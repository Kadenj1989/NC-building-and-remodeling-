import {defineField, defineType} from 'sanity'

/* Accepts youtube.com/watch?v=…, youtu.be/…, /embed/…, /shorts/… links */
export function youtubeId(url) {
  const m = String(url || '')
    .trim()
    .match(
      /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i,
    )
  return m ? m[1] : ''
}

export function validateYoutubeUrl(url) {
  if (!url) return true
  return youtubeId(url)
    ? true
    : 'This doesn’t look like a YouTube video link. Copy the address from the video page (it looks like youtube.com/watch?v=… or youtu.be/…).'
}

export default defineType({
  name: 'youtube',
  title: 'YouTube video',
  type: 'object',
  fields: [
    defineField({
      name: 'url',
      title: 'YouTube link',
      type: 'url',
      description: 'Paste the address of the video from YouTube, for example https://www.youtube.com/watch?v=abc123.',
      validation: (rule) => rule.required().uri({scheme: ['http', 'https']}).custom(validateYoutubeUrl),
    }),
    defineField({
      name: 'caption',
      title: 'Video title (optional)',
      type: 'string',
      description: 'A few words shown on the video before it plays. Leave empty to use the post title.',
    }),
  ],
  preview: {
    select: {url: 'url', caption: 'caption'},
    prepare({url, caption}) {
      return {title: caption || 'YouTube video', subtitle: url || 'No link yet'}
    },
  },
})
