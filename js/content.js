/*
  ==========================================================================
  OWNER-MANAGED CONTENT
  ==========================================================================
  Photos and projects live in this file.

  Blog posts come from Sanity Studio once SANITY_PROJECT_ID is set in
  js/config.js. Until then, the sample posts at the bottom of this file
  fill the blog so the pages still look right. With Sanity connected,
  these sample posts are ignored.

  On the pages, every spot filled from this file is marked with
  data-cms-img="..." (single image) or data-cms-list="..." (a list).
  Open any page with ?cms at the end of the URL (e.g. index.html?cms)
  to see those areas outlined and labeled.

  Items marked sample: true are demo placeholders. Replace or remove them.
*/
window.SITE_CONTENT = {
  /* Homepage hero slideshow: photos rotate in this order (first one loads first).
     brightness: optional per-photo boost (1 = unchanged, default 1.3). Raise it for dark photos. */
  hero: {
    images: [
      { image: "img/hero/hero-framing.jpg", alt: "Crew framing a two-story house at sunset" },
      { image: "img/hero/hero-brick-ranch-dusk.jpg", alt: "Single-story brick house with a covered front porch and its porch lights on at dusk", brightness: 1.1 },
      { image: "img/hero/hero-kitchen-bright.jpg", alt: "Finished kitchen with dark cabinets and an island", brightness: 1.2 },
      { image: "img/hero/hero-bath-bright.jpg", alt: "Finished bathroom with dark tile and a glass shower", brightness: 1.1 },
      { image: "img/hero/hero-porch-steps.jpg", alt: "Wooden front porch steps with white railings leading up to a white-sided house", brightness: 1 }
    ]
  },

  services: {
    remodeling: { image: "img/hero/hero-bath-work.jpg", alt: "Tile being set during a bathroom remodel" },
    roofing: { image: "img/hero/hero-home-finished.jpg", alt: "Two-story home with a dark shingle roof at dusk" },
    repairs: { image: "img/hero/hero-outdoor-work.jpg", alt: "Carpenter replacing deck boards on a covered porch" },
    painting: { image: "img/hero/hero-commercial.jpg", alt: "Finished interior with a brick wall, reception desk, and glass-walled conference room" },
    exteriorCleaning: { image: "img/services/exterior-cleaning.jpg", alt: "Pressure washer spraying a concrete walkway, half cleaned, in front of a gray-sided porch" }
  },

  owner: {
    name: "James",
    photo: "img/team/james.jpg",   // leave empty to show the "photo coming soon" placeholder
    alt: "James, owner of North Carolina Building and Remodeling"
  },

  closingImage: {
    image: "img/nc/nc-build-mountains.jpg",
    alt: "Wood-framed house under construction on a forested mountainside at sunset, with a North Carolina flag"
  },

  aboutClosingImage: {
    image: "img/nc/nc-porch-flag.jpg",
    alt: "Covered front porch with rocking chairs, a hanging fern, and a North Carolina flag"
  },

  /* Each project gets its own page: project.html?p=<slug>
     image  = cover photo (cards + top of the project page)
     before / after = optional before-and-after pair
     photos = the project gallery
     focus  = optional crop position for any photo, e.g. "50% 40%" (left-right, top-bottom) */
  projects: [
    {
      slug: "fireplace-remodel",
      title: "Fireplace remodel",
      service: "Remodeling",
      summary: "Before and after photos from this project.",
      image: "img/projects/fireplace-remodel/after-1.jpg",
      alt: "White brick fireplace with a wood mantel between built-in shelves",
      featured: true,
      before: { image: "img/projects/fireplace-remodel/before-1.jpg", alt: "Red brick fireplace in an empty room with a bare floor" },
      after: { image: "img/projects/fireplace-remodel/after-1.jpg", alt: "White brick fireplace with a wood mantel, built-in shelves and cabinets, and carpet" },
      photos: [
        { image: "img/projects/fireplace-remodel/after-1.jpg", alt: "Living room with the finished fireplace wall and built-ins" }
      ]
    },
    {
      slug: "kitchen-remodel",
      title: "Kitchen remodel",
      service: "Remodeling",
      summary: "Before and after photos from this project.",
      image: "img/projects/kitchen-remodel/after-1.jpg",
      alt: "Kitchen corner with gray-blue cabinets, stone counters and a tile backsplash",
      darkPhoto: true,
      featured: true,
      before: { image: "img/projects/kitchen-remodel/before-1.jpg", alt: "Kitchen with open wood cabinet boxes, patched walls and a bare floor", darkPhoto: true },
      after: { image: "img/projects/kitchen-remodel/after-1.jpg", alt: "Gray-blue cabinets, stone counters, a white tile backsplash and a sink under the window", darkPhoto: true },
      photos: [
        { image: "img/projects/kitchen-remodel/after-1.jpg", alt: "Finished kitchen corner with new cabinets and counters", darkPhoto: true }
      ]
    },
    {
      slug: "pressure-washing",
      title: "Pressure washing",
      service: "Repairs",
      summary: "Before and after photos of a front walkway and a set of brick steps.",
      image: "img/projects/pressure-washing/after-1.jpg",
      alt: "Clean light concrete walkway after pressure washing, leading to brick steps and a white house with a teal front door",
      focus: "50% 40%",
      before: { image: "img/projects/pressure-washing/before-1.jpg", alt: "Stained gray concrete walkway between hedges, leading to brick steps, before pressure washing", focus: "50% 10%" },
      after: { image: "img/projects/pressure-washing/after-1.jpg", alt: "The same walkway after pressure washing: clean light concrete leading to brick steps and a teal front door", focus: "50% 40%" },
      photos: [
        { image: "img/projects/pressure-steps.jpg", alt: "Brick steps with a white rail and a stamped concrete patio, stained on the left before pressure washing and clean on the right after" }
      ]
    },
    {
      slug: "door-install",
      title: "Door install",
      service: "Repairs",
      summary: "Before and after photos from this project.",
      image: "img/projects/door-install/after-1.jpg",
      alt: "White door with a large divided glass window in a sided entry",
      featured: true,
      before: { image: "img/projects/door-install/before-1.jpg", alt: "Worn dark door with a pet flap in a sided entry" },
      after: { image: "img/projects/door-install/after-1.jpg", alt: "White door with a large divided glass window in the same entry" },
      photos: [
        { image: "img/projects/door-install/after-1.jpg", alt: "New white door with a divided glass window" }
      ]
    }
  ],

  /* SAMPLE blog posts (Resources page) — shown only while SANITY_PROJECT_ID in js/config.js is empty.
     Each post is one simple record and opens at article.html?post=<slug>.
     The Resources page shows every post newest first; the newest one is shown large.
     slug:     the end of the post's web address (lowercase, dashes)
     title:    headline
     label:    optional, "Stories" or "Tips"
     date:     e.g. "2026-10-02" — empty shows "Sample post"
     excerpt:  one or two sentences for the cards
     image / imageAlt: cover photo and a short description of it
     content:  article body in Sanity's Portable Text format (optional) */
  posts: [
    {
      slug: "bathroom-remodel-start-to-finish",
      title: "A bathroom remodel, start to finish",
      label: "Stories",
      date: "",
      excerpt: "How a remodel comes together: demo, rough-in, tile and the final walkthrough.",
      image: "img/blog/article-bath-tile-progress.jpg",
      imageAlt: "Gray tile partly installed on a bathroom wall, with a bucket of thinset and a trowel on a drop cloth",
      url: "article.html?post=bathroom-remodel-start-to-finish",
      sample: true,
      content: [
        { _type: "block", style: "h2", children: [{ _type: "span", text: "What we found" }] },
        {
          _type: "block", style: "normal", markDefs: [{ _key: "l1", _type: "link", href: "services.html#remodeling" }],
          children: [
            { _type: "span", text: "Most projects have something that isn’t obvious at first. Here it was " },
            { _type: "span", text: "soft subfloor", marks: ["strong"] },
            { _type: "span", text: " under the old tub. We replaced it before any tile went down. See how our " },
            { _type: "span", text: "remodeling work", marks: ["l1"] },
            { _type: "span", text: " comes together, " },
            { _type: "span", text: "step by step", marks: ["em"] },
            { _type: "span", text: "." }
          ]
        },
        {
          _type: "image",
          url: "img/blog/article-bath-finished.jpg",
          alt: "Finished bathroom with an oak vanity, a round mirror and a glass walk-in shower",
          caption: "The finished bathroom after tile, fixtures and the final walkthrough."
        },
        { _type: "block", style: "h3", children: [{ _type: "span", text: "The steps, in order" }] },
        { _type: "block", style: "normal", listItem: "bullet", level: 1, children: [{ _type: "span", text: "Demo and haul-away" }] },
        { _type: "block", style: "normal", listItem: "bullet", level: 1, children: [{ _type: "span", text: "Plumbing and electrical rough-in" }] },
        { _type: "block", style: "normal", listItem: "bullet", level: 1, children: [{ _type: "span", text: "Waterproofing, tile and grout" }] },
        { _type: "block", style: "normal", listItem: "bullet", level: 1, children: [{ _type: "span", text: "Fixtures, trim and the final walkthrough" }] },
        { _type: "block", style: "blockquote", children: [{ _type: "span", text: "Pull quotes highlight one line worth remembering, such as a comment from the homeowner." }] },
        { _type: "block", style: "normal", children: [{ _type: "span", text: "Planning something similar? Send us a few photos and we’ll take a look." }] }
      ]
    },
    {
      slug: "roof-check-before-winter",
      title: "What to look for on your roof before winter",
      label: "Tips",
      date: "",
      excerpt: "A short list you can check from the ground, and when it’s time to call someone.",
      image: "img/blog/blog-roof-check-shingles.jpg",
      imageAlt: "Dark asphalt shingles above a gutter holding fallen autumn leaves",
      url: "article.html?post=roof-check-before-winter",
      sample: true
    },
    {
      slug: "jobsite-video-framing-day",
      title: "Jobsite video: framing day",
      label: "Stories",
      date: "",
      excerpt: "A quick look at framing on a residential build, from the first wall to the roof line.",
      image: "img/blog/blog-framing-day-trusses.jpg",
      imageAlt: "Roof trusses set on top of a sheathed two-story house frame against a blue sky",
      url: "article.html?post=jobsite-video-framing-day",
      sample: true
    },
    {
      slug: "deck-boards-repair-or-replace",
      title: "Deck boards: repair or replace?",
      label: "Tips",
      date: "",
      excerpt: "How to tell whether a few boards need swapping or the framing underneath needs work.",
      image: "img/blog/blog-deck-boards.jpg",
      imageAlt: "Weathered gray deck boards with a few new replacement boards, a drill and a box of screws",
      url: "article.html?post=deck-boards-repair-or-replace",
      sample: true
    },
    {
      slug: "planning-a-kitchen-remodel",
      title: "Planning a kitchen remodel: where to start",
      label: "Tips",
      date: "",
      excerpt: "Layout, budget and timing questions worth answering before anything gets torn out.",
      image: "img/blog/blog-kitchen-planning-samples.jpg",
      imageAlt: "Cabinet door, countertop and tile samples lined up on a kitchen island",
      url: "article.html?post=planning-a-kitchen-remodel",
      sample: true
    },
    {
      slug: "why-paint-prep-matters",
      title: "Why paint prep matters more than the paint",
      label: "Tips",
      date: "",
      excerpt: "Patching, sanding and priming: the steps that decide how long a paint job lasts.",
      image: "img/blog/blog-paint-prep.jpg",
      imageAlt: "Patched drywall with painter's tape, a sanding block, a putty knife and a roller tray on a drop cloth",
      url: "article.html?post=why-paint-prep-matters",
      sample: true
    },
    {
      slug: "welcome-to-from-the-jobsite",
      title: "Welcome to From the Jobsite",
      label: "Stories",
      date: "",
      excerpt: "What this page is for, and what you can expect to find here as it grows.",
      image: "img/blog/blog-welcome-porch.jpg",
      imageAlt: "Front porch with two rocking chairs, a potted fern and an open blue front door",
      url: "article.html?post=welcome-to-from-the-jobsite",
      sample: true
    }
  ]
};

