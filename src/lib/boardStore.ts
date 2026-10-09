export type Tool = "select" | "hand" | "pen" | "arrow" | "connector" | "rect" | "square" | "circle" | "ellipse" | "triangle" | "diamond" | "star" | "line" | "text" | "eraser"

export interface BoardObj {
  id: string
  type: "pen" | "arrow" | "connector" | "rect" | "ellipse" | "triangle" | "diamond" | "star" | "line" | "text" | "image" | "file"
  color: string
  width: number
  by: string
  pts?: number[][]
  x?: number; y?: number; x2?: number; y2?: number
  text?: string; size?: number; font?: string
  from?: string; to?: string
  url?: string; w?: number; h?: number; name?: string
  /** pinned: cannot be moved, resized, edited or deleted until unlocked */
  locked?: boolean; lockedBy?: string
  /** board (tab) this object lives on — missing = the first board */
  bd?: string
}
export interface BoardMeta { id: string; name: string }
export const MAIN_BOARD = "main"
export interface Cursor { x: number; y: number; name: string; color: string; t: number }

export class BoardStore {
  objects = new Map<string, BoardObj>()
  live = new Map<string, BoardObj>()
  liveT = new Map<string, number>()
  cursors = new Map<string, Cursor>()
  view = { x: 0, y: 0, s: 1 }
  size = { w: 0, h: 0 }
  keepAlive = false
  /** this user's own board background (white / black) — never shared */
  dark = false
  inited = false
  /** object being edited locally (hidden on canvas while the editor is open) */
  hideId: string | null = null
  selection = new Set<string>()
  /** the board (tab) THIS user is looking at — others can be on a different one */
  boardId = MAIN_BOARD
  boards = new Map<string, Map<string, BoardObj>>([[MAIN_BOARD, this.objects]])
  boardList: BoardMeta[] = [{ id: MAIN_BOARD, name: "" }]
  boardVer = 0
  private views = new Map<string, { x: number; y: number; s: number }>()
  /** resize handles are shown (select tool + edit permission) */
  canTransform = false
  private ls = new Set<() => void>()

  subscribe(fn: () => void) { this.ls.add(fn); return () => { this.ls.delete(fn) } }
  bump() { this.ls.forEach((f) => f()) }

  setLive(o: BoardObj) { this.live.set(o.id, o); this.liveT.set(o.id, Date.now()); this.bump() }
  removeLive(id: string) { this.live.delete(id); this.liveT.delete(id); this.bump() }
  commit(o: BoardObj) { this.live.delete(o.id); this.liveT.delete(o.id); this.objects.set(o.id, o); this.bump() }
  remove(id: string) { this.objects.delete(id); this.live.delete(id); this.selection.delete(id); this.bump() }
  clear() { this.objects.clear(); this.live.clear(); this.selection.clear(); this.bump() }

  mapOf(bd: string) { let m = this.boards.get(bd); if (!m) { m = new Map(); this.boards.set(bd, m) } return m }
  findObj(id: string) { for (const m of this.boards.values()) { const o = m.get(id); if (o) return o } return undefined }
  /** an object from anywhere (this board or another one) */
  putObj(o: BoardObj) { const bd = o.bd || MAIN_BOARD; if (bd === this.boardId) this.commit(o); else this.mapOf(bd).set(o.id, o) }
  removeAny(id: string) { this.boards.forEach((m) => m.delete(id)); this.remove(id) }
  clearBoard(bd: string) { if (bd === this.boardId) this.clear(); else this.mapOf(bd).clear() }

  switchBoard(id: string) {
    if (id === this.boardId || !this.boardList.some((b) => b.id === id)) return
    this.views.set(this.boardId, { ...this.view })
    this.boardId = id
    this.objects = this.mapOf(id)
    this.live.clear(); this.liveT.clear(); this.selection.clear(); this.cursors.clear(); this.hideId = null
    Object.assign(this.view, this.views.get(id) || { x: this.size.w / 2, y: this.size.h / 2, s: 1 })
    this.boardVer++; this.bump()
  }
  upsertBoard(b: BoardMeta) {
    const i = this.boardList.findIndex((x) => x.id === b.id)
    this.boardList = i < 0 ? [...this.boardList, b] : this.boardList.map((x) => (x.id === b.id ? { ...x, name: b.name } : x))
    this.mapOf(b.id); this.boardVer++; this.bump()
  }
  dropBoard(id: string) {
    if (id === MAIN_BOARD) return
    if (this.boardId === id) this.switchBoard(MAIN_BOARD)
    this.boardList = this.boardList.filter((b) => b.id !== id)
    this.boards.delete(id); this.views.delete(id)
    this.boardVer++; this.bump()
  }

  worldCenter() {
    const { x, y, s } = this.view
    return { x: (this.size.w / 2 - x) / s, y: (this.size.h / 2 - y) / s }
  }
  viewWorld() {
    const { x, y, s } = this.view
    return { x0: -x / s, y0: -y / s, x1: (this.size.w - x) / s, y1: (this.size.h - y) / s }
  }
  zoomAt(factor: number, cx: number, cy: number) {
    const v = this.view
    const ns = Math.min(4, Math.max(0.08, v.s * factor))
    const k = ns / v.s
    v.x = cx - (cx - v.x) * k
    v.y = cy - (cy - v.y) * k
    v.s = ns
    this.bump()
  }
}
