import { supabase } from "@/lib/chantan-db"

/** Host snapshots and the end-of-session attendee report live for ten minutes. */
export const SNAP_TTL = 10 * 60 * 1000
const BUCKET = "chantan-public"

const pathOf = (url: string) => {
  const i = url.indexOf(`/${BUCKET}/`)
  if (i < 0) return null
  try { return decodeURIComponent(url.slice(i + BUCKET.length + 2).split("?")[0]) } catch { return null }
}

/** The host's own expired items are removed for good: snapshot files + rows, and old attendee reports. */
export async function purgeMyExpired() {
  try {
    const now = new Date().toISOString()
    const { data: snaps } = await supabase.from("board_snaps").select("id,url").lt("expires_at", now).limit(100)
    if (snaps?.length) {
      const paths = (snaps as { url: string }[]).map((s) => pathOf(s.url)).filter(Boolean) as string[]
      if (paths.length) await supabase.storage.from(BUCKET).remove(paths)
      await supabase.from("board_snaps").delete().in("id", (snaps as { id: string }[]).map((s) => s.id))
    }
    await supabase.from("session_reports").delete().lt("expires_at", now)
  } catch { /* try again next time */ }
}
