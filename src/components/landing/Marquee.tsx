import { useTranslation } from 'react-i18next'
const WORDS = ["رسم حر", "كتابة", "أسهم", "ألوان", "خريطة مصغّرة", "دردشة", "كاميرا بإذن المسؤول", "ميكروفون", "مشاركة الشاشة", "رفع الملفات", "تسجيل الجلسة", "تعاون لحظي"]

export function Marquee() {
  const { t } = useTranslation()
  const row = (k: string) => (
    <div key={k} className="flex shrink-0 items-center gap-8 pe-8" aria-hidden={k === "b"}>
      {WORDS.map((w) => (
        <span key={w} className="flex items-center gap-8 text-lg font-bold text-foreground md:text-xl">
          {t(w)}<span className="h-1.5 w-1.5 rounded-full bg-accent" />
        </span>
      ))}
    </div>
  )
  return (
    <div className="my-8 overflow-hidden border-y-[1.5px] border-border py-4" dir="rtl">
      <div className="rb-marquee-track flex">{row("a")}{row("b")}</div>
    </div>
  )
}
