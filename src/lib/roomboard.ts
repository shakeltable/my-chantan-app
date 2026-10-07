import { supabase } from "@/lib/chantan-db"
import i18n from "@/lib/i18n"

export interface Profile { id: string; name: string; email: string; country: string }
export interface RoomRow { id: string; code: string; name: string; admin_id: string; created_at: string }
export interface Peer {
  id: string; name: string; country: string; isAdmin: boolean; color: string
  cam: boolean; mic: boolean; screen: boolean; joinedAt: number
  /** salted hash of the email (never the email itself) — lets the admin's ban cover the address */
  eh?: string
  /** the board (tab) this person is looking at right now */
  board?: string
}

const PROFILE_KEY = "roomboard:profile"
const CRED_KEY = "roomboard:cred"

export function getProfile(): Profile | null {
  try { const v = localStorage.getItem(PROFILE_KEY); return v ? JSON.parse(v) : null } catch { return null }
}
export function saveProfile(p: Profile) { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)) }

export const COUNTRY_CODES = [
  "SA", "AE", "EG", "MA", "DZ", "TN", "LY", "JO", "LB", "SY", "IQ", "KW", "QA", "BH", "OM", "YE", "PS", "SD", "MR", "SO", "DJ", "KM",
  "TR", "FR", "DE", "GB", "US", "CA", "ES", "IT", "NL", "BE", "CH", "SE", "BR", "IN", "PK", "ID", "MY", "CN", "JP", "RU", "AU",
]

const dnCache = new Map<string, any>()
export function countryName(code: string) {
  if (!code) return i18n.t("غير محدد")
  const lng = i18n.language || "ar"
  try {
    if (!dnCache.has(lng)) dnCache.set(lng, new (Intl as any).DisplayNames([lng], { type: "region" }))
    return dnCache.get(lng)?.of(code) || code
  } catch { return code }
}

export async function detectCountry(): Promise<string> {
  try {
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), 3000)
    const r = await fetch("https://ipapi.co/json/", { signal: ctl.signal })
    clearTimeout(timer)
    const j = await r.json()
    if (j?.country_code) return String(j.country_code).toUpperCase()
  } catch { /* fall back below */ }
  const m = (navigator.language || "").match(/-([A-Za-z]{2})$/)
  return m ? m[1].toUpperCase() : ""
}

export const PALETTE = ["#1f2937", "#229fb6", "#e5484d", "#f5a524", "#30a46c", "#3b82f6", "#e255a1"]
export function colorFor(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return PALETTE[1 + (h % (PALETTE.length - 1))]
}

export function makeCode() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789"
  let s = ""
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}
export function normalizeCode(s: string) { return s.trim().toLowerCase().replace(/[^a-z0-9]/g, "") }

/** Silent guest account so visitors can upload files. Returns false if unavailable. */
export async function ensureSession(p: Profile): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession()
    if (data.session) return true
    const stored = localStorage.getItem(CRED_KEY)
    if (stored) {
      const cred = JSON.parse(stored)
      const r = await supabase.auth.signInWithPassword(cred)
      if (!r.error && r.data.session) return true
    }
    const email = `guest-${p.id}@roomboard.app`
    const password = crypto.randomUUID() + "Aa1!"
    const r = await supabase.auth.signUp({ email, password, options: { data: { display_name: p.name } } })
    if (r.error || !r.data.session) return false
    localStorage.setItem(CRED_KEY, JSON.stringify({ email, password }))
    return true
  } catch { return false }
}

export async function uploadToRoom(code: string, file: File | Blob, ext?: string): Promise<string> {
  const name = file instanceof File ? file.name : ""
  const e = (ext || name.split(".").pop() || "bin").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || "bin"
  const path = `${code}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${e}`
  const { error } = await supabase.storage.from("chantan-public").upload(path, file, { contentType: file.type || undefined, upsert: false })
  if (error) throw new Error(error.message)
  return supabase.storage.from("chantan-public").getPublicUrl(path).data.publicUrl
}

export function formatSize(n?: number | null) {
  if (!n) return ""
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}
