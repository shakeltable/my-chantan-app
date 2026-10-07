import { useEffect, useState } from "react"
import { toast } from "sonner"
import { supabase } from "@/lib/chantan-db"
import { PIXEL_KEYS, PIXEL_RE } from "@/lib/tracking"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useTranslation } from "react-i18next"

const ROWS = [
  { id: "google", label: "Google Analytics / Ads", hint: "G-XXXXXXXXXX", note: "معرّف القياس (Measurement ID)" },
  { id: "facebook", label: "Facebook Pixel", hint: "123456789012345", note: "معرّف البيكسل (أرقام فقط)" },
  { id: "tiktok", label: "TikTok Pixel", hint: "C1A2B3D4E5F6G7H8", note: "معرّف البيكسل (Pixel ID)" },
] as const

export function PixelsSettings() {
  const { t } = useTranslation()
  const [v, setV] = useState({ google: "", facebook: "", tiktok: "" })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase.from("site_settings").select("key,value").in("key", Object.values(PIXEL_KEYS)).then(({ data }) => {
      const n = { google: "", facebook: "", tiktok: "" }
      data?.forEach((r: any) => { (Object.keys(PIXEL_KEYS) as (keyof typeof PIXEL_KEYS)[]).forEach((k) => { if (PIXEL_KEYS[k] === r.key) n[k] = r.value || "" }) })
      setV(n)
    })
  }, [])

  const save = async () => {
    for (const r of ROWS) {
      const x = v[r.id].trim()
      if (x && !PIXEL_RE[r.id].test(x)) return toast.error(t("المعرّف غير صحيح: {{name}}", { name: r.label }))
    }
    setBusy(true)
    const { error } = await supabase.from("site_settings").upsert(
      ROWS.map((r) => ({ key: PIXEL_KEYS[r.id], value: v[r.id].trim(), updated_at: new Date().toISOString() })), { onConflict: "key" })
    setBusy(false)
    error ? toast.error(t("تعذّر الحفظ")) : toast.success(t("تم حفظ البيكسلات — تُطبّق عند فتح الصفحة التالية للزوار"))
  }

  return (
    <div className="max-w-2xl">
      <p className="mb-5 text-sm text-muted-foreground">{t("ألصق المعرّف فقط (وليس كود الـ script كاملًا). يُحمَّل البيكسل تلقائيًا في كل صفحات الموقع ويسجّل مشاهدات الصفحات ودخول الغرف. اترك الحقل فارغًا لإيقافه.")}</p>
      <div className="space-y-4">
        {ROWS.map((r) => (
          <div key={r.id}>
            <label className="mb-1 block text-sm font-bold">{t(r.label)}</label>
            <Input dir="ltr" placeholder={t(r.hint)} value={v[r.id]} onChange={(e) => setV({ ...v, [r.id]: e.target.value })} />
            <p className="mt-1 text-xs text-muted-foreground">{t(r.note)}</p>
          </div>
        ))}
      </div>
      <Button className="mt-6" onClick={save} disabled={busy}>{t("حفظ البيكسلات")}</Button>
    </div>
  )
}
