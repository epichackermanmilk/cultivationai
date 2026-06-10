export const FEATURED_SLUGS = [
  'reverend-insanity',
  'renegade-immortal',
  'against-the-gods',
  'a-will-eternal',
  'i-shall-seal-the-heavens',
  'warlock-of-the-magus-world',
  'shadow-slave',
  'supreme-magus',
] as const

export type FeaturedSlug = (typeof FEATURED_SLUGS)[number]

export const FEATURED_SLUG_SET = new Set<string>(FEATURED_SLUGS)

export interface ComingSoonNovel {
  slug: string
  title: string
  author: string
  total_chapters: number
  genres: string[]
  cover_url: string
  coming_soon: true
}

export const COMING_SOON_NOVELS: ComingSoonNovel[] = [
  {
    slug: 'renegade-immortal',
    title: 'Renegade Immortal',
    author: 'Er Gen',
    total_chapters: 2088,
    genres: ['Xianxia', 'Adventure', 'Drama'],
    cover_url: 'https://images.novelbin.me/novel/renegade-immortal.jpg',
    coming_soon: true,
  },
  {
    slug: 'a-will-eternal',
    title: 'A Will Eternal',
    author: 'Er Gen',
    total_chapters: 1314,
    genres: ['Xianxia', 'Comedy', 'Adventure'],
    cover_url: 'https://images.novelbin.me/novel/a-will-eternal.jpg',
    coming_soon: true,
  },
  {
    slug: 'warlock-of-the-magus-world',
    title: 'Warlock of the Magus World',
    author: 'The Plagiarist',
    total_chapters: 1200,
    genres: ['Fantasy', 'Sci-fi', 'Adventure'],
    cover_url: 'https://images.novelbin.me/novel/warlock-of-the-magus-world.jpg',
    coming_soon: true,
  },
]
