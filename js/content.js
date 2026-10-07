/*
  ==========================================================================
  OWNER-MANAGED CONTENT
  ==========================================================================
  Photos and projects live in this file.

  Blog posts do not live here. Pages CMS saves them as Markdown files in
  content/posts. Until the first post is published, the site shows
  "Our blog is coming soon."

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
  ]
};
