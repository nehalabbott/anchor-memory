import PageHeader from '@/components/PageHeader'
import { useApp } from '@/store/useApp'

export default function Garden() {
  const count = useApp((s) => s.memories.length)
  const flowers = Math.min(count, 8)
  return (
    <>
      <PageHeader title="Your Memory Garden" />
      <div className="card p-6 text-center" role="img" aria-label={`${flowers} flowers blooming`}>
        <div className="text-5xl tracking-widest leading-relaxed">{'🌷🌻🌸🌼🌺🌹🪻🌱'.match(/./gu)!.slice(0, Math.max(flowers, 1)).join(' ')}</div>
      </div>
      <div className="mt-4 rounded-card border-2 border-garden-500 bg-mint-100 p-4">
        <h2 className="text-xl text-garden-900">Your garden is flourishing!</h2>
        <p className="text-ink/80">Every memory you recall helps your garden grow beautifully and bloom with life.</p>
      </div>
      <p className="mt-4 text-ink/70 text-center">The garden will grow with every game you enjoy (Part 2).</p>
    </>
  )
}
