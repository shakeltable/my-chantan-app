import { useEffect, useRef, useState } from "react"
import { ExternalLink, X } from "lucide-react"
import { randDelay, safeUrl, useAdConfig, useAds, type Ad } from "@/lib/ads"
import { logEvent } from "@/lib/tracking"
import { useTranslation } from "react-i18next"

const SHOW_MS = 20000

/** A small, dismissible ad card that appears at the top of the room every 2–5 minutes (never covers the board centre). */
export function AdPopup({ roomCode }: { roomCode?: string }) {
  const { t } = useTranslation()
  const ads = useAds("popup")
  const cfg = useAdConfig()
  const [shown, setShown] = useState<Ad | null>(null)
  const idx = useRef(Math.floor(Math.random() * 100))

  useEffect(() => {
    if (!ads.length) return
    let t1 = 0, t2 = 0
    const schedule = () => {
      t1 = window.setTimeout(() => {
        const ad = ads[idx.current++ % ads.length]
        setShown(ad)
        logEvent("ad_impression", { ad_id: ad.id, room_code: roomCode })
        t2 = window.setTimeout(() => { setShown(null); schedule() }, SHOW_MS)
      }, randDelay(cfg))
    }
    schedule()
    return () => { window.clearTimeout(t1); window.clearTimeout(t2) }
  }, [ads, cfg.min, cfg.max, roomCode])

  if (!shown) return null
  const link = safeUrl(shown.link_url)
  const img = safeUrl(shown.image_url)
  const click = () => { logEvent("ad_click", { ad_id: shown.id, room_code: roomCode }); if (link) window.open(link, "_blank", "noopener,noreferrer"); setShown(null) }

  return (
    <div className="fixed left-1/2 top-16 z-30 w-[min(22rem,calc(100vw-1.5rem))] -translate-x-1/2 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="relative rounded-[10px] border-[1.5px] border-border bg-background p-2.5 shadow-lg">
        <button aria-label={t("إغلاق")} onClick={() => setShown(null)} className="absolute end-1.5 top-1.5 rounded-[4px] p-1 transition-colors duration-150 hover:bg-muted"><X className="h-3.5 w-3.5" /></button>
        <button onClick={click} className="flex w-full items-start gap-3 pe-6 text-start">
          {img && <img src={img} alt="" className="h-14 w-14 shrink-0 rounded-[6px] object-cover" />}
          <span className="min-w-0 flex-1">
            <span className="mb-0.5 block text-[10px] font-semibold text-muted-foreground">{t("إعلان")}</span>
            <span className="block truncate text-sm font-bold">{t(shown.title)}</span>
            {shown.body && <span className="line-clamp-2 block text-xs text-muted-foreground">{t(shown.body)}</span>}
            {link && shown.cta && <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-accent">{shown.cta}<ExternalLink className="h-3 w-3" /></span>}
          </span>
        </button>
      </div>
    </div>
  )
}
