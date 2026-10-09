import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { MotionItem, MotionReveal } from "@/components/MotionReveal"
import { useTranslation } from "react-i18next"

const QA = [
  { q: "Do I need an account?", a: "No. Enter a name and an email, choose your country, and you are in. Your email is never shown to anyone." },
  { q: "How do I invite people?", a: "Copy the invite link from the top of the room, or send the six-letter code." },
  { q: "Who can turn on a camera or microphone?", a: "The admin always can. Everyone else asks, and the admin approves with one click." },
  { q: "Can I upload documents?", a: "Yes. Images and documents up to 25 MB appear on the board as cards." },
  { q: "What happens when the admin ends the session?", a: "The room closes for everyone. The host sees the guest list with names, emails and countries, and can send it to Google Sheets or download a CSV. It is kept for ten minutes, then deleted." },
  { q: "Can the host share a picture of the board?", a: "Yes. One click captures the board and every guest can download it for ten minutes before it is deleted." },
]

export function Faq() {
  const { t } = useTranslation()
  return (
    <section id="faq" className="mx-auto max-w-3xl px-5 pb-20 md:px-8 md:pb-28">
      <MotionReveal>
        <MotionItem><h2 className="mb-8 text-center font-display text-4xl font-extrabold tracking-[-0.03em] md:text-5xl">{t("Quick answers.")}</h2></MotionItem>
        <MotionItem>
          <Accordion type="single" collapsible className="rounded-2xl border border-border bg-card px-5 md:px-7">
            {QA.map((x) => (
              <AccordionItem key={x.q} value={x.q} className="border-border last:border-b-0">
                <AccordionTrigger className="py-5 text-start text-lg font-semibold hover:no-underline">{t(x.q)}</AccordionTrigger>
                <AccordionContent className="pb-5 text-base leading-7 text-muted-foreground">{t(x.a)}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </MotionItem>
      </MotionReveal>
    </section>
  )
}
