import {useEffect, useRef} from 'react'
import {set, unset, useFormValue} from 'sanity'

export const SLUG_MAX_LENGTH = 96

/* Same rules as the "Generate" button: lowercase words joined by dashes */
export function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, '')
}

/*
  Web address field that fills itself in from the title while the owner types.
  It keeps following the title only while the slug still matches the title
  (or is empty). Once the owner edits the slug by hand, it is left alone.
  The normal "Generate" button still works (options.source = "title").
*/
export function AutoSlugInput(props) {
  const {value, onChange, renderDefault} = props
  const title = useFormValue(['title'])
  const current = (value && value.current) || ''
  const previousTitle = useRef(title)

  useEffect(() => {
    const before = previousTitle.current
    previousTitle.current = title
    if (before === title) return
    const following = !current || current === slugify(before)
    if (!following) return
    const next = slugify(title)
    if (next === current) return
    onChange(next ? set({_type: 'slug', current: next}) : unset())
    // Only react to title changes; `current` is read from the same render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title])

  return renderDefault(props)
}
