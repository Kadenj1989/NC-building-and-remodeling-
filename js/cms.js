/*
  Renders owner-managed content into the page.
    - Photos, hero slides and projects: js/content.js
    - Blog posts: Pages CMS Markdown files in content/posts

  Pages CMS (.pages.yml) saves each post as content/posts/<slug>.md with
  title, slug, date, featured_image, video, attachment, and body.
  Images and files use the public path /content/uploads/.
  This file reads those Markdown files from the public GitHub repository.
  Blog posts open at article.html?post=<slug>.

  Markup hooks:
    data-cms-img="hero | services.remodeling | owner | closingImage | ..."
    data-cms-list="heroSlides | featuredProjects | allProjects | projectDetail | moreProjects |
                   homeBlog | resourcesBlog | article | relatedPosts"
    data-cms-label="Readable name"   -> shown when the page is opened with ?cms

  Blog lists return null when there are no posts, so the static
  "Our blog is coming soon." HTML stays in place.
*/
(function () {
  var doc = document;
  var config = window.SITE_CONFIG || {};
  var GITHUB_OWNER = String(config.GITHUB_OWNER || "Kadenj1989").trim();
  var GITHUB_REPO = String(config.GITHUB_REPO || "NC-building-and-remodeling-").trim();
  var GITHUB_BRANCH = String(config.GITHUB_BRANCH || "main").trim();
  var POSTS_PATH = "content/posts";
  var SITE_NAME = "North Carolina Building & Remodeling";
  var ORG_NAME = "North Carolina Building and Remodeling, LLC";
  var POST_LISTS = {
    homeBlog: 1,
    resourcesBlog: 1,
    homeFeatured: 1,
    homeRecent: 1,
    latestPosts: 1,
    featuredPost: 1,
    archivePosts: 1,
    article: 1,
    relatedPosts: 1
  };

  function merge(base, extra) {
    var out = {}, k;
    for (k in base) out[k] = base[k];
    for (k in extra) out[k] = extra[k];
    return out;
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

  function loadContent() {
    var base = window.SITE_CONTENT || {};
    return Promise.resolve(merge(base, { posts: [], pagesCms: true, blogState: "loading" }));
  }

  /* Pages CMS posts live in the public GitHub repo. No token. */
  function githubApi(path) {
    return "https://api.github.com/repos/" +
      encodeURIComponent(GITHUB_OWNER) + "/" + encodeURIComponent(GITHUB_REPO) +
      "/contents/" + path.split("/").map(encodeURIComponent).join("/") +
      "?ref=" + encodeURIComponent(GITHUB_BRANCH);
  }

  function fetchWithTimeout(url, options) {
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = ctrl && window.setTimeout(function () { ctrl.abort(); }, 15000);
    var opts = options || {};
    if (ctrl) opts.signal = ctrl.signal;
    return fetch(url, opts).then(function (r) {
      window.clearTimeout(timer);
      return r;
    }, function (err) {
      window.clearTimeout(timer);
      throw err;
    });
  }

  function fetchJson(url) {
    return fetchWithTimeout(url, { cache: "no-store" }).then(function (r) {
      if (r.status === 404) return null;
      if (!r.ok) throw new Error("GitHub request failed (" + r.status + ")");
      return r.json();
    });
  }

  function fetchText(url) {
    return fetchWithTimeout(url, { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("Post request failed (" + r.status + ")");
      return r.text();
    });
  }

  function decodeBase64(b64) {
    var bin = atob(String(b64 || "").replace(/\n/g, ""));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  }

  function fileText(item) {
    if (item.download_url) return fetchText(item.download_url);
    return fetchJson(item.url).then(function (file) {
      if (!file || !file.content) throw new Error("Empty post");
      return decodeBase64(file.content);
    });
  }

  function unquote(value) {
    var v = String(value == null ? "" : value).trim();
    if ((v.charAt(0) === '"' && v.charAt(v.length - 1) === '"') ||
        (v.charAt(0) === "'" && v.charAt(v.length - 1) === "'")) {
      v = v.slice(1, -1);
    }
    return v.replace(/\\"/g, '"').replace(/\\'/g, "'");
  }

  function flag(value, yes) {
    return (yes ? /^(true|yes|1)$/i : /^(false|no|0)$/i).test(String(value || "").trim());
  }

  function isFutureDate(iso) {
    var day = String(iso || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
    var now = new Date();
    var today = now.getFullYear() + "-" +
      String(now.getMonth() + 1).padStart(2, "0") + "-" +
      String(now.getDate()).padStart(2, "0");
    return day > today;
  }

  function parseMarkdownFile(text, fallbackSlug) {
    text = String(text || "").replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
    var data = {};
    var body = text;
    if (text.slice(0, 4) === "---\n") {
      var close = text.indexOf("\n---", 4);
      if (close >= 0) {
        text.slice(4, close).split("\n").forEach(function (line) {
          var m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
          if (m && m[2].trim() !== "|" && m[2].trim() !== ">") data[m[1]] = unquote(m[2]);
        });
        body = text.slice(close + 4).replace(/^\n+/, "");
      }
    }
    if (flag(data.draft, true) || flag(data.published, false) || /^draft$/i.test(data.status || "")) return null;
    var date = data.date || data.published || data.publishedAt || "";
    if (isFutureDate(date)) return null;
    var plain = body
      .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[#>*_`~\-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    var excerpt = data.excerpt || (plain.length > 190 ? plain.slice(0, 187).trim() + "…" : plain);
    return normalizePost({
      title: data.title || fallbackSlug,
      slug: data.slug || fallbackSlug,
      label: data.label || data.category || "",
      date: date,
      image: data.featured_image || data.image || data.cover || "",
      imageAlt: data.featured_image_alt || data.imageAlt || data.title || "",
      youtubeUrl: data.youtube || data.youtubeUrl || "",
      video: data.video || "",
      attachment: data.attachment || "",
      excerpt: excerpt,
      seoTitle: data.seoTitle || data.seo_title || "",
      seoDescription: data.seoDescription || data.seo_description || data.description || "",
      markdown: body
    });
  }

  function loadPosts() {
    return fetchJson(githubApi(POSTS_PATH)).then(function (items) {
      if (items && !Array.isArray(items) && items.type === "file") items = [items];
      if (!items || !Array.isArray(items)) return [];
      var files = items.filter(function (item) {
        var name = String(item && item.name || "");
        return item && item.type === "file" && /\.md$/i.test(name) &&
          !/^readme\.md$/i.test(name) && name.charAt(0) !== "_" && name.charAt(0) !== ".";
      });
      return Promise.all(files.map(function (item) {
        var fallback = String(item.name || "").replace(/\.md$/i, "");
        return fileText(item).then(function (text) {
          return parseMarkdownFile(text, fallback);
        }, function () { return null; });
      }));
    }).then(function (posts) {
      return newestFirst((posts || []).filter(function (p) { return p && p.title && p.slug; }));
    });
  }

  /* Projects ------------------------------------------------------------- */

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

  /* Blog ----------------------------------------------------------------- */

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

  function normalizePost(p) {
    var key = p.slug || slug(p.title);
    return {
      slug: key,
      url: postUrl(key),
      title: p.title || "",
      label: String(p.label || "").trim(),
      excerpt: p.excerpt || "",
      date: p.date || "",
      image: p.image || "",
      imageAlt: p.imageAlt || p.title || "",
      youtubeUrl: p.youtubeUrl || "",
      video: p.video || "",
      attachment: p.attachment || "",
      markdown: p.markdown || "",
      seoTitle: p.seoTitle || "",
      seoDescription: p.seoDescription || ""
    };
  }

  function time(p) {
    return Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(p.date) ? p.date + "T12:00:00" : p.date) || 0;
  }

  function newestFirst(list) {
    return (list || []).slice().sort(function (a, b) { return time(b) - time(a); });
  }

  function arrangePosts(list) {
    var sorted = newestFirst(list);
    return { featured: sorted[0] || null, rest: sorted.slice(1), all: sorted };
  }

  /* Pages CMS stores uploads as /content/uploads/... . Keep that site path. */
  function imageSrc(src) {
    src = String(src || "").trim();
    if (!src) return "";
    if (/^(https?:)?\/\//i.test(src)) return src;
    if (src.charAt(0) === "/") src = src.slice(1);
    return src;
  }

  function postImg(p, w, h, alt, eager) {
    var src = imageSrc(p.image);
    if (!src) return "";
    return '<img src="' + esc(src) + '" alt="' + esc(alt || "") + '" width="' + w + '" height="' + h + '"' +
      (eager ? ' fetchpriority="high"' : ' loading="lazy" decoding="async"') + ">";
  }

  function postMedia(cls, p, w, h) {
    var pic = postImg(p, w, h, p.imageAlt || "");
    return '<a class="' + cls + (pic ? "" : " media-empty") + '" href="' + esc(p.url) + '" tabindex="-1" aria-hidden="true">' + pic + "</a>";
  }

  function postDate(p) {
    return p.date ? formatDate(p.date) : "";
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

  function safeHref(href) {
    var h = String(href || "").trim();
    var test = h.replace(/[\s\u0000-\u001f]/g, "");
    if (!test || /^\/\//.test(test)) return "";
    if (/^(https?:|mailto:|tel:)/i.test(test)) return h;
    if (/^[a-z][a-z0-9+.\-]*:/i.test(test)) return "";
    return h;
  }

  function youtubeId(url) {
    var m = String(url || "").trim().match(
      /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i);
    return m ? m[1] : "";
  }

  function videoFigure(id, title, poster) {
    if (!id) return "";
    var t = title || "Watch the video";
    var src = poster || "https://i.ytimg.com/vi/" + encodeURIComponent(id) + "/hqdefault.jpg";
    return '<figure class="video wide" data-video data-youtube-id="' + esc(id) + '" data-title="' + esc(t) + '">' +
      '<img src="' + esc(src) + '" alt="" width="1024" height="576" loading="lazy" decoding="async">' +
      '<button class="video-play" type="button" aria-label="Play video: ' + esc(t) + '">' +
      '<span class="video-play-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12-7.5z" fill="currentColor"/></svg></span>' +
      "</button>" +
      '<figcaption class="video-label">' + esc(t) + "</figcaption></figure>";
  }

  function fileVideo(src, title) {
    src = safeHref(src);
    if (!src || youtubeId(src)) return "";
    return '<figure class="wide"><video controls preload="metadata" style="width:100%;height:auto" aria-label="' +
      esc(title || "Blog video") + '"><source src="' + esc(imageSrc(src)) + '"></video></figure>';
  }

  function inlineMarkdown(text) {
    var s = String(text || "");
    var out = "";
    var re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(__[^_]+__)|(\*[^*\n]+\*)|(_[^_\n]+_)|(\[([^\]]+)\]\(([^)]+)\))/g;
    var last = 0;
    var m;
    while ((m = re.exec(s))) {
      out += esc(s.slice(last, m.index));
      if (m[1]) out += "<code>" + esc(m[1].slice(1, -1)) + "</code>";
      else if (m[2]) out += "<strong>" + inlineMarkdown(m[2].slice(2, -2)) + "</strong>";
      else if (m[3]) out += "<strong>" + inlineMarkdown(m[3].slice(2, -2)) + "</strong>";
      else if (m[4]) out += "<em>" + inlineMarkdown(m[4].slice(1, -1)) + "</em>";
      else if (m[5]) out += "<em>" + inlineMarkdown(m[5].slice(1, -1)) + "</em>";
      else if (m[6]) {
        var href = safeHref(m[8]);
        out += href
          ? '<a href="' + esc(href) + '"' + (/^https?:/i.test(href) ? ' target="_blank" rel="noopener"' : "") + ">" + inlineMarkdown(m[7]) + "</a>"
          : inlineMarkdown(m[7]);
      }
      last = m.index + m[0].length;
    }
    return out + esc(s.slice(last));
  }

  function markdownToHtml(markdown) {
    var lines = String(markdown || "").replace(/\r\n?/g, "\n").split("\n");
    var out = [];
    var paragraph = [];
    var list = "";
    function closeParagraph() {
      if (!paragraph.length) return;
      out.push("<p>" + inlineMarkdown(paragraph.join(" ")) + "</p>");
      paragraph = [];
    }
    function closeList() {
      if (list) out.push("</" + list + ">");
      list = "";
    }
    lines.forEach(function (line) {
      var t = line.trim();
      if (!t) {
        closeParagraph();
        closeList();
        return;
      }
      var image = t.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)$/);
      if (image) {
        closeParagraph();
        closeList();
        var src = safeHref(image[2]);
        if (src) {
          out.push('<figure class="wide"><img src="' + esc(imageSrc(src)) + '" alt="' + esc(image[1]) +
            '" loading="lazy" decoding="async"></figure>');
        }
        return;
      }
      if (/^https?:\/\/\S+$/.test(t) && youtubeId(t)) {
        closeParagraph();
        closeList();
        out.push(videoFigure(youtubeId(t), "Watch the video", ""));
        return;
      }
      var heading = t.match(/^(#{1,4})\s+(.+)$/);
      if (heading) {
        closeParagraph();
        closeList();
        var level = heading[1].length <= 2 ? 2 : Math.min(4, heading[1].length);
        out.push("<h" + level + ">" + inlineMarkdown(heading[2]) + "</h" + level + ">");
        return;
      }
      var quote = t.match(/^>\s*(.+)$/);
      if (quote) {
        closeParagraph();
        closeList();
        out.push('<blockquote class="pull-quote"><p>' + inlineMarkdown(quote[1]) + "</p></blockquote>");
        return;
      }
      var bullet = t.match(/^[-*+]\s+(.+)$/);
      var number = t.match(/^\d+\.\s+(.+)$/);
      if (bullet || number) {
        closeParagraph();
        var wanted = number ? "ol" : "ul";
        if (list !== wanted) {
          closeList();
          out.push("<" + wanted + ">");
          list = wanted;
        }
        out.push("<li>" + inlineMarkdown((bullet || number)[1]) + "</li>");
        return;
      }
      paragraph.push(t);
    });
    closeParagraph();
    closeList();
    return out.join("");
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
    var el = doc.head.querySelector("script[data-blog-jsonld]");
    if (!el) {
      var scripts = doc.head.querySelectorAll('script[type="application/ld+json"]');
      for (var i = 0; i < scripts.length; i++) {
        if (/BlogPosting/.test(scripts[i].textContent || "")) {
          el = scripts[i];
          break;
        }
      }
    }
    if (!el) {
      el = doc.createElement("script");
      el.type = "application/ld+json";
      doc.head.appendChild(el);
    }
    el.setAttribute("data-blog-jsonld", "");
    el.textContent = JSON.stringify(data, null, 2).replace(/</g, "\\u003c");
  }

  function applyPostSeo(p, author) {
    var title = p.seoTitle || p.title + " | Resources | " + SITE_NAME;
    var desc = p.seoDescription || p.excerpt;
    var url = absUrl(postUrl(p.slug));
    var image = p.image ? absUrl(imageSrc(p.image)) : "";
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
    if (p.date) ld.datePublished = /^\d{4}-\d{2}-\d{2}$/.test(p.date) ? p.date : new Date(time(p)).toISOString();
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
    var hero = postImg(p, 1600, 686, p.imageAlt, true);
    var yt = youtubeId(p.youtubeUrl) || youtubeId(p.video);
    var attachment = safeHref(p.attachment);
    return '<header class="article-head tone-light"><div class="wrap">' +
      '<ol class="crumbs on-light"><li><a href="index.html">Home</a></li><li><a href="jobsite.html">Resources</a></li><li>' + esc(p.title) + "</li></ol>" +
      (p.label ? '<p class="eyebrow">' + esc(p.label) + "</p>" : "") +
      "<h1>" + esc(p.title) + "</h1>" +
      '<p class="article-meta"><span>By <strong>' + esc(author) + "</strong></span>" +
      (date ? '<span><time datetime="' + esc(p.date) + '">' + date + "</time></span>" : "") +
      "</p></div></header>" +
      (hero ? '<figure class="article-hero">' + hero + "</figure>" : "") +
      '<div class="prose">' + markdownToHtml(p.markdown) +
      (yt ? videoFigure(yt, p.title, "") : fileVideo(p.video, p.title)) +
      (attachment ? '<p><a class="btn btn-outline" href="' + esc(imageSrc(attachment)) + '" target="_blank" rel="noopener">View attached file</a></p>' : "") +
      "</div>" +
      '<aside class="article-cta"><div class="cta-panel"><div>' +
      '<p class="eyebrow">Start your project</p><h2>Planning something similar?</h2>' +
      "<p>Tell us about your project and send us photos through our project request system.</p></div>" +
      '<a class="btn btn-primary" href="#jobber-request" data-link="jobber">Start Your Request</a></div></aside>';
  }

  function findPost(c, key) {
    var list = c.posts || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].slug === key) return list[i];
    }
    return null;
  }

  function readyPosts(c) {
    return c.blogState === "ready" ? (c.posts || []) : null;
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
    homeBlog: function (c) {
      var posts = readyPosts(c);
      if (!posts) return null;
      var featured = arrangePosts(posts).featured;
      if (!featured) return null;
      return '<div class="blog-feature reveal is-visible">' + blogFeature(featured) + "</div>";
    },
    resourcesBlog: function (c) {
      var posts = readyPosts(c);
      if (!posts) return null;
      var arranged = arrangePosts(posts);
      if (!arranged.featured) return null;
      var rest = arranged.rest.map(function (p) { return postCard(p); }).join("");
      return '<div class="blog-feature reveal is-visible">' + blogFeature(arranged.featured) + "</div>" +
        (rest ? '<div class="post-grid blog-rest">' + rest + "</div>" : "");
    },
    homeFeatured: function (c) {
      var posts = readyPosts(c);
      if (!posts) return null;
      var featured = arrangePosts(posts).featured;
      return featured ? blogFeature(featured) : null;
    },
    homeRecent: function (c) {
      var posts = readyPosts(c);
      if (!posts || !posts.length) return null;
      return arrangePosts(posts).rest.slice(0, 3).map(blogListItem).join("");
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
      var posts = readyPosts(c);
      if (!posts || !posts.length) return null;
      return arrangePosts(posts).all.slice(0, 3).map(function (p) { return postCard(p); }).join("");
    },
    featuredPost: function (c) {
      var posts = readyPosts(c);
      if (!posts) return null;
      var featured = arrangePosts(posts).featured;
      return featured ? featuredPost(featured) : null;
    },
    archivePosts: function (c) {
      var posts = readyPosts(c);
      if (!posts || !posts.length) return null;
      return arrangePosts(posts).rest.map(function (p) { return postCard(p); }).join("");
    },
    article: function (c) {
      var key = currentPostSlug();
      if (!key) return null;
      if (c.blogState === "loading") return articleMessage("Loading post…", "Loading the post.", "Loading");
      if (c.blogState === "error") {
        return articleMessage("This post couldn’t be loaded.", "Please try again in a few minutes.");
      }
      var p = findPost(c, key);
      if (!p) return articleNotFound();
      var author = (c.owner && c.owner.name) || "James";
      applyPostSeo(p, author);
      return articleHtml(p, author);
    },
    relatedPosts: function (c) {
      if (c.blogState !== "ready") return null;
      var key = currentPostSlug();
      var others = arrangePosts(c.posts).all.filter(function (x) { return x.slug !== key; }).slice(0, 3);
      if (!others.length) return "";
      return '<div class="wrap"><div class="section-head"><div>' +
        '<p class="eyebrow">Keep reading</p><h2 id="related-title">More from the jobsite.</h2></div>' +
        '<div class="section-aside"><a class="link-arrow" href="jobsite.html">All posts</a></div></div>' +
        '<div class="post-grid">' + others.map(function (p) { return postCard(p, true); }).join("") + "</div></div>";
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
        el.innerHTML = '<img src="' + esc(src) + '" alt="' + esc(data.alt || "") + '" loading="lazy" decoding="async">';
        el.classList.add("has-photo");
      }
    });

    doc.querySelectorAll("[data-cms-list]").forEach(function (el) {
      var name = el.getAttribute("data-cms-list");
      if (postsOnly && !POST_LISTS[name]) return;
      var build = LISTS[name];
      var html = build && build(content);
      /*
        null keeps the static HTML. That is what leaves "Our blog is coming soon."
        in place when Pages CMS has not published a post yet.
        An empty string clears a list once posts have loaded.
      */
      if (html == null || typeof html !== "string") return;
      if (html || POST_LISTS[name]) el.innerHTML = html;
    });

    doc.dispatchEvent(new CustomEvent("cms:rendered", { detail: { postsOnly: !!postsOnly } }));
  }

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
      "<code>js/content.js</code>. Blog posts come from Pages CMS Markdown files in <code>content/posts</code>. " +
      "Until a post is published, the site keeps the “coming soon” message.</p>" +
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
    if (!hasPostLists()) return;
    loadPosts().then(function (posts) {
      render(merge(content, { posts: posts, blogState: "ready" }), true);
    }, function (err) {
      if (window.console) console.warn("Pages CMS blog posts could not be loaded.", err);
      render(merge(content, { posts: [], blogState: "error" }), true);
    });
  }).catch(function () { /* keep static fallback */ });

  if (/[?&]cms\b/.test(window.location.search)) {
    if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", showEditableAreas);
    else showEditableAreas();
  }
})();
