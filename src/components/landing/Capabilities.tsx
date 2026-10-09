import { Languages, Lock, MessageSquare, Mic } from "lucide-react"
import { MotionItem, MotionReveal } from "@/components/MotionReveal"
import { useTranslation } from "react-i18next"

const card = "rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md md:p-8"
const kicker = "text-xs font-bold uppercase tracking-[0.14em] text-accent"
const ACC = "hsl(190 68% 42%)"

export function Capabilities() {
  const { t } = useTranslation()
  return (
    <section id="features" className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
      <MotionReveal>
        <MotionItem className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="font-display text-4xl font-extrabold tracking-[-0.03em] md:text-5xl">{t("Everything a room needs.")}</h2>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">{t("One canvas, one chat, one place for the files. Nothing to install.")}</p>
        </MotionItem>
        <MotionItem className="grid gap-4 md:grid-cols-3">
          <div className={`${card} grid gap-6 sm:grid-cols-2 md:col-span-2`}>
            <div className="flex flex-col justify-center">
              <span className={kicker}>{t("Canvas")}</span>
              <h3 className="mt-2 font-display text-2xl font-bold tracking-tight">{t("An endless board with a minimap.")}</h3>
              <p className="mt-3 leading-7 text-muted-foreground">{t("Pan, zoom and jump anywhere. See every teammate's cursor with their name and colour.")}</p>
            </div>
            <div className="relative min-h-[200px] overflow-hidden rounded-xl">
              <img src="/assets/lead.webp" alt={t("A hand drawing an arrow on a whiteboard")} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
            </div>
          </div>
          <div className={card}>
            <span className={kicker}>{t("Connect")}</span>
            <h3 className="mt-2 font-display text-xl font-bold tracking-tight">{t("Curved arrows that follow your ideas.")}</h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{t("Link any two elements. Move one and the arrow bends with it.")}</p>
            <svg viewBox="0 0 220 90" className="mt-4 w-full" fill="none" aria-hidden>
              <rect x="6" y="8" width="64" height="34" rx="6" stroke="hsl(var(--foreground))" strokeWidth="2" />
              <rect x="150" y="48" width="64" height="34" rx="6" stroke="hsl(var(--foreground))" strokeWidth="2" />
              <path d="M70 25 C 120 25, 100 65, 148 65" stroke={ACC} strokeWidth="2.5" strokeLinecap="round" />
              <path d="M141 59 L149 65 L141 71" stroke={ACC} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className={card}>
            <svg viewBox="0 0 240 110" className="mb-5 w-full rounded-xl bg-muted/50" fill="none" aria-hidden>
              <circle cx="40" cy="38" r="20" stroke={ACC} strokeWidth="2.5" />
              <rect x="82" y="18" width="40" height="40" rx="3" stroke="hsl(var(--foreground))" strokeWidth="2" />
              <path d="M150 58 L172 18 L194 58 Z" stroke="hsl(var(--foreground))" strokeWidth="2" strokeLinejoin="round" />
              <path d="M214 38 L224 56 L214 74 L204 56 Z" transform="translate(-6 -12)" stroke="hsl(var(--foreground))" strokeWidth="2" strokeLinejoin="round" />
              <path d="M110 74 L116 88 L131 90 L120 99 L123 112 L110 105 L97 112 L100 99 L89 90 L104 88 Z" transform="translate(-60 -16)" stroke={ACC} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M130 94 L226 82" stroke="hsl(var(--foreground))" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <span className={kicker}>{t("Shapes")}</span>
            <h3 className="mt-2 font-display text-xl font-bold tracking-tight">{t("Circles, squares, stars and more.")}</h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{t("Drop clean shapes in one drag, then resize, colour or lock them.")}</p>
          </div>
          <div className={card}>
            <div className="relative mb-5 h-28 overflow-hidden rounded-xl">
              <img src="/assets/s-files.webp" alt={t("Documents and photos on a desk")} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
            </div>
            <span className={kicker}>{t("Files")}</span>
            <h3 className="mt-2 font-display text-xl font-bold tracking-tight">{t("Photos and documents, right on the board.")}</h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{t("Drop a file up to 25 MB and it lands in front of everyone.")}</p>
          </div>
          <div className={card}>
            <div className="mb-5 flex items-end gap-1 rounded-xl bg-muted/50 px-3 pt-8" aria-hidden>
              {["Board 1", "Board 2", "Board 3"].map((b, i) => (
                <span key={b} className={`rounded-t-md px-3 py-1.5 text-xs font-semibold ${i === 1 ? "border border-b-0 border-border bg-card text-foreground" : "text-muted-foreground"}`}>
                  {t(b)}{i === 1 && <span className="ms-2 inline-block h-1.5 w-1.5 rounded-full bg-accent" />}
                </span>
              ))}
            </div>
            <span className={kicker}>{t("Boards")}</span>
            <h3 className="mt-2 font-display text-xl font-bold tracking-tight">{t("Up to 20 boards in tabs.")}</h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{t("Live dots show who is on which board.")}</p>
          </div>
        </MotionItem>
        <MotionItem>
          <ul className="mx-auto mt-10 grid max-w-4xl gap-x-12 sm:grid-cols-2">
            <li className="flex items-start gap-3 border-t border-border py-5"><MessageSquare className="mt-1 h-5 w-5 shrink-0 text-accent" /><span><b className="font-semibold">{t("Chat that remembers")}</b><br /><span className="text-sm text-muted-foreground">{t("Late joiners catch up on every message.")}</span></span></li>
            <li className="flex items-start gap-3 border-t border-border py-5"><Lock className="mt-1 h-5 w-5 shrink-0 text-accent" /><span><b className="font-semibold">{t("Lock anything")}</b><br /><span className="text-sm text-muted-foreground">{t("Pinned elements can't be moved, edited or erased.")}</span></span></li>
            <li className="flex items-start gap-3 border-t border-border py-5"><Mic className="mt-1 h-5 w-5 shrink-0 text-accent" /><span><b className="font-semibold">{t("Camera and mic, by permission")}</b><br /><span className="text-sm text-muted-foreground">{t("The admin decides who speaks. Anyone can share their screen.")}</span></span></li>
            <li className="flex items-start gap-3 border-t border-border py-5"><Languages className="mt-1 h-5 w-5 shrink-0 text-accent" /><span><b className="font-semibold">{t("Speaks your language")}</b><br /><span className="text-sm text-muted-foreground">{t("English, Arabic, French and Spanish.")}</span></span></li>
          </ul>
        </MotionItem>
      </MotionReveal>
    </section>
  )
}
