import { useEffect, useState } from "react"
import { Wordmark } from "@/components/Wordmark"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"
import { LanguageToggle } from "../LanguageToggle"

export function Masthead({ onCreate, onJoin }: { onCreate: () => void; onJoin: () => void }) {
  const { t } = useTranslation()
  const [solid, setSolid] = useState(false)
  useEffect(() => {
    const f = () => setSolid(window.scrollY > 24)
    f()
    window.addEventListener("scroll", f, { passive: true })
    return () => window.removeEventListener("scroll", f)
  }, [])
  const link = "transition-colors duration-150 hover:text-foreground"
  return (
    <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 md:px-6">
      <div className={cn("mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 rounded-full border px-4 transition-all duration-200 md:px-5", solid ? "border-border bg-background/85 shadow-sm backdrop-blur" : "border-transparent bg-transparent")}>
        <a href="#top" aria-label={t("Room Board")} className="flex items-center text-lg"><Wordmark /></a>
        <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground lg:flex">
          <a href="#features" className={link}>{t("Features")}</a>
          <a href="#how" className={link}>{t("How it works")}</a>
          <a href="#privacy" className={link}>{t("Privacy")}</a>
          <a href="#faq" className={link}>{t("FAQ")}</a>
        </nav>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <Button variant="ghost" size="sm" onClick={onJoin} className="hidden sm:inline-flex">{t("Join with a code")}</Button>
          <Button size="sm" onClick={onCreate}>{t("Start a room")}</Button>
        </div>
      </div>
    </header>
  )
}
