import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import type { Peer } from "@/lib/roomboard"
import type { Session } from "./useRoomSession"
import { useTranslation } from 'react-i18next'

type Kind = "av" | "screen"
export type PermKind = "cam" | "mic" | "edit"
/** key "*" = permission for everyone */
export type Perms = Record<string, { cam?: boolean; mic?: boolean; edit?: boolean }>
export interface PermRequest { id: string; name: string; kind: PermKind }
export interface RemoteEntry { av?: MediaStream; screen?: MediaStream; tick: number }

const ICE: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" }, { urls: "stun:global.stun.twilio.com:3478" },
    // relay fallback for restricted networks
    { urls: ["turn:openrelay.metered.ca:80", "turn:openrelay.metered.ca:443", "turns:openrelay.metered.ca:443?transport=tcp"], username: "openrelayproject", credential: "openrelayproject" },
  ],
  // gather candidates ahead of time + a single transport = faster connection setup
  iceCandidatePoolSize: 6,
  bundlePolicy: "max-bundle",
}

/** Cap bitrate / frame-rate so streams stay smooth and low-latency instead of queueing. */
function tune(pc: RTCPeerConnection, kind: Kind) {
  pc.getSenders().forEach((s) => {
    if (!s.track) return
    try {
      const p = s.getParameters()
      if (!p.encodings || !p.encodings.length) p.encodings = [{}]
      if (s.track.kind === "video") {
        p.encodings[0].maxBitrate = kind === "screen" ? 900_000 : 700_000
        p.encodings[0].maxFramerate = kind === "screen" ? 10 : 24
        if (kind === "screen") {
          // never send more than ~720p: a full 1080p/4K desktop is what made sharing heavy
          const w = s.track.getSettings().width || 0
          if (w > 1280) p.encodings[0].scaleResolutionDownBy = Math.min(4, w / 1280)
        }
        ;(p as any).degradationPreference = kind === "screen" ? "balanced" : "maintain-framerate"
      } else p.encodings[0].maxBitrate = 40_000
      s.setParameters(p).catch(() => undefined)
    } catch { /* not supported */ }
  })
}

interface Args {
  session: Session; code: string; meId: string; myName: string
  adminId: string; isAdmin: boolean; peers: Peer[]
}

export function useMedia({ session, code, meId, myName, adminId, isAdmin, peers }: Args) {
  const { t } = useTranslation()
  const { send, on, updateMeta } = session
  const permKey = `roomboard:perms:${code}`
  const [perms, setPerms] = useState<Perms>(() => {
    if (!isAdmin) return {}
    try { return JSON.parse(localStorage.getItem(permKey) || "{}") } catch { return {} }
  })
  const [requests, setRequests] = useState<PermRequest[]>([])
  const [remote, setRemote] = useState<Record<string, RemoteEntry>>({})
  const [localAV, setLocalAV] = useState<MediaStream | null>(null)
  const [camOn, setCamOn] = useState(false)
  const [micOn, setMicOn] = useState(false)
  const [screenOn, setScreenOn] = useState(false)

  const permsRef = useRef(perms); permsRef.current = perms
  const remoteRef = useRef(remote); remoteRef.current = remote
  /** what this user asked for — switched on automatically once the admin approves */
  const want = useRef<{ cam?: boolean; mic?: boolean }>({})
  const lastAsk = useRef(new Map<string, number>())
  const peersRef = useRef(peers); peersRef.current = peers
  const camRef = useRef(false)
  const micRef = useRef(false)
  const pubs = useRef<{ av?: MediaStream; screen?: MediaStream }>({})
  const out = useRef(new Map<string, RTCPeerConnection>())
  const outSid = useRef(new Map<string, string>())
  const inc = useRef(new Map<string, RTCPeerConnection>())
  const pending = useRef(new Map<string, RTCIceCandidateInit[]>())

  const allowed = useCallback((k: "cam" | "mic") => isAdmin || !!permsRef.current[meId]?.[k], [isAdmin, meId])

  const offerTo = useCallback(async (target: string, kind: Kind) => {
    const stream = pubs.current[kind]
    if (!stream) return
    const key = `${target}:${kind}`
    out.current.get(key)?.close()
    pending.current.delete("i:" + key)
    const sid = crypto.randomUUID()
    const pc = new RTCPeerConnection(ICE)
    out.current.set(key, pc); outSid.current.set(key, sid)
    stream.getTracks().forEach((t) => pc.addTrack(t, stream))
    pc.onicecandidate = (e) => {
      if (e.candidate) send("rtc", { type: "ice-out", from: meId, to: target, kind, sid, c: e.candidate.toJSON() })
    }
    try {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      send("rtc", { type: "offer", from: meId, to: target, kind, sid, sdp: offer.sdp })
      tune(pc, kind)
    } catch (e) { console.warn("offer failed", e) }
  }, [send, meId])

  const publish = useCallback(async (kind: Kind, stream: MediaStream | null) => {
    for (const [k, pc] of out.current) if (k.endsWith(":" + kind)) { pc.close(); out.current.delete(k) }
    const old = pubs.current[kind]
    pubs.current[kind] = stream || undefined
    const keep = stream ? stream.getTracks() : []
    old?.getTracks().forEach((tr) => { if (!keep.includes(tr)) tr.stop() })
    if (kind === "av") setLocalAV(stream)
    if (!stream) { send("pub-stop", { from: meId, kind }); return }
    peersRef.current.filter((p) => p.id !== meId).forEach((p) => offerTo(p.id, kind))
  }, [send, meId, offerTo])

  const flush = async (pc: RTCPeerConnection, tag: string) => {
    const list = pending.current.get(tag) || []
    pending.current.delete(tag)
    for (const c of list) { try { await pc.addIceCandidate(c) } catch { /* ignore */ } }
  }
  const addIce = async (pc: RTCPeerConnection | undefined, tag: string, c: RTCIceCandidateInit) => {
    if (pc && pc.remoteDescription) { try { await pc.addIceCandidate(c) } catch { /* ignore */ } return }
    pending.current.set(tag, [...(pending.current.get(tag) || []), c])
  }

  // ----- signalling & roster events -----
  useEffect(() => {
    const dropRemote = (id: string, kind?: Kind) => {
      const kinds: Kind[] = kind ? [kind] : ["av", "screen"]
      kinds.forEach((k) => { inc.current.get(`${id}:${k}`)?.close(); inc.current.delete(`${id}:${k}`) })
      setRemote((r) => {
        const e = r[id]; if (!e) return r
        const n = { ...e, tick: e.tick + 1 }
        kinds.forEach((k) => delete n[k])
        return { ...r, [id]: n }
      })
    }
    const offs = [
      on("rtc", async (m: any) => {
        if (m.to !== meId) return
        const key = `${m.from}:${m.kind}`
        try {
          if (m.type === "want") {
            // a viewer is missing our stream — send it again
            if (pubs.current[m.kind as Kind]) offerTo(m.from, m.kind)
            return
          }
          if (m.type === "offer") {
            inc.current.get(key)?.close()
            pending.current.delete("o:" + key)
            const pc = new RTCPeerConnection(ICE)
            inc.current.set(key, pc)
            pc.onicecandidate = (e) => {
              if (e.candidate) send("rtc", { type: "ice-in", from: meId, to: m.from, kind: m.kind, sid: m.sid, c: e.candidate.toJSON() })
            }
            pc.ontrack = (e) => {
              const st = e.streams[0]
              if (!st) return
              // play out as soon as packets arrive (smallest jitter buffer)
              try { (e.receiver as any).jitterBufferTarget = e.track.kind === "audio" ? 60 : 0 } catch { /* ignore */ }
              try { (e.receiver as any).playoutDelayHint = e.track.kind === "audio" ? 0.06 : 0 } catch { /* ignore */ }
              setRemote((r) => ({ ...r, [m.from]: { ...r[m.from], [m.kind]: st, tick: (r[m.from]?.tick || 0) + 1 } }))
            }
            pc.onconnectionstatechange = () => {
              if (pc.connectionState === "failed" && inc.current.get(key) === pc) dropRemote(m.from, m.kind)
            }
            await pc.setRemoteDescription({ type: "offer", sdp: m.sdp })
            await flush(pc, "o:" + key)
            const ans = await pc.createAnswer()
            await pc.setLocalDescription(ans)
            send("rtc", { type: "answer", from: meId, to: m.from, kind: m.kind, sid: m.sid, sdp: ans.sdp })
          } else if (m.type === "answer") {
            const pc = out.current.get(key)
            if (!pc || outSid.current.get(key) !== m.sid) return
            await pc.setRemoteDescription({ type: "answer", sdp: m.sdp })
            await flush(pc, "i:" + key)
          } else if (m.type === "ice-out") {
            await addIce(inc.current.get(key), "o:" + key, m.c)
          } else if (m.type === "ice-in") {
            if (outSid.current.get(key) !== m.sid) return
            await addIce(out.current.get(key), "i:" + key, m.c)
          }
        } catch (e) { console.warn("rtc error", e) }
      }),
      on("pub-stop", (m: any) => dropRemote(m.from, m.kind)),
      on("peer-join", (p: Peer) => {
        (["av", "screen"] as Kind[]).forEach((k) => { if (pubs.current[k]) offerTo(p.id, k) })
        if (isAdmin) send("perms", { from: meId, perms: permsRef.current })
      }),
      on("peer-leave", (p: Peer) => {
        dropRemote(p.id)
        for (const k of ["av", "screen"]) { out.current.get(`${p.id}:${k}`)?.close(); out.current.delete(`${p.id}:${k}`) }
        setRequests((r) => r.filter((x) => x.id !== p.id))
      }),
      on("perms", (m: any) => { if (m.from === adminId) setPerms(m.perms || {}) }),
      on("perm-request", (m: any) => {
        if (!isAdmin) return
        setRequests((r) => (r.some((x) => x.id === m.from && x.kind === m.kind) ? r : [...r, { id: m.from, name: m.name, kind: m.kind }]))
        if (m.kind === "edit") toast.info(t("{{name}} يطلب إذن التحرير على السبورة", { name: m.name }))
        else toast.info(t("{{name}} يطلب إذن تشغيل {{kind}}", { name: m.name, kind: m.kind === "cam" ? t("الكاميرا") : t("الميكروفون") }))
      }),
    ]
    return () => offs.forEach((f) => f())
  }, [on, send, meId, adminId, isAdmin, offerTo])

  useEffect(() => { if (isAdmin) localStorage.setItem(permKey, JSON.stringify(perms)) }, [perms, isAdmin, permKey])

  // self-healing: someone is on camera / mic / screen but nothing arrived here → ask them to send it again
  useEffect(() => {
    const iv = window.setInterval(() => {
      const now = Date.now()
      const ask = (id: string, kind: Kind) => {
        const k = `${id}:${kind}`
        if (now - (lastAsk.current.get(k) || 0) < 5000) return
        const pc = inc.current.get(k)
        if (pc && (pc.connectionState === "connecting" || pc.connectionState === "new") && now - (lastAsk.current.get(k) || 0) < 12000) return
        lastAsk.current.set(k, now)
        send("rtc", { type: "want", from: meId, to: id, kind })
      }
      peersRef.current.forEach((p) => {
        if (p.id === meId) return
        const r = remoteRef.current[p.id]
        if ((p.cam || p.mic) && !r?.av) ask(p.id, "av")
        if (p.screen && !r?.screen) ask(p.id, "screen")
      })
    }, 2500)
    return () => clearInterval(iv)
  }, [send, meId])

  // ----- local capture -----
  const setAV = useCallback(async (cam: boolean, mic: boolean) => {
    try {
      if (!cam && !mic) await publish("av", null)
      else {
        // reuse the tracks that are already running — only ask the device for what is new
        const prev = pubs.current.av
        const live = (tr?: MediaStreamTrack) => (tr && tr.readyState === "live" ? tr : undefined)
        const keepV = cam ? live(prev?.getVideoTracks()[0]) : undefined
        const keepA = mic ? live(prev?.getAudioTracks()[0]) : undefined
        const needV = cam && !keepV, needA = mic && !keepA
        const fresh = needV || needA ? await navigator.mediaDevices.getUserMedia({
          video: needV ? { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 24, max: 30 } } : false,
          audio: needA ? { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } : false,
        }) : null
        fresh?.getVideoTracks().forEach((tr) => { tr.contentHint = "motion" })
        fresh?.getAudioTracks().forEach((tr) => { tr.contentHint = "speech" })
        const tracks = [keepA, keepV, ...(fresh?.getTracks() || [])].filter(Boolean) as MediaStreamTrack[]
        await publish("av", new MediaStream(tracks))
      }
      camRef.current = cam; micRef.current = mic
      setCamOn(cam); setMicOn(mic)
      updateMeta({ cam, mic })
    } catch {
      toast.error(t("تعذّر الوصول إلى الكاميرا أو الميكروفون — تحقّق من أذونات المتصفح"))
    }
  }, [publish, updateMeta])

  const request = useCallback((kind: PermKind) => {
    if (kind === "cam" || kind === "mic") want.current[kind] = true
    send("perm-request", { from: meId, name: myName, kind })
    if (kind === "edit") toast.info(t("أُرسل طلب إذن التحرير إلى المسؤول"))
    else toast.info(t("أُرسل طلب إذن {{kind}} إلى المسؤول", { kind: kind === "cam" ? t("الكاميرا") : t("الميكروفون") }))
  }, [send, meId, myName])

  const toggleCam = useCallback(() => {
    if (!allowed("cam")) return request("cam")
    setAV(!camRef.current, micRef.current)
  }, [allowed, request, setAV])
  const toggleMic = useCallback(() => {
    if (!allowed("mic")) return request("mic")
    setAV(camRef.current, !micRef.current)
  }, [allowed, request, setAV])

  const stopScreen = useCallback(async () => {
    await publish("screen", null); setScreenOn(false); updateMeta({ screen: false })
  }, [publish, updateMeta])
  const toggleScreen = useCallback(async () => {
    if (pubs.current.screen) return stopScreen()
    if (!navigator.mediaDevices?.getDisplayMedia) return toast.error(t("متصفحك لا يدعم مشاركة الشاشة"))
    try {
      // prefer the WHOLE screen: sharing one tab/window freezes or goes black for viewers as soon as you switch away from it
      const st = await navigator.mediaDevices.getDisplayMedia({
        // light capture: ~720p at 10 fps, like the camera stream
        video: { width: { ideal: 1280, max: 1600 }, height: { ideal: 720, max: 900 }, frameRate: { ideal: 10, max: 15 }, displaySurface: "monitor" },
        audio: false,
        selfBrowserSurface: "exclude", surfaceSwitching: "include", monitorTypeSurfaces: "include",
      } as any)
      const surface = (st.getVideoTracks()[0].getSettings() as any).displaySurface
      if (surface && surface !== "monitor") toast.info(t("لتتنقل بين النوافذ دون أن تظهر شاشة سوداء للمشاركين، اختر «الشاشة بالكامل» عند المشاركة"), { duration: 8000 })
      st.getVideoTracks()[0].contentHint = "motion"
      st.getVideoTracks()[0].applyConstraints({ frameRate: { max: 15 } }).catch(() => undefined)
      st.getVideoTracks()[0].onended = () => { stopScreen() }
      await publish("screen", st); setScreenOn(true); updateMeta({ screen: true })
    } catch (e: any) {
      if (e?.name !== "NotAllowedError") toast.error(t("تعذّرت مشاركة الشاشة"))
    }
  }, [publish, stopScreen, updateMeta])

  // ----- admin controls -----
  const grant = useCallback((id: string, kind: PermKind, value: boolean) => {
    const next = { ...permsRef.current, [id]: { ...permsRef.current[id], [kind]: value } }
    setPerms(next)
    send("perms", { from: meId, perms: next })
    if (value) setRequests((r) => r.filter((x) => !(x.id === id && x.kind === kind)))
  }, [send, meId])
  const dismiss = useCallback((id: string, kind: PermKind) => setRequests((r) => r.filter((x) => !(x.id === id && x.kind === kind))), [])

  // ----- whiteboard edit permission (everyone else is view-only) -----
  const canEdit = isAdmin || !!perms[meId]?.edit || !!perms["*"]?.edit
  const editAll = !!perms["*"]?.edit
  const prevEdit = useRef(false)
  useEffect(() => {
    if (isAdmin) return
    if (canEdit && !prevEdit.current) toast.success(t("منحك المسؤول إذن التحرير على السبورة"))
    if (!canEdit && prevEdit.current) toast.info(t("سحب المسؤول إذن التحرير — السبورة الآن للعرض فقط"))
    prevEdit.current = canEdit
  }, [canEdit, isAdmin])

  // revoke → switch off
  const prevPerm = useRef<{ cam?: boolean; mic?: boolean }>({})
  useEffect(() => {
    if (isAdmin) return
    const mine = perms[meId] || {}
    const prev = prevPerm.current
    prevPerm.current = mine
    if (mine.cam && !prev.cam) toast.success(t("منحك المسؤول إذن تشغيل الكاميرا"))
    if (mine.mic && !prev.mic) toast.success(t("منحك المسؤول إذن تشغيل الميكروفون"))
    let nextCam = camRef.current && !!mine.cam
    let nextMic = micRef.current && !!mine.mic
    if ((camRef.current && !mine.cam) || (micRef.current && !mine.mic)) toast.info(t("سحب المسؤول إذن الكاميرا أو الميكروفون"))
    // approved something the user asked for → start it right away, no extra click
    if (mine.cam && !prev.cam && want.current.cam) { nextCam = true; want.current.cam = false }
    if (mine.mic && !prev.mic && want.current.mic) { nextMic = true; want.current.mic = false }
    if (nextCam !== camRef.current || nextMic !== micRef.current) setAV(nextCam, nextMic)
  }, [perms, isAdmin, meId, setAV])

  const stopAll = useCallback(async () => {
    await publish("av", null); await publish("screen", null)
    setCamOn(false); setMicOn(false); setScreenOn(false)
  }, [publish])

  const getAudioStreams = useCallback(() => {
    const list: MediaStream[] = []
    if (pubs.current.av?.getAudioTracks().length) list.push(pubs.current.av)
    Object.values(remote).forEach((r) => { if (r.av?.getAudioTracks().length) list.push(r.av) })
    return list
  }, [remote])

  useEffect(() => () => {
    Object.values(pubs.current).forEach((s) => s?.getTracks().forEach((t) => t.stop()))
    out.current.forEach((pc) => pc.close()); inc.current.forEach((pc) => pc.close())
  }, [])

  return {
    perms, requests, remote, localAV, camOn, micOn, screenOn, canEdit, editAll, request,
    allowed, toggleCam, toggleMic, toggleScreen, grant, dismiss, stopAll, getAudioStreams,
  }
}

export type Media = ReturnType<typeof useMedia>
