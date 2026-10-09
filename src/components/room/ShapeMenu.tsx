import { useRef, useState, type CSSProperties, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { Circle, Diamond, Minus, RectangleHorizontal, Square, Star, Triangle } from "lucide-react"
import type { Tool } from "@/lib/boardStore"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"

const ic = "h-[18px] w-[18px]"
const Oval = () => (
  <svg viewBox="0 0 24 24" className={ic} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><ellipse cx="12" cy="12" rx="10" ry="6.5" /></svg>
)

const SHAPES: { id: Tool; label: string; icon: ReactNode }[] = [
  { id: "rect", label: "مستطيل", icon: <RectangleHorizontal className={ic} /> },
  { id: "square", label: "مربع", icon: <Square className={ic} /> },
  { id: "circle", label: "دائرة", icon: <Circle className={ic} /> },
  { id: "ellipse", label: "شكل بيضاوي", icon: <Oval /> },
  { id: "triangle", label: "مثلث", icon: <Triangle className={ic} /> },
  { id: "diamond", label: "معيّن", icon: <Diamond className={ic} /> },
  { id: "star", label: "نجمة", icon: <Star className={ic} /> },
  { id: "line", label: "خط مستقيم", icon: <Minus className={ic} /> },
]

const btn = "flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] text-foreground transition-colors duration-150 hover:bg-muted"

/** One toolbar button that opens a small grid of shapes (circle, square, triangle, star…). */
export function ShapeMenu({ tool, setTool, horizontal }: { tool: Tool; setTool: (t: Tool) => void; horizontal?: boolean }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [last, setLast] = useState<Tool>("rect")
  const [style, setStyle] = useState<CSSProperties>({})
  const ref = useRef<HTMLButtonElement>(null)
  const active = SHAPES.some((s) => s.id === tool)
  const shown = SHAPES.find((s) => s.id === (active ? tool : last)) || SHAPES[0]

  const toggle = () => {
    if (!open && ref.current) {
      const r = ref.current.getBoundingClientRect()
      const rtl = document.documentElement.dir === "rtl"
      if (horizontal) setStyle({ bottom: window.innerHeight - r.top + 8, left: Math.min(Math.max(8, r.left), window.innerWidth - 200) })
      else {
        const top = Math.min(r.top, window.innerHeight - 130)
        setStyle(rtl ? { top, right: window.innerWidth - r.left + 8 } : { top, left: r.right + 8 })
      }
    }
    setOpen((o) => !o)
  }
  const pick = (id: Tool) => { setTool(id); setLast(id); setOpen(false) }

  return (
    <>
      <button ref={ref} title={t("الأشكال")} aria-label={t("الأشكال")} aria-expanded={open} onClick={toggle}
        className={cn(btn, active && "bg-primary text-primary-foreground hover:bg-primary")}>
        {shown.icon}
      </button>
      {open && createPortal(
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
          <div className="fixed z-[61] grid w-[184px] grid-cols-4 gap-1 rounded-[8px] border-[1.5px] border-border bg-background p-1.5 shadow-lg" style={style}>
            {SHAPES.map((s) => (
              <button key={s.id} title={t(s.label)} aria-label={t(s.label)} onClick={() => pick(s.id)}
                className={cn(btn, tool === s.id && "bg-primary text-primary-foreground hover:bg-primary")}>
                {s.icon}
              </button>
            ))}
          </div>
        </>, document.body)}
    </>
  )
}
