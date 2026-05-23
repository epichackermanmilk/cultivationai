'use client'

import { useState } from 'react'

export default function CoverImage({ src, alt }: { src: string; alt: string }) {
  const [err, setErr] = useState(false)
  if (!src || err) return null
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setErr(true)}
      className="mb-4 w-full rounded-lg object-cover"
    />
  )
}
