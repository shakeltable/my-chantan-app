import { moveObj, objBounds } from "@/lib/boardDraw"
import type { BoardObj, BoardStore } from "@/lib/boardStore"
import type { BoardActions } from "@/hooks/useBoardSync"

/** Every element of the current board whose frame touches the rectangle (board units). */
export function objectsInRect(store: BoardStore, x0: number, y0: number, x1: number, y1: number) {
  const a = Math.min(x0, x1), b = Math.min(y0, y1), c = Math.max(x0, x1), d = Math.max(y0, y1)
  const ids: string[] = []
  store.objects.forEach((o) => {
    const [oa, ob, oc, od] = objBounds(o, store.objects)
    if (oc >= a && oa <= c && od >= b && ob <= d) ids.push(o.id)
  })
  return ids
}

/** Delete all selected (unpinned) elements, plus arrows that were attached to them. Returns how many were removed. */
export function deleteSelection(store: BoardStore, actions: BoardActions) {
  const gone = new Set<string>()
  store.selection.forEach((id) => { const o = store.objects.get(id); if (o && !o.locked) gone.add(id) })
  store.objects.forEach((o) => {
    if (o.type === "connector" && !o.locked && ((o.from && gone.has(o.from)) || (o.to && gone.has(o.to)))) gone.add(o.id)
  })
  gone.forEach((id) => actions.deleteObj(id))
  store.selection.clear(); store.bump()
  return gone.size
}

/** Copy the selection a little to the side and select the copies. */
export function duplicateSelection(store: BoardStore, actions: BoardActions, meId: string) {
  const sel = [...store.selection].map((id) => store.objects.get(id)).filter((o): o is BoardObj => !!o && !o.locked)
  const map = new Map<string, string>()
  sel.forEach((o) => map.set(o.id, crypto.randomUUID()))
  const next = new Set<string>()
  sel.forEach((o) => {
    if (o.type === "connector") {
      if (!(o.from && o.to && map.has(o.from) && map.has(o.to))) return
      const n: BoardObj = { ...o, id: map.get(o.id)!, from: map.get(o.from), to: map.get(o.to), by: meId, locked: false, lockedBy: undefined }
      actions.addObj(n); next.add(n.id); return
    }
    const n = { ...moveObj(o, 28, 28), id: map.get(o.id)!, by: meId, locked: false, lockedBy: undefined }
    actions.addObj(n); next.add(n.id)
  })
  store.selection = next; store.bump()
  return next.size
}

/** Select everything on the current board. */
export function selectAll(store: BoardStore) {
  store.selection = new Set(store.objects.keys()); store.bump()
}
