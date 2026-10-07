import { Wordmark } from "@/components/Wordmark"
import { CircleDot, Copy, FolderOpen, LogOut, MessageSquare, Mic, MicOff, Moon, MonitorUp, Sun, Power, Square, Users, Video, VideoOff } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Media } from "@/hooks/useMedia"
import { useTranslation } from 'react-i18next'

export type PanelId = "chat" | "people" | "files" | null

interface Props {
  roomName: string; code: string; isAdmin: boolean; media: Media
  recOn: boolean; recSeconds: number; onToggleRec: () => void
  panel: PanelId; setPanel: (p: PanelId) => void; count: number
  onCopy: () => void; onEnd: () => void; onLeave: () => void
  dark: boolean; onToggleDark: () => void
  /** phone: only the logo, room code and exit stay up here — the rest moves to the bottom dock */
  mobile?: boolean
}

export function RoomTopBar({ roomName, code, isAdmin, media, recOn, recSeconds, onToggleRec, panel, setPanel, count, onCopy, onEnd, onLeave, dark, onToggleDark, mobile }: Props) {
  const { t } = useTranslation()
  const mm = `${Math.floor(recSeconds / 60)}:${String(recSeconds % 60).padStart(2, "0")}`
  const tab = (id: Exclude<PanelId, null>) => cn("h-9 w-9 shrink-0", panel === id && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground")
  if (mobile) {
    return (
      <header className="flex h-11 shrink-0 items-center gap-2 border-b-[1.5px] border-border bg-background px-3">
        <Link to="/" className="flex shrink-0 items-center" aria-label={t("الصفحة الرئيسية")}><Wordmark className="text-base" /></Link>
        <button onClick={onCopy} className="flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground" title={t("نسخ رابط الدعوة")}>
          <span className="max-w-[7rem] truncate font-semibold text-foreground">{roomName}</span>
          <span dir="ltr" className="font-mono tracking-wider">{code}</span><Copy className="h-3 w-3 shrink-0" />
        </button>
        {recOn && <span className="flex items-center gap-1 text-[11px] font-bold text-destructive"><span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />{isAdmin ? mm : t("تسجيل")}</span>}
        <div className="ms-auto">
          {isAdmin ? (
            <Button variant="outline" size="icon" className="h-8 w-8 border-destructive text-destructive" onClick={onEnd} aria-label={t("إنهاء الجلسة")}><Power className="h-4 w-4" /></Button>
          ) : (
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={onLeave} aria-label={t("مغادرة")}><LogOut className="h-4 w-4 rtl:-scale-x-100" /></Button>
          )}
        </div>
      </header>
    )
  }
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b-[1.5px] border-border bg-background px-3">
      <Link to="/" className="flex shrink-0 items-center" aria-label={t("الصفحة الرئيسية")}><Wordmark className="text-lg" /></Link>
      <div className="mx-2 hidden h-6 w-px bg-border sm:block" />
      <div className="min-w-0">
        <div className="truncate text-sm font-bold leading-tight">{roomName}</div>
        <button onClick={onCopy} className="flex items-center gap-1 text-[11px] text-muted-foreground transition-colors duration-150 hover:text-foreground" title={t("نسخ رابط الدعوة")}>
          <span dir="ltr" className="font-mono tracking-wider">{code}</span><Copy className="h-3 w-3" />
        </button>
      </div>
      {recOn && (
        <div className="ms-2 flex items-center gap-1.5 rounded-[6px] border border-destructive px-2 py-1 text-xs font-bold text-destructive">
          <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />{t("تسجيل")} {isAdmin && mm}
        </div>
      )}
      <div className="ms-auto flex items-center gap-1">
        <Button variant={media.camOn ? "default" : "outline"} size="icon" className="h-9 w-9" onClick={media.toggleCam}
          title={media.allowed("cam") ? t("الكاميرا") : t("اطلب إذن الكاميرا من المسؤول")} aria-label={t("الكاميرا")}>
          {media.camOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
        </Button>
        <Button variant={media.micOn ? "default" : "outline"} size="icon" className="h-9 w-9" onClick={media.toggleMic}
          title={media.allowed("mic") ? t("الميكروفون") : t("اطلب إذن الميكروفون من المسؤول")} aria-label={t("الميكروفون")}>
          {media.micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        </Button>
        <Button variant="outline" size="icon" className="h-9 w-9" onClick={onToggleDark}
          title={dark ? t("خلفية السبورة: بيضاء") : t("خلفية السبورة: سوداء")} aria-label={t("لون خلفية السبورة")}>
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button variant={media.screenOn ? "default" : "outline"} size="icon" className="hidden h-9 w-9 sm:inline-flex" onClick={media.toggleScreen} title={t("مشاركة الشاشة")} aria-label={t("مشاركة الشاشة")}>
          <MonitorUp className="h-4 w-4" />
        </Button>
        {isAdmin && (
          <Button variant={recOn ? "destructive" : "outline"} size="icon" className="h-9 w-9" onClick={onToggleRec} title={recOn ? t("إيقاف التسجيل وحفظه") : t("بدء تسجيل الغرفة")} aria-label={t("تسجيل")}>
            {recOn ? <Square className="h-4 w-4" /> : <CircleDot className="h-4 w-4" />}
          </Button>
        )}
        <div className="mx-1 h-6 w-px bg-border" />
        <Button variant="ghost" size="icon" className={tab("chat")} onClick={() => setPanel(panel === "chat" ? null : "chat")} title={t("الدردشة")} aria-label={t("الدردشة")}><MessageSquare className="h-4 w-4" /></Button>
        <Button variant="ghost" className={cn(tab("people"), "w-auto gap-1 px-2")} onClick={() => setPanel(panel === "people" ? null : "people")} title={t("المشاركون")} aria-label={t("المشاركون")}><Users className="h-4 w-4" /><span className="text-xs font-bold">{count}</span></Button>
        <Button variant="ghost" size="icon" className={tab("files")} onClick={() => setPanel(panel === "files" ? null : "files")} title={t("الملفات والتسجيلات")} aria-label={t("الملفات والتسجيلات")}><FolderOpen className="h-4 w-4" /></Button>
        <div className="mx-1 h-6 w-px bg-border" />
        {isAdmin ? (
          <Button variant="outline" size="sm" className="h-9 gap-1.5 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={onEnd}>
            <Power className="h-4 w-4" /><span className="hidden md:inline">{t("إنهاء الجلسة")}</span>
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={onLeave}><LogOut className="h-4 w-4 rtl:-scale-x-100" /><span className="hidden md:inline">{t("مغادرة")}</span></Button>
        )}
      </div>
    </header>
  )
}
