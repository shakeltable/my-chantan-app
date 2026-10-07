import { useState, type ReactNode } from "react"
import { ChevronUp, CircleDot, FolderOpen, MessageSquare, Mic, MicOff, Moon, MonitorUp, Square, Sun, Users, Video, VideoOff } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Media } from "@/hooks/useMedia"
import type { PanelId } from "./RoomTopBar"
import { useTranslation } from "react-i18next"

interface Props {
  media: Media; isAdmin: boolean; recOn: boolean; onToggleRec: () => void
  panel: PanelId; setPanel: (p: PanelId) => void; count: number
  dark: boolean; onToggleDark: () => void
  /** the drawing tools row */
  children: ReactNode
}

const KEY = "roomboard:dock"
const b = "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border-[1.5px] border-border transition-colors duration-150"
const on = "border-primary bg-primary text-primary-foreground"

/** Phone layout: everything except the board lives in this collapsible dock at the very bottom. */
export function MobileDock({ media, isAdmin, recOn, onToggleRec, panel, setPanel, count, dark, onToggleDark, children }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(() => localStorage.getItem(KEY) === "open")
  const toggle = () => setOpen((o) => { localStorage.setItem(KEY, o ? "closed" : "open"); return !o })
  const pending = isAdmin ? media.requests.length : 0
  const canShare = !!navigator.mediaDevices?.getDisplayMedia
  const pan = (id: Exclude<PanelId, null>) => setPanel(panel === id ? null : id)

  return (
    <div className="shrink-0 border-t-[1.5px] border-border bg-background pb-[env(safe-area-inset-bottom)]">
      <button onClick={toggle} aria-expanded={open}
        className="flex h-8 w-full items-center justify-center gap-2 text-xs font-semibold text-muted-foreground transition-colors duration-150 hover:text-foreground">
        <span>{open ? t("إخفاء الأدوات") : t("الأدوات والإعدادات")}</span>
        {!open && pending > 0 && <span className="rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">{pending}</span>}
        <ChevronUp className={cn("h-4 w-4 transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && (
        <>
          <div className="flex items-center gap-1.5 overflow-x-auto border-t border-border px-2 py-1.5">
            <button className={cn(b, media.camOn && on)} onClick={media.toggleCam} aria-label={t("الكاميرا")}>{media.camOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}</button>
            <button className={cn(b, media.micOn && on)} onClick={media.toggleMic} aria-label={t("الميكروفون")}>{media.micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}</button>
            {canShare && <button className={cn(b, media.screenOn && on)} onClick={media.toggleScreen} aria-label={t("مشاركة الشاشة")}><MonitorUp className="h-4 w-4" /></button>}
            <button className={b} onClick={onToggleDark} aria-label={t("لون خلفية السبورة")}>{dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
            {isAdmin && <button className={cn(b, recOn && "border-destructive bg-destructive text-destructive-foreground")} onClick={onToggleRec} aria-label={t("تسجيل")}>{recOn ? <Square className="h-4 w-4" /> : <CircleDot className="h-4 w-4" />}</button>}
            <div className="mx-0.5 h-6 w-px shrink-0 bg-border" />
            <button className={cn(b, panel === "chat" && on)} onClick={() => pan("chat")} aria-label={t("الدردشة")}><MessageSquare className="h-4 w-4" /></button>
            <button className={cn(b, "w-auto gap-1 px-2.5", panel === "people" && on)} onClick={() => pan("people")} aria-label={t("المشاركون")}>
              <Users className="h-4 w-4" /><span className="text-xs font-bold">{count}</span>
              {pending > 0 && <span className="absolute -top-1 -end-1 rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">{pending}</span>}
            </button>
            <button className={cn(b, panel === "files" && on)} onClick={() => pan("files")} aria-label={t("الملفات والتسجيلات")}><FolderOpen className="h-4 w-4" /></button>
          </div>
          {children}
        </>
      )}
    </div>
  )
}
