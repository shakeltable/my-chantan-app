// chantan:role=admin
import { createClient } from "npm:@supabase/supabase-js@2"
import { corsHeaders, handleCors } from "../_shared/cors.ts"

// Housekeeping for the site owner (runs when /me-as-admin opens): removes only what is past its time limit.
//  - old screen recordings (3 hours)
//  - host board snapshots (1 hour): file + row (also the older ones saved in room_files)
//  - end-of-session attendee reports (1 hour)
const BUCKET = "chantan-public"
const HOUR = 60 * 60 * 1000

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } })

const pathOf = (url: unknown) => {
  if (typeof url !== "string") return null
  const i = url.indexOf(`/${BUCKET}/`)
  if (i < 0) return null
  try { return decodeURIComponent(url.slice(i + BUCKET.length + 2).split("?")[0]) } catch { return null }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handleCors()
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
    const out = { recordings: 0, snapshots: 0, reports: 0, files: 0 }
    const paths: string[] = []
    const nowIso = new Date().toISOString()

    const { data: recs } = await admin.from("recordings").select("id,url,parts").lt("created_at", new Date(Date.now() - 3 * HOUR).toISOString()).limit(200)
    for (const r of (recs || []) as { id: string; url: string; parts: string[] | null }[]) {
      const urls = Array.isArray(r.parts) && r.parts.length ? r.parts : [r.url]
      for (const u of urls) { const p = pathOf(u); if (p) paths.push(p) }
    }
    const { data: snaps } = await admin.from("board_snaps").select("id,url").lt("expires_at", nowIso).limit(200)
    for (const s of (snaps || []) as { id: string; url: string }[]) { const p = pathOf(s.url); if (p) paths.push(p) }
    const { data: old } = await admin.from("room_files").select("id,url").like("name", "board-snapshot-%").lt("created_at", new Date(Date.now() - HOUR).toISOString()).limit(200)
    for (const s of (old || []) as { id: string; url: string }[]) { const p = pathOf(s.url); if (p) paths.push(p) }

    if (paths.length) {
      const { error } = await admin.storage.from(BUCKET).remove(paths)
      if (error) return json({ error: error.message }, 500)
      out.files = paths.length
    }
    if (recs?.length) { await admin.from("recordings").delete().in("id", recs.map((r: { id: string }) => r.id)); out.recordings = recs.length }
    if (snaps?.length) { await admin.from("board_snaps").delete().in("id", snaps.map((s: { id: string }) => s.id)); out.snapshots += snaps.length }
    if (old?.length) { await admin.from("room_files").delete().in("id", old.map((s: { id: string }) => s.id)); out.snapshots += old.length }
    const { data: gone } = await admin.from("session_reports").delete().lt("expires_at", nowIso).select("id")
    out.reports = gone?.length || 0
    return json({ ok: true, ...out })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "failed" }, 500)
  }
})
