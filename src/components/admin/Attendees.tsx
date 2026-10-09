import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Copy, Download } from "lucide-react"
import { supabase } from "@/lib/chantan-db"
import { countryName } from "@/lib/roomboard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useTranslation } from "react-i18next"

interface Member { id: string; room_code: string; name: string; email: string; country: string; created_at: string }

/** Everyone who joined a room — their emails are visible here (the site owner) and nowhere else. */
export function Attendees() {
  const { t, i18n } = useTranslation()
  const [rows, setRows] = useState<Member[]>([])
  const [rooms, setRooms] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [room, setRoom] = useState("")

  useEffect(() => {
    Promise.all([
      supabase.from("room_members").select("*").order("created_at", { ascending: false }).limit(2000),
      supabase.from("rooms").select("code,name"),
    ]).then(([m, r]) => {
      setRows((m.data as Member[]) || [])
      setRooms(Object.fromEntries(((r.data as { code: string; name: string }[]) || []).map((x) => [x.code, x.name])))
      setLoading(false)
    })
  }, [])

  // one line per person per room
  const list = useMemo(() => {
    const seen = new Set<string>()
    const needle = q.trim().toLowerCase()
    return rows.filter((m) => {
      const k = `${m.room_code}|${(m.email || "").toLowerCase()}`
      if (seen.has(k)) return false
      seen.add(k)
      if (room && m.room_code !== room) return false
      return !needle || `${m.name} ${m.email}`.toLowerCase().includes(needle)
    })
  }, [rows, q, room])
  const unique = useMemo(() => new Set(list.map((m) => (m.email || "").toLowerCase())).size, [list])

  const copyAll = () => {
    navigator.clipboard?.writeText([...new Set(list.map((m) => m.email))].join(", "))
    toast.success(t("نُسخت الإيميلات"))
  }
  const csv = () => {
    const esc = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`
    const lines = [["name", "email", "country", "room", "joined"].join(",")].concat(
      list.map((m) => [m.name, m.email, countryName(m.country), rooms[m.room_code] || m.room_code, m.created_at].map(esc).join(",")))
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" }))
    a.download = "room-board-attendees.csv"; a.click(); URL.revokeObjectURL(a.href)
  }

  return (
    <div className="space-y-6">
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold">{t("حاضرو الغرف")}</h2>
            <p className="text-sm text-muted-foreground">{t("{{n}} بريد فريد · {{rows}} مشارك", { n: unique, rows: list.length })}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={copyAll} disabled={!list.length}><Copy className="me-1 h-4 w-4" />{t("نسخ الإيميلات")}</Button>
            <Button variant="outline" size="sm" onClick={csv} disabled={!list.length}><Download className="me-1 h-4 w-4" />{t("CSV")}</Button>
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("ابحث بالاسم أو البريد")} />
          <select value={room} onChange={(e) => setRoom(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm sm:w-56">
            <option value="">{t("كل الغرف")}</option>
            {Object.entries(rooms).map(([c, n]) => <option key={c} value={c}>{n} ({c})</option>)}
          </select>
        </div>
        <div className="mt-3 overflow-x-auto rounded-[8px] border-[1.5px] border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/60 text-start text-xs text-muted-foreground">
              <tr>{[t("الاسم"), t("البريد"), t("الدولة"), t("الغرفة"), t("تاريخ الانضمام")].map((h) => <th key={h} className="px-3 py-2 text-start font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">{t("جارٍ التحميل…")}</td></tr>}
              {!loading && !list.length && <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">{t("لا يوجد مشاركون بعد")}</td></tr>}
              {list.map((m) => (
                <tr key={m.id}>
                  <td className="px-3 py-2 font-semibold">{m.name}</td>
                  <td className="px-3 py-2" dir="ltr">{m.email}</td>
                  <td className="px-3 py-2">{countryName(m.country)}</td>
                  <td className="px-3 py-2">{rooms[m.room_code] || m.room_code}</td>
                  <td className="px-3 py-2 text-muted-foreground">{new Date(m.created_at).toLocaleString(i18n.language, { dateStyle: "medium", timeStyle: "short" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
