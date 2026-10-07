import { Lock, LockOpen, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { objBounds } from "@/lib/boardDraw"
import type { BoardStore } from "@/lib/boardStore"
import type { BoardActions } from "@/hooks/useBoardSync"
import { useTranslation } from "react-i18next"

interface Props { store: BoardStore; actions: BoardActions; meId: string; isAdmin: boolean }

const btn = "flex h-8 items-center gap-1.5 rounded-[6px] px-2.5 text-xs font-semibold transition-colors duration-150 hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent"

/** Floating bar above the selection: pin (lock) / unpin / delete. */
export function SelectionBar({ store, actions, meId, isAdmin }: Props) {
  const { t } = useTranslation()
  const objs = [...store.selection].map((id) => store.objects.get(id)).filter(Boolean) as NonNullable<ReturnType<typeof store.objects.get>>[]
  if (!objs.length) return null

  const { x, y, s } = store.view
  let a = Infinity, b = Infinity, c = -Infinity
  objs.forEach((o) => { const r = objBounds(o, store.objects); a = Math.min(a, r[0]); b = Math.min(b, r[1]); c = Math.max(c, r[2]) })
  const left = Math.min(Math.max(((a + c) / 2) * s + x, 90), Math.max(90, store.size.w - 90))
  const top = Math.max(8, b * s + y - 52)

  const anyUnlocked = objs.some((o) => !o.locked)
  const canUnlock = (o: (typeof objs)[number]) => isAdmin || (o.lockedBy || o.by) === meId

  const toggleLock = () => {
    if (anyUnlocked) {
      objs.filter((o) => !o.locked).forEach((o) => actions.addObj({ ...o, locked: true, lockedBy: meId }))
      toast.success(t("تم تثبيت العناصر"))
    } else {
      const ok = objs.filter(canUnlock)
      if (!ok.length) return toast.info(t("لا يمكنك إلغاء تثبيت هذا العنصر — صاحب التثبيت أو المسؤول فقط"))
      ok.forEach((o) => actions.addObj({ ...o, locked: false, lockedBy: undefined }))
      toast.success(t("تم إلغاء التثبيت"))
    }
  }
  const del = () => {
    objs.filter((o) => !o.locked).forEach((o) => actions.deleteObj(o.id))
    store.selection.clear(); store.bump()
  }

  return (
    <div className="absolute z-20 flex -translate-x-1/2 items-center gap-0.5 rounded-[8px] border-[1.5px] border-border bg-background/95 p-1 backdrop-blur" style={{ left, top }}
      onPointerDown={(e) => e.stopPropagation()}>
      {objs.length > 1 && <span className="px-2 text-xs font-semibold text-muted-foreground">{t("{{n}} عناصر", { n: objs.length })}</span>}
      <button className={btn} onClick={toggleLock} title={anyUnlocked ? t("تثبيت العناصر المحددة") : t("إلغاء التثبيت")}>
        {anyUnlocked ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
        {anyUnlocked ? t("تثبيت") : t("إلغاء التثبيت")}
      </button>
      <button className={`${btn} text-destructive`} onClick={del} disabled={!anyUnlocked} title={t("حذف")}>
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}
