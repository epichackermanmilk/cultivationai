'use client'

import { useState } from 'react'

interface Props {
  text: string
  /** Number of lines to show when collapsed (default 4) */
  lines?: number
  className?: string
}

export default function DescriptionExpander({ text, lines = 4, className = '' }: Props) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={className}>
      <p
        className="text-xs leading-relaxed text-zinc-400 whitespace-pre-line"
        style={expanded ? undefined : {
          display:            '-webkit-box',
          WebkitLineClamp:    lines,
          WebkitBoxOrient:    'vertical',
          overflow:           'hidden',
        }}
      >
        {text}
      </p>
      <button
        onClick={() => setExpanded(v => !v)}
        className="mt-1 text-xs text-amber-500 hover:text-amber-400 transition"
      >
        {expanded ? 'Show less ↑' : 'Show more ↓'}
      </button>
    </div>
  )
}
