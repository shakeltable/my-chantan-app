import { cn } from "@/lib/utils"
import { useTranslation } from 'react-i18next'

const HEAVY = "Room"
const LIGHT = "Board"

/** Text-only English logo: "Room Board" — a brand mark, never translated, always left-to-right. */
export function Wordmark({ className }: { className?: string }) {
  const { t } = useTranslation()
  return (
    <span dir="ltr" translate="no" className={cn("inline-flex select-none items-baseline gap-[0.22em] font-display text-[1.2em] leading-none tracking-[-0.04em]", className)}>
      <span className="font-extrabold">{t(HEAVY)}</span>
      <span className="font-light text-accent">{t(LIGHT)}</span>
    </span>
  )
}
