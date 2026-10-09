import { Eraser, Hand, Lock, ImagePlus, MousePointer2, MoveUpRight, Pencil, Spline, Trash2, Type, Undo2 } from "lucide-react"
import { ShapeMenu } from "./ShapeMenu"
import type { Tool } from "@/lib/boardStore"
import { PALETTE } from "@/lib/roomboard"
import { cn } from "@/lib/utils"
import { useTranslation } from 'react-i18next'

interface Props {
  tool: Tool; setTool: (t: Tool) => void
  color: string; setColor: (c: string) => void
  width: number; setWidth: (w: number) => void
  isAdmin: boolean
  canEdit: boolean; onRequestEdit: () => void
  onUndo: () => void; onClear: () => void; onPickFile: () => void
  /** phone layout: a scrolling row that sits BELOW the board instead of floating over it */
  horizontal?: boolean
}

const TOOLS: { id: Tool; label: string; icon: JSX.Element }[] = [
  { id: "select", label: "تحديد وتحريك العناصر", icon: <MousePointer2 className="h-[18px] w-[18px]" /> },
  { id: "hand", label: "تحريك السبورة", icon: <Hand className="h-[18px] w-[18px]" /> },
  { id: "pen", label: "قلم", icon: <Pencil className="h-[18px] w-[18px]" /> },
  { id: "arrow", label: "سهم", icon: <MoveUpRight className="h-[18px] w-[18px]" /> },
  { id: "connector", label: "سهم منحنٍ لربط العناصر", icon: <Spline className="h-[18px] w-[18px]" /> },
  { id: "text", label: "كتابة", icon: <Type className="h-[18px] w-[18px]" /> },
  { id: "eraser", label: "ممحاة", icon: <Eraser className="h-[18px] w-[18px]" /> },
]

const btn = "flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] text-foreground transition-colors duration-150 hover:bg-muted"

export function Toolbar({ tool, setTool, color, setColor, width, setWidth, isAdmin, canEdit, onRequestEdit, onUndo, onClear, onPickFile, horizontal }: Props) {
  const { t } = useTranslation()
  const H = !!horizontal
  const sep = <div className={cn("shrink-0 bg-border", H ? "mx-1 h-6 w-px" : "my-1 h-px w-6")} />
  if (!canEdit) {
    return (
      <div className={H
        ? "flex shrink-0 items-center justify-center gap-2 border-t-[1.5px] border-border bg-background px-3 py-1.5"
        : "absolute start-3 top-1/2 z-20 flex w-14 -translate-y-1/2 flex-col items-center gap-1 rounded-[8px] border-[1.5px] border-border bg-background/95 p-1.5 backdrop-blur"}>
        <Lock className={cn("h-[18px] w-[18px] text-muted-foreground", !H && "mt-1")} />
        <span className={cn("font-semibold leading-tight text-muted-foreground", H ? "text-xs" : "text-center text-[10px]")}>{t("عرض فقط")}</span>
        <button title={t("اطلب إذن التحرير من المسؤول")} aria-label={t("اطلب إذن التحرير من المسؤول")} onClick={onRequestEdit} className={btn}>
          <Pencil className="h-[18px] w-[18px]" />
        </button>
      </div>
    )
  }
  return (
    <div className={H
      ? "flex shrink-0 items-center gap-1 overflow-x-auto border-t-[1.5px] border-border bg-background px-2 py-1.5"
      : "absolute start-3 top-1/2 z-20 flex max-h-[88%] -translate-y-1/2 flex-col items-center gap-1 overflow-y-auto rounded-[8px] border-[1.5px] border-border bg-background/95 p-1.5 backdrop-blur"}>
      {TOOLS.map((tl) => (
        <span key={tl.id} className="contents">
          <button title={t(tl.label)} aria-label={t(tl.label)} onClick={() => setTool(tl.id)}
            className={cn(btn, tool === tl.id && "bg-primary text-primary-foreground hover:bg-primary")}>
            {tl.icon}
          </button>
          {tl.id === "connector" && <ShapeMenu tool={tool} setTool={setTool} horizontal={H} />}
        </span>
      ))}
      {sep}
      <div className={H ? "flex shrink-0 items-center gap-2 px-1" : "grid grid-cols-2 gap-1.5 p-0.5"}>
        {PALETTE.map((c) => (
          <button key={c} aria-label={t("لون")} onClick={() => setColor(c)}
            className={cn("shrink-0 rounded-full border border-border transition-transform duration-150 hover:scale-110", H ? "h-6 w-6" : "h-[18px] w-[18px]", color === c && "ring-2 ring-ring ring-offset-1 ring-offset-background")}
            style={{ background: c }} />
        ))}
      </div>
      {sep}
      <div className={cn("flex items-center gap-1", !H && "flex-col")}>
        {[2, 4, 8].map((w) => (
          <button key={w} title={t("سماكة الخط")} aria-label={t("سماكة الخط")} onClick={() => setWidth(w)}
            className={cn(btn, !H && "h-7", width === w && "bg-muted")}>
            <span className="block rounded-full bg-foreground" style={{ width: 18, height: w }} />
          </button>
        ))}
      </div>
      {sep}
      <button title={t("إدراج صورة أو ملف")} aria-label={t("إدراج صورة أو ملف")} onClick={onPickFile} className={btn}><ImagePlus className="h-[18px] w-[18px]" /></button>
      <button title={t("تراجع عن آخر عنصر لك")} aria-label={t("تراجع")} onClick={onUndo} className={btn}><Undo2 className="h-[18px] w-[18px]" /></button>
      {isAdmin && (
        <button title={t("مسح السبورة (للمسؤول)")} aria-label={t("مسح السبورة")} onClick={onClear} className={cn(btn, "text-destructive")}>
          <Trash2 className="h-[18px] w-[18px]" />
        </button>
      )}
    </div>
  )
}
