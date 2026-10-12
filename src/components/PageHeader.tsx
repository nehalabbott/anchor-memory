/** Clear page title with subtitle for sub-screens. */
export default function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-5">
      <h1 className="text-2xl">{title}</h1>
      {subtitle && <p className="mt-2 text-ink/70 text-lg">{subtitle}</p>}
    </header>
  )
}
