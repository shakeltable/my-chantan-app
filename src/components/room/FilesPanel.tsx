import { useEffect, useState } from "react"
import { Download, FileText, Film, Image as ImageIcon } from "lucide-react"
import { supabase } from "@/lib/chantan-db"
import { formatSize } from "@/lib/roomboard"
import { useTranslation } from 'react-i18next'

interface FileRow { id: string; name: string; url: string; mime: string | null; size: number | null; uploader: string | null; created_at: string }
interface RecRow { id: string; name: string; url: string; duration_s: number | null; size: number | null; created_by: string | null; created_at: string }

function useRows<T>(table: string, code: string, refreshKey: number) {
  const [rows, setRows] = useState<T[]>([])
  useEffect(() => {
    supabase.from(table).select("*").eq("room_code", code).order("created_at", { ascending: false }).limit(100)
      .then(({ data }) => setRows((data as T[]) || []))
  }, [table, code, refreshKey])
  return rows
}

export function FilesList({ code, refreshKey }: { code: string; refreshKey: number }) {
  const { t } = useTranslation()
  const rows = useRows<FileRow>("room_files", code, refreshKey)
  if (!rows.length) return <p className="p-4 text-sm text-muted-foreground">{t("لم يُرفع أي ملف بعد. استخدم زر إدراج صورة أو ملف في شريط الأدوات، أو اسحب الملف وأفلته على السبورة.")}</p>
  return (
    <ul className="divide-y divide-border">
      {rows.map((f) => (
        <li key={f.id} className="flex items-center gap-3 px-4 py-3">
          {f.mime?.startsWith("image/") ? <ImageIcon className="h-5 w-5 shrink-0 text-accent" /> : <FileText className="h-5 w-5 shrink-0 text-accent" />}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{t(f.name)}</div>
            <div className="text-xs text-muted-foreground">{f.uploader} · {formatSize(f.size)}</div>
          </div>
          <a href={f.url} target="_blank" rel="noreferrer" download aria-label={t("تنزيل")} className="rounded-[6px] p-2 transition-colors duration-150 hover:bg-muted"><Download className="h-4 w-4" /></a>
        </li>
      ))}
    </ul>
  )
}

export function RecordingsList({ code, refreshKey }: { code: string; refreshKey: number }) {
  const { t } = useTranslation()
  const rows = useRows<RecRow>("recordings", code, refreshKey)
  const [open, setOpen] = useState<string | null>(null)
  if (!rows.length) return <p className="p-4 text-sm text-muted-foreground">{t("لا توجد تسجيلات محفوظة لهذه الغرفة. يستطيع المسؤول بدء التسجيل من الشريط العلوي.")}</p>
  return (
    <ul className="divide-y divide-border">
      {rows.map((r) => (
        <li key={r.id} className="px-4 py-3">
          <div className="flex items-center gap-3">
            <Film className="h-5 w-5 shrink-0 text-accent" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{t(r.name)}</div>
              <div className="text-xs text-muted-foreground">
                {r.duration_s ? `${Math.floor(r.duration_s / 60)}:${String(r.duration_s % 60).padStart(2, "0")} د · ` : ""}{formatSize(r.size)}
              </div>
            </div>
            <button onClick={() => setOpen(open === r.id ? null : r.id)} className="rounded-[6px] border border-border px-2.5 py-1 text-xs font-semibold transition-colors duration-150 hover:border-primary">
              {open === r.id ? t("إخفاء") : t("تشغيل")}
            </button>
            <a href={r.url} target="_blank" rel="noreferrer" download aria-label={t("تنزيل")} className="rounded-[6px] p-2 transition-colors duration-150 hover:bg-muted"><Download className="h-4 w-4" /></a>
          </div>
          {open === r.id && <video src={r.url} controls className="mt-3 w-full rounded-[6px] border border-border bg-black" />}
        </li>
      ))}
    </ul>
  )
}

export function FilesPanel({ code, refreshKey }: { code: string; refreshKey: number }) {
  const [tab, setTab] = useState<"files" | "recs">("files")
  const t = (on: boolean) => `flex-1 px-3 py-2.5 text-sm font-semibold border-b-2 transition-colors duration-150 ${on ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`
  return (
    <div className="flex h-full flex-col">
      <div className="flex border-b border-border">
        <button className={t(tab === "files")} onClick={() => setTab("files")}>الملفات</button>
        <button className={t(tab === "recs")} onClick={() => setTab("recs")}>التسجيلات</button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {tab === "files" ? <FilesList code={code} refreshKey={refreshKey} /> : <RecordingsList code={code} refreshKey={refreshKey} />}
      </div>
    </div>
  )
}
