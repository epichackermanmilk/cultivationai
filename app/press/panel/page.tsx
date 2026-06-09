import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Press panel', robots: { index: false, follow: false } }

// Marketing-screenshot composer. Renders a captured app screenshot inside a phone
// frame on an on-brand gradient with a headline — captured at store resolution.
// /press/panel?s=askbook|library|character|games|multi

type Panel = { eyebrow: string; head: React.ReactNode; img: string; badge?: string }

const PANELS: Record<string, Panel> = {
  askbook: {
    eyebrow: 'ASK THE BOOK',
    head: <>Ask any novel<br /><span className="accent">anything</span></>,
    img: '6-askbook.png',
    badge: 'Answers grounded in real chapters',
  },
  library: {
    eyebrow: 'THOUSANDS OF NOVELS',
    head: <>Your next read,<br /><span className="accent">one tap away</span></>,
    img: '2-library.png',
    badge: 'Updated weekly',
  },
  character: {
    eyebrow: 'CHARACTER CHAT',
    head: <>Talk to your favorite<br /><span className="accent">characters</span></>,
    img: '7-character.png',
    badge: 'They stay in character',
  },
  games: {
    eyebrow: 'STORY GAMES',
    head: <>Play games built<br />from the <span className="accent">lore</span></>,
    img: '4-games.png',
    badge: 'Survive · regress · recruit',
  },
  multi: {
    eyebrow: 'MULTI-NOVEL CHAT',
    head: <>Compare across<br />novels <span className="accent">instantly</span></>,
    img: '8-multi.png',
    badge: 'Chat several books at once',
  },
}

export default async function PanelPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s } = await searchParams
  const p = PANELS[s ?? 'askbook'] ?? PANELS.askbook

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Plus+Jakarta+Sans:wght@500;700&display=swap"
        rel="stylesheet"
      />
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box}
        html,body{background:#07060d}
        .panel{
          position:relative;width:540px;height:960px;overflow:hidden;
          background:
            radial-gradient(120% 70% at 50% 16%, rgba(245,158,11,0.20), transparent 60%),
            linear-gradient(168deg,#241a3d 0%,#150f29 46%,#0a0713 100%);
          font-family:'Plus Jakarta Sans',system-ui,sans-serif;
        }
        .glow{position:absolute;left:50%;top:54%;width:560px;height:560px;transform:transl(-50%,-50%);
          background:radial-gradient(circle, rgba(245,158,11,0.28), transparent 62%);filter:blur(18px)}
        .content{position:relative;z-index:2;height:100%;display:flex;flex-direction:column;align-items:center;padding:64px 40px 0}
        .eyebrow{color:#fbbf24;font-weight:700;font-size:15px;letter-spacing:.22em;margin-bottom:14px}
        h1{font-family:'Fraunces',Georgia,serif;color:#fff;font-weight:700;font-size:50px;line-height:1.04;text-align:center;letter-spacing:-0.01em}
        h1 .accent{color:#f59e0b;font-style:italic}
        .badge{margin-top:22px;display:inline-flex;align-items:center;gap:8px;color:#e8e3f5;
          background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.14);
          padding:9px 16px;border-radius:999px;font-size:15px;font-weight:500}
        .star{color:#fbbf24}
        .phonewrap{margin-top:40px;flex:1;display:flex;justify-content:center;align-items:flex-start}
        .phone{
          width:340px;border-radius:46px;background:#0c0b12;padding:11px;
          box-shadow:0 30px 70px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06), 0 0 60px rgba(245,158,11,0.18);
        }
        .screen{border-radius:36px;overflow:hidden;background:#000;aspect-ratio:412/892}
        .screen img{width:100%;display:block}
      `}</style>

      <div className="panel">
        <div className="glow" />
        <div className="content">
          <p className="eyebrow">{p.eyebrow}</p>
          <h1>{p.head}</h1>
          {p.badge && (
            <span className="badge"><span className="star">★★★★★</span>{p.badge}</span>
          )}
          <div className="phonewrap">
            <div className="phone">
              <div className="screen">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/press-shots/${p.img}`} alt="" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
