import { useEffect, useState } from "react"
import { Camera, Download } from "lucide-react"
import { supabase } from "@/lib/chantan-db"
import { ensureSession, getProfile } from "@/lib/roomboard"
import { downloadUrl } from "@/lib/download"
import { useTranslation } from "react-i18next"

export const fmtLeft = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}

export function useNow(step = 1000) {
  const [n, setN] = useState(Date.now())
  useEffect(() => { const i = window.setInterval(() => setN(Date.now()), step); return () => clearInterval(i) }, [step])
  return n
}

/** Live mm:ss countdown to a deadline. */
export function Left({ exp }: { exp: number }) {
  const now = useNow()
  return <span dir="ltr" className="inline-block font-mono font-bold tabular-nums">{fmtLeft(exp - now)}</span>
}

interface Snap { id: string; url: string; created_at: string; expires_at: string }

/** The pictures the host captured, with a live countdown — shown to everyone once the session has ended. */
export function SnapGallery({ code, className = "" }: { code: string; className?: string }) {
  const { t, i18n } = useTranslation()
  const [snaps, setSnaps] = useState<Snap[]>([])
  const now = useNow()
  useEffect(() => {
    let dead = false
    ;(async () => {
      const p = getProfile()
      if (p) await ensureSession(p)
      const { data } = await supabase.from("board_snaps").select("id,url,created_at,expires_at").eq("room_code", code)
        .gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(20)
      if (!dead) setSnaps((data as Snap[]) || [])
    })().catch(() => undefined)
    return () => { dead = true }
  }, [code])
  const live = snaps.filter((s) => new Date(s.expires_at).getTime() > now)
  if (!live.length) return null
  const last = Math.max(...live.map((s) => new Date(s.expires_at).getTime()))
  return (
    <div className={`rounded-[8px] border-[1.5px] border-border p-4 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-1.5 font-bold"><Camera className="h-4 w-4 text-accent" />{t("لقطات السبورة التي التقطها المسؤول")}</span>
        <span className="text-muted-foreground">{t("تُحذف بعد")} <Left exp={last} /></span>
      </div>
      <ul className="mt-3 space-y-2">
        {live.map((s) => (
          <li key={s.id} className="flex items-center gap-3">
            <img src={s.url} alt={t("لقطة السبورة")} loading="lazy" className="h-14 w-20 shrink-0 rounded-[4px] border border-border object-cover" />
            <div className="min-w-0 flex-1 text-xs text-muted-foreground">{new Date(s.created_at).toLocaleTimeString(i18n.language, { timeStyle: "short" })}</div>
            <button onClick={() => downloadUrl(s.url, "room-board-snapshot.png")} aria-label={t("تنزيل")} className="rounded-[6px] p-2 transition-colors duration-150 hover:bg-muted"><Download className="h-4 w-4" /></button>
          </li>
        ))}
      </ul>
    </div>
  )
}
