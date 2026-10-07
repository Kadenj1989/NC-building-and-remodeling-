import {defineArrayMember, defineField, defineType} from 'sanity'
import {AutoSlugInput, SLUG_MAX_LENGTH, slugify} from '../components/AutoSlugInput'
import {validateYoutubeUrl} from './youtube'

/* The website shows this as the small label on each post (js/cms.js LABELS) */
export const CATEGORIES = [
  {title: 'Stories', value: 'stories'},
  {title: 'Tips', value: 'tips'},
]

/* Alt text is required only once a photo has been uploaded */
function requireAltWhenImage(alt, context) {
  const image = context.parent
  if (image && image.asset && !String(alt || '').trim()) {
    return 'Please describe the photo in a few words.'
  }
  return true
}

const altField = defineField({
  name: 'alt',
  title: 'Photo description',
  type: 'string',
  description:
    'Describe what the photo shows in a few words, for visitors who can’t see it and for Google. Example: “New shingle roof on a two-story home.”',
  validation: (rule) => rule.custom(requireAltWhenImage),
})

export default defineType({
  name: 'post',
  title: 'Blog post',
  type: 'document',
  fieldsets: [
    {
      name: 'seo',
      title: 'Search engines (optional)',
      description:
        'How this post appears in Google results and when shared on Facebook. Leave these empty to use the title and short summary.',
      options: {collapsible: true, collapsed: true},
    },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'The headline shown on the blog and at the top of the post.',
      validation: (rule) => rule.required().max(120),
    }),
    defineField({
      name: 'slug',
      title: 'Web address',
      type: 'slug',
      description:
        'The end of this post’s web address. It fills in from the title automatically until you change it. Use only lowercase letters, numbers and dashes. Avoid changing it after the post is published, because old links to the post would stop working.',
      options: {source: 'title', maxLength: SLUG_MAX_LENGTH, slugify},
      components: {input: AutoSlugInput},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Label (optional)',
      type: 'string',
      description: 'Stories for project write-ups and company updates, Tips for homeowner advice. Shown as a small label on the post.',
      options: {list: CATEGORIES, layout: 'radio'},
    }),
    defineField({
      name: 'featuredImage',
      title: 'Featured image',
      type: 'image',
      description:
        'The main photo, shown on the blog cards and at the top of the post. After uploading, click the crop icon to pick the most important part of the photo so it isn’t cut off.',
      options: {hotspot: true},
      fields: [altField],
    }),
    defineField({
      name: 'excerpt',
      title: 'Short summary shown on the blog cards',
      type: 'text',
      rows: 3,
      description: 'One or two sentences that make people want to read more. Also shown in bold at the start of the post.',
      validation: (rule) => [
        rule.required(),
        rule.max(220).warning('Shorter summaries (under about 220 characters) look best on the cards.'),
      ],
    }),
    defineField({
      name: 'publishedAt',
      title: 'Publish date',
      type: 'datetime',
      description:
        'The post appears on the website on this date and time (after you press Publish). If you pick a future date, the post waits and shows up automatically on that date.',
      initialValue: () => new Date().toISOString(),
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'youtubeUrl',
      title: 'YouTube video (optional)',
      type: 'url',
      description:
        'Paste a YouTube video link to show a video player near the top of the post.',
      validation: (rule) => rule.uri({scheme: ['http', 'https']}).custom(validateYoutubeUrl),
    }),
    defineField({
      name: 'content',
      title: 'Article',
      type: 'array',
      description:
        'Write the full post here. Use the toolbar for headings, bold, italic, lists, links and quotes. Use the + button to add a photo or a YouTube video.',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            {title: 'Normal text', value: 'normal'},
            {title: 'Heading', value: 'h2'},
            {title: 'Subheading', value: 'h3'},
            {title: 'Small heading', value: 'h4'},
            {title: 'Quote', value: 'blockquote'},
          ],
          lists: [
            {title: 'Bullet list', value: 'bullet'},
            {title: 'Numbered list', value: 'number'},
          ],
          marks: {
            decorators: [
              {title: 'Bold', value: 'strong'},
              {title: 'Italic', value: 'em'},
            ],
            annotations: [
              defineArrayMember({
                name: 'link',
                title: 'Link',
                type: 'object',
                fields: [
                  defineField({
                    name: 'href',
                    title: 'Link address',
                    type: 'url',
                    description:
                      'A full web address (https://…), an email (mailto:name@example.com), a phone number (tel:9105551234), or a page on this site (services.html).',
                    validation: (rule) =>
                      rule.required().uri({scheme: ['http', 'https', 'mailto', 'tel'], allowRelative: true}),
                  }),
                ],
              }),
            ],
          },
        }),
        defineArrayMember({
          type: 'image',
          title: 'Photo',
          options: {hotspot: true},
          fields: [
            altField,
            defineField({
              name: 'caption',
              title: 'Caption (optional)',
              type: 'string',
              description: 'A short line shown under the photo.',
            }),
          ],
        }),
        defineArrayMember({type: 'youtube'}),
      ],
    }),
    defineField({
      name: 'seoTitle',
      title: 'Search engine title',
      type: 'string',
      fieldset: 'seo',
      description: 'The title shown in Google results and browser tabs. Leave empty to use the post title.',
      validation: (rule) => rule.max(70).warning('Google usually shows about 60 characters.'),
    }),
    defineField({
      name: 'seoDescription',
      title: 'Search engine description',
      type: 'text',
      rows: 3,
      fieldset: 'seo',
      description: 'The short description under the title in Google results. Leave empty to use the short summary.',
      validation: (rule) => rule.max(170).warning('Google usually shows about 155 characters.'),
    }),
  ],
  orderings: [
    {
      title: 'Publish date, newest first',
      name: 'publishedAtDesc',
      by: [{field: 'publishedAt', direction: 'desc'}],
    },
  ],
  preview: {
    select: {title: 'title', category: 'category', media: 'featuredImage'},
    prepare({title, category, media}) {
      const match = CATEGORIES.find((c) => c.value === category)
      return {title: title || 'Untitled post', subtitle: match ? match.title : 'No label', media}
    },
  },
})
