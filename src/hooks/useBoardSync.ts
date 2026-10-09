import { useEffect, useMemo, useRef } from "react"
import { supabase } from "@/lib/chantan-db"
import { MAIN_BOARD, type BoardObj, type BoardStore } from "@/lib/boardStore"
import type { Session } from "./useRoomSession"

export interface BoardActions {
  addObj: (o: BoardObj) => void
  deleteObj: (id: string) => void
  clearAll: () => void
  undo: () => void
  sendLive: (o: BoardObj) => void
  /** broadcast a live copy to others only (instant, unthrottled) — used while typing text */
  sendLiveRemote: (o: BoardObj) => void
  cancelLive: (id: string) => void
  /** a moved object: update locally already done, push to others (throttled) */
  moveLive: (o: BoardObj) => void
  sendCursor: (x: number, y: number) => void
  /** multi-board (tabs) */
  addBoard: (name: string) => string
  renameBoard: (id: string, name: string) => void
  removeBoard: (id: string) => void
}

export const MAX_BOARDS = 20

interface OpRow { op: string; obj_id: string; data: any; created_at?: string }

/** Apply one saved operation. `heal` = a catch-up pass: it only fills in what is missing and never overwrites what is already on screen. */
function applyRow(store: BoardStore, gone: Set<string>, r: OpRow, heal: boolean) {
  if (r.op === "add" && r.data) {
    if (!heal) store.mapOf(r.data.bd || MAIN_BOARD).set(r.obj_id, r.data)
    else if (!gone.has(r.obj_id) && !store.findObj(r.obj_id)) store.putObj(r.data)
  } else if (r.op === "del") {
    gone.add(r.obj_id)
    if (!heal) store.boards.forEach((m) => m.delete(r.obj_id))
    else if (store.findObj(r.obj_id)) store.removeAny(r.obj_id)
  } else if (r.op === "clear" && !heal) store.mapOf(r.data?.bd || MAIN_BOARD).clear()
  else if (r.op === "board-add" || r.op === "board-ren") {
    const cur = store.boardList.find((b) => b.id === r.obj_id)
    const name = r.data?.name || ""
    if (!heal || !cur || cur.name !== name) store.upsertBoard({ id: r.obj_id, name })
  } else if (r.op === "board-del") {
    if (!heal || store.boardList.some((b) => b.id === r.obj_id)) store.dropBoard(r.obj_id)
  }
}

export function useBoardSync(
  store: BoardStore, session: Session, code: string,
  me: { id: string; name: string; color: string }, adminId: string,
): BoardActions {
  const { send, on } = session
  const lastLive = useRef(0)
  const lastMove = useRef(new Map<string, number>())
  const lastCur = useRef(0)
  const lastSeen = useRef("")
  /** ids removed (here or by someone else) — the catch-up pass must never bring them back */
  const gone = useRef(new Set<string>())

  useEffect(() => {
    let dead = false
    lastSeen.current = ""
    gone.current = new Set()
    ;(async () => {
      let from = 0
      for (;;) {
        const { data, error } = await supabase.from("board_ops").select("op,obj_id,data,created_at")
          .eq("room_code", code).order("created_at", { ascending: true }).range(from, from + 999)
        if (error || dead) return
        data?.forEach((r: any) => {
          if (r.created_at && r.created_at >= lastSeen.current) lastSeen.current = r.created_at
          applyRow(store, gone.current, r, false)
        })
        if (!data || data.length < 1000) break
        from += 1000
      }
      if (!dead) store.bump()
    })()
    return () => { dead = true }
  }, [store, code])

  // Catch-up: if a live message is dropped by the network, the saved operations still bring the missing shape to everyone within seconds.
  useEffect(() => {
    let busy = false
    const iv = window.setInterval(async () => {
      if (busy || document.hidden) return
      busy = true
      try {
        let q = supabase.from("board_ops").select("op,obj_id,data,created_at").eq("room_code", code)
          .order("created_at", { ascending: true }).limit(500)
        if (lastSeen.current) q = q.gte("created_at", lastSeen.current)
        const { data, error } = await q
        if (error || !data) return
        // a "clear" wipes every earlier object of that board in this batch (already cleared on screen) — mark them first
        const batchAdds = new Map<string, string>()
        data.forEach((r: any) => {
          if (r.op === "add" && r.data) batchAdds.set(r.obj_id, r.data.bd || MAIN_BOARD)
          else if (r.op === "clear") {
            const bd = r.data?.bd || MAIN_BOARD
            batchAdds.forEach((b, id) => { if (b === bd) { gone.current.add(id); batchAdds.delete(id) } })
          }
        })
        data.forEach((r: any) => {
          if (r.created_at && r.created_at >= lastSeen.current) lastSeen.current = r.created_at
          if (r.op !== "clear") applyRow(store, gone.current, r, true)
        })
      } finally { busy = false }
    }, 6000)
    return () => clearInterval(iv)
  }, [store, code])

  // Second delivery path: every saved operation also reaches everyone straight from the database, so a shape can never go missing
  useEffect(() => {
    const ch = supabase.channel(`ops:${code}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "board_ops", filter: `room_code=eq.${code}` }, (m: any) => {
        const r = m?.new
        if (!r) return
        if (r.created_at && r.created_at > lastSeen.current) lastSeen.current = r.created_at
        if (r.op === "clear") return
        applyRow(store, gone.current, r, true)
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [store, code])

  useEffect(() => {
    const offs = [
      // a pinned object ignores any change that does not unpin it
      on("obj", (o: BoardObj) => { if (store.findObj(o.id)?.locked && o.locked) return; store.putObj(o) }),
      on("live", (o: BoardObj) => { if ((o.bd || MAIN_BOARD) === store.boardId) store.setLive(o) }),
      on("del", (p: { id: string }) => { if (store.findObj(p.id)?.locked) return; gone.current.add(p.id); store.removeAny(p.id) }),
      on("livedel", (p: { id: string }) => store.removeLive(p.id)),
      on("clear", (p: { from: string; bd?: string }) => {
        if (p.from !== adminId) return
        const bd = p.bd || MAIN_BOARD
        store.mapOf(bd).forEach((_, id) => gone.current.add(id))
        store.clearBoard(bd)
      }),
      on("board-add", (b: { id: string; name: string }) => store.upsertBoard(b)),
      on("board-ren", (b: { id: string; name: string }) => store.upsertBoard(b)),
      on("board-del", (b: { id: string }) => store.dropBoard(b.id)),
      on("cursor", (c: any) => {
        if ((c.bd || MAIN_BOARD) !== store.boardId) { if (store.cursors.delete(c.id)) store.bump(); return }
        store.cursors.set(c.id, { x: c.x, y: c.y, name: c.name, color: c.color, t: Date.now() })
        store.bump()
      }),
      on("peer-leave", (p: { id: string }) => { store.cursors.delete(p.id); store.bump() }),
    ]
    return () => offs.forEach((f) => f())
  }, [store, on, adminId])

  return useMemo<BoardActions>(() => {
    const log = (row: Record<string, unknown>) => {
      supabase.from("board_ops").insert({ room_code: code, ...row }).then(({ error }) => { if (error) console.warn(error.message) })
    }
    /** every new object belongs to the board its author is looking at */
    const tag = (o: BoardObj): BoardObj => (o.bd ? o : { ...o, bd: store.boardId })
    return {
      addObj: (o0) => {
        const o = tag(o0); store.putObj(o); send("obj", o); log({ op: "add", obj_id: o.id, data: o })
        // a second copy a moment later covers a message lost on a busy connection (it sends whatever is on the board by then)
        window.setTimeout(() => { const cur = store.findObj(o.id); if (cur) send("obj", cur) }, 1200)
      },
      deleteObj: (id) => { gone.current.add(id); store.removeAny(id); send("del", { id }); log({ op: "del", obj_id: id }) },
      clearAll: () => {
        const bd = store.boardId
        store.objects.forEach((_, id) => gone.current.add(id))
        store.clear(); send("clear", { from: me.id, bd }); log({ op: "clear", data: { bd } })
      },
      undo: () => {
        const mine = [...store.objects.values()].filter((o) => o.by === me.id && !o.locked)
        const last = mine[mine.length - 1]
        if (last) { gone.current.add(last.id); store.remove(last.id); send("del", { id: last.id }); log({ op: "del", obj_id: last.id }) }
      },
      sendLive: (o0) => {
        const o = tag(o0)
        store.setLive(o)
        const n = Date.now()
        if (n - lastLive.current > 60) {
          lastLive.current = n
          // a long stroke is sent thinned out while drawing (the full stroke goes out when it is finished)
          const p = o.pts
          if (p && p.length > 120) { const k = Math.ceil(p.length / 120); send("live", { ...o, pts: p.filter((_, i) => i % k === 0 || i === p.length - 1) }) }
          else send("live", o)
        }
      },
      sendLiveRemote: (o) => send("live", tag(o)),
      cancelLive: (id) => { store.removeLive(id); send("livedel", { id }) },
      moveLive: (o) => {
        const n = Date.now()
        if (n - (lastMove.current.get(o.id) || 0) > 55) { lastMove.current.set(o.id, n); send("obj", tag(o)) }
      },
      sendCursor: (x, y) => {
        const n = Date.now()
        if (n - lastCur.current > 110) { lastCur.current = n; send("cursor", { id: me.id, name: me.name, color: me.color, x, y, bd: store.boardId }) }
      },
      addBoard: (name) => {
        const id = "b" + Math.random().toString(36).slice(2, 8)
        store.upsertBoard({ id, name }); store.switchBoard(id)
        send("board-add", { id, name }); log({ op: "board-add", obj_id: id, data: { name } })
        return id
      },
      renameBoard: (id, name) => {
        store.upsertBoard({ id, name }); send("board-ren", { id, name }); log({ op: "board-ren", obj_id: id, data: { name } })
      },
      removeBoard: (id) => {
        if (id === MAIN_BOARD) return
        store.dropBoard(id); send("board-del", { id }); log({ op: "board-del", obj_id: id })
      },
    }
  }, [store, send, code, me.id, me.name, me.color])
}
