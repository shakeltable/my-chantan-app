import { useCallback, useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/chantan-db"
import type { Peer } from "@/lib/roomboard"

type Handler = (payload: any) => void
type Channel = ReturnType<typeof supabase.channel>

export function useRoomSession(code: string, initial: Peer) {
  const chRef = useRef<Channel | null>(null)
  const handlers = useRef(new Map<string, Set<Handler>>())
  const metaRef = useRef<Peer>(initial)
  const [peers, setPeers] = useState<Peer[]>([])
  const [status, setStatus] = useState<"connecting" | "ready" | "error">("connecting")
  /** ids of people really in the room — a presence "update" (cam/mic flag) must never look like leave+join */
  const known = useRef(new Set<string>())

  const emit = useCallback((ev: string, payload: any) => {
    handlers.current.get(ev)?.forEach((f) => f(payload))
  }, [])

  const on = useCallback((ev: string, fn: Handler) => {
    let set = handlers.current.get(ev)
    if (!set) { set = new Set(); handlers.current.set(ev, set) }
    set.add(fn)
    return () => { set!.delete(fn) }
  }, [])

  const send = useCallback((event: string, payload: any) => {
    chRef.current?.send({ type: "broadcast", event, payload })
  }, [])

  const updateMeta = useCallback((patch: Partial<Peer>) => {
    metaRef.current = { ...metaRef.current, ...patch }
    chRef.current?.track(metaRef.current)
  }, [])

  useEffect(() => {
    const me = metaRef.current
    known.current = new Set()
    const ch = supabase.channel(`roomboard:${code}`, {
      config: { broadcast: { self: false }, presence: { key: me.id } },
    })
    chRef.current = ch
    ch.on("broadcast", { event: "*" }, (m: any) => emit(m.event, m.payload))
      .on("presence", { event: "sync" }, () => {
        const st = ch.presenceState() as Record<string, any[]>
        const list = Object.values(st).map((a) => a[0] as Peer).filter(Boolean)
        list.sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0))
        setPeers(list)
      })
      .on("presence", { event: "join" }, ({ newPresences }: any) => {
        newPresences.forEach((p: Peer) => {
          if (p.id === me.id || known.current.has(p.id)) return
          known.current.add(p.id); emit("peer-join", p)
        })
      })
      .on("presence", { event: "leave" }, ({ leftPresences }: any) => {
        leftPresences.forEach((p: Peer) => {
          if (p.id === me.id) return
          const still = (ch.presenceState() as Record<string, any[]>)[p.id]
          if (still && still.length) return // only a status update (camera / mic / screen), not a real exit
          known.current.delete(p.id); emit("peer-leave", p)
        })
      })
      .subscribe(async (s: string) => {
        if (s === "SUBSCRIBED") { await ch.track(metaRef.current); setStatus("ready") }
        else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") setStatus("error")
      })
    return () => { chRef.current = null; supabase.removeChannel(ch) }
  }, [code, emit])

  return { peers, status, send, on, updateMeta }
}

export type Session = ReturnType<typeof useRoomSession>
