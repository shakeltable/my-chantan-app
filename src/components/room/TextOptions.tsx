import { FONTS, TEXT_SIZES } from "@/lib/boardDraw"
import { PALETTE } from "@/lib/roomboard"
import { cn } from "@/lib/utils"
import { useTranslation } from 'react-i18next'

interface Props {
  font: string; setFont: (f: string) => void
  size: number; setSize: (s: number) => void
  color: string; setColor: (c: string) => void
  onChanged: () => void
}

/** Floating bar shown while the text tool is active or a text is being edited. */
export function TextOptions({ font, setFont, size, setSize, color, setColor, onChanged }: Props) {
  const { t } = useTranslation()
  const done = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); onChanged() }
  return (
    <div data-textbar
      onMouseDown={(e) => { if ((e.target as HTMLElement).tagName !== "SELECT") e.preventDefault() }}
      className="absolute inset-x-0 top-3 z-30 mx-auto flex w-fit max-w-[94%] flex-wrap items-center justify-center gap-2 rounded-[8px] border-[1.5px] border-border bg-background/95 p-1.5 backdrop-blur">
      <select value={font} aria-label={t("الخط")} onChange={(e) => done(setFont)(e.target.value)}
        className="h-8 rounded-[6px] border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{ fontFamily: `"${font}", Vazirmatn, sans-serif` }}>
        {FONTS.map((f) => <option key={f.id} value={f.id} style={{ fontFamily: `"${f.id}", Vazirmatn, sans-serif` }}>{t(f.label)}</option>)}
      </select>
      <div className="flex items-center gap-0.5">
        {TEXT_SIZES.map((s, i) => (
          <button key={s} type="button" aria-label={t("حجم الخط")} title={t("حجم الخط")} onClick={() => done(setSize)(s)}
            className={cn("flex h-8 w-8 items-end justify-center rounded-[6px] pb-1 font-bold transition-colors duration-150 hover:bg-muted", size === s && "bg-primary text-primary-foreground hover:bg-primary")}>
            <span style={{ fontSize: 11 + i * 3, lineHeight: 1 }}>{t("Aa")}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1">
        {PALETTE.map((c) => (
          <button key={c} type="button" aria-label={t("لون الخط")} onClick={() => done(setColor)(c)}
            className={cn("h-5 w-5 rounded-full border border-border transition-transform duration-150 hover:scale-110", color === c && "ring-2 ring-ring ring-offset-1 ring-offset-background")}
            style={{ background: c }} />
        ))}
      </div>
    </div>
  )
}
