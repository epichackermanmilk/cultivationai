// Wraps every /games route. Renders the (gated) in-game banner ad above each game's
// own page. The ad hides itself for ad-free users and on the /games listing.
import GameAd from '@/components/GameAd'

export default function GamesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GameAd />
      {children}
    </>
  )
}
