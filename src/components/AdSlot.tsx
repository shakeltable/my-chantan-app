import { useEffect, useRef, useState } from "react"
import { ExternalLink, X } from "lucide-react"
import { safeUrl, useAdConfig, useAds, useRotation, type Ad, type SlotPlacement } from "@/lib/ads"
import { logEvent } from "@/lib/tracking"
import { useTranslation } from "react-i18next"

function GoogleAd({ client, slot, compact }: { client: string; slot: string; compact: boolean }) {
  useEffect(() => {
    try { ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({}) } catch { /* blocked or not ready */ }
  }, [])
  return (
    <ins className="adsbygoogle" style={{ display: "block", width: "100%", minHeight: compact ? 50 : 100, maxHeight: compact ? 90 : undefined, overflow: "hidden" }}
      data-ad-client={client} data-ad-slot={slot} data-ad-format={compact ? "horizontal" : "auto"} data-full-width-responsive="true" />
  )
}

/** Shows the ads of one place, rotating to a different one every 2–5 minutes. Optionally mixes in a Google AdSense unit. */
export function AdSlot({ placement, roomCode }: { placement: Exclude<SlotPlacement, "popup">; roomCode?: string }) {
  const { t } = useTranslation()
  const ads = useAds(placement)
  const cfg = useAdConfig()
  const hasGoogle = !!(cfg.adsenseClient && cfg.adsenseSlot)
  const pool: (Ad | "google")[] = [...ads, ...(hasGoogle ? (["google"] as const) : [])]
  const i = useRotation(pool.length, cfg)
  const [closed, setClosed] = useState(false)
  const seen = useRef(new Set<string>())

  const item = pool.length ? pool[i % pool.length] : undefined
  const ad = item && item !== "google" ? item : undefined
  useEffect(() => {
    if (!ad || closed || seen.current.has(ad.id)) return
    seen.current.add(ad.id)
    logEvent("ad_impression", { ad_id: ad.id, room_code: roomCode })
  }, [ad, closed, roomCode])

  if (!item || closed) return null

  if (item === "google") {
    if (placement === "chat") return <div className="border-t border-border bg-muted/40 p-3"><GoogleAd key={i} client={cfg.adsenseClient} slot={cfg.adsenseSlot} compact={false} /></div>
    return (
      <div className={`flex shrink-0 items-center gap-3 bg-background px-3 py-1.5 ${placement === "top" ? "border-b-[1.5px] border-border" : "border-t-[1.5px] border-border"}`}>
        <div className="min-w-0 flex-1"><GoogleAd key={i} client={cfg.adsenseClient} slot={cfg.adsenseSlot} compact /></div>
        <button aria-label={t("إغلاق")} onClick={() => setClosed(true)} className="rounded-[4px] p-1 transition-colors duration-150 hover:bg-muted"><X className="h-3.5 w-3.5" /></button>
      </div>
    )
  }

  const link = safeUrl(item.link_url)
  const click = () => { logEvent("ad_click", { ad_id: item.id, room_code: roomCode }); if (link) window.open(link, "_blank", "noopener,noreferrer") }
  const img = safeUrl(item.image_url)

  if (placement === "chat") {
    return (
      <div className="border-t border-border bg-muted/40 p-3">
        <button key={item.id} onClick={click} className="flex w-full items-start gap-3 rounded-[8px] border-[1.5px] border-border bg-background p-2.5 text-start transition-colors duration-150 hover:border-accent">
          {img && <img src={img} alt="" className="h-14 w-14 shrink-0 rounded-[6px] object-cover" loading="lazy" />}
          <span className="min-w-0 flex-1">
            <span className="mb-0.5 block text-[10px] font-semibold text-muted-foreground">{t("إعلان")}</span>
            <span className="block truncate text-sm font-bold">{t(item.title)}</span>
            {item.body && <span className="line-clamp-2 block text-xs text-muted-foreground">{t(item.body)}</span>}
            {link && item.cta && <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-accent">{item.cta}<ExternalLink className="h-3 w-3" /></span>}
          </span>
        </button>
      </div>
    )
  }

  return (
    <div className={`flex shrink-0 items-center gap-3 bg-background px-3 py-1.5 ${placement === "top" ? "border-b-[1.5px] border-border" : "border-t-[1.5px] border-border"}`}>
      <span className="shrink-0 text-[10px] font-semibold text-muted-foreground">{t("إعلان")}</span>
      <button key={item.id} onClick={click} className="flex min-w-0 flex-1 items-center gap-3 text-start">
        {img && <img src={img} alt="" className="h-8 w-8 shrink-0 rounded-[4px] object-cover" loading="lazy" />}
        <span className="min-w-0 truncate text-sm"><b>{t(item.title)}</b>{item.body && <span className="text-muted-foreground"> — {t(item.body)}</span>}</span>
        {link && item.cta && <span className="hidden shrink-0 items-center gap-1 text-xs font-semibold text-accent sm:inline-flex">{item.cta}<ExternalLink className="h-3 w-3" /></span>}
      </button>
      <button aria-label={t("إغلاق")} onClick={() => setClosed(true)} className="rounded-[4px] p-1 transition-colors duration-150 hover:bg-muted"><X className="h-3.5 w-3.5" /></button>
    </div>
  )
}
