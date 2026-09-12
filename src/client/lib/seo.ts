import { useEffect } from 'react'

export function useSeo(title: string, description?: string) {
  useEffect(() => {
    const prevTitle = document.title
    document.title = title

    let prevDescription: string | null = null
    let meta: HTMLMetaElement | null = null
    if (description) {
      meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
      prevDescription = meta?.content ?? null
      if (meta) meta.content = description
    }
    return () => {
      document.title = prevTitle
      if (meta && prevDescription !== null) meta.content = prevDescription
    }
  }, [title, description])
}