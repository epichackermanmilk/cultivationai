'use client'

import { useEffect } from 'react'
import { recordVisit, type NovelMeta } from '@/lib/bookmarks'

export default function VisitTracker({ novel }: { novel: NovelMeta }) {
  useEffect(() => {
    recordVisit(novel)
  }, [novel])

  return null
}
