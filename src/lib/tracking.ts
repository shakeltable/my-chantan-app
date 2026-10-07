import { supabase } from "@/lib/chantan-db"

const VID_KEY = "roomboard:vid"
const w = window as any

export function visitorId() {
  let v = localStorage.getItem(VID_KEY)
  if (!v) { v = crypto.randomUUID(); localStorage.setItem(VID_KEY, v) }
  return v
}

export interface PixelIds { google: string; facebook: string; tiktok: string }
export const PIXEL_KEYS = { google: "pixel_google", facebook: "pixel_facebook", tiktok: "pixel_tiktok" } as const
/** Only plain IDs are accepted — never free-form scripts. */
export const PIXEL_RE = { google: /^(G|AW|GT)-[A-Z0-9]{4,20}$/i, facebook: /^\d{8,20}$/, tiktok: /^[A-Z0-9]{8,30}$/i }

let pixelsReady = false
let ids: PixelIds = { google: "", facebook: "", tiktok: "" }

function loadScript(src: string) {
  const s = document.createElement("script")
  s.async = true; s.src = src
  document.head.appendChild(s)
}

function bootGoogle(id: string) {
  loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`)
  w.dataLayer = w.dataLayer || []
  w.gtag = function () { w.dataLayer.push(arguments) }
  w.gtag("js", new Date())
  w.gtag("config", id, { send_page_view: false })
}
function bootFacebook(id: string) {
  if (w.fbq) return
  const n: any = (w.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments) })
  if (!w._fbq) w._fbq = n
  n.push = n; n.loaded = true; n.version = "2.0"; n.queue = []
  loadScript("https://connect.facebook.net/en_US/fbevents.js")
  w.fbq("init", id)
}
function bootTikTok(id: string) {
  const t = "ttq"
  w.TiktokAnalyticsObject = t
  const q: any = (w[t] = w[t] || [])
  q.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie"]
  q.setAndDefer = (o: any, m: string) => { o[m] = (...a: any[]) => o.push([m, ...a]) }
  q.methods.forEach((m: string) => q.setAndDefer(q, m))
  q.load = (e: string) => {
    q._i = q._i || {}; q._i[e] = []; q._t = q._t || {}; q._t[e] = +new Date()
    loadScript(`https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${encodeURIComponent(e)}&lib=${t}`)
  }
  q.load(id)
}

/** Fetch saved pixel IDs and boot each tracker once. */
export async function initPixels() {
  if (pixelsReady) return
  pixelsReady = true
  try {
    const { data } = await supabase.from("site_settings").select("key,value").in("key", Object.values(PIXEL_KEYS))
    const m: Record<string, string> = {}
    data?.forEach((r: any) => { m[r.key] = (r.value || "").trim() })
    if (PIXEL_RE.google.test(m[PIXEL_KEYS.google] || "")) { ids.google = m[PIXEL_KEYS.google]; bootGoogle(ids.google) }
    if (PIXEL_RE.facebook.test(m[PIXEL_KEYS.facebook] || "")) { ids.facebook = m[PIXEL_KEYS.facebook]; bootFacebook(ids.facebook) }
    if (PIXEL_RE.tiktok.test(m[PIXEL_KEYS.tiktok] || "")) { ids.tiktok = m[PIXEL_KEYS.tiktok]; bootTikTok(ids.tiktok) }
  } catch { /* pixels are optional */ }
  pixelPage()
}

function pixelPage() {
  try {
    if (ids.google) w.gtag?.("event", "page_view", { page_path: location.pathname })
    if (ids.facebook) w.fbq?.("track", "PageView")
    if (ids.tiktok) w.ttq?.page?.()
  } catch { /* ignore */ }
}

let lastPath = ""
/** Record a page view (own stats + every connected pixel). */
export function trackPage(path: string) {
  if (path.startsWith("/me-as-admin") || path === lastPath) return
  lastPath = path
  if (pixelsReady && (ids.google || ids.facebook || ids.tiktok)) pixelPage()
  logEvent("page_view", { path })
}

export function logEvent(type: string, extra: { room_code?: string; ad_id?: string; path?: string } = {}) {
  supabase.from("analytics_events")
    .insert({ id: crypto.randomUUID(), type, visitor_id: visitorId(), path: extra.path ?? location.pathname, room_code: extra.room_code ?? null, ad_id: extra.ad_id ?? null })
    .then(({ error }) => { if (error) console.warn(error.message) })
}

/** Custom event: own stats + pixels. */
export function trackEvent(type: string, extra: { room_code?: string; ad_id?: string } = {}) {
  logEvent(type, extra)
  try {
    if (ids.google) w.gtag?.("event", type)
    if (ids.facebook) w.fbq?.("trackCustom", type)
    if (ids.tiktok) w.ttq?.track?.(type)
  } catch { /* ignore */ }
}
