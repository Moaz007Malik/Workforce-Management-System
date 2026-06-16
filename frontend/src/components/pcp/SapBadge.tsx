export function SapBadge({ status = 'Not Connected' }: { status?: string }) {
  const connected = status === 'Connected'
  return (
    <span
      className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
        connected
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700'
          : 'border-border bg-muted text-muted-foreground'
      }`}
    >
      SAP Sync: {status}
    </span>
  )
}
