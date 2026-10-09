import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Download, FileSpreadsheet, Loader2, Timer } from "lucide-react"
import { Wordmark } from "@/components/Wordmark"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/chantan-db"
import { countryName, ensureSession, getProfile } from "@/lib/roomboard"
import { downloadCsv, rowsToTsv } from "@/lib/download"
import { purgeMyExpired } from "@/lib/purge"
import type { RosterRow } from "@/hooks/useRoster"
import { Left, SnapGallery } from "./SnapGallery"
import { useTranslation } from "react-i18next"

interface Props { code: string; roomName: string; rows?: RosterRow[]; expiresAt?: number }

/** Shown to the host when the session ends: who attended (name, email, country), one-click Google Sheets / CSV. Deleted after ten minutes. */
export function SessionReport({ code, roomName, rows: given, expiresAt: exp }: Props) {
  const { t, i18n } = useTranslation()
  const [rows, setRows] = useState<RosterRow[] | null>(given ?? null)
  const [expires, setExpires] = useState<number>(exp ?? 0)

  useEffect(() => {
    if (given) return
    let dead = false
    ;(async () => {
      const p = getProfile()
      if (p) await ensureSession(p)
      await purgeMyExpired()
      const { data } = await supabase.from("session_reports").select("rows,expires_at").eq("room_code", code)
        .gt("expires_at", new Date().toISOString()).order("ended_at", { ascending: false }).limit(1)
      if (dead) return
      const r = data?.[0] as { rows: RosterRow[]; expires_at: string } | undefined
      setRows(r ? r.rows : []); setExpires(r ? new Date(r.expires_at).getTime() : 0)
    })()
    return () => { dead = true }
  }, [code, given])

  useEffect(() => {
    if (!expires) return
    const tm = window.setTimeout(() => { purgeMyExpired(); setRows([]); setExpires(0) }, Math.max(0, expires - Date.now()) + 1500)
    return () => clearTimeout(tm)
  }, [expires])

  const table = () => [["Name", "Email", "Country", "Joined"], ...(rows || []).map((r) => [r.name, r.email, countryName(r.country), r.joined])]
  const csv = () => downloadCsv(`room-board-${code}-attendees.csv`, table())
  /** one click: opens a new Google Sheet and puts the table on the clipboard, ready to paste in A1 */
  const sheets = () => {
    window.open("https://sheets.new", "_blank", "noopener")
    navigator.clipboard?.writeText(rowsToTsv(table()))
      .then(() => toast.success(t("تم نسخ البيانات. في Google Sheets اضغط على الخلية A1 ثم Ctrl+V (أو ⌘+V).")))
      .catch(() => toast.error(t("تعذّر النسخ. استعمل زر تنزيل CSV ثم استورده في Google Sheets.")))
  }

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-5 py-10">
      <Link to="/" aria-label={t("الصفحة الرئيسية")} className="text-xl"><Wordmark /></Link>
      <p className="mt-8 text-sm font-semibold text-accent">{t("انتهت الجلسة")}</p>
      <h1 className="mt-1 text-3xl font-extrabold">{roomName}</h1>
      <div className="mt-4 flex items-start gap-3 rounded-[8px] border-[1.5px] border-border bg-muted/50 p-3 text-sm">
        <Timer className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <span className="flex-1">
          {expires ? t("هذه البيانات تُحذف نهائيًا من قاعدة البيانات بعد 10 دقائق من نهاية الجلسة. نزّلها الآن.") : t("انتهت مدة حفظ هذه البيانات (10 دقائق).")}
        </span>
        {expires > 0 && <span className="rounded-[6px] bg-background px-2 py-0.5 text-base"><Left exp={expires} /></span>}
      </div>
      {rows === null ? (
        <div className="mt-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : !rows.length ? (
        <p className="mt-8 text-muted-foreground">{t("لا توجد بيانات حضور متاحة لهذه الجلسة، أو انتهت مدة حفظها.")}</p>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{t("{{n}} مشارك", { n: rows.length })}</p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={sheets}><FileSpreadsheet className="me-1.5 h-4 w-4" />{t("إرسال إلى Google Sheets")}</Button>
              <Button variant="outline" onClick={csv}><Download className="me-1.5 h-4 w-4" />{t("تنزيل CSV")}</Button>
            </div>
          </div>
          <div className="mt-3 overflow-x-auto rounded-[8px] border-[1.5px] border-border">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-muted/60 text-xs text-muted-foreground">
                <tr>{[t("الاسم"), t("البريد"), t("الدولة"), t("وقت الانضمام")].map((h) => <th key={h} className="px-3 py-2 text-start font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2 font-semibold">{r.name || "—"}</td>
                    <td className="px-3 py-2" dir="ltr">{r.email || "—"}</td>
                    <td className="px-3 py-2">{countryName(r.country)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{new Date(r.joined).toLocaleTimeString(i18n.language, { timeStyle: "short" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <SnapGallery code={code} className="mt-6" />
      <Button asChild variant="outline" className="mt-8"><Link to="/">{t("العودة إلى الرئيسية")}</Link></Button>
    </div>
  )
}
