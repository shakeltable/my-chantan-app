import { Lock, Mic, MousePointer2, MoveUpRight, Pencil, Square, Type } from "lucide-react"
import { useTranslation } from "react-i18next"

const AMBER = "#f5a524"

function Cursor({ name, color, className }: { name: string; color: string; className: string }) {
  return (
    <div className={`absolute z-10 ${className}`}>
      <MousePointer2 className="h-4 w-4 md:h-5 md:w-5" style={{ color, fill: color }} />
      <span className="ms-3 -mt-0.5 inline-block rounded-[4px] px-1.5 py-0.5 text-[9px] font-semibold text-white md:text-[11px]" style={{ background: color }}>{name}</span>
    </div>
  )
}

/** A coded preview of a live board: notes, curved connectors, a pen stroke, live cursors and chat. */
export function BoardMock() {
  const { t } = useTranslation()
  return (
    <div dir="ltr" className="relative mx-auto w-full max-w-[760px]">
      <div className="absolute inset-0 translate-x-3 translate-y-3 rounded-[10px] border-[1.5px] border-primary/25" aria-hidden />
      <div className="relative overflow-hidden rounded-[8px] border-[1.5px] border-primary bg-card shadow-[0_24px_48px_-28px_hsl(var(--foreground)/0.45)]">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="flex items-center gap-2 text-[11px] md:text-xs">
            <span className="h-2 w-2 rounded-full bg-success" />
            <span className="font-semibold">{t("Design sprint")}</span>
            <span className="font-mono text-muted-foreground">{t("k7m2xq")}</span>
          </div>
          <div className="flex -space-x-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-accent text-[8px] font-bold text-white">{t("MA")}</span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-[#e255a1] text-[8px] font-bold text-white">{t("FR")}</span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-[#3b82f6] text-[8px] font-bold text-white">{t("US")}</span>
          </div>
        </div>
        <div className="relative aspect-[4/3]" style={{ backgroundImage: "radial-gradient(hsl(var(--foreground) / 0.2) 1px, transparent 1px)", backgroundSize: "22px 22px" }}>
          <svg viewBox="0 0 600 450" className="absolute inset-0 h-full w-full" fill="none" aria-hidden>
            <defs>
              <marker id="rb-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M1 1 L9 5 L1 9" fill="none" stroke="hsl(190 68% 42%)" strokeWidth="1.8" strokeLinecap="round" />
              </marker>
            </defs>
            <path pathLength={1} className="rb-draw" d="M 270 92 C 340 92, 290 224, 352 224" stroke="hsl(190 68% 42%)" strokeWidth="2.5" markerEnd="url(#rb-ah)" strokeLinecap="round" />
            <path pathLength={1} className="rb-draw" d="M 448 252 C 448 330, 340 322, 270 318" stroke="hsl(190 68% 42%)" strokeWidth="2.5" markerEnd="url(#rb-ah)" strokeLinecap="round" />
            <path pathLength={1} className="rb-draw" d="M 70 392 q 24 -26 48 0 t 48 0 t 48 0 t 48 0" stroke="#e5484d" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <div className="absolute left-[14%] top-[14%] w-[31%] rounded-[4px] border-2 border-accent bg-background px-2.5 py-2 text-[11px] font-bold md:text-sm">{t("Launch plan")}</div>
          <div className="absolute left-[58%] top-[46%] w-[32%] rounded-[4px] border-2 border-primary bg-background px-2.5 py-2 text-[11px] font-bold md:text-sm">{t("Customer interviews")}</div>
          <div className="absolute left-[18%] top-[64%] w-[26%] rounded-[4px] border-2 bg-[#f5a524]/25 px-2.5 py-2 text-[11px] font-semibold md:text-sm" style={{ borderColor: AMBER }}>
            {t("Ship Friday")}
            <Lock className="absolute -end-2 -top-2 h-4 w-4 rounded-full bg-background p-0.5" style={{ color: AMBER }} />
          </div>
          <Cursor name={t("Sara · MA")} color="#229fb6" className="rb-drift left-[48%] top-[26%]" />
          <Cursor name={t("Leo · FR")} color="#e255a1" className="rb-drift-b left-[34%] top-[52%]" />
          <div className="absolute left-2 top-1/2 flex -translate-y-1/2 flex-col gap-0.5 rounded-[6px] border border-border bg-background p-1">
            <span className="rounded-[4px] bg-primary p-1.5 text-primary-foreground"><Pencil className="h-3.5 w-3.5" /></span>
            <span className="p-1.5 text-muted-foreground"><MoveUpRight className="h-3.5 w-3.5" /></span>
            <span className="p-1.5 text-muted-foreground"><Type className="h-3.5 w-3.5" /></span>
            <span className="p-1.5 text-muted-foreground"><Square className="h-3.5 w-3.5" /></span>
          </div>
          <div className="absolute bottom-2 right-2 w-[44%] space-y-1 rounded-[6px] border border-border bg-background p-2 text-[9px] md:text-[11px]">
            <p><span className="font-bold text-[#e255a1]">{t("Leo")}</span> {t("Can I get the mic?")}</p>
            <p className="flex items-center gap-1"><Mic className="h-3 w-3 text-success" /><span className="font-bold">{t("Admin")}</span> {t("Mic granted")}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
