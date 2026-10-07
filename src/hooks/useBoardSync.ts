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

export function useBoardSync(
  store: BoardStore, session: Session, code: string,
  me: { id: string; name: string; color: string }, adminId: string,
): BoardActions {
  const { send, on } = session
  const lastLive = useRef(0)
  const lastMove = useRef(new Map<string, number>())
  const lastCur = useRef(0)

  useEffect(() => {
    let dead = false
    ;(async () => {
      let from = 0
      for (;;) {
        const { data, error } = await supabase.from("board_ops").select("op,obj_id,data")
          .eq("room_code", code).order("created_at", { ascending: true }).range(from, from + 999)
        if (error || dead) return
        data?.forEach((r: any) => {
          if (r.op === "add" && r.data) store.mapOf(r.data.bd || MAIN_BOARD).set(r.obj_id, r.data)
          else if (r.op === "del") store.boards.forEach((m) => m.delete(r.obj_id))
          else if (r.op === "clear") store.mapOf(r.data?.bd || MAIN_BOARD).clear()
          else if (r.op === "board-add" || r.op === "board-ren") store.upsertBoard({ id: r.obj_id, name: r.data?.name || "" })
          else if (r.op === "board-del") store.dropBoard(r.obj_id)
        })
        if (!data || data.length < 1000) break
        from += 1000
      }
      if (!dead) store.bump()
    })()
    return () => { dead = true }
  }, [store, code])

  useEffect(() => {
    const offs = [
      // a pinned object ignores any change that does not unpin it
      on("obj", (o: BoardObj) => { if (store.findObj(o.id)?.locked && o.locked) return; store.putObj(o) }),
      on("live", (o: BoardObj) => { if ((o.bd || MAIN_BOARD) === store.boardId) store.setLive(o) }),
      on("del", (p: { id: string }) => { if (store.findObj(p.id)?.locked) return; store.removeAny(p.id) }),
      on("livedel", (p: { id: string }) => store.removeLive(p.id)),
      on("clear", (p: { from: string; bd?: string }) => { if (p.from === adminId) store.clearBoard(p.bd || MAIN_BOARD) }),
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
      addObj: (o0) => { const o = tag(o0); store.putObj(o); send("obj", o); log({ op: "add", obj_id: o.id, data: o }) },
      deleteObj: (id) => { store.removeAny(id); send("del", { id }); log({ op: "del", obj_id: id }) },
      clearAll: () => { const bd = store.boardId; store.clear(); send("clear", { from: me.id, bd }); log({ op: "clear", data: { bd } }) },
      undo: () => {
        const mine = [...store.objects.values()].filter((o) => o.by === me.id && !o.locked)
        const last = mine[mine.length - 1]
        if (last) { store.remove(last.id); send("del", { id: last.id }); log({ op: "del", obj_id: last.id }) }
      },
      sendLive: (o0) => {
        const o = tag(o0)
        store.setLive(o)
        const n = Date.now()
        if (n - lastLive.current > 40) { lastLive.current = n; send("live", o) }
      },
      sendLiveRemote: (o) => send("live", tag(o)),
      cancelLive: (id) => { store.removeLive(id); send("livedel", { id }) },
      moveLive: (o) => {
        const n = Date.now()
        if (n - (lastMove.current.get(o.id) || 0) > 40) { lastMove.current.set(o.id, n); send("obj", tag(o)) }
      },
      sendCursor: (x, y) => {
        const n = Date.now()
        if (n - lastCur.current > 45) { lastCur.current = n; send("cursor", { id: me.id, name: me.name, color: me.color, x, y, bd: store.boardId }) }
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
