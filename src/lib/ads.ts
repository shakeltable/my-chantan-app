import { useEffect, useState } from "react"
import { supabase } from "@/lib/chantan-db"

/** "any" = the ad rotates through every place (top, chat, bottom, popup). */
export type Placement = "chat" | "bottom" | "top" | "popup" | "any"
export type SlotPlacement = Exclude<Placement, "any">
export interface Ad {
  id: string; placement: Placement; title: string; body: string
  image_url: string | null; link_url: string; cta: string; active: boolean; sort_order: number
}

export const safeUrl = (u?: string | null) => (u && /^https?:\/\//i.test(u.trim()) ? u.trim() : "")

/* ---------- ads ---------- */
let cache: Promise<Ad[]> | null = null
export function loadAds(force = false): Promise<Ad[]> {
  if (!cache || force) {
    cache = Promise.resolve(
      supabase.from("site_ads").select("*").eq("active", true).order("sort_order", { ascending: true }).order("created_at", { ascending: false }),
    ).then(({ data }) => (data as Ad[]) || []).catch(() => [])
  }
  return cache
}

export function useAds(placement: SlotPlacement) {
  const [ads, setAds] = useState<Ad[]>([])
  useEffect(() => {
    let dead = false
    loadAds().then((all) => { if (!dead) setAds(all.filter((a) => a.placement === placement || a.placement === "any")) })
    return () => { dead = true }
  }, [placement])
  return ads
}

/* ---------- settings: rotation timing + Google AdSense ---------- */
export const AD_KEYS = { client: "adsense_client", slot: "adsense_slot", min: "ad_rotate_min", max: "ad_rotate_max" } as const
export const ADSENSE_CLIENT_RE = /^ca-pub-\d{10,20}$/
export const ADSENSE_SLOT_RE = /^\d{6,15}$/

export interface AdConfig { min: number; max: number; adsenseClient: string; adsenseSlot: string }
const DEFAULT_CFG: AdConfig = { min: 2, max: 5, adsenseClient: "", adsenseSlot: "" }

let cfgCache: Promise<AdConfig> | null = null
export function loadAdConfig(force = false): Promise<AdConfig> {
  if (!cfgCache || force) {
    cfgCache = Promise.resolve(supabase.from("site_settings").select("key,value").in("key", Object.values(AD_KEYS)))
      .then(({ data }) => {
        const m: Record<string, string> = {}
        data?.forEach((r: any) => { m[r.key] = (r.value || "").trim() })
        const min = Math.min(60, Math.max(1, Number(m[AD_KEYS.min]) || DEFAULT_CFG.min))
        const max = Math.min(60, Math.max(min, Number(m[AD_KEYS.max]) || DEFAULT_CFG.max))
        const client = ADSENSE_CLIENT_RE.test(m[AD_KEYS.client] || "") ? m[AD_KEYS.client] : ""
        const slot = ADSENSE_SLOT_RE.test(m[AD_KEYS.slot] || "") ? m[AD_KEYS.slot] : ""
        return { min, max, adsenseClient: client, adsenseSlot: slot }
      })
      .catch(() => DEFAULT_CFG)
  }
  return cfgCache
}

export function useAdConfig() {
  const [cfg, setCfg] = useState<AdConfig>(DEFAULT_CFG)
  useEffect(() => {
    let dead = false
    loadAdConfig().then((c) => { if (!dead) setCfg(c) })
    return () => { dead = true }
  }, [])
  return cfg
}

/** Random wait between the configured minimum and maximum (minutes), in ms. */
export const randDelay = (cfg: Pick<AdConfig, "min" | "max">) =>
  Math.round((cfg.min + Math.random() * (cfg.max - cfg.min)) * 60000)

/** Index that moves to the next ad after a random 2–5 minute wait (configurable). */
export function useRotation(count: number, cfg: Pick<AdConfig, "min" | "max">) {
  const [i, setI] = useState(() => Math.floor(Math.random() * 100))
  useEffect(() => {
    if (count < 2) return
    let id = 0
    const tick = () => { id = window.setTimeout(() => { setI((v) => v + 1); tick() }, randDelay(cfg)) }
    tick()
    return () => window.clearTimeout(id)
  }, [count, cfg.min, cfg.max])
  return i
}

/** Load the Google AdSense script once (never in the admin area). */
export async function initAdsense() {
  const cfg = await loadAdConfig()
  if (!cfg.adsenseClient || document.querySelector("script[data-adsense]")) return
  const s = document.createElement("script")
  s.async = true
  s.crossOrigin = "anonymous"
  s.dataset.adsense = "1"
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(cfg.adsenseClient)}`
  document.head.appendChild(s)
}
