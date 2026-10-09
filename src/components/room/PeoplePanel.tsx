import { useState } from "react"
import { Ban, Check, Crown, LayoutGrid, Mic, MicOff, Pencil, Video, VideoOff, X } from "lucide-react"
import { MAIN_BOARD, type BoardMeta } from "@/lib/boardStore"
import { Avatar } from "./Avatar"
import { AccessAdmin } from "./AccessAdmin"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { countryName, type Peer } from "@/lib/roomboard"
import type { Media } from "@/hooks/useMedia"
import { cn } from "@/lib/utils"
import { useTranslation } from 'react-i18next'

interface Props { peers: Peer[]; meId: string; isAdmin: boolean; media: Media; roomCode: string; onBan: (p: Peer) => void; boards: BoardMeta[]; onGoto: (id: string) => void }

const perm = "flex h-7 w-7 items-center justify-center rounded-[6px] border border-border transition-colors duration-150"

export function PeoplePanel({ peers, meId, isAdmin, media, roomCode, onBan, boards, onGoto }: Props) {
  const { t } = useTranslation()
  const [target, setTarget] = useState<Peer | null>(null)
  const sorted = [...peers].sort((a, b) => Number(b.isAdmin) - Number(a.isAdmin))
  return (
    <div className="h-full overflow-y-auto">
      {isAdmin && (
        <button onClick={() => media.grant("*", "edit", !media.editAll)}
          className={cn("flex w-full items-center justify-between gap-2 border-b border-border px-4 py-3 text-start text-sm font-semibold transition-colors duration-150 hover:bg-muted", media.editAll && "bg-accent/10")}>
          <span className="flex items-center gap-2"><Pencil className="h-4 w-4 text-accent" />{t("السماح للجميع بالتحرير")}</span>
          <span className={cn("rounded-[6px] px-2 py-0.5 text-xs font-bold", media.editAll ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground")}>{media.editAll ? t("مفعّل") : t("متوقف")}</span>
        </button>
      )}
      {isAdmin && media.requests.length > 0 && (
        <div className="border-b border-border bg-muted/50 p-4">
          <h4 className="mb-2 text-xs font-bold text-accent">{t("طلبات بانتظار موافقتك")}</h4>
          <ul className="space-y-2">
            {media.requests.map((r) => (
              <li key={r.id + r.kind} className="flex items-center justify-between gap-2 rounded-[6px] border-[1.5px] border-border bg-background px-3 py-2 text-sm">
                <span>{t(r.name)} — {r.kind === "cam" ? t("الكاميرا") : r.kind === "mic" ? t("الميكروفون") : t("التحرير على السبورة")}</span>
                <span className="flex gap-1">
                  <button aria-label={t("موافقة")} onClick={() => media.grant(r.id, r.kind, true)} className={cn(perm, "bg-primary text-primary-foreground")}><Check className="h-4 w-4" /></button>
                  <button aria-label={t("رفض")} onClick={() => media.dismiss(r.id, r.kind)} className={perm}><X className="h-4 w-4" /></button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <ul className="divide-y divide-border">
        {sorted.map((p) => (
          <li key={p.id} className="flex items-center gap-3 px-4 py-3">
            <Avatar name={p.name} color={p.color} size={36} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                <span className="truncate">{t(p.name)}{p.id === meId && t(" (أنت)")}</span>
                {p.isAdmin && <Crown className="h-3.5 w-3.5 shrink-0 text-accent" aria-label={t("مسؤول")} />}
              </div>
              <div className="text-xs text-muted-foreground">{countryName(p.country)}</div>
              {boards.length > 1 && (() => {
                const bi = Math.max(0, boards.findIndex((b) => b.id === (p.board || MAIN_BOARD)))
                const name = boards[bi].name || t("لوحة {{n}}", { n: bi + 1 })
                return (
                  <button onClick={() => onGoto(boards[bi].id)} title={t("الانتقال إلى هذه اللوحة")}
                    className="mt-0.5 flex max-w-full items-center gap-1 text-[11px] font-semibold text-accent transition-colors duration-150 hover:underline">
                    <LayoutGrid className="h-3 w-3 shrink-0" /><span className="truncate">{name}</span>
                  </button>
                )
              })()}
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              {p.cam ? <Video className="h-4 w-4 text-accent" /> : <VideoOff className="h-4 w-4 opacity-40" />}
              {p.mic ? <Mic className="h-4 w-4 text-accent" /> : <MicOff className="h-4 w-4 opacity-40" />}
            </div>
            {isAdmin && !p.isAdmin && (
              <div className="flex gap-1 ps-1">
                <button title={media.perms[p.id]?.edit ? t("سحب إذن التحرير") : t("منح إذن التحرير")} aria-label={t("إذن التحرير")}
                  onClick={() => media.grant(p.id, "edit", !media.perms[p.id]?.edit)}
                  className={cn(perm, (media.perms[p.id]?.edit || media.editAll) && "bg-accent text-accent-foreground")}><Pencil className="h-3.5 w-3.5" /></button>
                <button title={media.perms[p.id]?.cam ? t("سحب إذن الكاميرا") : t("منح إذن الكاميرا")} aria-label={t("إذن الكاميرا")}
                  onClick={() => media.grant(p.id, "cam", !media.perms[p.id]?.cam)}
                  className={cn(perm, media.perms[p.id]?.cam && "bg-accent text-accent-foreground")}><Video className="h-3.5 w-3.5" /></button>
                <button title={media.perms[p.id]?.mic ? t("سحب إذن الميكروفون") : t("منح إذن الميكروفون")} aria-label={t("إذن الميكروفون")}
                  onClick={() => media.grant(p.id, "mic", !media.perms[p.id]?.mic)}
                  className={cn(perm, media.perms[p.id]?.mic && "bg-accent text-accent-foreground")}><Mic className="h-3.5 w-3.5" /></button>
                <button title={t("حظر نهائي")} aria-label={t("حظر نهائي")} onClick={() => setTarget(p)}
                  className={cn(perm, "text-destructive hover:bg-destructive hover:text-destructive-foreground")}><Ban className="h-3.5 w-3.5" /></button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {isAdmin && <p className="p-4 text-xs leading-relaxed text-muted-foreground">{t("أنت المسؤول: السبورة للعرض فقط لكل المشاركين حتى تمنحهم إذن التحرير (زر القلم). فعّل أزرار الكاميرا والميكروفون بجانب كل مشارك لمنحه الإذن، واضغط عليها مجددًا لسحبه. زر الحظر يمنع المشارك نهائيًا من الدخول إلى هذه الغرفة.")}</p>}
      {isAdmin && <AccessAdmin code={roomCode} />}
      <AlertDialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader className="text-start">
            <AlertDialogTitle>{t("حظر")} {target?.name} {t("نهائيًا؟")}</AlertDialogTitle>
            <AlertDialogDescription>{t("سيُخرَج من الغرفة الآن، ولن يستطيع الدخول إليها مجددًا بهذا الجهاز أو بهذا البريد الإلكتروني.")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:space-x-0">
            <AlertDialogCancel>{t("تراجع")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (target) onBan(target); setTarget(null) }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("حظر نهائي")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
