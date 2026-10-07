import { MotionItem, MotionReveal } from "@/components/MotionReveal"
import { useTranslation } from 'react-i18next'

const QA = [
  { q: "هل أحتاج إلى حساب؟", a: "لا. تكتب اسمك وبريدك وتختار دولتك، وتدخل الغرفة مباشرة." },
  { q: "كيف أدعو الآخرين؟", a: "انسخ رابط الدعوة من أعلى الغرفة أو أرسل الكود المكوّن من ستة أحرف." },
  { q: "من يستطيع تشغيل الكاميرا؟", a: "المسؤول دائمًا. أما بقية المشاركين فيطلبون الإذن ويوافق المسؤول بنقرة." },
  { q: "أين تُحفظ التسجيلات؟", a: "في تبويب «الملفات والتسجيلات» داخل الغرفة، وتبقى متاحة بعد انتهاء الجلسة." },
  { q: "هل أستطيع رفع مستندات؟", a: "نعم، صور ومستندات حتى 25 ميغابايت، وتظهر كبطاقة على السبورة." },
  { q: "ماذا لو أنهى المسؤول الجلسة؟", a: "تُغلق الغرفة للجميع، وتبقى السبورة والتسجيلات محفوظة للرجوع إليها." },
]

export function QuickAnswers() {
  const { t } = useTranslation()
  return (
    <section id="faq" className="mx-auto max-w-7xl px-5 pb-16 md:px-8 md:pb-24">
      <MotionReveal>
        <MotionItem><h2 className="mb-6 text-2xl font-extrabold md:text-3xl">{t("أسئلة سريعة")}</h2></MotionItem>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3">
          {QA.map((x) => (
            <MotionItem key={x.q} className="-ms-[1.5px] -mt-[1.5px] border-[1.5px] border-border p-6 transition-colors duration-150 hover:border-primary">
              <h3 className="text-base font-bold">{t(x.q)}</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{t(x.a)}</p>
            </MotionItem>
          ))}
        </div>
      </MotionReveal>
    </section>
  )
}
