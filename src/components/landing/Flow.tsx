import { MotionItem, MotionReveal } from "@/components/MotionReveal"
import { useTranslation } from "react-i18next"

export function Flow() {
  const { t } = useTranslation()
  const steps = [
    { n: "1", h: "Create a room", p: "Give it a name and, if you like, a password. You become its admin." },
    { n: "2", h: "Share the link", p: "Send the invite link or the six-letter code. Guests enter a name and an email, and pick their country." },
    { n: "3", h: "Think out loud", p: "Draw, write, connect and talk. Snap the board and everyone can download the picture." },
  ]
  return (
    <section id="how" className="bg-muted/50">
      <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <MotionReveal>
          <MotionItem className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="font-display text-4xl font-extrabold tracking-[-0.03em] md:text-5xl">{t("In the room in ten seconds.")}</h2>
            <p className="mt-4 text-lg text-muted-foreground">{t("No downloads, no accounts, no meeting-link roulette.")}</p>
          </MotionItem>
          <div className="relative grid gap-10 md:grid-cols-3 md:gap-8">
            <div aria-hidden className="absolute inset-x-[16%] top-6 hidden border-t-2 border-dashed border-border md:block" />
            {steps.map((s) => (
              <MotionItem key={s.n} className="relative text-center">
                <span className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary font-display text-lg font-bold text-primary-foreground ring-8 ring-muted/50">{s.n}</span>
                <h3 className="mt-5 text-xl font-bold">{t(s.h)}</h3>
                <p className="mx-auto mt-2 max-w-xs leading-7 text-muted-foreground">{t(s.p)}</p>
              </MotionItem>
            ))}
          </div>
        </MotionReveal>
      </div>
    </section>
  )
}
