// Cross-promo config for our Chrome extension (auto-translates raw Chinese novel
// chapters → English). Promoted across NovelCodex; the extension links back here.
//
// TODO: replace URL + NAME with the real Chrome Web Store listing once published.
export const EXTENSION = {
  // Master switch for the cross-promo placements (sitewide banner + homepage card).
  // Flip to false to instantly hide them everywhere.
  live: true,
  name: 'Raw Novel Translator',
  // The "Install" CTAs just deep-link to the Web Store listing.
  // TODO: paste the real listing URL once the extension is published.
  url: 'https://chromewebstore.google.com/',
  tagline: 'Read raw Chinese web novels in instant English — free Chrome extension.',
  shortPitch: 'Translate raw chapters instantly',
}
