/*
  Site links and contact details — edit them here, once, for the whole site.
  Leave a value as "" until it is confirmed. Empty links show a short
  "coming soon" note instead of going nowhere; empty phone/email stay hidden.

  Photos and projects are NOT here — they live in js/content.js.
  Blog posts come from Sanity once SANITY_PROJECT_ID below is filled in.
*/
window.SITE_CONFIG = {
  /* ===================== JOBBER — QUOTE REQUESTS =====================
     The owner's snippet is an embed, not a public page. Opening the
     form_url directly shows Jobber's "form unavailable" error.
     Every data-link="jobber" button stays on this site and opens the
     embedded form on the contact page.
     ================================================================== */
  JOBBER_REQUEST_URL: "contact.html#jobber-form",

  // Public profiles
  GOOGLE_REVIEWS_URL: "https://share.google/2cC2WwdexCJPLI6TL",
  FACEBOOK_URL: "https://www.facebook.com/NorthCarolinaBuildingandRemodelingllc/",
  NEXTDOOR_URL: "https://nextdoor.com/page/north-carolina-building-and-remodeling-llc-stedman-nc?utm_campaign=1790713714836&share_action_id=b7c43bdf-7ade-40ce-8584-e5beb7fd60a0",
  /* Every data-link="youtube" uses this shorts URL. */
  YOUTUBE_URL: "https://www.youtube.com/@ncbuildingandremodelingllc/shorts",
  YOUTUBE_URL_PENDING: "https://www.youtube.com/@ncbuildingandremodelingllc/shorts",
  JOBBER_PROFILE_URL: "",

  // Office contact (general questions — project requests go to Jobber)
  PHONE: "(910) 303-4054",
  EMAIL: "ncbuildingandremodelingllc@gmail.com",

  /* ===================== PARTNER WITH US — FORM =====================
     Where the "Partner With Us" form (partner-with-us.html) sends inquiries.
     Create a free form on a service like Formspree or Getform that emails
     you each submission, then paste its endpoint URL here. It must start
     with https://, e.g. "https://formspree.io/f/abcdwxyz".
     The form POSTs JSON with these fields: name, company, email, phone,
     website, partnership_type, trade_specialty (only for Subcontractor /
     Trade), service_area, message, _subject.
     Leave it "" until it's set up: nothing is sent, and visitors are asked
     to email EMAIL above instead. This is a public URL, not a password —
     never paste an API key or secret here.
     ================================================================== */
  PARTNER_FORM_URL: "",

  /* ===================== SANITY — BLOG POSTS =====================
     These are public IDs, not passwords. Never paste a Sanity API token here.
     SANITY_PROJECT_ID: from sanity.io/manage (8 letters/numbers, e.g. "ab12cd34").
       Leave it "" to show the sample posts from js/content.js instead.
     SANITY_DATASET: almost always "production". Must match studio/.env.
     SITE_URL: the live address, e.g. "https://www.example.com" (no slash at
       the end). Optional — used for share links and search engines. */
  SANITY_PROJECT_ID: "",
  SANITY_DATASET: "production",
  SITE_URL: "",

  // Content editor login (hosted Sanity Studio URL) — linked as "Owner login" in the footer
  CMS_STUDIO_URL: ""
};
