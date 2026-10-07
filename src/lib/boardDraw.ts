import type { BoardObj } from "./boardStore"
import i18n from "./i18n"

export type Lookup = Map<string, BoardObj>
type Pt = { x: number; y: number }

// ---------- fonts ----------
export const FONTS = [
  { id: "Vazirmatn", label: "فازير", w: 600 },
  { id: "Cairo", label: "القاهرة", w: 600 },
  { id: "Tajawal", label: "تجوّل", w: 500 },
  { id: "Amiri", label: "أميري", w: 700 },
  { id: "Aref Ruqaa", label: "عارف رقعة", w: 700 },
  { id: "Reem Kufi", label: "ريم كوفي", w: 600 },
  { id: "Lalezar", label: "لالزار", w: 400 },
  { id: "Caveat", label: "Caveat", w: 600 },
]
export const TEXT_SIZES = [18, 28, 44, 72]

const fontOf = (id?: string) => FONTS.find((f) => f.id === id) || FONTS[0]
export const fontCss = (o: Pick<BoardObj, "font" | "size">) => {
  const f = fontOf(o.font)
  return `${f.w} ${o.size || 28}px "${f.id}", Vazirmatn, sans-serif`
}
export const fontFamily = (id?: string) => `"${fontOf(id).id}", Vazirmatn, sans-serif`
export const fontWeight = (id?: string) => fontOf(id).w

const fontsAsked = new Set<string>()
function ensureFont(id: string | undefined, redraw: () => void) {
  const f = fontOf(id)
  if (fontsAsked.has(f.id) || !document.fonts) return
  fontsAsked.add(f.id)
  document.fonts.load(`${f.w} 24px "${f.id}"`, "أبجد abc").then(redraw).catch(() => undefined)
}

const imgs = new Map<string, HTMLImageElement>()
export function getImg(url: string, redraw: () => void) {
  let i = imgs.get(url)
  if (!i) {
    i = new Image()
    i.crossOrigin = "anonymous"
    i.onload = redraw
    i.src = url
    imgs.set(url, i)
  }
  return i
}

let mctx: CanvasRenderingContext2D | null = null
function textSize(o: BoardObj) {
  mctx = mctx || document.createElement("canvas").getContext("2d")!
  mctx.font = fontCss(o)
  const lines = (o.text || "").split("\n")
  const lh = (o.size || 28) * 1.35
  const w = Math.max(...lines.map((l) => mctx!.measureText(l).width), 8)
  return { w, h: lines.length * lh, lh }
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  if ((ctx as any).roundRect) (ctx as any).roundRect(x, y, w, h, r)
  else ctx.rect(x, y, w, h)
}

// ---------- curved connectors ----------
function edge(b: number[], t: Pt) {
  const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2
  const hw = Math.max(1, (b[2] - b[0]) / 2), hh = Math.max(1, (b[3] - b[1]) / 2)
  const dx = t.x - cx, dy = t.y - cy
  if (Math.abs(dx) * hh > Math.abs(dy) * hw) { const s = dx >= 0 ? 1 : -1; return { p: { x: cx + s * hw, y: cy }, d: { x: s, y: 0 } } }
  const s = dy >= 0 ? 1 : -1
  return { p: { x: cx, y: cy + s * hh }, d: { x: 0, y: s } }
}
function free(p: Pt, t: Pt) {
  const dx = t.x - p.x, dy = t.y - p.y
  return Math.abs(dx) > Math.abs(dy) ? { p, d: { x: dx >= 0 ? 1 : -1, y: 0 } } : { p, d: { x: 0, y: dy >= 0 ? 1 : -1 } }
}
export function connectorCurve(o: BoardObj, objs?: Lookup): [Pt, Pt, Pt, Pt] {
  const A = o.from ? objs?.get(o.from) : undefined
  const B = o.to ? objs?.get(o.to) : undefined
  const ba = A ? objBounds(A, objs) : null, bb = B ? objBounds(B, objs) : null
  const sa = { x: o.x || 0, y: o.y || 0 }, sb = { x: o.x2 || 0, y: o.y2 || 0 }
  const ca = ba ? { x: (ba[0] + ba[2]) / 2, y: (ba[1] + ba[3]) / 2 } : sa
  const cb = bb ? { x: (bb[0] + bb[2]) / 2, y: (bb[1] + bb[3]) / 2 } : sb
  const e0 = ba ? edge(ba, cb) : free(sa, cb)
  const e1 = bb ? edge(bb, ca) : free(sb, ca)
  const k = Math.min(220, Math.max(30, Math.hypot(e1.p.x - e0.p.x, e1.p.y - e0.p.y) * 0.45))
  return [e0.p, { x: e0.p.x + e0.d.x * k, y: e0.p.y + e0.d.y * k }, { x: e1.p.x + e1.d.x * k, y: e1.p.y + e1.d.y * k }, e1.p]
}
const bez = (c: [Pt, Pt, Pt, Pt], t: number): Pt => {
  const u = 1 - t
  return {
    x: u * u * u * c[0].x + 3 * u * u * t * c[1].x + 3 * u * t * t * c[2].x + t * t * t * c[3].x,
    y: u * u * u * c[0].y + 3 * u * u * t * c[1].y + 3 * u * t * t * c[2].y + t * t * t * c[3].y,
  }
}

// ---------- drawing ----------
/** On the black board, dark ink is shown light so it stays readable (the stored colour is unchanged). */
export function viewColor(c: string, dark?: boolean) {
  if (!dark) return c
  const m = /^#([0-9a-f]{6})$/i.exec(c)
  if (!m) return c
  const n = parseInt(m[1], 16)
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
  return lum < 0.3 ? "#f1f5f9" : c
}

export function drawObj(ctx: CanvasRenderingContext2D, o: BoardObj, redraw: () => void, objs?: Lookup, dark?: boolean) {
  ctx.save()
  const col = viewColor(o.color, dark)
  ctx.strokeStyle = col
  ctx.fillStyle = col
  ctx.lineWidth = o.width
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  if (o.type === "pen" && o.pts?.length) {
    const p = o.pts
    ctx.beginPath()
    ctx.moveTo(p[0][0], p[0][1])
    if (p.length === 1) ctx.lineTo(p[0][0] + 0.01, p[0][1])
    else if (p.length < 3) p.forEach((q) => ctx.lineTo(q[0], q[1]))
    else {
      for (let i = 1; i < p.length - 1; i++) {
        ctx.quadraticCurveTo(p[i][0], p[i][1], (p[i][0] + p[i + 1][0]) / 2, (p[i][1] + p[i + 1][1]) / 2)
      }
      ctx.lineTo(p[p.length - 1][0], p[p.length - 1][1])
    }
    ctx.stroke()
  } else if (o.type === "arrow") {
    const { x = 0, y = 0, x2 = 0, y2 = 0 } = o
    const a = Math.atan2(y2 - y, x2 - x)
    const hl = 12 + o.width * 2.5
    ctx.beginPath()
    ctx.moveTo(x, y); ctx.lineTo(x2, y2)
    ctx.moveTo(x2 - hl * Math.cos(a - 0.45), y2 - hl * Math.sin(a - 0.45))
    ctx.lineTo(x2, y2)
    ctx.lineTo(x2 - hl * Math.cos(a + 0.45), y2 - hl * Math.sin(a + 0.45))
    ctx.stroke()
  } else if (o.type === "connector") {
    const [p0, c1, c2, p1] = connectorCurve(o, objs)
    const a = Math.atan2(p1.y - c2.y, p1.x - c2.x)
    const hl = 12 + o.width * 2.5
    ctx.beginPath()
    ctx.moveTo(p0.x, p0.y); ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, p1.x, p1.y)
    ctx.moveTo(p1.x - hl * Math.cos(a - 0.45), p1.y - hl * Math.sin(a - 0.45))
    ctx.lineTo(p1.x, p1.y)
    ctx.lineTo(p1.x - hl * Math.cos(a + 0.45), p1.y - hl * Math.sin(a + 0.45))
    ctx.stroke()
    ctx.beginPath(); ctx.arc(p0.x, p0.y, 2 + o.width * 0.6, 0, Math.PI * 2); ctx.fill()
  } else if (o.type === "rect") {
    const { x = 0, y = 0, x2 = 0, y2 = 0 } = o
    ctx.strokeRect(x, y, x2 - x, y2 - y)
  } else if (o.type === "text") {
    ensureFont(o.font, redraw)
    ctx.font = fontCss(o)
    ctx.textBaseline = "top"
    ctx.direction = "ltr"
    const lh = (o.size || 28) * 1.35
    ;(o.text || "").split("\n").forEach((ln, i) => ctx.fillText(ln, o.x || 0, (o.y || 0) + i * lh))
  } else if (o.type === "image" && o.url) {
    const im = getImg(o.url, redraw)
    if (im.complete && im.naturalWidth) ctx.drawImage(im, o.x || 0, o.y || 0, o.w || 200, o.h || 150)
    else { ctx.fillStyle = "#e5e7eb"; ctx.fillRect(o.x || 0, o.y || 0, o.w || 200, o.h || 150) }
    ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = 1
    ctx.strokeRect(o.x || 0, o.y || 0, o.w || 200, o.h || 150)
  } else if (o.type === "file") {
    const x = o.x || 0, y = o.y || 0, w = o.w || 240, h = o.h || 64
    rr(ctx, x, y, w, h, 6)
    ctx.fillStyle = "#ffffff"; ctx.fill()
    ctx.strokeStyle = "#229fb6"; ctx.lineWidth = 1.5; ctx.stroke()
    ctx.fillStyle = "#229fb6"; ctx.font = "600 11px Vazirmatn, sans-serif"; ctx.textBaseline = "top"
    ctx.fillText(i18n.t("ملف مرفوع"), x + 14, y + 12)
    ctx.fillStyle = "#1f2937"; ctx.font = "600 15px Vazirmatn, sans-serif"
    const nm = (o.name || i18n.t("ملف"))
    ctx.fillText(nm.length > 26 ? nm.slice(0, 25) + "…" : nm, x + 14, y + 32)
  }
  ctx.restore()
}

export function objBounds(o: BoardObj, objs?: Lookup): [number, number, number, number] {
  if (o.type === "pen" && o.pts?.length) {
    let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity
    o.pts.forEach(([px, py]) => { a = Math.min(a, px); b = Math.min(b, py); c = Math.max(c, px); d = Math.max(d, py) })
    const r = o.width / 2
    return [a - r, b - r, c + r, d + r]
  }
  if (o.type === "arrow" || o.type === "rect") {
    const { x = 0, y = 0, x2 = 0, y2 = 0 } = o
    return [Math.min(x, x2), Math.min(y, y2), Math.max(x, x2), Math.max(y, y2)]
  }
  if (o.type === "connector") {
    const cv = connectorCurve(o, objs)
    let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity
    for (let i = 0; i <= 12; i++) { const q = bez(cv, i / 12); a = Math.min(a, q.x); b = Math.min(b, q.y); c = Math.max(c, q.x); d = Math.max(d, q.y) }
    return [a, b, c, d]
  }
  if (o.type === "text") {
    const t = textSize(o)
    return [o.x || 0, o.y || 0, (o.x || 0) + t.w, (o.y || 0) + t.h]
  }
  return [o.x || 0, o.y || 0, (o.x || 0) + (o.w || 200), (o.y || 0) + (o.h || 100)]
}

function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay
  const l = dx * dx + dy * dy
  let t = l ? ((px - ax) * dx + (py - ay) * dy) / l : 0
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

export function hitObj(o: BoardObj, px: number, py: number, tol: number, objs?: Lookup) {
  const tl = tol + o.width / 2
  if (o.type === "pen" && o.pts) {
    if (o.pts.length === 1) return Math.hypot(px - o.pts[0][0], py - o.pts[0][1]) <= tl
    for (let i = 0; i < o.pts.length - 1; i++) {
      if (segDist(px, py, o.pts[i][0], o.pts[i][1], o.pts[i + 1][0], o.pts[i + 1][1]) <= tl) return true
    }
    return false
  }
  if (o.type === "arrow") return segDist(px, py, o.x || 0, o.y || 0, o.x2 || 0, o.y2 || 0) <= tl
  if (o.type === "connector") {
    const cv = connectorCurve(o, objs)
    let prev = bez(cv, 0)
    for (let i = 1; i <= 32; i++) {
      const q = bez(cv, i / 32)
      if (segDist(px, py, prev.x, prev.y, q.x, q.y) <= tl) return true
      prev = q
    }
    return false
  }
  const [a, b, c, d] = objBounds(o)
  if (o.type === "rect") {
    const inner = px > a + tl && px < c - tl && py > b + tl && py < d - tl
    return px >= a - tl && px <= c + tl && py >= b - tl && py <= d + tl && !inner
  }
  return px >= a && px <= c && py >= b && py <= d
}

/** Top-most object under the pointer. Boxes count as solid (rectangles can be grabbed from inside). */
export function pickObj(objs: Lookup, px: number, py: number, tol: number, opts: { elementsOnly?: boolean; exclude?: string; textOnly?: boolean } = {}) {
  const list = [...objs.values()].reverse()
  return list.find((o) => {
    if (o.id === opts.exclude) return false
    if (opts.textOnly) return o.type === "text" && hitObj(o, px, py, 0)
    if (opts.elementsOnly) {
      if (o.type === "connector") return false
      const [a, b, c, d] = objBounds(o)
      return px >= a - tol && px <= c + tol && py >= b - tol && py <= d + tol
    }
    if (o.type === "pen" || o.type === "arrow" || o.type === "connector") return hitObj(o, px, py, tol, objs)
    const [a, b, c, d] = objBounds(o)
    return px >= a - tol && px <= c + tol && py >= b - tol && py <= d + tol
  })
}

/** Scale an object around a fixed anchor point (used by the resize frame). */
export function scaleObj(o: BoardObj, kx: number, ky: number, ax: number, ay: number): BoardObj {
  const n: BoardObj = { ...o }
  let X = (v: number) => ax + (v - ax) * kx
  const Y = (v: number) => ay + (v - ay) * ky
  if (o.type === "text") {
    const base = o.size || 28
    const ns = Math.min(600, Math.max(8, base * kx))
    const k = ns / base
    n.size = Math.round(ns * 10) / 10
    n.x = ax + ((o.x || 0) - ax) * k; n.y = ay + ((o.y || 0) - ay) * k
    return n
  }
  if (o.pts) n.pts = o.pts.map(([x, y]) => [X(x), Y(y)])
  if (o.type === "image" || o.type === "file") {
    n.x = X(o.x || 0); n.y = Y(o.y || 0)
    n.w = Math.max(24, (o.w || 200) * kx); n.h = Math.max(24, (o.h || 100) * ky)
    return n
  }
  if (o.x !== undefined) n.x = X(o.x)
  if (o.y !== undefined) n.y = Y(o.y)
  if (o.x2 !== undefined) n.x2 = X(o.x2)
  if (o.y2 !== undefined) n.y2 = Y(o.y2)
  return n
}

/** The four corner handles (padded) with the opposite corner as anchor. */
export function handlesOf(o: BoardObj, objs: Lookup, s: number) {
  if (o.locked || o.type === "connector") return []
  const [a, b, c, d] = objBounds(o, objs), p = 6 / s
  const A = a - p, B = b - p, C = c + p, D = d + p
  return [
    { x: A, y: B, ax: C, ay: D, cur: "nwse-resize" },
    { x: C, y: B, ax: A, ay: D, cur: "nesw-resize" },
    { x: A, y: D, ax: C, ay: B, cur: "nesw-resize" },
    { x: C, y: D, ax: A, ay: B, cur: "nwse-resize" },
  ]
}

/** Small padlock badge (drawn in board units; s = current zoom). */
export function drawLock(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  const u = 1 / s
  ctx.save()
  ctx.setLineDash([])
  ctx.fillStyle = "#f5a524"; ctx.strokeStyle = "#f5a524"; ctx.lineWidth = 1.6 * u
  ctx.beginPath(); ctx.arc(x, y - 3 * u, 3.6 * u, Math.PI, 0); ctx.stroke()
  ctx.fillRect(x - 5.5 * u, y - 3 * u, 11 * u, 8.5 * u)
  ctx.restore()
}

export function moveObj(o: BoardObj, dx: number, dy: number): BoardObj {
  const n: BoardObj = { ...o }
  if (o.pts) n.pts = o.pts.map(([x, y]) => [x + dx, y + dy])
  if (o.x !== undefined) n.x = o.x + dx
  if (o.y !== undefined) n.y = o.y + dy
  if (o.x2 !== undefined) n.x2 = o.x2 + dx
  if (o.y2 !== undefined) n.y2 = o.y2 + dy
  if (o.type === "connector") { n.from = undefined; n.to = undefined }
  return n
}
