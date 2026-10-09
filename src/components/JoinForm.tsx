import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { KeyRound, Loader2 } from "lucide-react"
import { createAccess } from "@/lib/roomAccess"
import { toast } from "sonner"
import { supabase } from "@/lib/chantan-db"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  COUNTRY_CODES, countryName, detectCountry, ensureSession, getProfile, makeCode, normalizeCode, saveProfile, type Profile,
} from "@/lib/roomboard"
import { useTranslation } from 'react-i18next'

interface FormProps { mode: "create" | "join"; fixedCode?: string; onDone?: (code: string) => void }

export function JoinForm({ mode, fixedCode, onDone }: FormProps) {
  const { t } = useTranslation()
  const nav = useNavigate()
  const stored = getProfile()
  const [name, setName] = useState(stored?.name || "")
  const [email, setEmail] = useState(stored?.email || "")
  const [country, setCountry] = useState(stored?.country || "")
  const [roomName, setRoomName] = useState("")
  const [roomPw, setRoomPw] = useState("")
  const [code, setCode] = useState(fixedCode || "")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => { if (!country) detectCountry().then((c) => c && setCountry((v) => v || c)) }, [country])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    const n = name.trim(), em = email.trim()
    if (n.length < 2) return setError("أدخل اسمك (حرفان على الأقل)")
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) return setError("أدخل بريدًا إلكترونيًا صحيحًا")
    if (mode === "create" && roomPw && roomPw.length < 4) return setError("كلمة سر الغرفة 4 أحرف على الأقل")
    setBusy(true)
    try {
      const profile: Profile = { id: stored?.id || crypto.randomUUID(), name: n, email: em, country }
      let target = normalizeCode(code)
      if (mode === "join" && !fixedCode) {
        if (target.length < 4) throw new Error("أدخل كود الغرفة")
        const { data } = await supabase.from("rooms").select("code").eq("code", target).maybeSingle()
        if (!data) throw new Error("لم نجد غرفة بهذا الكود. تأكد منه وحاول مجددًا")
      }
      saveProfile(profile)
      await ensureSession(profile)
      if (mode === "create") {
        target = makeCode()
        const { error: err } = await supabase.from("rooms").insert({ code: target, name: roomName.trim() || `غرفة ${n}`, admin_id: profile.id })
        if (err) throw new Error("تعذّر إنشاء الغرفة، حاول مرة أخرى")
        try { await createAccess(target, roomPw || undefined) }
        catch { if (roomPw) throw new Error("أُنشئت الغرفة لكن تعذّر تفعيل كلمة السر. افتحها وأضفها من لوحة «المشاركون»") }
      }
      supabase.from("room_members").insert({ id: crypto.randomUUID(), room_code: target, name: n, email: em, country }).then(() => undefined)
      if (onDone) onDone(target)
      if (!fixedCode) nav(`/room/${target}`)
    } catch (err: any) {
      setError(err.message || "حدث خطأ غير متوقع")
      toast.error(t(err.message) || t("حدث خطأ غير متوقع"))
    } finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {mode === "create" && (
        <div className="space-y-1.5">
          <Label htmlFor="rn">{t("اسم الغرفة (اختياري)")}</Label>
          <Input id="rn" value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder={t("مثال: اجتماع فريق التصميم")} maxLength={60} />
        </div>
      )}
      {mode === "create" && (
        <div className="space-y-1.5">
          <Label htmlFor="rpw" className="flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5" />{t("كلمة سر للغرفة (اختياري)")}</Label>
          <Input id="rpw" dir="ltr" autoComplete="off" value={roomPw} onChange={(e) => setRoomPw(e.target.value)} placeholder={t("اتركها فارغة لغرفة مفتوحة بالكود")} className="text-start" maxLength={64} />
        </div>
      )}
      {mode === "join" && !fixedCode && (
        <div className="space-y-1.5">
          <Label htmlFor="rc">{t("كود الغرفة")}</Label>
          <Input id="rc" dir="ltr" value={code} onChange={(e) => setCode(e.target.value)} placeholder="abc123" className="text-start font-mono tracking-widest" maxLength={12} />
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="nm">{t("الاسم")}</Label>
          <Input id="nm" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("اسمك كما سيظهر للآخرين")} maxLength={40} autoComplete="name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="em">{t("البريد الإلكتروني")}</Label>
          <Input id="em" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className="text-start" autoComplete="email" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="co">{t("الدولة")}</Label>
        <select id="co" value={country} onChange={(e) => setCountry(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <option value="">{t("اختر دولتك")}</option>
          {COUNTRY_CODES.map((c) => <option key={c} value={c}>{countryName(c)}</option>)}
        </select>
        <p className="text-xs text-muted-foreground">{t("تُكتشف دولتك تلقائيًا ويمكنك تعديلها. تظهر بجانب اسمك لبقية المشاركين، أما بريدك فلا يظهر لأحد.")}</p>
      </div>
      {error && <p className="rounded-[6px] border border-destructive/40 px-3 py-2 text-sm text-destructive" role="alert">{t(error)}</p>}
      <Button type="submit" disabled={busy} className="w-full">
        {busy && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
        {mode === "create" ? t("أنشئ الغرفة وادخل") : t("انضم إلى الغرفة")}
      </Button>
    </form>
  )
}

export function JoinDialog({ mode, open, onOpenChange }: { mode: "create" | "join"; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-[8px] border-[1.5px]">
        <DialogHeader className="text-start">
          <DialogTitle className="text-xl">{mode === "create" ? t("ابدأ غرفة جديدة") : t("انضم بكود الغرفة")}</DialogTitle>
          <DialogDescription>{mode === "create" ? t("ستكون أنت المسؤول عن الغرفة، وتشارك الكود أو الرابط مع الآخرين.") : t("أدخل الكود الذي وصلك من منشئ الغرفة.")}</DialogDescription>
        </DialogHeader>
        <JoinForm mode={mode} />
      </DialogContent>
    </Dialog>
  )
}
