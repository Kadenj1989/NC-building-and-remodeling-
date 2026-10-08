/*
  Renders owner-managed content into the page.
    - Photos, hero slides and projects: js/content.js
    - Blog posts: Pages CMS Markdown files in content/posts

  Pages CMS (.pages.yml) saves each post as content/posts/<slug>.md with
  title, slug, date, category, featured_image, youtube, attachment, and body.
  Photos added inside the post are saved in the body, in the order and
  position the owner chose. The site draws each one in that same spot.
  category is one of: jobs, testimonials, general.
  youtube is a YouTube link. The video plays on the blog and is not stored in the repo.
  Images and files use the public path /content/uploads/.
  Posts and uploads are read from the latest commit on the public GitHub
  repository, not from the cached branch URL. GitHub's raw CDN keeps a
  branch URL stale for several minutes after a save, so an edited photo,
  file, video link, or paragraph would otherwise stay on the old version.
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
  var CONTENT_REF = GITHUB_BRANCH;
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

  /* Pages CMS quotes a slug that has a trailing space ("Testing ").
     unquote() leaves that space, and the article page trims the URL,
     so the card link and the lookup no longer match. */
  function cleanSlug(value) {
    return String(value == null ? "" : value).trim();
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

  /* Pages CMS posts live in the public GitHub repo. No token.
     CONTENT_REF starts as the branch name. Before posts load it becomes
     the latest commit SHA, so a save is not hidden by the branch CDN cache. */
  function isCommitSha(value) {
    return /^[0-9a-f]{40}$/i.test(String(value || ""));
  }

  function githubRefUrl() {
    return "https://api.github.com/repos/" +
      encodeURIComponent(GITHUB_OWNER) + "/" + encodeURIComponent(GITHUB_REPO) +
      "/git/ref/heads/" + GITHUB_BRANCH.split("/").map(encodeURIComponent).join("/");
  }

  function githubApi(path) {
    return "https://api.github.com/repos/" +
      encodeURIComponent(GITHUB_OWNER) + "/" + encodeURIComponent(GITHUB_REPO) +
      "/contents/" + path.split("/").map(encodeURIComponent).join("/") +
      "?ref=" + encodeURIComponent(CONTENT_REF);
  }

  /* Same-day posts share one frontmatter date. Commit time is the tiebreaker
     so the post just saved in Pages CMS is listed first. */
  function githubCommitsUrl() {
    return "https://api.github.com/repos/" +
      encodeURIComponent(GITHUB_OWNER) + "/" + encodeURIComponent(GITHUB_REPO) +
      "/commits?per_page=100&sha=" + encodeURIComponent(GITHUB_BRANCH) +
      "&path=" + POSTS_PATH.split("/").map(encodeURIComponent).join("/");
  }

  function resolveContentRef() {
    return fetchJson(githubRefUrl()).then(function (ref) {
      var sha = ref && ref.object && ref.object.sha;
      if (isCommitSha(sha)) CONTENT_REF = sha;
    }, function () {
      /* Keep the branch name. Posts still load the old way. */
    });
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
    /* download_url points at the branch raw URL, which stays cached.
       With a commit SHA, read that file at the commit instead. */
    if (isCommitSha(CONTENT_REF) && item && item.path) return fetchText(githubFileUrl(item.path));
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
    var featured = data.featured_image || data.image || data.cover || "";
    var inlineCover = featured ? null : firstMarkdownImage(body);
    return normalizePost({
      title: data.title || fallbackSlug,
      slug: cleanSlug(data.slug) || fallbackSlug,
      fileSlug: fallbackSlug,
      label: data.label || data.category || "",
      category: data.category || data.label || "",
      date: date,
      image: featured || (inlineCover ? inlineCover.src : ""),
      imageAlt: data.featured_image_alt || data.imageAlt || (inlineCover && inlineCover.alt) || data.title || "",
      youtubeUrl: data.youtube || data.youtubeUrl || "",
      video: data.video || "",
      attachment: data.attachment || "",
      excerpt: excerpt,
      seoTitle: data.seoTitle || data.seo_title || "",
      seoDescription: data.seoDescription || data.seo_description || data.description || "",
      markdown: body
    });
  }

  function commitTimes(commits) {
    var times = {};
    (Array.isArray(commits) ? commits : []).forEach(function (commit) {
      var meta = commit && commit.commit;
      var message = meta && meta.message || "";
      var stamp = meta && ((meta.committer && meta.committer.date) || (meta.author && meta.author.date));
      var when = Date.parse(stamp || "") || 0;
      var match = message.match(/content\/posts\/([^\s)]+)/i);
      if (!match || !when || times[match[1]]) return;
      times[match[1]] = when;
    });
    return times;
  }

  function fetchCommitTimes() {
    return fetchJson(githubCommitsUrl()).then(commitTimes, function () { return {}; });
  }

  function loadPosts() {
    return resolveContentRef().then(function () {
      return Promise.all([fetchJson(githubApi(POSTS_PATH)), fetchCommitTimes()]);
    }).then(function (parts) {
      var items = parts[0];
      var updated = parts[1] || {};
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
          var post = parseMarkdownFile(text, fallback);
          if (post) post.updated = updated[item.name] || 0;
          return post;
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

  var BLOG_CATEGORIES = [
    { id: "jobs", label: "Jobs/Projects" },
    { id: "testimonials", label: "Video Testimonials" },
    { id: "general", label: "General Information" }
  ];

  function blogCategory(value) {
    var raw = String(value || "").trim().toLowerCase().replace(/&/g, "and").replace(/[_/]+/g, " ").replace(/\s+/g, " ");
    var i;
    for (i = 0; i < BLOG_CATEGORIES.length; i++) {
      if (raw === BLOG_CATEGORIES[i].id || raw === BLOG_CATEGORIES[i].label.toLowerCase()) return BLOG_CATEGORIES[i];
    }
    if (raw === "jobs projects" || raw === "job projects" || raw === "jobs and projects") return BLOG_CATEGORIES[0];
    if (raw === "video testimonial" || raw === "testimonial" || raw === "testimonials") return BLOG_CATEGORIES[1];
    if (raw === "general info" || raw === "general information") return BLOG_CATEGORIES[2];
    return BLOG_CATEGORIES[2];
  }

  function postUrl(key) {
    return "article.html?post=" + encodeURIComponent(key);
  }

  function currentPostSlug() {
    var key = new URLSearchParams(window.location.search).get("post");
    if (key) return key.trim();
    var m = window.location.pathname.match(/\/blog\/([^\/]+)\/?$/);
    if (!m) return "";
    try { return cleanSlug(decodeURIComponent(m[1])); } catch (e) { return cleanSlug(m[1]); }
  }

  function normalizePost(p) {
    var fileSlug = cleanSlug(p.fileSlug);
    var key = cleanSlug(p.slug) || fileSlug || slug(p.title);
    var cat = blogCategory(p.category || p.label);
    return {
      slug: key,
      fileSlug: fileSlug,
      url: postUrl(key),
      title: p.title || "",
      updated: p.updated || 0,
      label: cat.label,
      category: cat.id,
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

  /* Prefer the frontmatter date. A missing or unparsed date uses the file's
     GitHub commit time so a just-saved post does not sink under older ones.
     The commit time also breaks ties when several posts share one date. */
  function rankTime(p) {
    return time(p) || p.updated || 0;
  }

  function newestFirst(list) {
    return (list || []).slice().sort(function (a, b) {
      var byPublished = rankTime(b) - rankTime(a);
      if (byPublished) return byPublished;
      return (b.updated || 0) - (a.updated || 0);
    });
  }

  function arrangePosts(list) {
    var sorted = newestFirst(list);
    return { featured: sorted[0] || null, rest: sorted.slice(1), all: sorted };
  }

  function githubFileUrl(path) {
    var parts = String(path || "").replace(/[?#].*$/, "").replace(/^\/+/, "").split("/").filter(Boolean).map(function (segment) {
      var decoded = segment;
      try { decoded = decodeURIComponent(segment); } catch (e) { decoded = segment; }
      return encodeURIComponent(decoded);
    });
    return "https://raw.githubusercontent.com/" +
      encodeURIComponent(GITHUB_OWNER) + "/" +
      encodeURIComponent(GITHUB_REPO) + "/" +
      encodeURIComponent(CONTENT_REF) + "/" +
      parts.join("/");
  }

  /* Pages CMS stores uploads as /content/uploads/....
     The same commit used for the post text is placed in the file URL.
     A new save changes that commit, so the browser cannot keep the previous
     photo, video, or attachment. An empty path renders nothing. */
  function imageSrc(src) {
    src = String(src || "").trim();
    if (!src) return "";
    var raw = src.match(/^(https?:)?\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/[^/]+\/([^?#]*)/i);
    if (raw) {
      var owner = raw[2];
      var repo = raw[3];
      try { owner = decodeURIComponent(owner); } catch (e1) {}
      try { repo = decodeURIComponent(repo); } catch (e2) {}
      if (owner === GITHUB_OWNER && repo === GITHUB_REPO) return githubFileUrl(raw[4]);
    }
    if (/^(https?:)?\/\//i.test(src)) return src;
    var path = src.charAt(0) === "/" ? src.slice(1) : src;
    if (/^content\/uploads\//i.test(path)) return githubFileUrl(path);
    return path;
  }

  function postImg(p, w, h, alt, eager, slot) {
    var src = imageSrc(p.image);
    if (!src) return "";
    return '<img src="' + esc(src) + '" alt="' + esc(alt || "") + '" width="' + w + '" height="' + h + '"' +
      ' data-fit="' + esc(slot || "card") + '" crossorigin="anonymous"' +
      (eager ? ' fetchpriority="high"' : ' loading="lazy" decoding="async"') + ">";
  }

  function postMedia(cls, p, w, h) {
    var slot = String(cls).indexOf("blog-feature") >= 0 ? "feature" : "card";
    var pic = postImg(p, w, h, p.imageAlt || "", false, slot);
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

  function postCard(p, compact, actionLabel) {
    var url = esc(p.url);
    var yt = youtubeId(p.youtubeUrl) || youtubeId(p.video);
    var action = actionLabel || ((yt || p.category === "testimonials") ? "Watch" : "Read more");
    var media = yt
      ? videoFigure(yt, p.title, imageSrc(p.image), "card")
      : postMedia("post-media", p, 900, 600);
    return '<article class="post" data-cat="' + esc(p.category || "general") + '">' +
      media +
      postMeta(p) +
      '<h3><a href="' + url + '">' + esc(p.title) + "</a></h3>" +
      "<p>" + esc(p.excerpt) + "</p>" +
      (compact ? "" : '<a class="link-arrow" href="' + url + '">' + action + '<span class="sr-only">: ' + esc(p.title) + "</span></a>") +
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
    var yt = youtubeId(p.youtubeUrl) || youtubeId(p.video);
    var action = yt || p.category === "testimonials" ? "Watch the video" : "Read the story";
    var media = yt
      ? videoFigure(yt, p.title, imageSrc(p.image), "card")
      : postMedia("blog-feature-media", p, 1280, 640);
    return media +
      '<div class="blog-feature-body">' + postMeta(p) +
      '<h3><a href="' + url + '">' + esc(p.title) + "</a></h3>" +
      "<p>" + esc(p.excerpt) + "</p>" +
      '<a class="link-arrow" href="' + url + '">' + action + "</a></div>";
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

  function videoFigure(id, title, poster, layout) {
    if (!id) return "";
    var t = title || "Watch the video";
    var src = poster || "https://i.ytimg.com/vi/" + encodeURIComponent(id) + "/hqdefault.jpg";
    var cls = layout === "card" ? "video" : "video wide";
    return '<figure class="' + cls + '" data-video data-youtube-id="' + esc(id) + '" data-title="' + esc(t) + '">' +
      '<img data-fit="feature" crossorigin="anonymous" src="' + esc(src) + '" alt="" width="1024" height="576" loading="lazy" decoding="async">' +
      '<button class="video-play" type="button" aria-label="Play video: ' + esc(t) + '">' +
      '<span class="video-play-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12-7.5z" fill="currentColor"/></svg></span>' +
      "</button>" +
      (layout === "card" ? "" : '<figcaption class="video-label">' + esc(t) + "</figcaption>") +
      "</figure>";
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

  function htmlAttr(tag, name) {
    var m = String(tag || "").match(new RegExp("\\b" + name + "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s\"'=<>`]+))", "i"));
    if (!m) return "";
    return (m[1] != null ? m[1] : (m[2] != null ? m[2] : m[3] || ""))
      .replace(/&amp;/g, "&").replace(/&quot;/g, "\"").replace(/&#39;/g, "'");
  }

  function imageTarget(raw) {
    var t = String(raw || "").trim();
    var title = "";
    var quoted = t.match(/^(.*?)(?:\s+"([^"]*)"|\s+'([^']*)')\s*$/);
    if (quoted && quoted[1].trim()) {
      t = quoted[1].trim();
      title = quoted[2] || quoted[3] || "";
    }
    if (t.charAt(0) === "<" && t.charAt(t.length - 1) === ">") t = t.slice(1, -1).trim();
    return { url: t, title: title };
  }

  /* Markdown images and <img> tags, in the order they were placed in the post. */
  function findPostImages(text) {
    var s = String(text || "");
    var found = [];
    var re = /!\[([^\]]*)\]\(([^)]+)\)|<img\b([^>]*?)\/?>/gi;
    var m;
    while ((m = re.exec(s))) {
      if (m[3] != null) {
        found.push({
          index: m.index,
          length: m[0].length,
          alt: htmlAttr(m[3], "alt"),
          src: htmlAttr(m[3], "src"),
          title: htmlAttr(m[3], "title")
        });
      } else {
        var target = imageTarget(m[2]);
        found.push({
          index: m.index,
          length: m[0].length,
          alt: m[1],
          src: target.url,
          title: target.title
        });
      }
    }
    return found;
  }

  function imageFigure(src, alt, title) {
    src = safeHref(src);
    if (!src) return "";
    var caption = String(title || "").trim();
    return '<figure class="wide"><img data-fit="inline" crossorigin="anonymous" src="' + esc(imageSrc(src)) + '" alt="' + esc(alt || "") +
      '" loading="lazy" decoding="async">' +
      (caption ? "<figcaption>" + esc(caption) + "</figcaption>" : "") +
      "</figure>";
  }

  function firstMarkdownImage(markdown) {
    var images = findPostImages(markdown);
    var i, src;
    for (i = 0; i < images.length; i++) {
      src = safeHref(images[i].src);
      if (src) return { alt: images[i].alt, src: src };
    }
    return null;
  }

  function markdownHasImages(markdown) {
    return !!firstMarkdownImage(markdown);
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
    function placeImages(text) {
      var images = findPostImages(text);
      if (!images.length) return false;
      var cursor = 0;
      images.forEach(function (image) {
        var before = text.slice(cursor, image.index).replace(/<\/?p>/gi, " ").trim();
        if (before) out.push("<p>" + inlineMarkdown(before) + "</p>");
        var figure = imageFigure(image.src, image.alt, image.title);
        if (figure) out.push(figure);
        cursor = image.index + image.length;
      });
      var after = text.slice(cursor).replace(/<\/?p>/gi, " ").trim();
      if (after) out.push("<p>" + inlineMarkdown(after) + "</p>");
      return true;
    }
    lines.forEach(function (line) {
      var t = line.trim().replace(/^<p>|<\/p>$/gi, "").trim();
      if (!t) {
        closeParagraph();
        closeList();
        return;
      }
      if (findPostImages(t).length) {
        closeParagraph();
        closeList();
        placeImages(t);
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
    var hero = markdownHasImages(p.markdown) ? "" : postImg(p, 1600, 900, p.imageAlt, true, "hero");
    var yt = youtubeId(p.youtubeUrl) || youtubeId(p.video);
    var attachment = safeHref(p.attachment);
    var player = yt ? videoFigure(yt, p.title, imageSrc(p.image)) : "";
    return '<header class="article-head tone-light"><div class="wrap">' +
      '<ol class="crumbs on-light"><li><a href="index.html">Home</a></li><li><a href="jobsite.html">Resources</a></li><li>' + esc(p.title) + "</li></ol>" +
      (p.label ? '<p class="eyebrow">' + esc(p.label) + "</p>" : "") +
      "<h1>" + esc(p.title) + "</h1>" +
      '<p class="article-meta"><span>By <strong>' + esc(author) + "</strong></span>" +
      (date ? '<span><time datetime="' + esc(p.date) + '">' + date + "</time></span>" : "") +
      "</p></div></header>" +
      (player ? '<div class="wrap article-video">' + player + "</div>" : (hero ? '<figure class="article-hero">' + hero + "</figure>" : "")) +
      '<div class="prose">' + markdownToHtml(p.markdown) +
      (player ? "" : fileVideo(p.video, p.title)) +
      (attachment ? '<p><a class="btn btn-outline" href="' + esc(imageSrc(attachment)) + '" target="_blank" rel="noopener">View attached file</a></p>' : "") +
      "</div>" +
      '<aside class="article-cta"><div class="cta-panel"><div>' +
      '<p class="eyebrow">Start your project</p><h2>Planning something similar?</h2>' +
      "<p>Tell us about your project and send us photos through our project request system.</p></div>" +
      '<a class="btn btn-primary" href="#jobber-request" data-link="jobber">Start Your Request</a></div></aside>';
  }

  function findPost(c, key) {
    var list = c.posts || [];
    var want = cleanSlug(key);
    if (!want) return null;
    var i, p, file;
    for (i = 0; i < list.length; i++) {
      if (list[i].slug === want) return list[i];
    }
    var lower = want.toLowerCase();
    var normalized = slug(want);
    for (i = 0; i < list.length; i++) {
      p = list[i];
      file = cleanSlug(p.fileSlug);
      if (String(p.slug).toLowerCase() === lower || file === want || file.toLowerCase() === lower) return p;
      if (normalized && (slug(p.slug) === normalized || slug(file) === normalized)) return p;
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
      var all = arrangePosts(posts).all;
      if (!all.length) return null;
      if (all.length === 1) {
        return '<div class="blog-feature reveal is-visible">' + blogFeature(all[0]) + "</div>";
      }
      var shown = all.slice(0, 3);
      return '<div class="post-grid home-posts' + (shown.length === 2 ? " is-two" : "") + '">' +
        shown.map(function (p) {
          var video = youtubeId(p.youtubeUrl) || youtubeId(p.video) || p.category === "testimonials";
          return postCard(p, false, video ? "Watch the video" : "Read the story");
        }).join("") + "</div>";
    },
    resourcesBlog: function (c) {
      var posts = readyPosts(c);
      if (!posts || !posts.length) return null;
      return '<div class="post-grid">' + arrangePosts(posts).all.map(function (p) { return postCard(p); }).join("") + "</div>";
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
    fitBlogImages();
  }

  /* Fit uploaded photos to the blog frame. Large files are reduced with
     high-quality smoothing. Small files are left alone so they are not stretched. */
  var FIT_BOX = {
    hero: [920, 520],
    feature: [960, 540],
    card: [640, 427],
    inline: [720, 480]
  };

  function fitBlogImages() {
    doc.querySelectorAll("img[data-fit]").forEach(fitBlogImage);
  }

  function fitBlogImage(img) {
    if (img.getAttribute("data-fit-done")) return;
    var run = function () {
      if (img.getAttribute("data-fit-done")) return;
      var nw = img.naturalWidth;
      var nh = img.naturalHeight;
      if (!nw || !nh) return;
      if (/\.gif($|\?)/i.test(img.currentSrc || img.src || "")) {
        img.setAttribute("data-fit-done", "gif");
        return;
      }
      var box = FIT_BOX[img.getAttribute("data-fit")] || FIT_BOX.card;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var scale = Math.min((box[0] * dpr) / nw, (box[1] * dpr) / nh, 1);
      if (nw < box[0] * 0.9 && nh < box[1] * 0.9) img.classList.add("is-small");
      if (scale > 0.97) {
        img.setAttribute("data-fit-done", "native");
        return;
      }
      var w = Math.max(1, Math.round(nw * scale));
      var h = Math.max(1, Math.round(nh * scale));
      try {
        var canvas = doc.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, w, h);
        img.setAttribute("data-fit-done", "resampling");
        var mime = /\.png($|\?)/i.test(img.currentSrc || "") ? "image/png" : "image/jpeg";
        canvas.toBlob(function (blob) {
          if (!blob) {
            img.setAttribute("data-fit-done", "css");
            return;
          }
          img.src = URL.createObjectURL(blob);
          img.setAttribute("data-fit-done", "done");
        }, mime, mime === "image/jpeg" ? 0.86 : undefined);
      } catch (err) {
        img.setAttribute("data-fit-done", "css");
      }
    };
    if (img.complete && img.naturalWidth) run();
    else img.addEventListener("load", run);
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
