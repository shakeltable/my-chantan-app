import { useEffect, useState } from "react"
import { Wordmark } from "@/components/Wordmark"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useTranslation } from 'react-i18next'
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
  return (
    <header className={cn("fixed inset-x-0 top-0 z-40 transition-all duration-200", solid ? "border-b border-border/60 bg-background/85 backdrop-blur" : "border-b border-transparent bg-transparent")}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
        <a href="#top" aria-label={t("Room Board")} className="flex items-center text-lg"><Wordmark /></a>
        <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
          <a href="#features" className="transition-colors duration-150 hover:text-foreground">{t("المزايا")}</a>
          <a href="#story" className="transition-colors duration-150 hover:text-foreground">{t("كيف تعمل")}</a>
          <a href="#faq" className="transition-colors duration-150 hover:text-foreground">{t("أسئلة سريعة")}</a>
        </nav>
        <div className="flex items-center gap-2">
          <LanguageToggle />

          <Button variant="ghost" size="sm" onClick={onJoin}>{t("انضم بكود")}</Button>
          <Button size="sm" onClick={onCreate}>{t("ابدأ غرفة")}</Button>
        </div>
      </div>
    </header>
  )
}
