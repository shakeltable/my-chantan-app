import { Wordmark } from "@/components/Wordmark"
import { Button } from "@/components/ui/button"
import { useTranslation } from "react-i18next"

export function SiteFooter({ onCreate, onJoin }: { onCreate: () => void; onJoin: () => void }) {
  const { t } = useTranslation()
  const link = "transition-colors duration-150 hover:text-foreground"
  return (
    <footer className="px-5 pb-6 md:px-8">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-primary px-6 py-16 text-center text-primary-foreground md:py-20">
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(50% 70% at 50% 120%, hsl(var(--accent) / 0.45), transparent 70%)" }} />
        <h2 className="relative mx-auto max-w-2xl font-display text-4xl font-extrabold leading-[1.05] tracking-[-0.03em] md:text-6xl">{t("Open a room. Bring everyone.")}</h2>
        <div className="relative mt-8 flex flex-wrap justify-center gap-3">
          <Button size="lg" variant="secondary" onClick={onCreate} className="rounded-full px-7">{t("Start a room")}</Button>
          <Button size="lg" variant="outline" onClick={onJoin} className="rounded-full border-primary-foreground/40 bg-transparent px-7 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">{t("Join with a code")}</Button>
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-2 py-8 text-sm text-muted-foreground md:flex-row">
        <div className="text-lg text-foreground"><Wordmark /></div>
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          <a className={link} href="#features">{t("Features")}</a>
          <a className={link} href="#how">{t("How it works")}</a>
          <a className={link} href="#privacy">{t("Privacy")}</a>
          <a className={link} href="#faq">{t("FAQ")}</a>
        </nav>
        <p className="text-xs">© {new Date().getFullYear()} {t("Room Board.")} {t("All rights reserved.")}</p>
      </div>
    </footer>
  )
}
