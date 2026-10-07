import { useEffect, useRef, useState } from "react"
import { Check, Pencil, Plus, Trash2 } from "lucide-react"
import { MAIN_BOARD, type BoardMeta } from "@/lib/boardStore"
import { MAX_BOARDS } from "@/hooks/useBoardSync"
import type { Peer } from "@/lib/roomboard"
import { cn } from "@/lib/utils"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useTranslation } from "react-i18next"

interface Props {
  boards: BoardMeta[]; current: string; peers: Peer[]; meId: string
  canEdit: boolean; isAdmin: boolean
  onSwitch: (id: string) => void; onAdd: () => void
  onRename: (id: string, name: string) => void; onRemove: (id: string) => void
}

/** Sheet-style tabs at the bottom of the board: one tab per board, with who is on each one. */
export function BoardTabs({ boards, current, peers, meId, canEdit, isAdmin, onSwitch, onAdd, onRename, onRemove }: Props) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [del, setDel] = useState<BoardMeta | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const label = (b: BoardMeta, i: number) => b.name || t("لوحة {{n}}", { n: i + 1 })

  useEffect(() => {
    scroller.current?.querySelector<HTMLElement>("[data-active='true']")?.scrollIntoView({ block: "nearest", inline: "nearest" })
  }, [current, boards.length])

  const startEdit = (b: BoardMeta, i: number) => { setDraft(label(b, i)); setEditing(b.id) }
  const commit = () => { if (editing && draft.trim()) onRename(editing, draft.trim().slice(0, 30)); setEditing(null) }

  return (
    <div className="flex h-10 shrink-0 items-stretch gap-1 border-t-[1.5px] border-border bg-muted/50 px-2">
      {canEdit && boards.length < MAX_BOARDS && (
        <button onClick={onAdd} title={t("إضافة لوحة جديدة")} aria-label={t("إضافة لوحة جديدة")}
          className="my-1 flex w-8 shrink-0 items-center justify-center rounded-[6px] text-muted-foreground transition-colors duration-150 hover:bg-background hover:text-foreground">
          <Plus className="h-4 w-4" />
        </button>
      )}
      <div ref={scroller} className="flex min-w-0 flex-1 items-end gap-0.5 overflow-x-auto">
        {boards.map((b, i) => {
          const active = b.id === current
          const here = peers.filter((p) => (p.board || MAIN_BOARD) === b.id)
          return (
            <div key={b.id} data-active={active}
              className={cn("group flex h-9 shrink-0 items-center gap-1.5 rounded-t-[8px] border-[1.5px] border-b-0 px-3 text-sm transition-colors duration-150",
                active ? "border-border bg-background font-bold" : "border-transparent text-muted-foreground hover:bg-background/70")}>
              {editing === b.id ? (
                <>
                  <input autoFocus value={draft} maxLength={30} onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(null) }}
                    className="h-6 w-24 rounded-[4px] border border-input bg-background px-1.5 text-sm outline-none focus:border-accent" />
                  <button aria-label={t("حفظ")} onClick={commit} className="rounded-[4px] p-0.5 hover:bg-muted"><Check className="h-3.5 w-3.5" /></button>
                </>
              ) : (
                <>
                  <button onClick={() => onSwitch(b.id)} onDoubleClick={() => isAdmin && startEdit(b, i)} className="max-w-[9rem] truncate">{label(b, i)}</button>
                  {here.length > 0 && (
                    <span className="flex items-center" title={here.map((p) => p.name).join("، ")}>
                      {here.slice(0, 4).map((p) => (
                        <i key={p.id} className={cn("-ms-1 h-3 w-3 rounded-full border-[1.5px] border-background first:ms-0", p.id === meId && "ring-1 ring-foreground/40")} style={{ background: p.color }} />
                      ))}
                      {here.length > 4 && <span className="ms-1 text-[10px] font-bold">+{here.length - 4}</span>}
                    </span>
                  )}
                  {isAdmin && active && (
                    <>
                      <button aria-label={t("تغيير اسم اللوحة")} title={t("تغيير اسم اللوحة")} onClick={() => startEdit(b, i)} className="rounded-[4px] p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil className="h-3 w-3" /></button>
                      {b.id !== MAIN_BOARD && <button aria-label={t("حذف اللوحة")} title={t("حذف اللوحة")} onClick={() => setDel(b)} className="rounded-[4px] p-0.5 text-destructive hover:bg-muted"><Trash2 className="h-3 w-3" /></button>}
                    </>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
      <AlertDialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader className="text-start">
            <AlertDialogTitle>{t("حذف هذه اللوحة؟")}</AlertDialogTitle>
            <AlertDialogDescription>{t("ستُحذف اللوحة وكل ما فيها لدى جميع المشاركين، وسينتقل من كان عليها إلى اللوحة الأولى.")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:space-x-0">
            <AlertDialogCancel>{t("تراجع")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (del) onRemove(del.id); setDel(null) }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("حذف اللوحة")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
