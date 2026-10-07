import { MotionItem, MotionReveal } from "@/components/MotionReveal"
import { useTranslation } from 'react-i18next'

const ITEMS = [
  { n: "٠١", h: "انضمام في ثوانٍ", p: "اسم وبريد فقط، بلا كلمات مرور. وتظهر دولتك بجانب اسمك للجميع." },
  { n: "٠٢", h: "أدوات رسم كاملة", p: "قلم وأسهم ومستطيلات ونصوص وممحاة، بسبعة ألوان وثلاث سماكات." },
  { n: "٠٣", h: "خريطة مصغّرة", p: "نظرة شاملة على السبورة كلها، والانتقال إلى أي موضع بسحبة واحدة." },
  { n: "٠٤", h: "دردشة فورية", p: "رسائل مكتوبة تُحفظ في الغرفة، فيقرؤها من ينضم متأخرًا." },
  { n: "٠٥", h: "تحكّم المسؤول", p: "يمنح أو يسحب إذن الكاميرا والميكروفون، ويُنهي الجلسة متى شاء." },
  { n: "٠٦", h: "تسجيل وتوثيق", p: "سجّل الغرفة بالصوت والسبورة، وارجع إلى التسجيل والملفات لاحقًا." },
]

export function FeatureIndex() {
  const { t } = useTranslation()
  return (
    <section id="features" className="mx-auto max-w-7xl px-5 pb-16 md:px-8 md:pb-24">
      <MotionReveal>
        <MotionItem className="mb-8 flex items-end justify-between border-b-[1.5px] border-primary pb-3">
          <h2 className="text-2xl font-extrabold md:text-3xl">{t("فهرس المزايا")}</h2>
          <span className="text-xs font-semibold text-accent">{t("كل ما تحتاجه الغرفة")}</span>
        </MotionItem>
        <div className="grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3 lg:divide-x lg:divide-x-reverse lg:divide-border">
          {ITEMS.map((i, idx) => (
            <MotionItem key={i.n} className={`border-b border-border py-6 lg:px-6 ${idx % 3 === 0 ? "lg:ps-0" : ""}`}>
              <span className="text-sm font-bold text-accent">{i.n}</span>
              <h3 className="mt-1 text-lg font-bold">{t(i.h)}</h3>
              <p className="mt-1.5 text-sm leading-7 text-muted-foreground">{t(i.p)}</p>
            </MotionItem>
          ))}
        </div>
      </MotionReveal>
    </section>
  )
}
