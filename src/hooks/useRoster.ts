import { useCallback, useEffect, useRef } from "react"
import type { Profile } from "@/lib/roomboard"
import type { Session } from "./useRoomSession"

export interface RosterRow { id: string; name: string; email: string; country: string; joined: string }

/**
 * The host's browser keeps a list of everyone who was in the session (name, email, country),
 * so a report can be shown when the session ends. Others only send their own contact line to the host.
 */
export function useRoster(session: Session, profile: Profile, isAdmin: boolean, code: string) {
  const { peers, status, send, on } = session
  const key = `roomboard:roster:${code}`
  const map = useRef(new Map<string, RosterRow>())
  const save = useCallback(() => { try { localStorage.setItem(key, JSON.stringify([...map.current.values()])) } catch { /* ignore */ } }, [key])

  useEffect(() => {
    if (!isAdmin) return
    try { (JSON.parse(localStorage.getItem(key) || "[]") as RosterRow[]).forEach((r) => map.current.set(r.id, r)) } catch { /* ignore */ }
    map.current.set(profile.id, { id: profile.id, name: profile.name, email: profile.email, country: profile.country, joined: new Date().toISOString() })
    save()
  }, [isAdmin, key, profile.id, profile.name, profile.email, profile.country, save])

  useEffect(() => {
    if (!isAdmin) return
    let changed = false
    peers.forEach((p) => {
      const cur = map.current.get(p.id)
      if (!cur) { map.current.set(p.id, { id: p.id, name: p.name, email: "", country: p.country, joined: new Date(p.joinedAt || Date.now()).toISOString() }); changed = true }
      else if (cur.name !== p.name || cur.country !== p.country) { map.current.set(p.id, { ...cur, name: p.name, country: p.country }); changed = true }
    })
    if (changed) save()
  }, [peers, isAdmin, save])

  useEffect(() => {
    if (status !== "ready") return
    const hello = () => send("contact", { id: profile.id, email: profile.email })
    const offs = [
      on("contact", (m: any) => {
        if (!isAdmin || !m?.id || typeof m.email !== "string") return
        const cur = map.current.get(String(m.id))
        if (cur) map.current.set(cur.id, { ...cur, email: m.email.trim().toLowerCase() })
        else map.current.set(String(m.id), { id: String(m.id), name: "", email: m.email.trim().toLowerCase(), country: "", joined: new Date().toISOString() })
        save()
      }),
      on("contact-req", () => { if (!isAdmin) hello() }),
    ]
    const tm = window.setTimeout(() => (isAdmin ? send("contact-req", {}) : hello()), isAdmin ? 1500 : 1200)
    return () => { clearTimeout(tm); offs.forEach((f) => f()) }
  }, [status, send, on, isAdmin, profile.id, profile.email, save])

  return useCallback((): RosterRow[] => {
    map.current.set(profile.id, { ...(map.current.get(profile.id) as RosterRow), id: profile.id, name: profile.name, email: profile.email, country: profile.country, joined: map.current.get(profile.id)?.joined || new Date().toISOString() })
    return [...map.current.values()].filter((r) => r.name || r.email).sort((a, b) => a.joined.localeCompare(b.joined))
  }, [profile.id, profile.name, profile.email, profile.country])
}
