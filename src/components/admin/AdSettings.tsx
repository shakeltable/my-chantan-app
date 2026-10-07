import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Repeat } from "lucide-react"
import { supabase } from "@/lib/chantan-db"
import { AD_KEYS, ADSENSE_CLIENT_RE, ADSENSE_SLOT_RE, loadAdConfig } from "@/lib/ads"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useTranslation } from "react-i18next"

const save = (rows: Record<string, string>) =>
  supabase.from("site_settings").upsert(
    Object.entries(rows).map(([key, value]) => ({ key, value, updated_at: new Date().toISOString() })), { onConflict: "key" })

/** How often the shown ad changes (minutes, random between min and max). */
export function RotationSettings() {
  const { t } = useTranslation()
  const [min, setMin] = useState(2)
  const [max, setMax] = useState(5)
  const [busy, setBusy] = useState(false)
  useEffect(() => { loadAdConfig(true).then((c) => { setMin(c.min); setMax(c.max) }) }, [])

  const submit = async () => {
    const a = Math.round(Number(min)), b = Math.round(Number(max))
    if (!(a >= 1 && b >= a && b <= 60)) return toast.error(t("اكتب مدة صحيحة: الحد الأدنى 1 دقيقة، والأقصى 60، والأقصى لا يقل عن الأدنى"))
    setBusy(true)
    const { error } = await save({ [AD_KEYS.min]: String(a), [AD_KEYS.max]: String(b) })
    setBusy(false)
    if (error) return toast.error(t("تعذّر الحفظ"))
    loadAdConfig(true); toast.success(t("تم حفظ مدة التدوير"))
  }

  return (
    <div className="mb-6 rounded-[8px] border-[1.5px] border-border bg-background p-4">
      <h3 className="mb-1 flex items-center gap-2 font-bold"><Repeat className="h-4 w-4 text-accent" />{t("تدوير الإعلانات")}</h3>
      <p className="mb-3 text-sm text-muted-foreground">{t("إذا كان في المكان الواحد أكثر من إعلان، يتبدّل الإعلان تلقائيًا بعد مدة عشوائية بين الحدّين. الإعلانات من نوع «النافذة المنبثقة» تظهر بنفس الإيقاع في أعلى الغرفة لمدة 20 ثانية ويمكن إغلاقها.")}</p>
      <div className="flex flex-wrap items-end gap-3">
        <div><label className="mb-1 block text-xs font-semibold text-muted-foreground">{t("من (دقائق)")}</label><Input className="w-24" type="number" min={1} max={60} value={min} onChange={(e) => setMin(Number(e.target.value))} /></div>
        <div><label className="mb-1 block text-xs font-semibold text-muted-foreground">{t("إلى (دقائق)")}</label><Input className="w-24" type="number" min={1} max={60} value={max} onChange={(e) => setMax(Number(e.target.value))} /></div>
        <Button onClick={submit} disabled={busy}>{t("حفظ")}</Button>
      </div>
    </div>
  )
}

/** Google AdSense: only the public publisher ID and ad-unit ID are accepted, never raw scripts. */
export function GoogleAdsSettings() {
  const { t } = useTranslation()
  const [client, setClient] = useState("")
  const [slot, setSlot] = useState("")
  const [busy, setBusy] = useState(false)
  useEffect(() => { loadAdConfig(true).then((c) => { setClient(c.adsenseClient); setSlot(c.adsenseSlot) }) }, [])

  const submit = async () => {
    const c = client.trim(), s = slot.trim()
    if (c && !ADSENSE_CLIENT_RE.test(c)) return toast.error(t("معرّف الناشر غير صحيح، شكله ca-pub-1234567890123456"))
    if (s && !ADSENSE_SLOT_RE.test(s)) return toast.error(t("معرّف وحدة الإعلان غير صحيح (أرقام فقط)"))
    setBusy(true)
    const { error } = await save({ [AD_KEYS.client]: c, [AD_KEYS.slot]: s })
    setBusy(false)
    if (error) return toast.error(t("تعذّر الحفظ"))
    loadAdConfig(true); toast.success(t("تم حفظ إعدادات Google AdSense — تُطبّق عند فتح الصفحة التالية للزوار"))
  }

  return (
    <div className="max-w-2xl">
      <p className="mb-5 text-sm text-muted-foreground">{t("اربح من إعلانات Google عبر Google AdSense (هو الاسم الحالي لـ Adwords للناشرين). ألصق المعرّفين فقط، وليس كود الـ script كاملًا. يُحمَّل السكريبت تلقائيًا في الصفحة الرئيسية والغرف، ويظهر إعلان Google ضمن دورة التدوير في أعلى الغرفة والدردشة وأسفلها. اترك الحقلين فارغين لإيقافه.")}</p>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-bold">{t("معرّف الناشر (Publisher ID)")}</label>
          <Input dir="ltr" placeholder="ca-pub-1234567890123456" value={client} onChange={(e) => setClient(e.target.value)} />
          <p className="mt-1 text-xs text-muted-foreground">{t("تجده في حسابك على AdSense ضمن الحساب ثم معلومات الحساب.")}</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold">{t("معرّف وحدة الإعلان (Ad unit / slot ID)")}</label>
          <Input dir="ltr" placeholder="1234567890" value={slot} onChange={(e) => setSlot(e.target.value)} />
          <p className="mt-1 text-xs text-muted-foreground">{t("أنشئ وحدة إعلانية من نوع «معروض» (Display ads) في AdSense وانسخ رقمها.")}</p>
        </div>
      </div>
      <div className="mt-5 rounded-[8px] border-[1.5px] border-border bg-muted/40 p-3 text-xs leading-6 text-muted-foreground">
        {t("ملاحظات: يجب أن توافق Google على موقعك أولًا في AdSense، وقد تطلب ملف ads.txt في جذر الموقع. لا تنقر على إعلاناتك بنفسك لأن هذا يخالف سياسة Google. لا تظهر إعلانات Google في النافذة المنبثقة، فقط في الأماكن الثابتة.")}
      </div>
      <Button className="mt-5" onClick={submit} disabled={busy}>{t("حفظ إعدادات Google AdSense")}</Button>
    </div>
  )
}
