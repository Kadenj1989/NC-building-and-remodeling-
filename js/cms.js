/*
  Renders owner-managed content into the page.
    - Photos, hero slides and projects: js/content.js
    - Blog posts: Sanity (published posts only) when SITE_CONFIG.SANITY_PROJECT_ID is set,
      otherwise the sample posts in js/content.js

  Markup hooks:
    data-cms-img="hero | services.remodeling | owner | closingImage | ..."
    data-cms-list="heroSlides | featuredProjects | allProjects | projectDetail | moreProjects |
                   homeFeatured | homeRecent | latestPosts | featuredPost | archivePosts | article | relatedPosts"
    data-cms-label="Readable name"   -> shown when the page is opened with ?cms

  The HTML inside each hook is a static fallback and is replaced on load.
  With Sanity connected, posts arrive after a second, posts-only render; hero slides and
  project lists are drawn once and never redrawn.

  Blog posts open at article.html?post=<slug> (a /blog/<slug> path also works if the host rewrites it).
*/
(function () {
  var doc = document;
  var config = window.SITE_CONFIG || {};
  var SANITY_ID = String(config.SANITY_PROJECT_ID || "").trim();
  var SANITY_DATASET = String(config.SANITY_DATASET || "production").trim();
  var SITE_NAME = "North Carolina Building & Remodeling";
  var ORG_NAME = "North Carolina Building and Remodeling, LLC";

  /* A post has at most one label: Stories or Tips. Older category values still map onto them. */
  var LABELS = {
    stories: "Stories",
    projects: "Stories",
    "customer-stories": "Stories",
    videos: "Stories",
    "company-news": "Stories",
    tips: "Tips",
    remodeling: "Tips",
    roofing: "Tips",
    "home-maintenance": "Tips",
    seasonal: "Tips"
  };
  var POST_LISTS = { homeFeatured: 1, homeRecent: 1, latestPosts: 1, featuredPost: 1, archivePosts: 1, article: 1, relatedPosts: 1 };

  function merge(base, extra) {
    var out = {}, k;
    for (k in base) out[k] = base[k];
    for (k in extra) out[k] = extra[k];
    return out;
  }

  function loadContent() {
    var base = window.SITE_CONTENT || {};
    if (SANITY_ID) return Promise.resolve(merge(base, { posts: [], sanity: true, blogState: "loading" }));
    return Promise.resolve(merge(base, { posts: (base.posts || []).map(normalizePost), sanity: false, blogState: "ready" }));
  }

  /* Sanity (public, read-only CDN — no token) --------------------------- */
  var LIVE = '_type == "post" && defined(slug.current) && defined(publishedAt) && publishedAt <= now() && !(_id in path("drafts.**"))';
  var CARD_FIELDS = 'title, "slug": slug.current, category, excerpt, publishedAt, youtubeUrl, ' +
    '"image": featuredImage.asset->url, "imageAlt": featuredImage.alt, "hotspot": featuredImage.hotspot, ' +
    '"crop": featuredImage.crop, "dims": featuredImage.asset->metadata.dimensions';
  var LIST_QUERY = "*[" + LIVE + "] | order(publishedAt desc) {" + CARD_FIELDS + "}";
  var ARTICLE_QUERY = "*[" + LIVE + " && slug.current == $slug][0]{" + CARD_FIELDS + ", seoTitle, seoDescription, " +
    'content[]{..., _type == "image" => {..., "url": asset->url, "dims": asset->metadata.dimensions, alt, caption, hotspot, crop}}}';

  function sanityFetch(query, params) {
    if (!/^[a-z0-9-]+$/i.test(SANITY_ID)) return Promise.reject(new Error("SANITY_PROJECT_ID looks wrong"));
    var url = "https://" + SANITY_ID + ".apicdn.sanity.io/v2025-01-01/data/query/" + encodeURIComponent(SANITY_DATASET) +
      "?query=" + encodeURIComponent(query) + "&perspective=published";
    Object.keys(params || {}).forEach(function (k) {
      url += "&" + encodeURIComponent("$" + k) + "=" + encodeURIComponent(JSON.stringify(params[k]));
    });
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = ctrl && window.setTimeout(function () { ctrl.abort(); }, 15000);
    return fetch(url, ctrl ? { signal: ctrl.signal } : {})
      .then(function (r) {
        if (!r.ok) throw new Error("Sanity request failed (" + r.status + ")");
        return r.json();
      })
      .then(function (d) {
        window.clearTimeout(timer);
        return d.result;
      }, function (err) {
        window.clearTimeout(timer);
        throw err;
      });
  }

  function loadPosts() {
    var onArticle = !!doc.querySelector('[data-cms-list="article"]');
    var query = onArticle ? '{"posts": ' + LIST_QUERY + ', "article": ' + ARTICLE_QUERY + "}" : LIST_QUERY;
    return sanityFetch(query, onArticle ? { slug: currentPostSlug() } : null).then(function (result) {
      var list = onArticle ? result && result.posts : result;
      return {
        posts: (list || []).map(normalizePost),
        article: onArticle && result && result.article ? normalizePost(result.article) : null
      };
    });
  }

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function slug(value) {
    return String(value || "").toLowerCase().trim().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function pick(obj, path) {
    return path.split(".").reduce(function (o, k) { return o && o[k]; }, obj);
  }

  function formatDate(iso) {
    var d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso + "T12:00:00" : iso);
    if (isNaN(d)) return esc(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function img(src, alt, dark, focus) {
    return '<img' + (dark ? ' class="lift"' : "") + ' src="' + esc(src) + '" alt="' + esc(alt) + '"' +
      (focus ? ' style="object-position:' + esc(focus) + '"' : "") +
      ' width="1024" height="576" loading="lazy" decoding="async">';
  }

  function projectUrl(p) {
    return p.url || "project.html?p=" + encodeURIComponent(p.slug || slug(p.title));
  }

  function currentProject(c) {
    var list = c.projects || [];
    var key = new URLSearchParams(window.location.search).get("p");
    if (!key) return list[0] || null;
    for (var i = 0; i < list.length; i++) {
      if ((list[i].slug || slug(list[i].title)) === key) return list[i];
    }
    return null;
  }

  function projectDetail(p) {
    var svc = slug(p.service);
    var photos = p.photos && p.photos.length ? p.photos : [{ image: p.image, alt: p.alt, focus: p.focus }];
    var html =
      '<section class="page-hero project-hero">' + img(p.image, p.alt || p.title, p.darkPhoto, p.focus) +
      '<div class="wrap"><ol class="crumbs"><li><a href="index.html">Home</a></li><li><a href="projects.html">Projects</a></li><li>' + esc(p.title) + "</li></ol>" +
      '<p class="eyebrow">' + esc(p.service) + "</p><h1>" + esc(p.title) + "</h1>" +
      (p.summary ? '<p class="lede">' + esc(p.summary) + "</p>" : "") +
      (p.sample ? '<p class="project-sample-note">Sample project · real job photos will replace these</p>' : "") +
      "</div></section>" +
      '<section class="section tone-light project-detail"><div class="wrap project-detail-grid"><div class="project-photos">';

    if (p.before && p.after) {
      html += '<h2 class="project-sub">Before &amp; after</h2><div class="before-after">' +
        "<figure>" + img(p.before.image, p.before.alt, p.before.darkPhoto, p.before.focus) + "<span>Before</span></figure>" +
        "<figure>" + img(p.after.image, p.after.alt, p.after.darkPhoto, p.after.focus) + "<span>After</span></figure></div>";
    }

    html += '<h2 class="project-sub">Project photos</h2><div class="project-gallery' + (photos.length === 1 ? " is-single" : "") + '">' +
      photos.map(function (ph) { return "<figure>" + img(ph.image, ph.alt, ph.darkPhoto, ph.focus) + "</figure>"; }).join("") + "</div></div>" +
      '<aside class="project-facts"><p class="eyebrow">Project details</p><dl>' +
      "<div><dt>Service</dt><dd>" + esc(p.service) + "</dd></div>" +
      "<div><dt>Photos</dt><dd>" + (photos.length + (p.before && p.after ? 2 : 0)) + "</dd></div></dl>" +
      "<p>Planning something like this? Send us the details and a few photos.</p>" +
      '<a class="btn btn-primary" href="#jobber-request" data-link="jobber">Request a Quote</a>' +
      '<a class="link-arrow" href="services.html#' + esc(svc) + '">About ' + esc(p.service.toLowerCase()) + "</a></aside>" +
      "</div></section>";
    return html;
  }

  function projectCard(p, heading, withSummary) {
    var tag = heading === "h2" ? 'h2 class="h3-like"' : "h3";
    return '<a class="project" href="' + esc(projectUrl(p)) + '" data-cat="' + esc(slug(p.service)) + '">' +
      '<figure class="project-media">' + img(p.image, p.alt, p.darkPhoto, p.focus) +
      (p.sample ? '<span class="sample-flag">Sample project</span>' : "") + "</figure>" +
      '<div class="project-body"><p class="project-meta">' + esc(p.service) + "</p>" +
      "<" + tag + ">" + esc(p.title) + "</" + heading + ">" +
      (withSummary && p.summary ? "<p>" + esc(p.summary) + "</p>" : "") + "</div></a>";
  }

  /* Blog posts ----------------------------------------------------------- */

  function postLabel(value) {
    return LABELS[slug(value)] || String(value || "").trim();
  }

  function postUrl(key) {
    return "article.html?post=" + encodeURIComponent(key);
  }

  function currentPostSlug() {
    var key = new URLSearchParams(window.location.search).get("post");
    if (key) return key.trim();
    var m = window.location.pathname.match(/\/blog\/([^\/]+)\/?$/);
    if (!m) return "";
    try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; }
  }

  /* Sanity posts and the sample posts in content.js share this shape */
  function normalizePost(p) {
    var key = (p.slug && p.slug.current) || p.slug || slug(p.title);
    return {
      slug: key,
      url: postUrl(key),
      title: p.title || "",
      label: postLabel(p.label || p.category),
      excerpt: p.excerpt || "",
      date: p.publishedAt || p.date || "",
      image: p.image || "",
      imageAlt: p.imageAlt || "",
      hotspot: p.hotspot || null,
      crop: p.crop || null,
      dims: p.dims || null,
      darkPhoto: !!p.darkPhoto,
      youtubeUrl: p.youtubeUrl || "",
      content: p.content || null,
      seoTitle: p.seoTitle || "",
      seoDescription: p.seoDescription || "",
      sample: !!p.sample
    };
  }

  function time(p) {
    return Date.parse(p.date) || 0;
  }

  function newestFirst(list) {
    return (list || []).slice().sort(function (a, b) { return time(b) - time(a); });
  }

  /* The newest post leads; undated sample posts keep their order from content.js */
  function arrangePosts(list) {
    var sorted = newestFirst(list);
    return { featured: sorted[0] || null, rest: sorted.slice(1), all: sorted };
  }

  function clamp01(n) {
    return Math.min(1, Math.max(0, n));
  }

  /* Sanity CDN images get size/format params (and crop + hotspot); local img/ paths are left alone */
  function imageSrc(src, meta, w, h) {
    if (!src) return "";
    if (!/^https:\/\/cdn\.sanity\.io\//i.test(src)) return src;
    meta = meta || {};
    var q = ["auto=format", "q=75"];
    var dims = meta.dims, crop = meta.crop, hs = meta.hotspot;
    var cl = 0, ct = 0, cw = 1, ch = 1;
    if (crop && dims && dims.width && dims.height) {
      cl = crop.left || 0;
      ct = crop.top || 0;
      cw = 1 - cl - (crop.right || 0);
      ch = 1 - ct - (crop.bottom || 0);
      if (cw > 0 && ch > 0 && (cw < 1 || ch < 1)) {
        q.push("rect=" + [Math.round(cl * dims.width), Math.round(ct * dims.height),
          Math.round(cw * dims.width), Math.round(ch * dims.height)].join(","));
      } else {
        cl = 0; ct = 0; cw = 1; ch = 1;
      }
    }
    if (!h && dims && dims.width) w = Math.min(w, Math.round(dims.width * cw));
    q.push("w=" + w);
    if (h) {
      q.push("h=" + h, "fit=crop");
      if (hs && isFinite(hs.x) && isFinite(hs.y)) {
        q.push("crop=focalpoint", "fp-x=" + clamp01((hs.x - cl) / cw).toFixed(3), "fp-y=" + clamp01((hs.y - ct) / ch).toFixed(3));
      }
    }
    return src + (src.indexOf("?") < 0 ? "?" : "&") + q.join("&");
  }

  function postImg(p, w, h, alt, eager) {
    var src = imageSrc(p.image, p, w, h);
    if (!src) return "";
    return '<img' + (p.darkPhoto ? ' class="lift"' : "") + ' src="' + esc(src) + '" alt="' + esc(alt || "") +
      '" width="' + w + '" height="' + h + '"' + (eager ? ' fetchpriority="high"' : ' loading="lazy" decoding="async"') + ">";
  }

  /* Media link: an empty gray box when the post has no photo */
  function postMedia(cls, p, w, h) {
    var pic = postImg(p, w, h, p.imageAlt || "");
    return '<a class="' + cls + (pic ? "" : " media-empty") + '" href="' + esc(p.url) + '" tabindex="-1" aria-hidden="true">' + pic + "</a>";
  }

  function postDate(p) {
    return p.date ? formatDate(p.date) : (p.sample ? "Sample post" : "");
  }

  function metaSpans(p) {
    var date = postDate(p);
    return (p.label ? '<span class="post-cat">' + esc(p.label) + "</span>" : "") +
      (date ? '<span class="post-date">' + date + "</span>" : "");
  }

  function postMeta(p, style) {
    return '<p class="post-meta"' + (style ? ' style="' + style + '"' : "") + ">" + metaSpans(p) + "</p>";
  }

  function postCard(p, compact) {
    var url = esc(p.url);
    return '<article class="post">' +
      postMedia("post-media", p, 900, 600) +
      postMeta(p) +
      '<h3><a href="' + url + '">' + esc(p.title) + "</a></h3>" +
      "<p>" + esc(p.excerpt) + "</p>" +
      (compact ? "" : '<a class="link-arrow" href="' + url + '">Read more<span class="sr-only">: ' + esc(p.title) + "</span></a>") +
      "</article>";
  }

  function featuredPost(p) {
    var url = esc(p.url);
    return postMedia("post-media", p, 1280, 800) +
      '<div><p class="eyebrow">Latest</p>' + postMeta(p, "margin-top:0") +
      '<h2><a href="' + url + '">' + esc(p.title) + "</a></h2>" +
      "<p>" + esc(p.excerpt) + "</p>" +
      '<a class="link-arrow" href="' + url + '">Read the story</a></div>';
  }

  function blogFeature(p) {
    var url = esc(p.url);
    return postMedia("blog-feature-media", p, 1280, 640) +
      '<div class="blog-feature-body">' + postMeta(p) +
      '<h3><a href="' + url + '">' + esc(p.title) + "</a></h3>" +
      "<p>" + esc(p.excerpt) + "</p>" +
      '<a class="link-arrow" href="' + url + '">Read the story</a></div>';
  }

  function blogListItem(p) {
    return '<li><a href="' + esc(p.url) + '"><span class="post-meta">' + metaSpans(p) + "</span>" +
      '<span class="blog-list-title">' + esc(p.title) + "</span>" +
      '<span class="blog-list-excerpt">' + esc(p.excerpt) + "</span></a></li>";
  }

  function blogNote(c, emptyText) {
    var text = c.blogState === "loading" ? "Loading posts…" :
      c.blogState === "error" ? "Posts couldn’t be loaded right now. Please try again in a few minutes." : emptyText;
    return '<p class="post-grid-note" role="status">' + esc(text) + "</p>";
  }

  /* Portable Text -> HTML (text is escaped; only safe links) ------------- */

  function safeHref(href) {
    var h = String(href || "").trim();
    var test = h.replace(/[\s\u0000-\u001f]/g, "");
    if (!test || /^\/\//.test(test)) return "";
    if (/^(https?:|mailto:|tel:)/i.test(test)) return h;
    if (/^[a-z][a-z0-9+.\-]*:/i.test(test)) return "";
    return h;
  }

  var DECORATORS = { strong: "strong", em: "em", code: "code", underline: "u", "strike-through": "s" };

  function ptSpans(block) {
    var defs = {};
    (block.markDefs || []).forEach(function (d) { if (d && d._key) defs[d._key] = d; });
    return (block.children || []).map(function (span) {
      if (!span || typeof span.text !== "string") return "";
      var html = esc(span.text).replace(/\n/g, "<br>");
      (span.marks || []).forEach(function (m) {
        var def = defs[m];
        if (def) {
          var href = def._type === "link" ? safeHref(def.href) : "";
          if (href) {
            html = '<a href="' + esc(href) + '"' + (/^https?:/i.test(href) ? ' target="_blank" rel="noopener"' : "") + ">" + html + "</a>";
          }
          return;
        }
        if (DECORATORS[m]) html = "<" + DECORATORS[m] + ">" + html + "</" + DECORATORS[m] + ">";
      });
      return html;
    }).join("");
  }

  function youtubeId(url) {
    var m = String(url || "").trim().match(
      /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i);
    return m ? m[1] : "";
  }

  /* Same markup as the static video players; site.js binds [data-video] */
  function videoFigure(id, title, poster) {
    if (!id) return "";
    var t = title || "Watch the video";
    var src = poster || "https://i.ytimg.com/vi/" + encodeURIComponent(id) + "/hqdefault.jpg";
    return '<figure class="video wide" data-video data-youtube-id="' + esc(id) + '" data-title="' + esc(t) + '">' +
      '<img src="' + esc(src) + '" alt="" width="1024" height="576" loading="lazy" decoding="async">' +
      '<button class="video-play" type="button" aria-label="Play video: ' + esc(t) + '">' +
      '<span class="video-play-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12-7.5z" fill="currentColor"/></svg></span>' +
      "</button>" +
      '<figcaption class="video-label">Video coming soon</figcaption></figure>';
  }

  function ptImage(b) {
    var src = imageSrc(b.url || b.image, b, 1600, 0);
    if (!src) return "";
    var d = b.dims || {};
    var w = d.width || 1024, h = d.height || 576;
    if (b.crop && d.width && d.height) {
      w = Math.round(w * (1 - (b.crop.left || 0) - (b.crop.right || 0))) || w;
      h = Math.round(h * (1 - (b.crop.top || 0) - (b.crop.bottom || 0))) || h;
    }
    return '<figure class="wide"><img' + (b.darkPhoto ? ' class="lift"' : "") + ' src="' + esc(src) + '" alt="' + esc(b.alt) +
      '" width="' + w + '" height="' + h + '" loading="lazy" decoding="async">' +
      (b.caption ? "<figcaption>" + esc(b.caption) + "</figcaption>" : "") + "</figure>";
  }

  /* Nested list levels are flattened: the design styles one level of list */
  function portableText(blocks, postTitle) {
    var out = "", list = "";
    function closeList() {
      if (list) out += "</" + list + ">";
      list = "";
    }
    (blocks || []).forEach(function (b) {
      if (!b) return;
      if (b._type === "block" && b.listItem) {
        var tag = b.listItem === "number" ? "ol" : "ul";
        if (list !== tag) {
          closeList();
          out += "<" + tag + ">";
          list = tag;
        }
        out += "<li>" + ptSpans(b) + "</li>";
        return;
      }
      closeList();
      if (b._type === "block") {
        var inner = ptSpans(b);
        if (!inner.replace(/<[^>]*>/g, "").trim()) return;
        var style = b.style || "normal";
        if (/^h[2-4]$/.test(style)) out += "<" + style + ">" + inner + "</" + style + ">";
        else if (style === "h1") out += "<h2>" + inner + "</h2>";
        else if (style === "blockquote") out += '<blockquote class="pull-quote"><p>' + inner + "</p></blockquote>";
        else out += "<p>" + inner + "</p>";
      } else if (b._type === "image") {
        out += ptImage(b);
      } else if (b._type === "youtube") {
        out += videoFigure(youtubeId(b.url), b.caption || postTitle);
      }
    });
    closeList();
    return out;
  }

  /* Article page --------------------------------------------------------- */

  function siteBase() {
    var site = String(config.SITE_URL || "").trim().replace(/\/+$/, "");
    if (site) return site + "/";
    var path = window.location.pathname.replace(/\/blog\/[^\/]*\/?$/, "/").replace(/[^\/]*$/, "");
    return window.location.origin + path;
  }

  function absUrl(path) {
    try { return new URL(path, siteBase()).href; } catch (e) { return path; }
  }

  function setMeta(attr, key, value) {
    var el = doc.head.querySelector("meta[" + attr + '="' + key + '"]');
    if (!value) {
      if (el) el.remove();
      return;
    }
    if (!el) {
      el = doc.createElement("meta");
      el.setAttribute(attr, key);
      doc.head.appendChild(el);
    }
    el.setAttribute("content", value);
  }

  function setCanonical(href) {
    var el = doc.head.querySelector('link[rel="canonical"]');
    if (!el) {
      el = doc.createElement("link");
      el.rel = "canonical";
      doc.head.appendChild(el);
    }
    el.href = href;
  }

  function setJsonLd(data) {
    var el = doc.head.querySelector('script[type="application/ld+json"]');
    if (!el) {
      el = doc.createElement("script");
      el.type = "application/ld+json";
      doc.head.appendChild(el);
    }
    el.textContent = JSON.stringify(data, null, 2).replace(/</g, "\\u003c");
  }

  function applyPostSeo(p, author) {
    var title = p.seoTitle || p.title + " | Resources | " + SITE_NAME;
    var desc = p.seoDescription || p.excerpt;
    var url = absUrl(postUrl(p.slug));
    var image = p.image ? absUrl(imageSrc(p.image, p, 1200, 630)) : "";
    doc.title = title;
    setMeta("name", "description", desc);
    setMeta("name", "robots", "");
    setCanonical(url);
    setMeta("property", "og:type", "article");
    setMeta("property", "og:title", p.seoTitle || p.title);
    setMeta("property", "og:description", desc);
    setMeta("property", "og:image", image);
    setMeta("property", "og:url", url);
    var ld = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: p.title,
      description: desc,
      author: { "@type": "Person", name: author },
      publisher: { "@type": "Organization", name: ORG_NAME, logo: { "@type": "ImageObject", url: absUrl("img/brand/nclogo.png") } },
      mainEntityOfPage: { "@type": "WebPage", "@id": url }
    };
    if (p.date) ld.datePublished = new Date(time(p) || p.date).toISOString();
    if (image) ld.image = [image];
    setJsonLd(ld);
  }

  function articleMessage(heading, text, crumb) {
    return '<header class="article-head tone-light"><div class="wrap">' +
      '<ol class="crumbs on-light"><li><a href="index.html">Home</a></li><li><a href="jobsite.html">Resources</a></li>' +
      (crumb ? "<li>" + esc(crumb) + "</li>" : "") + "</ol>" +
      "<h1>" + esc(heading) + '</h1><p class="lede">' + esc(text) + "</p>" +
      '<div class="btn-row"><a class="btn btn-primary" href="jobsite.html">See all posts</a></div></div></header>';
  }

  function articleNotFound() {
    doc.title = "Post not found | Resources | " + SITE_NAME;
    setMeta("name", "robots", "noindex");
    return articleMessage("Post not found.", "It may have been moved or removed.");
  }

  function articleHtml(p, author) {
    var date = postDate(p);
    var videoId = youtubeId(p.youtubeUrl);
    var hero = postImg(p, 1600, 686, p.imageAlt, true);
    return '<header class="article-head tone-light"><div class="wrap">' +
      '<ol class="crumbs on-light"><li><a href="index.html">Home</a></li><li><a href="jobsite.html">Resources</a></li><li>' + esc(p.title) + "</li></ol>" +
      (p.label ? '<p class="eyebrow">' + esc(p.label) + "</p>" : "") +
      "<h1>" + esc(p.title) + "</h1>" +
      '<p class="article-meta"><span>By <strong>' + esc(author) + "</strong></span>" +
      (date ? (p.date ? '<span><time datetime="' + esc(p.date) + '">' + date + "</time></span>" : "<span>" + date + "</span>") : "") +
      "</p></div></header>" +
      (hero ? '<figure class="article-hero">' + hero + "</figure>" : "") +
      '<div class="prose">' +
      (p.excerpt ? '<p class="intro">' + esc(p.excerpt) + "</p>" : "") +
      videoFigure(videoId, p.title, p.image ? imageSrc(p.image, p, 1600, 900) : "") +
      portableText(p.content, p.title) +
      "</div>" +
      '<aside class="article-cta"><div class="cta-panel"><div>' +
      '<p class="eyebrow">Start your project</p><h2>Planning something similar?</h2>' +
      "<p>Tell us about your project and send us photos through our project request system.</p></div>" +
      '<a class="btn btn-primary" href="#jobber-request" data-link="jobber">Start Your Request</a></div></aside>';
  }

  function findPost(c, key) {
    if (c.sanity) return c.article || null;
    var list = c.posts || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].slug === key) return list[i];
    }
    return null;
  }

  var LISTS = {
    heroSlides: function (c) {
      var list = (c.hero && c.hero.images) || [];
      return list.map(function (s, i) {
        var boost = Number(s.brightness);
        return '<img class="hero-slide' + (i === 0 ? " is-active" : "") + '"' +
          (boost > 0 ? ' style="--brighten:' + boost + '"' : "") +
          ' src="' + esc(s.image) + '" alt="' + esc(s.alt) + '" width="1024" height="576"' +
          (i === 0 ? ' fetchpriority="high"' : ' loading="lazy" decoding="async"') + ">";
      }).join("");
    },
    homeFeatured: function (c) {
      var a = arrangePosts(c.posts);
      if (a.featured) return blogFeature(a.featured);
      return c.sanity ? '<div class="blog-feature-body">' + blogNote(c, "No posts yet. Check back soon.") + "</div>" : null;
    },
    homeRecent: function (c) {
      if (!c.sanity && !(c.posts || []).length) return null;
      return arrangePosts(c.posts).rest.slice(0, 3).map(blogListItem).join("");
    },
    featuredProjects: function (c) {
      var list = (c.projects || []).filter(function (p) { return p.featured; });
      if (!list.length) list = c.projects || [];
      return list.slice(0, 3).map(function (p, i) { return projectCard(p, "h3", i === 0); }).join("");
    },
    allProjects: function (c) {
      return (c.projects || []).map(function (p) { return projectCard(p, "h2", true); }).join("");
    },
    projectDetail: function (c) {
      var p = currentProject(c);
      if (!p) {
        return '<section class="page-hero"><div class="wrap"><ol class="crumbs"><li><a href="index.html">Home</a></li><li><a href="projects.html">Projects</a></li></ol>' +
          '<h1>Project not found.</h1><p class="lede">It may have been moved or removed.</p>' +
          '<div class="btn-row"><a class="btn btn-primary" href="projects.html">See all projects</a></div></div></section>';
      }
      doc.title = p.title + " | " + (p.service || "Projects") + " | North Carolina Building and Remodeling LLC";
      var projectDesc = (p.summary ? String(p.summary).replace(/\s+$/, "") : p.title) +
        " " + (p.service || "Project") + " work by North Carolina Building and Remodeling LLC, serving Cumberland County, NC and surrounding communities.";
      setMeta("name", "description", projectDesc);
      setMeta("property", "og:title", p.title + " | North Carolina Building and Remodeling LLC");
      setMeta("property", "og:description", projectDesc);
      return projectDetail(p);
    },
    moreProjects: function (c) {
      var p = currentProject(c);
      var others = (c.projects || []).filter(function (x) { return x !== p; });
      var same = others.filter(function (x) { return p && x.service === p.service; });
      var rest = others.filter(function (x) { return same.indexOf(x) < 0; });
      return same.concat(rest).slice(0, 3).map(function (x) { return projectCard(x, "h3", false); }).join("");
    },
    latestPosts: function (c) {
      if (!c.sanity && !(c.posts || []).length) return null;
      return arrangePosts(c.posts).all.slice(0, 3).map(function (p) { return postCard(p); }).join("");
    },
    featuredPost: function (c) {
      var a = arrangePosts(c.posts);
      if (a.featured) return featuredPost(a.featured);
      return c.sanity ? blogNote(c, "No posts yet. Check back soon.") : null;
    },
    archivePosts: function (c) {
      if (!c.sanity && !(c.posts || []).length) return null;
      return arrangePosts(c.posts).rest.map(function (p) { return postCard(p); }).join("");
    },
    article: function (c) {
      var key = currentPostSlug();
      if (!key && !c.sanity) return null;
      if (c.blogState === "loading") return articleMessage("Loading post…", "One moment.", "Loading");
      if (c.blogState === "error") {
        return articleMessage("This post couldn’t be loaded.", "Please try again in a few minutes, or browse all posts.");
      }
      var p = key ? findPost(c, key) : null;
      if (!p) return articleNotFound();
      var author = (c.owner && c.owner.name) || "James";
      applyPostSeo(p, author);
      return articleHtml(p, author);
    },
    relatedPosts: function (c) {
      var key = currentPostSlug();
      if (!key && !c.sanity) return null;
      var current = key ? findPost(c, key) : null;
      var others = arrangePosts(c.posts).all.filter(function (x) { return x.slug !== key; });
      var same = others.filter(function (x) { return current && current.label && x.label === current.label; });
      var rest = others.filter(function (x) { return same.indexOf(x) < 0; });
      return same.concat(rest).slice(0, 3).map(function (p) { return postCard(p, true); }).join("");
    }
  };

  function render(content, postsOnly) {
    if (!content) return;

    if (!postsOnly) doc.querySelectorAll("[data-cms-img]").forEach(function (el) {
      var data = pick(content, el.getAttribute("data-cms-img"));
      var src = data && (data.image || data.photo);
      if (!src) return;
      if (el.tagName === "IMG") {
        el.src = src;
        if (data.alt != null) el.alt = data.alt;
      } else {
        el.innerHTML = '<img src="' + esc(src) + '" alt="' + esc(data.alt) + '" loading="lazy" decoding="async">';
        el.classList.add("has-photo");
      }
    });

    doc.querySelectorAll("[data-cms-list]").forEach(function (el) {
      var name = el.getAttribute("data-cms-list");
      if (postsOnly && !POST_LISTS[name]) return;
      var build = LISTS[name];
      var html = build && build(content);
      /* post lists may legitimately become empty; other lists keep their fallback */
      if (typeof html === "string" && (html || POST_LISTS[name])) el.innerHTML = html;
    });

    doc.dispatchEvent(new CustomEvent("cms:rendered", { detail: { postsOnly: !!postsOnly } }));
  }

  /* ?cms — outline every owner-managed area so it's obvious what can be edited */
  function addTags() {
    if (!doc.body.classList.contains("show-cms")) return;
    doc.querySelectorAll("[data-cms-label]").forEach(function (el) {
      if (el.querySelector(":scope > .cms-tag")) return;
      var tag = doc.createElement("span");
      tag.className = "cms-tag";
      tag.setAttribute("aria-hidden", "true");
      tag.textContent = "Owner-managed · " + el.getAttribute("data-cms-label");
      el.appendChild(tag);
    });
  }

  function showEditableAreas() {
    doc.body.classList.add("show-cms");
    addTags();
    doc.addEventListener("cms:rendered", addTags);
    var bar = doc.createElement("div");
    bar.className = "cms-banner";
    bar.setAttribute("role", "status");
    bar.innerHTML =
      "<p><strong>Content view.</strong> Areas outlined in gold are owner-managed. Photos and projects come from " +
      "<code>js/content.js</code>. Blog posts " + (SANITY_ID
        ? "come from Sanity Studio (published posts only)."
        : "will come from Sanity Studio once <code>SANITY_PROJECT_ID</code> is set in <code>js/config.js</code>; " +
          "until then the sample posts in <code>js/content.js</code> are shown.") + "</p>" +
      '<button type="button" class="cms-banner-close" aria-label="Hide content view">×</button>';
    bar.querySelector("button").addEventListener("click", function () {
      doc.body.classList.remove("show-cms");
      bar.remove();
    });
    doc.body.appendChild(bar);
  }

  function hasPostLists() {
    return Object.keys(POST_LISTS).some(function (name) {
      return doc.querySelector('[data-cms-list="' + name + '"]');
    });
  }

  loadContent().then(function (content) {
    render(content);
    if (!content.sanity || !hasPostLists()) return;
    loadPosts().then(function (data) {
      render(merge(content, { posts: data.posts, article: data.article, blogState: "ready" }), true);
    }, function (err) {
      if (window.console) console.warn("Blog posts could not be loaded from Sanity.", err);
      render(merge(content, { posts: [], article: null, blogState: "error" }), true);
    });
  }).catch(function () { /* keep static fallback */ });

  if (/[?&]cms\b/.test(window.location.search)) {
    if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", showEditableAreas);
    else showEditableAreas();
  }
})();
