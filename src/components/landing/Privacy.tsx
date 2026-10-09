import { Ban, Clock, FileSpreadsheet, KeyRound, Pencil, ShieldCheck } from "lucide-react"
import { MotionItem, MotionReveal } from "@/components/MotionReveal"
import { Button } from "@/components/ui/button"
import { useTranslation } from "react-i18next"

const ROWS = [["Sara", "sara@example.com", "Morocco"], ["Leo", "leo@example.com", "France"], ["Ana", "ana@example.com", "Spain"]]

export function Privacy() {
  const { t } = useTranslation()
  return (
    <section id="privacy" className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
      <MotionReveal className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <MotionItem>
            <h2 className="font-display text-4xl font-extrabold tracking-[-0.03em] md:text-5xl">{t("Your room, your rules.")}</h2>
            <p className="mt-4 max-w-xl text-lg leading-8 text-muted-foreground">{t("The creator of a room is its admin. Nothing happens on the board, on camera or on a microphone unless they allow it.")}</p>
          </MotionItem>
          <MotionItem>
            <ul className="mt-8 divide-y divide-border border-y border-border">
              <li className="flex gap-4 py-4"><KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-accent" /><p className="leading-7"><b className="font-semibold">{t("Password-protected rooms.")}</b> <span className="text-muted-foreground">{t("Change it any time without kicking out the people already inside.")}</span></p></li>
              <li className="flex gap-4 py-4"><Pencil className="mt-0.5 h-5 w-5 shrink-0 text-accent" /><p className="leading-7"><b className="font-semibold">{t("View-only by default.")}</b> <span className="text-muted-foreground">{t("Guests ask for edit rights; you approve one person or everyone.")}</span></p></li>
              <li className="flex gap-4 py-4"><Ban className="mt-0.5 h-5 w-5 shrink-0 text-accent" /><p className="leading-7"><b className="font-semibold">{t("Permanent bans.")}</b> <span className="text-muted-foreground">{t("A banned guest is removed at once and can't come back with the same device or email.")}</span></p></li>
              <li className="flex gap-4 py-4"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" /><p className="leading-7"><b className="font-semibold">{t("Emails stay private.")}</b> <span className="text-muted-foreground">{t("Other guests never see your address. Only the host gets the guest list.")}</span></p></li>
            </ul>
          </MotionItem>
        </div>
        <MotionItem>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_24px_48px_-30px_hsl(var(--foreground)/0.4)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-accent">{t("Session ended")}</p>
                <p className="font-display text-lg font-bold">{t("Guest list")}</p>
              </div>
              <span className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-semibold"><Clock className="h-3.5 w-3.5 text-accent" /><span dir="ltr" className="font-mono">9:42</span></span>
            </div>
            <div className="mt-4 overflow-hidden rounded-xl border border-border text-xs" dir="ltr">
              <div className="grid grid-cols-3 bg-muted/60 px-3 py-2 font-semibold text-muted-foreground"><span>{t("Name")}</span><span>{t("Email")}</span><span>{t("Country")}</span></div>
              {ROWS.map((r) => (
                <div key={r[0]} className="grid grid-cols-3 gap-2 border-t border-border px-3 py-2"><span className="font-semibold">{t(r[0])}</span><span className="truncate text-muted-foreground">{t(r[1])}</span><span>{t(r[2])}</span></div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" className="pointer-events-none gap-1.5" tabIndex={-1}><FileSpreadsheet className="h-4 w-4" />{t("Send to Google Sheets")}</Button>
              <Button size="sm" variant="outline" className="pointer-events-none" tabIndex={-1}>{t("Download CSV")}</Button>
            </div>
            <p className="mt-4 border-t border-border pt-3 text-xs leading-6 text-muted-foreground">{t("When you end the room, the host sees names, emails and countries. Everything is kept for ten minutes, then deleted.")}</p>
          </div>
        </MotionItem>
      </MotionReveal>
    </section>
  )
}
