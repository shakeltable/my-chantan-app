import { supabase } from "@/lib/chantan-db"

export interface AccessRow {
  room_code: string; user_id: string
  pw_hash: string | null; pw_salt: string | null; pw_version: number
  banned_ids: string[]; banned_hashes: string[]
}

const enc = new TextEncoder()
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("")

export async function emailHash(code: string, email: string) {
  return hex(await crypto.subtle.digest("SHA-256", enc.encode(`${code}:${email.trim().toLowerCase()}`)))
}
const salt = () => hex(crypto.getRandomValues(new Uint8Array(16)).buffer)
async function derive(pw: string, s: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"])
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: enc.encode(s), iterations: 100000 }, key, 256))
}

export async function getAccess(code: string): Promise<AccessRow | null> {
  const { data, error } = await supabase.from("room_access").select("*").eq("room_code", code).maybeSingle()
  if (error) throw new Error(error.message)
  return (data as AccessRow) || null
}

/** Called by the room creator (or an older room's admin) to own the access settings. */
export async function createAccess(code: string, password?: string) {
  const s = password ? salt() : null
  const { error } = await supabase.from("room_access").insert({
    room_code: code, pw_salt: s, pw_hash: password && s ? await derive(password, s) : null, pw_version: password ? 1 : 0,
  })
  if (error) throw new Error(error.message)
}

async function update(code: string, patch: Record<string, unknown>) {
  const { data, error } = await supabase.from("room_access").update({ ...patch, updated_at: new Date().toISOString() })
    .eq("room_code", code).select("room_code")
  if (error) throw new Error(error.message)
  if (!data || !data.length) throw new Error("forbidden")
}

/** Empty password removes protection. People already inside the room stay in. */
export async function setRoomPassword(code: string, password: string) {
  const row = await getAccess(code)
  if (!row) return createAccess(code, password || undefined)
  const s = password ? salt() : null
  await update(code, { pw_salt: s, pw_hash: password && s ? await derive(password, s) : null, pw_version: (row.pw_version || 0) + 1 })
}

export async function banPerson(code: string, id: string, ehash?: string) {
  let row = await getAccess(code)
  if (!row) { await createAccess(code); row = await getAccess(code) }
  const ids = Array.from(new Set([...(row?.banned_ids || []), id]))
  const hashes = ehash ? Array.from(new Set([...(row?.banned_hashes || []), ehash])) : row?.banned_hashes || []
  await update(code, { banned_ids: ids, banned_hashes: hashes })
}

export async function verifyPassword(row: AccessRow, pw: string) {
  if (!row.pw_hash || !row.pw_salt) return true
  return (await derive(pw, row.pw_salt)) === row.pw_hash
}

export const isBanned = (row: AccessRow | null, id: string, eh: string) =>
  !!row && (row.banned_ids.includes(id) || row.banned_hashes.includes(eh))

const key = (code: string) => `roomboard:unlock:${code}`
const stamp = (row: AccessRow) => `${row.pw_version}:${row.pw_hash}`
export const isUnlocked = (row: AccessRow) => !row.pw_hash || localStorage.getItem(key(row.room_code)) === stamp(row)
export const markUnlocked = (row: AccessRow) => localStorage.setItem(key(row.room_code), stamp(row))
