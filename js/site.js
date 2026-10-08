(function () {
  var doc = document;
  var config = window.SITE_CONFIG || {};
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Mobile menu ---------------------------------------------------------- */
  var toggle = doc.querySelector(".nav-toggle");
  var nav = doc.querySelector(".site-nav");

  function setMenu(open) {
    if (!toggle || !nav) return;
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    doc.body.classList.toggle("nav-open", open);
  }

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      setMenu(!nav.classList.contains("is-open"));
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });
    var desktop = window.matchMedia("(min-width: 981px)");
    var onDesktop = function (mq) {
      if (mq.matches) setMenu(false);
    };
    if (desktop.addEventListener) desktop.addEventListener("change", onDesktop);
  }

  /* Hero slideshow ------------------------------------------------------- */
  var heroSlides = doc.querySelectorAll("[data-hero-slides] .hero-slide");
  if (heroSlides.length > 1 && !reduceMotion) {
    var heroIndex = 0;
    var heroTimer = null;
    var nextHeroSlide = function () {
      var next = (heroIndex + 1) % heroSlides.length;
      if (!heroSlides[next].complete) return;
      heroSlides[heroIndex].classList.remove("is-active");
      heroSlides[next].classList.add("is-active");
      heroIndex = next;
    };
    var startHero = function () {
      if (!heroTimer) heroTimer = window.setInterval(nextHeroSlide, 6000);
    };
    var stopHero = function () {
      window.clearInterval(heroTimer);
      heroTimer = null;
    };
    doc.addEventListener("visibilitychange", function () {
      if (doc.hidden) stopHero();
      else startHero();
    });
    startHero();
  }

  /* Explore dropdown ----------------------------------------------------- */
  doc.querySelectorAll(".nav-drop").forEach(function (drop) {
    var btn = drop.querySelector(".nav-drop-toggle");
    if (!btn) return;
    function set(open) {
      drop.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    }
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      set(!drop.classList.contains("is-open"));
    });
    doc.addEventListener("click", function (e) {
      if (!drop.contains(e.target)) set(false);
    });
    drop.addEventListener("focusout", function (e) {
      if (window.innerWidth > 980 && !drop.contains(e.relatedTarget)) set(false);
    });
  });

  doc.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    doc.querySelectorAll(".nav-drop.is-open").forEach(function (drop) {
      var btn = drop.querySelector(".nav-drop-toggle");
      drop.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
      btn.focus();
    });
    if (nav && nav.classList.contains("is-open")) {
      setMenu(false);
      toggle.focus();
    }
  });

  /* See more toggles ----------------------------------------------------- */
  doc.querySelectorAll("[data-more-toggle]").forEach(function (btn) {
    var panel = doc.getElementById(btn.getAttribute("aria-controls"));
    if (!panel) return;
    function set(open) {
      panel.hidden = !open;
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.textContent = open ? "See less" : "See more";
    }
    set(false);
    btn.hidden = false;
    btn.addEventListener("click", function () {
      set(panel.hidden);
    });
  });

  /* Placeholder notice --------------------------------------------------- */
  var dialog;
  function showNotice(title, text) {
    if (!dialog) {
      dialog = doc.createElement("dialog");
      dialog.className = "notice-dialog";
      dialog.setAttribute("aria-labelledby", "notice-title");
      dialog.innerHTML =
        '<div class="notice-inner"><p class="eyebrow">Coming soon</p>' +
        '<h2 id="notice-title"></h2><p class="notice-text"></p>' +
        '<form method="dialog"><button class="btn btn-dark" type="submit">Close</button></form></div>';
      doc.body.appendChild(dialog);
      dialog.addEventListener("click", function (e) {
        if (e.target === dialog) dialog.close();
      });
    }
    dialog.querySelector("h2").textContent = title;
    dialog.querySelector(".notice-text").textContent = text;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else window.alert(text);
  }

  /* Links from config ---------------------------------------------------- */
  var LINKS = {
    jobber: {
      url: config.JOBBER_REQUEST_URL,
      title: "Request a quote through Jobber",
      text: "Quote requests are handled through Jobber, the system we use to manage projects. This button will open our Jobber request form, where you describe the job, upload photos and send it straight to us. The link goes live as soon as the Jobber URL is added."
    },
    studio: {
      url: config.CMS_STUDIO_URL,
      title: "Owner login",
      text: "This opens Pages CMS, where the owner writes and publishes blog posts."
    },
    google: {
      url: config.GOOGLE_REVIEWS_URL,
      title: "Google reviews",
      text: "This will open our Google Business Profile so you can read reviews from customers."
    },
    facebook: { url: config.FACEBOOK_URL, title: "Facebook", text: "Our Facebook page link will be added here." },
    nextdoor: { url: config.NEXTDOOR_URL, title: "Nextdoor", text: "Our Nextdoor business page link will be added here." },
    youtube: { url: config.YOUTUBE_URL, title: "YouTube", text: "Our YouTube channel is in development. This link will go live once the channel is updated." },
    jobberProfile: { url: config.JOBBER_PROFILE_URL, title: "Jobber", text: "Our Jobber profile link will be added here." }
  };

  function bindLinks() {
    doc.querySelectorAll("[data-link]").forEach(function (a) {
      var key = a.getAttribute("data-link");
      var link = LINKS[key];
      if (!link || a.hasAttribute("data-link-bound")) return;
      a.setAttribute("data-link-bound", "");
      if (link.url) {
        a.href = link.url;
        if (key !== "jobber" && /^https?:/i.test(link.url)) {
          a.target = "_blank";
          a.rel = "noopener";
        }
        return;
      }
      a.addEventListener("click", function (e) {
        e.preventDefault();
        showNotice(link.title, link.text);
      });
    });
  }
  bindLinks();
  doc.addEventListener("cms:rendered", bindLinks);

  /* Phone / email -------------------------------------------------------- */
  doc.querySelectorAll("[data-contact]").forEach(function (el) {
    var type = el.getAttribute("data-contact");
    var value = type === "phone" ? config.PHONE : config.EMAIL;
    if (!value) return;
    var a = doc.createElement("a");
    a.href = type === "phone" ? "tel:" + value.replace(/[^\d+]/g, "") : "mailto:" + value;
    var at = type === "email" ? value.indexOf("@") : -1;
    if (at > 0) a.append(value.slice(0, at), doc.createElement("wbr"), value.slice(at));
    else a.textContent = value;
    el.textContent = "";
    el.classList.remove("pending");
    el.appendChild(a);
  });

  doc.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* Filters (projects, resources) ---------------------------------------- */
  doc.querySelectorAll("[data-filters]").forEach(function (bar) {
    var list = doc.getElementById(bar.getAttribute("data-filters"));
    if (!list) return;
    var empty = doc.querySelector('[data-filter-empty="' + list.id + '"]');
    var param = bar.getAttribute("data-filter-param");
    var applyFilter = function (filter) {
      var shown = 0;
      list.querySelectorAll("[data-cat]").forEach(function (item) {
        var cats = item.getAttribute("data-cat").split(" ");
        var match = filter === "all" || cats.indexOf(filter) > -1;
        item.classList.toggle("is-hidden", !match);
        if (match) shown++;
      });
      if (empty) empty.hidden = shown > 0 || filter === "all";
    };
    var choose = function (filter, updateUrl) {
      var match = null;
      bar.querySelectorAll("[data-filter]").forEach(function (c) {
        var on = c.getAttribute("data-filter") === filter;
        if (on) match = c;
        c.classList.toggle("is-on", on);
        c.setAttribute("aria-pressed", on ? "true" : "false");
      });
      if (!match) return;
      applyFilter(filter);
      if (updateUrl && param && window.history && window.history.replaceState) {
        var url = new URL(window.location.href);
        if (filter === "all") url.searchParams.delete(param);
        else url.searchParams.set(param, filter);
        window.history.replaceState(null, "", url.pathname + url.search + url.hash);
      }
    };
    bar.addEventListener("click", function (e) {
      var chip = e.target.closest("[data-filter]");
      if (!chip || !bar.contains(chip)) return;
      choose(chip.getAttribute("data-filter"), true);
    });
    /* posts can arrive after load — keep the chosen topic applied */
    doc.addEventListener("cms:rendered", function () {
      var on = bar.querySelector("[data-filter].is-on");
      if (on) applyFilter(on.getAttribute("data-filter"));
    });
    if (param) {
      var requested = new URLSearchParams(window.location.search).get(param);
      if (requested) choose(requested, false);
    }
  });

  /* YouTube embeds — load the player only when someone presses play ----- */
  function bindVideos() {
    doc.querySelectorAll("[data-video]").forEach(bindVideo);
  }
  function bindVideo(box) {
    if (box.hasAttribute("data-video-bound")) return;
    box.setAttribute("data-video-bound", "");
    var id = (box.getAttribute("data-youtube-id") || "").trim();
    var btn = box.querySelector(".video-play");
    if (!btn) return;
    if (!id) {
      btn.addEventListener("click", function () {
        showNotice("Video coming soon", "This spot is ready for a YouTube video. Once the video is posted, it plays right here on the page.");
      });
      return;
    }
    var label = box.querySelector(".video-label");
    if (label) label.textContent = box.getAttribute("data-title") || "Watch the video";
    btn.addEventListener("click", function () {
      var frame = doc.createElement("iframe");
      frame.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(id) + "?autoplay=1&rel=0";
      frame.title = box.getAttribute("data-title") || "Video";
      frame.allow = "autoplay; accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      frame.referrerPolicy = "strict-origin-when-cross-origin";
      frame.allowFullscreen = true;
      box.appendChild(frame);
      btn.remove();
    });
  }
  bindVideos();
  doc.addEventListener("cms:rendered", bindVideos);

  /* Services jump rail --------------------------------------------------- */
  var jumpLinks = doc.querySelectorAll(".jump a");
  if (jumpLinks.length && "IntersectionObserver" in window) {
    var byId = {};
    jumpLinks.forEach(function (a) {
      byId[a.getAttribute("href").slice(1)] = a;
    });
    var jumpObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        jumpLinks.forEach(function (a) {
          a.classList.toggle("is-on", a === byId[entry.target.id]);
        });
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    Object.keys(byId).forEach(function (id) {
      var section = doc.getElementById(id);
      if (section) jumpObserver.observe(section);
    });
  }

  /* Reveal on scroll ----------------------------------------------------- */
  var reveals = doc.querySelectorAll(".reveal");
  if (!reduceMotion && "IntersectionObserver" in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
    reveals.forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    reveals.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  /* Mobile sticky CTA — hidden near the top and wherever a CTA is already on screen */
  var mobileCta = doc.querySelector(".mobile-cta");
  if (mobileCta) {
    var covering = 0;
    var updateCta = function () {
      mobileCta.classList.toggle("is-visible", window.scrollY > 520 && covering === 0);
    };
    if ("IntersectionObserver" in window) {
      var ctaObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var was = entry.target._ctaIn || false;
          if (entry.isIntersecting !== was) {
            covering += entry.isIntersecting ? 1 : -1;
            entry.target._ctaIn = entry.isIntersecting;
          }
        });
        updateCta();
      });
      doc.querySelectorAll(".site-footer, .jobber, .final-cta, .contact-quote, .contact-quick, .partner-form-section").forEach(function (el) {
        ctaObserver.observe(el);
      });
    }
    window.addEventListener("scroll", updateCta, { passive: true });
    updateCta();
  }

  /* Partner inquiry form (partner-with-us.html) --------------------------
     Posts JSON to config.PARTNER_FORM_URL. While that is empty nothing is
     sent: the visitor's answers stay on screen and they're asked to email. */
  var partnerForm = doc.querySelector("#partner-inquiry");
  if (partnerForm) {
    var TRADE = "Subcontractor / Trade";
    var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    var pfUrl = String(config.PARTNER_FORM_URL || "").trim();
    var pfConnected = /^https:\/\/\S+$/i.test(pfUrl);
    var pfEls = partnerForm.elements;
    var pfType = pfEls.partnership_type;
    var pfTradeField = doc.querySelector("#pf-trade-field");
    var pfNote = doc.querySelector("#partner-form-note");
    var pfSubmit = partnerForm.querySelector('[type="submit"]');
    var pfSubmitText = pfSubmit.textContent;
    var pfSending = false;

    if (pfUrl && !pfConnected) {
      console.warn("PARTNER_FORM_URL must start with https:// — the partner form will not send until it does.");
    }

    var syncTrade = function () {
      var show = pfType.value === TRADE;
      pfTradeField.hidden = !show;
      pfEls.trade_specialty.disabled = !show;
      pfType.closest(".field").classList.toggle("full", !show);
    };
    pfType.addEventListener("change", syncTrade);
    window.addEventListener("pageshow", syncTrade);
    syncTrade();

    var rules = {
      name: function (v) {
        return v ? "" : "Please enter your name.";
      },
      email: function (v) {
        if (!v) return "Please enter your email address.";
        return EMAIL_RE.test(v) ? "" : "Please enter a valid email address, like name@company.com.";
      },
      partnership_type: function (v) {
        return v ? "" : "Please choose a partnership type.";
      },
      website: function (v, input) {
        return !v || input.validity.valid ? "" : "Please enter a full web address, like https://yourcompany.com.";
      }
    };

    var normalizeWebsite = function () {
      var site = pfEls.website.value.trim();
      if (site && !/^[a-z][a-z\d+.-]*:\/\//i.test(site)) site = "https://" + site;
      pfEls.website.value = site;
    };

    var checkField = function (input) {
      var rule = rules[input.name];
      if (!rule) return true;
      var message = rule(input.value.trim(), input);
      var error = doc.getElementById(input.id + "-error");
      if (message) input.setAttribute("aria-invalid", "true");
      else input.removeAttribute("aria-invalid");
      if (error) {
        error.textContent = message;
        error.hidden = !message;
      }
      return !message;
    };

    Object.keys(rules).forEach(function (name) {
      var input = pfEls[name];
      var recheck = function () {
        if (input.getAttribute("aria-invalid") === "true") checkField(input);
      };
      input.addEventListener("input", recheck);
      input.addEventListener("change", recheck);
    });
    pfEls.website.addEventListener("blur", function () {
      normalizeWebsite();
      if (pfEls.website.getAttribute("aria-invalid") === "true") checkField(pfEls.website);
    });

    var collect = function () {
      var data = {
        name: pfEls.name.value.trim(),
        company: pfEls.company.value.trim(),
        email: pfEls.email.value.trim(),
        phone: pfEls.phone.value.trim(),
        website: pfEls.website.value.trim(),
        partnership_type: pfType.value
      };
      if (data.partnership_type === TRADE) data.trade_specialty = pfEls.trade_specialty.value.trim();
      data.service_area = pfEls.service_area.value.trim();
      data.message = pfEls.message.value.trim();
      return data;
    };

    var LABELS = {
      name: "Name",
      company: "Company",
      email: "Email",
      phone: "Phone",
      website: "Website / Portfolio",
      partnership_type: "Partnership type",
      trade_specialty: "Trade / Specialty",
      service_area: "Service area",
      message: "About the company / partnership"
    };

    var emailLink = function (data) {
      var a = doc.createElement("a");
      a.textContent = config.EMAIL;
      a.href = "mailto:" + config.EMAIL;
      if (data) {
        var body = Object.keys(data)
          .filter(function (key) { return data[key]; })
          .map(function (key) { return LABELS[key] + ": " + data[key]; })
          .join("\r\n");
        a.href += "?subject=" + encodeURIComponent("Partnership inquiry") + "&body=" + encodeURIComponent(body);
      }
      return a;
    };

    var officeContact = function (data) {
      if (config.EMAIL) return ["email them to ", emailLink(data)];
      if (config.PHONE) return ["call the office at " + config.PHONE];
      return ["contact the office"];
    };

    var showNote = function (state, parts, focus) {
      pfNote.textContent = "";
      pfNote.setAttribute("data-state", state);
      parts.forEach(function (part) {
        pfNote.appendChild(typeof part === "string" ? doc.createTextNode(part) : part);
      });
      pfNote.hidden = false;
      if (focus) pfNote.focus();
    };

    var setSending = function (on) {
      pfSending = on;
      pfSubmit.disabled = on;
      pfSubmit.textContent = on ? "Sending…" : pfSubmitText;
      partnerForm.setAttribute("aria-busy", on ? "true" : "false");
    };

    partnerForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (pfSending) return;

      normalizeWebsite();
      var invalid = Object.keys(rules)
        .map(function (name) { return pfEls[name]; })
        .filter(function (input) { return !checkField(input); });
      if (invalid.length) {
        showNote("error", ["Please fix the highlighted " + (invalid.length > 1 ? "fields" : "field") + ". Nothing has been sent yet."]);
        invalid[0].focus();
        return;
      }

      var data = collect();

      if (pfEls._gotcha.value) {
        showNote("error", ["Sorry, your inquiry couldn’t be sent. Please "].concat(officeContact(data), ["."]), true);
        return;
      }

      if (!pfConnected) {
        showNote("info", [
          "This form isn’t connected to email yet, so your inquiry has not been sent. Your answers are still filled in above. To reach us now, please "
        ].concat(officeContact(data), [" (the link opens an email with your answers filled in)."]), true);
        return;
      }

      setSending(true);
      pfNote.hidden = true;
      var payload = {};
      Object.keys(data).forEach(function (key) {
        payload[key] = data[key];
      });
      payload._subject = "Partnership inquiry: " + data.name + (data.company ? " (" + data.company + ")" : "");

      var controller = "AbortController" in window ? new AbortController() : null;
      var timer = controller ? window.setTimeout(function () { controller.abort(); }, 20000) : null;

      fetch(pfUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
        signal: controller ? controller.signal : undefined
      })
        .then(function (res) {
          if (!res.ok) throw new Error("Partner form request failed: " + res.status);
          partnerForm.reset();
          syncTrade();
          showNote("success", ["Thanks, your partnership inquiry was sent. We’ll be in touch if there’s a potential fit."], true);
        })
        .catch(function () {
          showNote("error", [
            "Sorry, something went wrong and your inquiry was not sent. Your answers are still filled in above. Please try again, or "
          ].concat(officeContact(data), ["."]), true);
        })
        .then(function () {
          window.clearTimeout(timer);
          setSending(false);
        });
    });
  }
})();
