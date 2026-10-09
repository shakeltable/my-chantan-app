import { useCallback, useEffect, useReducer, useRef, useState, type RefObject } from "react"
import { Maximize, Minus, Plus } from "lucide-react"
import { BOX_SHAPES, drawLock, drawObj, fontFamily, fontWeight, handlesOf, hitObj, moveObj, objBounds, pickObj, scaleObj, viewColor } from "@/lib/boardDraw"
import { toast } from "sonner"
import { SelectionBar } from "./SelectionBar"
import { deleteSelection, duplicateSelection, objectsInRect, selectAll } from "@/lib/boardSelect"
import type { BoardObj, BoardStore, Tool } from "@/lib/boardStore"
import type { BoardActions } from "@/hooks/useBoardSync"
import { TextOptions } from "./TextOptions"
import { useTranslation } from 'react-i18next'

interface Props {
  store: BoardStore; actions: BoardActions
  me: { id: string; name: string; color: string }
  tool: Tool; color: string; setColor: (c: string) => void; width: number
  font: string; setFont: (f: string) => void
  textSize: number; setTextSize: (s: number) => void
  canvasRef: RefObject<HTMLCanvasElement>
  onDropFile: (f: File) => void
  /** false = view-only (the admin has not given this user edit permission) */
  canEdit: boolean
  dark: boolean
  isAdmin: boolean
}

const uid = () => crypto.randomUUID()
const SHAPE_OF: Partial<Record<Tool, BoardObj["type"]>> = { rect: "rect", square: "rect", circle: "ellipse", ellipse: "ellipse", triangle: "triangle", diamond: "diamond", star: "star", line: "line" }
interface Editor { id: string; wx: number; wy: number; existing: boolean }

export function Whiteboard({ store, actions, me, tool, color, setColor, width, font, setFont, textSize, setTextSize, canvasRef, onDropFile, canEdit, dark, isAdmin }: Props) {
  const { t } = useTranslation()
  const wrap = useRef<HTMLDivElement>(null)
  const cur = useRef<BoardObj | null>(null)
  const pan = useRef<{ x: number; y: number } | null>(null)
  const drag = useRef<{ sx: number; sy: number; origs: BoardObj[]; moved: boolean } | null>(null)
  const xform = useRef<{ h: { x: number; y: number; ax: number; ay: number }; orig: BoardObj; px: number; py: number; moved: boolean } | null>(null)
  const prevSel = useRef(0)
  const marq = useRef<{ x0: number; y0: number; x1: number; y1: number; add: boolean; base: Set<string>; moved: boolean } | null>(null)
  const erasing = useRef(false)
  const space = useRef(false)
  const textStart = useRef<{ wx: number; wy: number; hit?: BoardObj } | null>(null)
  const [editor, setEditor] = useState<Editor | null>(null)
  const [text, setText] = useState("")
  const [, force] = useReducer((n: number) => n + 1, 0)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const done = useRef(false)

  // ----- render loop -----
  useEffect(() => {
    let dirty = true
    let raf = 0
    const redraw = () => { dirty = true }
    const unsub = store.subscribe(redraw)
    const paint = () => {
      const c = canvasRef.current
      if (!c) return
      const ctx = c.getContext("2d")!
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const { w, h } = store.size
      const { x, y, s } = store.view
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.fillStyle = store.dark ? "#161a1e" : "#fbfbfa"
      ctx.fillRect(0, 0, c.width, c.height)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      let st = 32 * s
      while (st < 14) st *= 2
      if (s > 0.12) {
        ctx.fillStyle = store.dark ? "rgba(200,215,225,0.2)" : "rgba(60,80,90,0.24)"
        const ox = ((x % st) + st) % st, oy = ((y % st) + st) % st
        for (let px = ox; px < w; px += st) for (let py = oy; py < h; py += st) ctx.fillRect(px - 0.75, py - 0.75, 1.5, 1.5)
      }
      ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * x, dpr * y)
      const now = Date.now()
      const fresh = (id: string) => now - (store.liveT.get(id) || 0) < 6000
      // with many objects, skip the ones fully outside the visible area
      const vw = store.objects.size > 30 ? store.viewWorld() : null
      store.objects.forEach((o) => {
        if (o.id === store.hideId) return
        if (vw && o.type !== "connector") { const bb = objBounds(o, store.objects); if (bb[2] < vw.x0 - 40 || bb[0] > vw.x1 + 40 || bb[3] < vw.y0 - 40 || bb[1] > vw.y1 + 40) return }
        if (o.type === "text" && store.live.has(o.id) && fresh(o.id)) return
        drawObj(ctx, o, redraw, store.objects, store.dark)
        if (o.locked && o.type !== "connector") { const bb = objBounds(o, store.objects); drawLock(ctx, bb[2] - 8 / s, bb[1] - 12 / s, s) }
      })
      store.live.forEach((o, id) => { if (fresh(id)) drawObj(ctx, o, redraw, store.objects, store.dark) })
      store.selection.forEach((id) => {
        const sel = store.objects.get(id)
        if (!sel) return
        const [a, b, c2, d] = objBounds(sel, store.objects), pad = 6 / s
        ctx.strokeStyle = sel.locked ? "#f5a524" : "#229fb6"; ctx.lineWidth = 1.5 / s; ctx.setLineDash([6 / s, 4 / s])
        ctx.strokeRect(a - pad, b - pad, c2 - a + pad * 2, d - b + pad * 2)
      })
      ctx.setLineDash([])
      if (store.canTransform && store.selection.size === 1) {
        const so = store.objects.get([...store.selection][0])
        if (so) {
          const r = 6 / s
          ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#229fb6"; ctx.lineWidth = 2 / s
          handlesOf(so, store.objects, s).forEach((h) => { ctx.beginPath(); ctx.arc(h.x, h.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke() })
        }
      }
      const mq = marq.current
      if (mq && mq.moved) {
        ctx.fillStyle = "rgba(34,159,182,0.12)"; ctx.strokeStyle = "#229fb6"; ctx.lineWidth = 1.5 / s; ctx.setLineDash([5 / s, 4 / s])
        ctx.fillRect(Math.min(mq.x0, mq.x1), Math.min(mq.y0, mq.y1), Math.abs(mq.x1 - mq.x0), Math.abs(mq.y1 - mq.y0))
        ctx.strokeRect(Math.min(mq.x0, mq.x1), Math.min(mq.y0, mq.y1), Math.abs(mq.x1 - mq.x0), Math.abs(mq.y1 - mq.y0))
        ctx.setLineDash([])
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      store.cursors.forEach((cu) => {
        const sx = cu.x * s + x, sy = cu.y * s + y
        ctx.fillStyle = cu.color
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 4, sy + 16); ctx.lineTo(sx + 9, sy + 10); ctx.closePath(); ctx.fill()
        ctx.font = "600 11px Vazirmatn, sans-serif"; ctx.textBaseline = "middle"
        const tw = ctx.measureText(cu.name).width
        ctx.fillRect(sx + 10, sy + 14, tw + 10, 18)
        ctx.fillStyle = "#fff"; ctx.fillText(cu.name, sx + 15, sy + 23)
      })
    }
    const resize = () => {
      const el = wrap.current, c = canvasRef.current
      if (!el || !c) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = el.clientWidth, h = el.clientHeight
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr)
      c.style.width = w + "px"; c.style.height = h + "px"
      store.size = { w, h }
      if (!store.inited) { store.view.x = w / 2; store.view.y = h / 2; store.inited = true }
      dirty = true; store.bump()
    }
    const loop = () => { if (dirty || store.keepAlive) { dirty = false; paint() } raf = requestAnimationFrame(loop) }
    const ro = new ResizeObserver(resize)
    if (wrap.current) ro.observe(wrap.current)
    resize()
    raf = requestAnimationFrame(loop)
    const prune = window.setInterval(() => {
      const n = Date.now(); let ch = false
      store.cursors.forEach((cu, id) => { if (n - cu.t > 6000) { store.cursors.delete(id); ch = true } })
      if (ch) store.bump()
    }, 2000)
    return () => { cancelAnimationFrame(raf); ro.disconnect(); unsub(); clearInterval(prune) }
  }, [store, canvasRef])

  // ----- wheel (pan / zoom) -----
  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = c.getBoundingClientRect()
      if (e.ctrlKey || e.metaKey) store.zoomAt(Math.exp(-e.deltaY * 0.01), e.clientX - r.left, e.clientY - r.top)
      else { store.view.x -= e.deltaX; store.view.y -= e.deltaY; store.bump() }
    }
    c.addEventListener("wheel", onWheel, { passive: false })
    return () => c.removeEventListener("wheel", onWheel)
  }, [store, canvasRef])

  // ----- keys: space = temporary hand, Delete = remove selection -----
  useEffect(() => {
    const typing = (e: KeyboardEvent) => ["TEXTAREA", "INPUT", "SELECT"].includes((e.target as HTMLElement)?.tagName)
    const kd = (e: KeyboardEvent) => {
      if (typing(e)) return
      if (e.code === "Space") { space.current = true; e.preventDefault() }
      if (canEdit && (e.key === "Delete" || e.key === "Backspace") && store.selection.size) {
        deleteSelection(store, actions); e.preventDefault()
      }
      if (canEdit && store.canTransform) {
        const mod = e.ctrlKey || e.metaKey
        if (mod && e.key.toLowerCase() === "a") { selectAll(store); e.preventDefault() }
        else if (mod && e.key.toLowerCase() === "d" && store.selection.size) { duplicateSelection(store, actions, me.id); e.preventDefault() }
        else if (e.key === "Escape" && store.selection.size) { store.selection.clear(); store.bump() }
      }
    }
    const ku = (e: KeyboardEvent) => { if (e.code === "Space") space.current = false }
    window.addEventListener("keydown", kd); window.addEventListener("keyup", ku)
    return () => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku) }
  }, [store, actions, canEdit, me.id])

  useEffect(() => {
    store.canTransform = tool === "select" && canEdit
    if (canvasRef.current) canvasRef.current.style.cursor = ""
    if (!store.canTransform) store.selection.clear()
    store.bump()
  }, [tool, store, canEdit, canvasRef])
  // re-render the floating selection bar only while something is (or was just) selected
  useEffect(() => store.subscribe(() => { const n = store.selection.size; if (n || prevSel.current) force(); prevSel.current = n }), [store])
  useEffect(() => { store.dark = dark; store.bump() }, [dark, store])

  // keep the text editor glued to the board while panning/zooming
  useEffect(() => (editor ? store.subscribe(force) : undefined), [editor, store])

  // ----- real-time text: every keystroke / style change reaches everyone at once -----
  useEffect(() => {
    if (!editor) return
    const push = () => actions.sendLiveRemote({ id: editor.id, type: "text", text, x: editor.wx, y: editor.wy, size: textSize, font, color, width: 1, by: me.id })
    push()
    const iv = window.setInterval(push, 2500)
    return () => clearInterval(iv)
  }, [editor, text, font, textSize, color, actions, me.id])

  const pt = (e: { clientX: number; clientY: number }) => {
    const r = canvasRef.current!.getBoundingClientRect()
    const sx = e.clientX - r.left, sy = e.clientY - r.top
    const { x, y, s } = store.view
    return { sx, sy, wx: (sx - x) / s, wy: (sy - y) / s }
  }
  const tolW = () => 8 / store.view.s
  const handleAt = (wx: number, wy: number) => {
    const o = store.selection.size === 1 ? store.objects.get([...store.selection][0]) : undefined
    return o ? handlesOf(o, store.objects, store.view.s).find((h) => Math.hypot(h.x - wx, h.y - wy) <= 10 / store.view.s) : undefined
  }

  const eraseAt = (wx: number, wy: number) => {
    const hit = [...store.objects.values()].reverse().find((o) => !o.locked && hitObj(o, wx, wy, tolW(), store.objects))
    if (hit) actions.deleteObj(hit.id)
  }

  const openEditor = (o?: BoardObj, at?: { wx: number; wy: number }) => {
    if (o?.locked) { toast.info(t("النص مثبّت — ألغِ التثبيت لتعديله")); return }
    done.current = false
    if (o) {
      setFont(o.font || "Vazirmatn"); setTextSize(o.size || 28); setColor(o.color)
      setText(o.text || "")
      store.hideId = o.id
      setEditor({ id: o.id, wx: o.x || 0, wy: o.y || 0, existing: true })
    } else {
      setText("")
      setEditor({ id: uid(), wx: at!.wx, wy: at!.wy, existing: false })
    }
    store.bump()
    setTimeout(() => taRef.current?.focus(), 30)
  }

  const closeEditor = () => { setEditor(null); setText(""); store.hideId = null; store.bump() }

  const commitText = () => {
    if (!editor || done.current) return
    done.current = true
    const e = editor, v = text.trim()
    const prev = store.objects.get(e.id)
    closeEditor()
    if (v) actions.addObj({ id: e.id, type: "text", text: v, x: e.wx, y: e.wy, size: textSize, font, color, width: 1, by: prev?.by || me.id })
    else if (e.existing) actions.deleteObj(e.id)
    else actions.cancelLive(e.id)
  }
  const cancelText = () => {
    if (!editor || done.current) return
    done.current = true
    const e = editor
    closeEditor()
    actions.cancelLive(e.id)
  }

  // permission revoked while drawing / typing → drop the unfinished work
  useEffect(() => {
    if (canEdit) return
    cur.current = null; drag.current = null; xform.current = null; erasing.current = false; textStart.current = null; marq.current = null
    if (editor) cancelText()
  }, [canEdit]) // eslint-disable-line react-hooks/exhaustive-deps

  const onDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = pt(e)
    if (!canEdit || tool === "hand" || e.button === 1 || space.current) { pan.current = { x: e.clientX, y: e.clientY }; return }
    if (tool === "select") {
      const hd = handleAt(p.wx, p.wy)
      const sole = store.selection.size === 1 ? store.objects.get([...store.selection][0]) : undefined
      if (hd && sole) { xform.current = { h: hd, orig: { ...sole }, px: hd.x, py: hd.y, moved: false }; return }
      const hit = pickObj(store.objects, p.wx, p.wy, tolW())
      if (e.shiftKey && hit) {
        if (store.selection.has(hit.id)) store.selection.delete(hit.id); else store.selection.add(hit.id)
        store.bump(); return
      }
      if (!hit) {
        // empty spot: start a selection rectangle (Shift = add to the current selection)
        if (!e.shiftKey) store.selection.clear()
        marq.current = { x0: p.wx, y0: p.wy, x1: p.wx, y1: p.wy, add: e.shiftKey, base: new Set(store.selection), moved: false }
        store.bump(); return
      }
      else if (!store.selection.has(hit.id)) store.selection = new Set([hit.id])
      store.bump()
      if (hit && !hit.locked) {
        const multi = store.selection.size > 1
        const list = [...store.selection].map((id) => store.objects.get(id)).filter((o): o is BoardObj => !!o && !o.locked && !(multi && o.type === "connector"))
        if (list.length) drag.current = { sx: p.wx, sy: p.wy, origs: list.map((o) => ({ ...o })), moved: false }
      }
      return
    }
    if (tool === "pen") cur.current = { id: uid(), type: "pen", color, width, by: me.id, pts: [[p.wx, p.wy]] }
    else if (tool === "arrow" || SHAPE_OF[tool]) cur.current = { id: uid(), type: tool === "arrow" ? "arrow" : SHAPE_OF[tool]!, color, width, by: me.id, x: p.wx, y: p.wy, x2: p.wx, y2: p.wy }
    else if (tool === "connector") {
      const a = pickObj(store.objects, p.wx, p.wy, tolW(), { elementsOnly: true })
      cur.current = { id: uid(), type: "connector", color, width, by: me.id, x: p.wx, y: p.wy, x2: p.wx, y2: p.wy, from: a?.id }
    }
    else if (tool === "eraser") { erasing.current = true; eraseAt(p.wx, p.wy) }
    else if (tool === "text") textStart.current = { wx: p.wx, wy: p.wy, hit: pickObj(store.objects, p.wx, p.wy, 0, { textOnly: true }) }
    if (cur.current) actions.sendLive({ ...cur.current })
  }

  const onMove = (e: React.PointerEvent) => {
    const p = pt(e)
    actions.sendCursor(p.wx, p.wy)
    if (tool === "select" && canEdit && !pan.current && !drag.current && !xform.current) {
      const hd = handleAt(p.wx, p.wy) as ({ cur?: string } | undefined)
      canvasRef.current!.style.cursor = hd?.cur || ""
    }
    if (xform.current) {
      const xf = xform.current
      const { ax, ay } = xf.h
      const vx = xf.px - ax, vy = xf.py - ay
      const ty = xf.orig.type
      const prop = ty === "text" || ty === "pen" || ty === "image" || ty === "file"
      const free = prop ? e.shiftKey && (ty === "image" || ty === "file") : !e.shiftKey
      const dx = p.wx - ax, dy = p.wy - ay
      let kx: number, ky: number
      if (free) { kx = Math.abs(vx) > 1 ? dx / vx : 1; ky = Math.abs(vy) > 1 ? dy / vy : 1 }
      else { kx = ky = (dx * vx + dy * vy) / (vx * vx + vy * vy || 1) }
      kx = Math.max(0.05, kx); ky = Math.max(0.05, ky)
      xf.moved = true
      const n = scaleObj(xf.orig, kx, ky, ax, ay)
      store.commit(n); actions.moveLive(n)
      return
    }
    if (marq.current) {
      const m = marq.current
      m.x1 = p.wx; m.y1 = p.wy
      if (!m.moved && Math.hypot(m.x1 - m.x0, m.y1 - m.y0) * store.view.s < 4) return
      m.moved = true
      store.selection = new Set([...m.base, ...objectsInRect(store, m.x0, m.y0, m.x1, m.y1)])
      store.bump(); return
    }
    if (pan.current) {
      store.view.x += e.clientX - pan.current.x
      store.view.y += e.clientY - pan.current.y
      pan.current = { x: e.clientX, y: e.clientY }
      store.bump(); return
    }
    if (drag.current) {
      const d = drag.current
      const dx = p.wx - d.sx, dy = p.wy - d.sy
      if (!d.moved && Math.hypot(dx, dy) * store.view.s < 3) return
      d.moved = true
      d.origs.forEach((orig) => { const n = moveObj(orig, dx, dy); store.commit(n); actions.moveLive(n) })
      return
    }
    if (erasing.current) { eraseAt(p.wx, p.wy); return }
    const o = cur.current
    if (!o) return
    if (o.type === "pen") {
      const last = o.pts![o.pts!.length - 1]
      if (Math.hypot(p.wx - last[0], p.wy - last[1]) * store.view.s < 2.5) return
      o.pts!.push([p.wx, p.wy])
    } else {
      o.x2 = p.wx; o.y2 = p.wy
      const ox = o.x || 0, oy = o.y || 0, ddx = p.wx - ox, ddy = p.wy - oy
      if (BOX_SHAPES.has(o.type) && (tool === "square" || tool === "circle" || e.shiftKey)) {
        // perfect square / circle (Shift on any box shape does the same)
        const m = Math.max(Math.abs(ddx), Math.abs(ddy))
        o.x2 = ox + (ddx < 0 ? -m : m); o.y2 = oy + (ddy < 0 ? -m : m)
      } else if (e.shiftKey && (o.type === "line" || o.type === "arrow")) {
        // snap to 45° steps
        const ang = Math.round(Math.atan2(ddy, ddx) / (Math.PI / 4)) * (Math.PI / 4), len = Math.hypot(ddx, ddy)
        o.x2 = ox + Math.cos(ang) * len; o.y2 = oy + Math.sin(ang) * len
      }
      if (o.type === "connector") o.to = pickObj(store.objects, p.wx, p.wy, tolW(), { elementsOnly: true, exclude: o.from })?.id
    }
    actions.sendLive({ ...o })
  }

  const onUp = (e: React.PointerEvent) => {
    pan.current = null
    if (marq.current) { marq.current = null; store.bump() }
    erasing.current = false
    const d = drag.current
    drag.current = null
    if (d?.moved) d.origs.forEach((orig) => { const n = store.objects.get(orig.id); if (n) actions.addObj({ ...n }) })
    const xf = xform.current
    xform.current = null
    if (xf?.moved) { const n = store.objects.get(xf.orig.id); if (n) actions.addObj({ ...n }) }
    const o = cur.current
    cur.current = null
    if (o) {
      const tiny = o.type !== "pen" && Math.hypot((o.x2 || 0) - (o.x || 0), (o.y2 || 0) - (o.y || 0)) * store.view.s < 4
      if (tiny) actions.cancelLive(o.id)
      else actions.addObj({ ...o })
    }
    if (tool === "text" && textStart.current) {
      const s = textStart.current; textStart.current = null
      s.hit ? openEditor(s.hit) : openEditor(undefined, s)
    }
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* ignore */ }
  }

  const onDouble = (e: React.MouseEvent) => {
    if (!canEdit || tool === "text" || tool === "hand") return
    const p = pt(e)
    const hit = pickObj(store.objects, p.wx, p.wy, 0, { textOnly: true })
    if (hit) openEditor(hit)
  }

  const fit = useCallback(() => {
    const objs = [...store.objects.values()]
    const { w, h } = store.size
    if (!objs.length) { store.view = { x: w / 2, y: h / 2, s: 1 }; store.bump(); return }
    let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity
    objs.forEach((o) => { const [x0, y0, x1, y1] = objBounds(o, store.objects); a = Math.min(a, x0); b = Math.min(b, y0); c = Math.max(c, x1); d = Math.max(d, y1) })
    const s = Math.min(2, Math.max(0.1, Math.min((w - 160) / (c - a || 1), (h - 160) / (d - b || 1))))
    store.view = { s, x: w / 2 - ((a + c) / 2) * s, y: h / 2 - ((b + d) / 2) * s }
    store.bump()
  }, [store])

  const zoom = (f: number) => store.zoomAt(f, store.size.w / 2, store.size.h / 2)
  const cursorCls = !canEdit || tool === "hand" ? "cursor-grab" : tool === "text" ? "cursor-text" : tool === "select" ? "cursor-default" : "cursor-crosshair"
  const zb = "flex h-8 w-8 items-center justify-center rounded-[6px] hover:bg-muted transition-colors duration-150"
  const { x: vx, y: vy, s: vs } = store.view
  const longest = Math.max(...text.split("\n").map((l) => l.length), 6)

  return (
    <div ref={wrap} className="absolute inset-0 overflow-hidden"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) onDropFile(f) }}>
      <canvas ref={canvasRef} className={`block ${cursorCls}`} style={{ touchAction: "none" }}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onDoubleClick={onDouble} />
      {canEdit && tool === "select" && !editor && <SelectionBar store={store} actions={actions} meId={me.id} isAdmin={isAdmin} />}
      {canEdit && (tool === "text" || editor) && (
        <TextOptions font={font} setFont={setFont} size={textSize} setSize={setTextSize} color={color} setColor={setColor}
          onChanged={() => setTimeout(() => taRef.current?.focus(), 0)} />
      )}
      {canEdit && editor && (
        <textarea ref={taRef} dir="auto" rows={text.split("\n").length} value={text} onChange={(e) => setText(e.target.value)}
          onBlur={(e) => { if ((e.relatedTarget as HTMLElement | null)?.closest?.("[data-textbar]")) return; commitText() }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitText() }
            if (e.key === "Escape") cancelText()
          }}
          placeholder={t("اكتب هنا…")}
          className="absolute z-20 resize-none overflow-hidden rounded-[4px] border border-dashed border-ring bg-transparent p-0 outline-none"
          style={{
            left: editor.wx * vs + vx, top: editor.wy * vs + vy, color: viewColor(color, dark),
            fontFamily: fontFamily(font), fontWeight: fontWeight(font), fontSize: textSize * vs, lineHeight: 1.35,
            width: Math.max(120, longest * textSize * vs * 0.62 + 12),
          }} />
      )}
      <div className="absolute bottom-3 start-3 z-20 flex items-center gap-0.5 rounded-[8px] border-[1.5px] border-border bg-background/95 p-1 backdrop-blur">
        <button className={zb} aria-label={t("تصغير")} onClick={() => zoom(0.8)}><Minus className="h-4 w-4" /></button>
        <button className={zb} aria-label={t("تكبير")} onClick={() => zoom(1.25)}><Plus className="h-4 w-4" /></button>
        <button className={zb} aria-label={t("احتواء المحتوى")} title={t("احتواء المحتوى")} onClick={fit}><Maximize className="h-4 w-4" /></button>
      </div>
    </div>
  )
}
