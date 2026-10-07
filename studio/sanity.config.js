import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {schemaTypes} from './schemaTypes'

/* Public values from studio/.env (see .env.example). They must match js/config.js on the website. */
const projectId = process.env.SANITY_STUDIO_PROJECT_ID || ''
const dataset = process.env.SANITY_STUDIO_DATASET || 'production'

export default defineConfig({
  name: 'default',
  title: 'North Carolina Building & Remodeling',
  projectId,
  dataset,

  plugins: [
    structureTool({
      title: 'Blog',
      structure: (S) =>
        S.list()
          .title('Blog')
          .items([
            S.listItem()
              .title('Blog posts')
              .schemaType('post')
              .child(
                S.documentTypeList('post')
                  .title('Blog posts')
                  .defaultOrdering([{field: 'publishedAt', direction: 'desc'}]),
              ),
          ]),
    }),
  ],

  schema: {
    types: schemaTypes,
    templates: (templates) => templates.filter((t) => t.schemaType === 'post'),
  },

  document: {
    newDocumentOptions: (items) => items.filter((item) => item.templateId === 'post'),
  },

  /* The "Publish date" field already schedules posts; hide Sanity's extra
     scheduling, releases and tasks tools so the dashboard stays simple. */
  scheduledPublishing: {enabled: false},
  scheduledDrafts: {enabled: false},
  releases: {enabled: false},
  tasks: {enabled: false},
})
