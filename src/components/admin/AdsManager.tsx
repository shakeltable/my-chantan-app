import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { ImagePlus, Pencil, Plus, Trash2, X } from "lucide-react"
import { supabase } from "@/lib/chantan-db"
import { uploadToRoom } from "@/lib/roomboard"
import { loadAds, safeUrl, type Ad } from "@/lib/ads"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { RotationSettings } from "./AdSettings"
import { useTranslation } from "react-i18next"

type Draft = Omit<Ad, "id"> & { id?: string }
const blank: Draft = { placement: "chat", title: "", body: "", image_url: null, link_url: "", cta: "", active: true, sort_order: 0 }
const placeLabel = (p: string, t: (k: string) => string) =>
  p === "chat" ? t("الدردشة") : p === "bottom" ? t("أسفل الغرفة") : p === "top" ? t("أعلى الغرفة") : p === "popup" ? t("نافذة منبثقة هادئة") : t("تدوير في كل الأماكن")
const field = "mb-1 block text-xs font-semibold text-muted-foreground"

export function AdsManager() {
  const { t } = useTranslation()
  const [ads, setAds] = useState<Ad[]>([])
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const reload = useCallback(async () => {
    const { data } = await supabase.from("site_ads").select("*").order("placement").order("sort_order").order("created_at", { ascending: false })
    setAds((data as Ad[]) || [])
  }, [])
  useEffect(() => { reload() }, [reload])

  const save = async () => {
    if (!draft) return
    if (!draft.title.trim()) return toast.error(t("اكتب عنوان الإعلان"))
    if (draft.link_url.trim() && !safeUrl(draft.link_url)) return toast.error(t("الرابط يجب أن يبدأ بـ https://"))
    setBusy(true)
    const row = { placement: draft.placement, title: draft.title.trim(), body: draft.body.trim(), image_url: draft.image_url || null, link_url: draft.link_url.trim(), cta: draft.cta.trim(), active: draft.active, sort_order: Number(draft.sort_order) || 0 }
    const { error } = draft.id ? await supabase.from("site_ads").update(row).eq("id", draft.id) : await supabase.from("site_ads").insert(row)
    setBusy(false)
    if (error) return toast.error(t("تعذّر حفظ الإعلان"))
    toast.success(t("تم حفظ الإعلان")); setDraft(null); loadAds(true); reload()
  }

  const toggle = async (a: Ad) => {
    await supabase.from("site_ads").update({ active: !a.active }).eq("id", a.id)
    loadAds(true); reload()
  }
  const remove = async (a: Ad) => {
    if (!window.confirm(t("حذف هذا الإعلان نهائيًا؟"))) return
    await supabase.from("site_ads").delete().eq("id", a.id)
    loadAds(true); reload()
  }
  const upload = async (f: File) => {
    if (!f.type.startsWith("image/")) return toast.error(t("اختر صورة"))
    if (f.size > 3 * 1024 * 1024) return toast.error(t("الصورة أكبر من 3 ميغابايت"))
    try { const url = await uploadToRoom("ads", f); setDraft((d) => d && { ...d, image_url: url }) }
    catch { toast.error(t("فشل رفع الصورة")) }
  }
  const set = (p: Partial<Draft>) => setDraft((d) => d && { ...d, ...p })

  return (
    <div>
      <RotationSettings />
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{t("الإعلانات تظهر في أعلى الغرفة، وفي الدردشة (بطاقة فوق حقل الكتابة)، وفي شريط أسفل الغرفة، أو كنافذة منبثقة صغيرة.")}</p>
        <Button onClick={() => setDraft({ ...blank })}><Plus className="me-1 h-4 w-4" />{t("إعلان جديد")}</Button>
      </div>

      {draft && (
        <div className="mb-6 rounded-[8px] border-[1.5px] border-accent bg-background p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold">{draft.id ? t("تعديل الإعلان") : t("إعلان جديد")}</h3>
            <button aria-label={t("إغلاق")} onClick={() => setDraft(null)} className="rounded-[4px] p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className={field}>{t("مكان الظهور")}</label>
              <select value={draft.placement} onChange={(e) => set({ placement: e.target.value as Ad["placement"] })}
                className="h-10 w-full rounded-[6px] border border-input bg-background px-3 text-sm">
                <option value="chat">{t("الدردشة")}</option>
                <option value="bottom">{t("أسفل الغرفة")}</option>
                <option value="top">{t("أعلى الغرفة")}</option>
                <option value="popup">{t("نافذة منبثقة هادئة")}</option>
                <option value="any">{t("تدوير في كل الأماكن")}</option>
              </select>
            </div>
            <div><label className={field}>{t("الترتيب (الأصغر أولًا)")}</label><Input type="number" value={draft.sort_order} onChange={(e) => set({ sort_order: Number(e.target.value) })} /></div>
            <div><label className={field}>{t("عنوان الإعلان")}</label><Input value={draft.title} maxLength={80} onChange={(e) => set({ title: e.target.value })} /></div>
            <div><label className={field}>{t("نص زر الدعوة (اختياري)")}</label><Input value={draft.cta} maxLength={30} onChange={(e) => set({ cta: e.target.value })} /></div>
            <div className="md:col-span-2"><label className={field}>{t("وصف قصير")}</label><Input value={draft.body} maxLength={160} onChange={(e) => set({ body: e.target.value })} /></div>
            <div className="md:col-span-2"><label className={field}>{t("رابط الإعلان")}</label><Input dir="ltr" placeholder="https://" value={draft.link_url} onChange={(e) => set({ link_url: e.target.value })} /></div>
            <div className="flex items-center gap-3 md:col-span-2">
              {draft.image_url ? <img src={draft.image_url} alt="" className="h-14 w-14 rounded-[6px] object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-[6px] border border-dashed border-border text-muted-foreground"><ImagePlus className="h-5 w-5" /></div>}
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>{t("رفع صورة")}</Button>
              {draft.image_url && <Button type="button" variant="ghost" onClick={() => set({ image_url: null })}>{t("إزالة الصورة")}</Button>}
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = "" }} />
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold"><Switch checked={draft.active} onCheckedChange={(v) => set({ active: v })} />{t("مفعّل")}</label>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={save} disabled={busy}>{t("حفظ")}</Button>
            <Button variant="outline" onClick={() => setDraft(null)}>{t("تراجع")}</Button>
          </div>
        </div>
      )}

      {ads.length === 0 ? (
        <p className="rounded-[8px] border-[1.5px] border-dashed border-border p-8 text-center text-sm text-muted-foreground">{t("لا توجد إعلانات بعد.")}</p>
      ) : (
        <ul className="divide-y divide-border rounded-[8px] border-[1.5px] border-border">
          {ads.map((a) => (
            <li key={a.id} className="flex items-center gap-3 p-3">
              {a.image_url ? <img src={a.image_url} alt="" className="h-12 w-12 shrink-0 rounded-[6px] object-cover" /> : <div className="h-12 w-12 shrink-0 rounded-[6px] bg-muted" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{a.title}</p>
                <p className="truncate text-xs text-muted-foreground">{placeLabel(a.placement, t)}{a.link_url ? ` · ${a.link_url}` : ""}</p>
              </div>
              <Switch checked={a.active} onCheckedChange={() => toggle(a)} aria-label={t("مفعّل")} />
              <button aria-label={t("تعديل")} onClick={() => setDraft({ ...a })} className="rounded-[4px] p-2 transition-colors duration-150 hover:bg-muted"><Pencil className="h-4 w-4" /></button>
              <button aria-label={t("حذف")} onClick={() => remove(a)} className="rounded-[4px] p-2 text-destructive transition-colors duration-150 hover:bg-muted"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
