import { useEffect, useRef } from "react"
import type { BoardStore } from "@/lib/boardStore"
import { BOX_SHAPES, objBounds, viewColor } from "@/lib/boardDraw"
import { useTranslation } from 'react-i18next'

export function Minimap({ store, compact }: { store: BoardStore; compact?: boolean }) {
  const { t } = useTranslation()
  const W = compact ? 104 : 176
  const H = compact ? 68 : 116
  const ref = useRef<HTMLCanvasElement>(null)
  const map = useRef({ minx: 0, miny: 0, m: 1 })
  const drag = useRef(false)

  useEffect(() => {
    const paint = () => {
      const c = ref.current
      if (!c) return
      const ctx = c.getContext("2d")!
      const dpr = window.devicePixelRatio || 1
      c.width = W * dpr; c.height = H * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      const vw = store.viewWorld()
      let a = vw.x0, b = vw.y0, cx = vw.x1, d = vw.y1
      store.objects.forEach((o) => {
        const [x0, y0, x1, y1] = objBounds(o, store.objects)
        a = Math.min(a, x0); b = Math.min(b, y0); cx = Math.max(cx, x1); d = Math.max(d, y1)
      })
      const pad = 30
      a -= pad; b -= pad; cx += pad; d += pad
      const m = Math.min(W / (cx - a), H / (d - b))
      const ox = (W - (cx - a) * m) / 2, oy = (H - (d - b) * m) / 2
      map.current = { minx: a - ox / m, miny: b - oy / m, m }
      const tx = (x: number) => (x - map.current.minx) * m
      const ty = (y: number) => (y - map.current.miny) * m
      store.objects.forEach((o) => {
        const vc = viewColor(o.color, store.dark); ctx.strokeStyle = vc; ctx.fillStyle = vc; ctx.lineWidth = 1
        if (o.type === "pen" && o.pts) {
          ctx.beginPath()
          o.pts.forEach((p, i) => (i ? ctx.lineTo(tx(p[0]), ty(p[1])) : ctx.moveTo(tx(p[0]), ty(p[1]))))
          ctx.stroke()
        } else if (o.type === "arrow" || o.type === "line") {
          ctx.beginPath(); ctx.moveTo(tx(o.x || 0), ty(o.y || 0)); ctx.lineTo(tx(o.x2 || 0), ty(o.y2 || 0)); ctx.stroke()
        } else if (o.type === "connector") {
          ctx.beginPath(); ctx.moveTo(tx(o.x || 0), ty(o.y || 0)); ctx.lineTo(tx(o.x2 || 0), ty(o.y2 || 0)); ctx.stroke()
        } else {
          const [x0, y0, x1, y1] = objBounds(o, store.objects)
          if (BOX_SHAPES.has(o.type)) ctx.strokeRect(tx(x0), ty(y0), (x1 - x0) * m, (y1 - y0) * m)
          else { ctx.globalAlpha = 0.35; ctx.fillRect(tx(x0), ty(y0), Math.max(2, (x1 - x0) * m), Math.max(2, (y1 - y0) * m)); ctx.globalAlpha = 1 }
        }
      })
      ctx.strokeStyle = "#229fb6"; ctx.lineWidth = 1.5
      ctx.fillStyle = "rgba(34,159,182,0.10)"
      const rx = tx(vw.x0), ry = ty(vw.y0), rw = (vw.x1 - vw.x0) * m, rh = (vw.y1 - vw.y0) * m
      ctx.fillRect(rx, ry, rw, rh); ctx.strokeRect(rx, ry, rw, rh)
    }
    paint()
    return store.subscribe(paint)
  }, [store, W, H])

  const go = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    const { minx, miny, m } = map.current
    const wx = (e.clientX - r.left) / m + minx
    const wy = (e.clientY - r.top) / m + miny
    store.view.x = store.size.w / 2 - wx * store.view.s
    store.view.y = store.size.h / 2 - wy * store.view.s
    store.bump()
  }

  return (
    <div className="absolute bottom-3 end-3 z-20 rounded-[8px] border-[1.5px] border-border bg-background/95 p-1 backdrop-blur">
      {!compact && <div className="px-1 pb-0.5 text-[10px] font-semibold text-muted-foreground">{t("الخريطة المصغّرة")}</div>}
      <canvas ref={ref} style={{ width: W, height: H, touchAction: "none" }} className="cursor-pointer rounded-[4px] bg-muted/60"
        onPointerDown={(e) => { drag.current = true; e.currentTarget.setPointerCapture(e.pointerId); go(e) }}
        onPointerMove={(e) => drag.current && go(e)}
        onPointerUp={() => { drag.current = false }} />
    </div>
  )
}
