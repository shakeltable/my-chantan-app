import { useEffect, useState } from "react"
import { Camera, Download, FileText, Image as ImageIcon } from "lucide-react"
import { supabase } from "@/lib/chantan-db"
import { formatSize } from "@/lib/roomboard"
import { downloadUrl } from "@/lib/download"
import { Left } from "./SnapGallery"
import { useTranslation } from 'react-i18next'

interface FileRow { id: string; name: string; url: string; mime: string | null; size: number | null; uploader: string | null; created_at: string }
interface Snap { id: string; url: string; created_at: string; expires_at: string }

export function FilesList({ code, refreshKey }: { code: string; refreshKey: number }) {
  const { t, i18n } = useTranslation()
  const [rows, setRows] = useState<FileRow[]>([])
  const [snaps, setSnaps] = useState<Snap[]>([])
  useEffect(() => {
    supabase.from("room_files").select("*").eq("room_code", code).order("created_at", { ascending: false }).limit(100)
      .then(({ data }) => setRows(((data as FileRow[]) || []).filter((f) => !f.name.startsWith("board-snapshot-"))))
    supabase.from("board_snaps").select("id,url,created_at,expires_at").eq("room_code", code)
      .gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => setSnaps((data as Snap[]) || []))
  }, [code, refreshKey])
  if (!rows.length && !snaps.length) return <p className="p-4 text-sm text-muted-foreground">{t("لم يُرفع أي ملف بعد. استخدم زر إدراج صورة أو ملف في شريط الأدوات، أو اسحب الملف وأفلته على السبورة.")}</p>
  return (
    <div>
      {snaps.length > 0 && (
        <div className="border-b border-border p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-bold"><Camera className="h-3.5 w-3.5 text-accent" />{t("لقطات المسؤول (تُحذف بعد 10 دقائق)")}</div>
          <ul className="space-y-2">
            {snaps.map((s) => (
              <li key={s.id} className="flex items-center gap-3">
                <img src={s.url} alt={t("لقطة السبورة")} loading="lazy" className="h-12 w-16 shrink-0 rounded-[4px] border border-border object-cover" />
                <div className="min-w-0 flex-1 text-xs text-muted-foreground">{new Date(s.created_at).toLocaleTimeString(i18n.language, { timeStyle: "short" })}<br />{t("تُحذف بعد")} <Left exp={new Date(s.expires_at).getTime()} /></div>
                <button onClick={() => downloadUrl(s.url, "room-board-snapshot.png")} aria-label={t("تنزيل")} className="rounded-[6px] p-2 transition-colors duration-150 hover:bg-muted"><Download className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        </div>
      )}
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
    </div>
  )
}

export function FilesPanel({ code, refreshKey }: { code: string; refreshKey: number }) {
  return (
    <div className="h-full overflow-y-auto">
      <FilesList code={code} refreshKey={refreshKey} />
    </div>
  )
}
