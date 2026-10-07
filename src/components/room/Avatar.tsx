export function Avatar({ name, color, size = 32 }: { name: string; color: string; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ width: size, height: size, background: color, fontSize: size * 0.42 }}
    >
      {(name || "؟").trim().charAt(0).toUpperCase()}
    </span>
  )
}
