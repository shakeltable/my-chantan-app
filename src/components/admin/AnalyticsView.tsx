import { useEffect, useMemo, useState } from "react"
import { Eye, DoorOpen, MousePointerClick, Users, MessageSquare, LayoutGrid } from "lucide-react"
import { supabase } from "@/lib/chantan-db"
import type { Ad } from "@/lib/ads"
import { useTranslation } from "react-i18next"

interface Ev { type: string; created_at: string; visitor_id: string | null; ad_id: string | null; room_code: string | null }
interface Totals { rooms: number; messages: number; members: number }

const day = (d: Date) => d.toISOString().slice(0, 10)

async function fetchEvents(since: string) {
  const out: Ev[] = []
  for (let from = 0; from < 20000; from += 1000) {
    const { data, error } = await supabase.from("analytics_events").select("type,created_at,visitor_id,ad_id,room_code")
      .gte("created_at", since).order("created_at", { ascending: true }).range(from, from + 999)
    if (error || !data) break
    out.push(...(data as Ev[]))
    if (data.length < 1000) break
  }
  return out
}
const count = async (table: string) => (await supabase.from(table).select("*", { count: "exact", head: true })).count || 0

export function AnalyticsView() {
  const { t, i18n } = useTranslation()
  const [days, setDays] = useState(14)
  const [events, setEvents] = useState<Ev[] | null>(null)
  const [ads, setAds] = useState<Ad[]>([])
  const [totals, setTotals] = useState<Totals | null>(null)

  useEffect(() => {
    setEvents(null)
    const since = new Date(Date.now() - days * 86400000); since.setHours(0, 0, 0, 0)
    fetchEvents(since.toISOString()).then(setEvents)
  }, [days])
  useEffect(() => {
    Promise.resolve(supabase.from("site_ads").select("*")).then(({ data }) => setAds((data as Ad[]) || []))
    Promise.all([count("rooms"), count("messages"), count("room_members")]).then(([rooms, messages, members]) => setTotals({ rooms, messages, members }))
  }, [])

  const s = useMemo(() => {
    const ev = events || []
    const views = ev.filter((e) => e.type === "page_view")
    const entries = ev.filter((e) => e.type === "room_enter")
    const perDay: Record<string, { v: number; r: number }> = {}
    for (let i = days - 1; i >= 0; i--) perDay[day(new Date(Date.now() - i * 86400000))] = { v: 0, r: 0 }
    views.forEach((e) => { const k = e.created_at.slice(0, 10); if (perDay[k]) perDay[k].v++ })
    entries.forEach((e) => { const k = e.created_at.slice(0, 10); if (perDay[k]) perDay[k].r++ })
    const adRows = ads.map((a) => {
      const imp = ev.filter((e) => e.type === "ad_impression" && e.ad_id === a.id).length
      const clk = ev.filter((e) => e.type === "ad_click" && e.ad_id === a.id).length
      return { a, imp, clk, ctr: imp ? (clk / imp) * 100 : 0 }
    })
    return {
      views: views.length, visitors: new Set(views.map((e) => e.visitor_id)).size,
      entries: entries.length, rooms: new Set(entries.map((e) => e.room_code)).size,
      imp: ev.filter((e) => e.type === "ad_impression").length, clk: ev.filter((e) => e.type === "ad_click").length,
      perDay: Object.entries(perDay), adRows,
    }
  }, [events, ads, days])

  const fmt = (n: number) => n.toLocaleString(i18n.language)
  const max = Math.max(1, ...s.perDay.map(([, d]) => Math.max(d.v, d.r)))
  const cards = [
    { icon: Eye, label: t("مشاهدات الصفحات"), v: s.views },
    { icon: Users, label: t("زوار فريدون"), v: s.visitors },
    { icon: DoorOpen, label: t("مرات دخول الغرف"), v: s.entries },
    { icon: LayoutGrid, label: t("غرف نشطة"), v: s.rooms },
    { icon: Eye, label: t("ظهور الإعلانات"), v: s.imp },
    { icon: MousePointerClick, label: t("نقرات الإعلانات"), v: s.clk },
  ]

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        {[7, 14, 30].map((d) => (
          <button key={d} onClick={() => setDays(d)}
            className={`rounded-[6px] border-[1.5px] px-3 py-1 text-sm font-semibold transition-colors duration-150 ${days === d ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`}>
            {t("آخر {{n}} يوم", { n: d })}
          </button>
        ))}
        {events === null && <span className="text-xs text-muted-foreground">{t("جارٍ التحميل…")}</span>}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-[8px] border-[1.5px] border-border bg-background p-4">
            <c.icon className="mb-2 h-4 w-4 text-accent" />
            <p className="text-3xl font-extrabold tabular-nums">{fmt(c.v)}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-[8px] border-[1.5px] border-border bg-background p-4">
        <div className="mb-3 flex items-center gap-4 text-xs font-semibold">
          <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-primary" />{t("مشاهدات الصفحات")}</span>
          <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-accent" />{t("دخول الغرف")}</span>
        </div>
        <div className="flex h-40 items-end gap-1">
          {s.perDay.map(([k, d]) => (
            <div key={k} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-0.5" title={`${k} — ${d.v} / ${d.r}`}>
              <div className="flex flex-1 items-end justify-center gap-px">
                <div className="w-full max-w-[10px] rounded-t-[2px] bg-primary" style={{ height: `${(d.v / max) * 100}%` }} />
                <div className="w-full max-w-[10px] rounded-t-[2px] bg-accent" style={{ height: `${(d.r / max) * 100}%` }} />
              </div>
              <span className="truncate text-center text-[9px] text-muted-foreground" dir="ltr">{k.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-[8px] border-[1.5px] border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-xs text-muted-foreground">
            <tr><th className="p-3 text-start">{t("الإعلان")}</th><th className="p-3 text-start">{t("ظهور")}</th><th className="p-3 text-start">{t("نقرات")}</th><th className="p-3 text-start">{t("نسبة النقر")}</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {s.adRows.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">{t("لا توجد إعلانات بعد.")}</td></tr>}
            {s.adRows.map(({ a, imp, clk, ctr }) => (
              <tr key={a.id}><td className="p-3 font-semibold">{a.title}</td><td className="p-3 tabular-nums">{fmt(imp)}</td><td className="p-3 tabular-nums">{fmt(clk)}</td><td className="p-3 tabular-nums">{ctr.toFixed(1)}%</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      {totals && (
        <p className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5"><LayoutGrid className="h-4 w-4" />{t("إجمالي الغرف")}: <b className="text-foreground">{fmt(totals.rooms)}</b></span>
          <span className="flex items-center gap-1.5"><Users className="h-4 w-4" />{t("إجمالي المنضمّين")}: <b className="text-foreground">{fmt(totals.members)}</b></span>
          <span className="flex items-center gap-1.5"><MessageSquare className="h-4 w-4" />{t("إجمالي الرسائل")}: <b className="text-foreground">{fmt(totals.messages)}</b></span>
        </p>
      )}
    </div>
  )
}
