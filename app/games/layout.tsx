// Wraps every /games route. The in-game banner ad is rendered inside each game page
// (below the shared header) rather than here, so the header sits flush at the top like
// every other page.
export default function GamesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
