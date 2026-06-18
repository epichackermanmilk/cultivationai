// AdSense configuration.
// The publisher client is already loaded globally in app/layout.tsx.
// To turn on the reader ads: in your AdSense dashboard create two *display* ad
// units (Ads → By ad unit → Display ads), then paste each unit's "data-ad-slot"
// number below. Until then the reader shows labelled placeholders (no errors).

export const ADSENSE_CLIENT = 'ca-pub-1350938260860067'

export const ADSENSE_SLOTS = {
  readerTop:    '9124440881', // top-of-chapter ad
  readerBottom: '8980970659', // bottom-of-chapter ad
}
