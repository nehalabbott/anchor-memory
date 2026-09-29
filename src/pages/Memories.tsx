import { useState, type FormEvent } from 'react'
import { Camera, Mic, Pencil, Plus, Trash2 } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { MemoryAudio, MemoryPhoto } from '@/components/MemoryMedia'
import { DEMO_MEMORIES, DEMO_PERSON } from '@/demo/demoData'
import { mediaRepository } from '@/lib/mediaRepository'
import type { MediaReference, MemoryEvent, MemoryItem, MemoryKind, Relationship } from '@/lib/types'
import { useApp } from '@/store/useApp'

const KINDS: { value: MemoryKind; label: string }[] = [
  { value: 'person', label: 'Person' }, { value: 'story', label: 'Story' }, { value: 'place', label: 'Place' },
  { value: 'activity', label: 'Activity' }, { value: 'object', label: 'Object' }, { value: 'event', label: 'Meaningful event' },
  { value: 'sequence', label: 'Sequence of events' },
]
const RELATIONSHIPS: Relationship[] = ['son', 'daughter', 'spouse', 'grandchild', 'grandparent', 'friend', 'other']
const listFromText = (text: string) => [...new Set(text.split(/[\n,]/).map((part) => part.trim()).filter(Boolean))]
const textFromList = (values?: string[]) => values?.join(', ') ?? ''
const newId = () => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 12)

interface MemoryDraft {
  kind: MemoryKind
  name: string
  relationship: Relationship | ''
  story: string
  people: string
  places: string
  activities: string
  objects: string
  events: string
}

function draftFrom(memory?: MemoryItem): MemoryDraft {
  return {
    kind: memory?.kind ?? 'person', name: memory?.name ?? '', relationship: memory?.relationship ?? '',
    story: memory?.story ?? '', people: textFromList(memory?.people), places: textFromList(memory?.places),
    activities: textFromList(memory?.activities), objects: textFromList(memory?.objects),
    events: memory?.events?.map((event) => event.title).join('\n') ?? '',
  }
}

export default function Memories() {
  const { memories, supportedPerson, setSupportedPerson, addMemory, updateMemory, deleteMemory, replaceMemories } = useApp()
  const [editing, setEditing] = useState<MemoryItem | null>(null)
  const [adding, setAdding] = useState(false)
  const [personName, setPersonName] = useState(supportedPerson.name)
  const [personalDetails, setPersonalDetails] = useState(supportedPerson.personalDetails.join('\n'))
  const [personSaved, setPersonSaved] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [notice, setNotice] = useState('')

  function savePerson(event: FormEvent) {
    event.preventDefault()
    const name = personName.trim()
    if (!name) return
    setSupportedPerson({ name, personalDetails: listFromText(personalDetails) })
    setPersonSaved(true)
  }

  function saveMemory(draft: MemoryDraft, photo?: MediaReference, voice?: MediaReference) {
    const events: MemoryEvent[] = draft.events.split('\n').map((title) => title.trim()).filter(Boolean).map((title, index) => ({
      id: newId(), title, sequenceOrder: index + 1,
    }))
    const value = {
      kind: draft.kind,
      name: draft.name.trim(),
      relationship: draft.relationship || undefined,
      story: draft.story.trim(),
      people: listFromText(draft.people),
      places: listFromText(draft.places),
      activities: listFromText(draft.activities),
      objects: listFromText(draft.objects),
      events,
      photo: photo ?? editing?.photo,
      voice: voice ?? editing?.voice,
    }
    if (editing) {
      updateMemory(editing.id, value)
      if (photo && editing.photo) void mediaRepository.remove(editing.photo).catch(() => undefined)
      if (voice && editing.voice) void mediaRepository.remove(editing.voice).catch(() => undefined)
    } else addMemory(value)
    setEditing(null)
    setAdding(false)
    setNotice('Memory saved. It can now shape a personal activity.')
  }

  function removeMemory(memory: MemoryItem) {
    deleteMemory(memory.id)
    if (memory.photo) void mediaRepository.remove(memory.photo).catch(() => undefined)
    if (memory.voice) void mediaRepository.remove(memory.voice).catch(() => undefined)
    setDeleteTarget(null)
    setEditing(null)
    setNotice('Memory removed.')
  }

  async function loadDemo() {
    await Promise.all(memories.flatMap((memory) => [memory.photo, memory.voice].filter((media): media is MediaReference => Boolean(media)).map((media) => mediaRepository.remove(media).catch(() => undefined))))
    setSupportedPerson({ name: DEMO_PERSON.name, personalDetails: DEMO_PERSON.personalDetails })
    setPersonName(DEMO_PERSON.name)
    setPersonalDetails(DEMO_PERSON.personalDetails.join('\n'))
    replaceMemories(DEMO_MEMORIES)
    setEditing(null)
    setAdding(false)
    setNotice('Fictional demo memories loaded. They are sample content, not real patient information.')
  }

  return (
    <>
      <PageHeader title="Personal Memories" subtitle="Caregiver space" />

      <section className="card p-4" aria-labelledby="person-heading">
        <h2 id="person-heading" className="text-xl">Person using Anchor</h2>
        <p className="mt-1 text-ink/75">Keep their details separate from the people and stories they remember.</p>
        <form onSubmit={savePerson} className="mt-4 space-y-3">
          <label className="block font-semibold" htmlFor="supported-name">Name
            <input id="supported-name" value={personName} onChange={(event) => { setPersonName(event.target.value); setPersonSaved(false) }} required className="mt-1 min-h-[56px] w-full rounded-xl border-2 border-mint-200 bg-white px-4" />
          </label>
          <label className="block font-semibold" htmlFor="personal-details">Helpful personal details
            <textarea id="personal-details" value={personalDetails} onChange={(event) => { setPersonalDetails(event.target.value); setPersonSaved(false) }} rows={3} placeholder="Interests, familiar routines, or comforting topics" className="mt-1 w-full rounded-xl border-2 border-mint-200 bg-white p-3" />
          </label>
          <button className="btn-soft w-full" type="submit">Save person details</button>
          {personSaved && <p role="status" className="text-garden-900">Person details saved.</p>}
        </form>
      </section>

      <section className="mt-6" aria-labelledby="memories-heading">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="memories-heading" className="text-xl">Memories for activities</h2>
            <p className="mt-1 text-ink/75">Personal details here are used to create familiar activities.</p>
          </div>
          <button type="button" onClick={() => { setEditing(null); setAdding(true) }} aria-label="Add a memory" className="min-h-[56px] min-w-[56px] rounded-full bg-garden-700 text-white flex items-center justify-center"><Plus size={26} /></button>
        </div>

        <div className="mt-3 rounded-card border-2 border-sun-main bg-sun-soft p-3">
          <p className="font-semibold text-sun-deep">Fictional demonstration content</p>
          <p className="text-sun-deep">Load sample memories for a complete demo. This is not real patient information.</p>
          <button type="button" onClick={() => void loadDemo()} className="mt-3 min-h-[52px] rounded-xl border-2 border-sun-deep bg-white px-4 font-semibold text-sun-deep">Load fictional demo memories</button>
        </div>

        {notice && <p role="status" className="mt-3 rounded-xl bg-mint-100 p-3 text-garden-900">{notice}</p>}
        {adding && <MemoryForm onCancel={() => setAdding(false)} onSave={saveMemory} />}
        {editing && <MemoryForm key={editing.id} memory={editing} onCancel={() => setEditing(null)} onSave={saveMemory} />}

        {memories.length === 0 ? (
          <div className="card mt-4 p-5 text-center">
            <h3 className="text-xl">Start with a familiar memory</h3>
            <p className="mt-2 text-ink/75">A caregiver can add a person, story, place, activity, object, or meaningful sequence. Activities will use what is shared here.</p>
            <button type="button" className="btn-primary mt-4 w-full" onClick={() => setAdding(true)}>Add the first memory</button>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {memories.map((memory) => (
              <li key={memory.id} className="card overflow-hidden p-4">
                <div className="flex items-start gap-3">
                  <MemoryPhoto reference={memory.photo} alt={`Photo for ${memory.name}`} className="h-20 w-20 shrink-0 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold uppercase text-garden-700">{KINDS.find((kind) => kind.value === memory.kind)?.label ?? 'Memory'}</p>
                    <h3 className="text-lg">{memory.name}{memory.relationship ? ` · ${memory.relationship}` : ''}</h3>
                    {memory.story && <p className="mt-1 text-ink/80">{memory.story}</p>}
                  </div>
                  <button type="button" onClick={() => { setAdding(false); setEditing(memory) }} aria-label={`Edit ${memory.name}`} className="min-h-[48px] min-w-[48px] rounded-full border-2 border-mint-200 bg-white text-garden-900 flex items-center justify-center"><Pencil size={20} /></button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-sm text-ink/75">
                  {[...memory.people ?? [], ...memory.places ?? [], ...memory.activities ?? [], ...memory.objects ?? []].map((detail) => <span key={`${memory.id}-${detail}`} className="rounded-full bg-mist px-3 py-1">{detail}</span>)}
                </div>
                {memory.events?.length ? <p className="mt-3 text-ink/80"><span className="font-semibold">Sequence:</span> {memory.events.map((event) => event.title).join(' → ')}</p> : null}
                <div className="mt-3"><MemoryAudio reference={memory.voice} /></div>
                {deleteTarget === memory.id ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label={`Confirm removing ${memory.name}`}>
                    <span className="mr-auto">Remove this memory?</span>
                    <button type="button" onClick={() => removeMemory(memory)} className="min-h-[48px] rounded-xl bg-rose-deep px-4 font-semibold text-white">Remove</button>
                    <button type="button" onClick={() => setDeleteTarget(null)} className="min-h-[48px] rounded-xl border-2 border-mint-200 bg-white px-4 font-semibold">Keep</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setDeleteTarget(memory.id)} className="mt-3 min-h-[48px] rounded-xl px-3 font-semibold text-rose-deep flex items-center gap-2"><Trash2 size={19} /> Remove memory</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

function MemoryForm({ memory, onCancel, onSave }: { memory?: MemoryItem; onCancel: () => void; onSave: (draft: MemoryDraft, photo?: MediaReference, voice?: MediaReference) => void }) {
  const [draft, setDraft] = useState(() => draftFrom(memory))
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [voiceFile, setVoiceFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (key: keyof MemoryDraft, value: string) => setDraft((current) => ({ ...current, [key]: value }))

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      if ((photoFile?.size ?? 0) > 20 * 1024 * 1024 || (voiceFile?.size ?? 0) > 20 * 1024 * 1024) {
        throw new Error('Choose media files smaller than 20 MB.')
      }
      const photo = photoFile ? await mediaRepository.save(photoFile, 'photo', draft.name.trim()) : undefined
      const voice = voiceFile ? await mediaRepository.save(voiceFile, 'voice', draft.name.trim()) : undefined
      onSave(draft, photo, voice)
    } catch {
      setError('Media could not be saved on this device. Try a smaller file or continue without it.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="card mt-4 space-y-3 p-4" aria-label={memory ? 'Edit memory' : 'Add memory'}>
      <h3 className="text-xl">{memory ? 'Edit memory' : 'Add a memory'}</h3>
      <label className="block font-semibold" htmlFor="memory-kind">Type
        <select id="memory-kind" value={draft.kind} onChange={(event) => set('kind', event.target.value)} className="mt-1 min-h-[56px] w-full rounded-xl border-2 border-mint-200 bg-white px-4">
          {KINDS.map((kind) => <option key={kind.value} value={kind.value}>{kind.label}</option>)}
        </select>
      </label>
      <label className="block font-semibold" htmlFor="memory-name">Name this memory or person
        <input id="memory-name" value={draft.name} onChange={(event) => set('name', event.target.value)} required className="mt-1 min-h-[56px] w-full rounded-xl border-2 border-mint-200 bg-white px-4" />
      </label>
      <label className="block font-semibold" htmlFor="memory-relationship">Relationship, if this is a person
        <select id="memory-relationship" value={draft.relationship} onChange={(event) => set('relationship', event.target.value)} className="mt-1 min-h-[56px] w-full rounded-xl border-2 border-mint-200 bg-white px-4">
          <option value="">Not specified</option>
          {RELATIONSHIPS.map((relationship) => <option key={relationship} value={relationship}>{relationship}</option>)}
        </select>
      </label>
      <label className="block font-semibold" htmlFor="memory-story">Personal story
        <textarea id="memory-story" value={draft.story} onChange={(event) => set('story', event.target.value)} rows={4} placeholder="What makes this memory meaningful?" className="mt-1 w-full rounded-xl border-2 border-mint-200 bg-white p-3" />
      </label>
      <DetailField id="memory-people" label="People mentioned" value={draft.people} onChange={(value) => set('people', value)} />
      <DetailField id="memory-places" label="Places" value={draft.places} onChange={(value) => set('places', value)} />
      <DetailField id="memory-activities" label="Activities" value={draft.activities} onChange={(value) => set('activities', value)} />
      <DetailField id="memory-objects" label="Meaningful objects" value={draft.objects} onChange={(value) => set('objects', value)} />
      <label className="block font-semibold" htmlFor="memory-events">Events in order, one per line
        <textarea id="memory-events" value={draft.events} onChange={(event) => set('events', event.target.value)} rows={4} placeholder={'A familiar event\nWhat happened next'} className="mt-1 w-full rounded-xl border-2 border-mint-200 bg-white p-3" />
      </label>
      <label className="block rounded-xl border-2 border-mint-200 bg-white p-3 font-semibold" htmlFor="memory-photo"><span className="flex items-center gap-2"><Camera size={20} /> Photo (optional)</span>
        <input id="memory-photo" type="file" accept="image/*" onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)} className="mt-2 block w-full text-base" />
        {memory?.photo && !photoFile && <span className="mt-2 block text-sm font-normal text-ink/70">A photo is already attached. Choose another to replace it.</span>}
      </label>
      <label className="block rounded-xl border-2 border-mint-200 bg-white p-3 font-semibold" htmlFor="memory-voice"><span className="flex items-center gap-2"><Mic size={20} /> Voice recording (optional)</span>
        <input id="memory-voice" type="file" accept="audio/*" onChange={(event) => setVoiceFile(event.target.files?.[0] ?? null)} className="mt-2 block w-full text-base" />
        {memory?.voice && !voiceFile && <span className="mt-2 block text-sm font-normal text-ink/70">A recording is already attached. Choose another to replace it.</span>}
      </label>
      <p className="text-sm text-ink/70">Photos and recordings are stored on this device for this prototype. Each file must be smaller than 20 MB.</p>
      {error && <p role="alert" className="rounded-xl bg-rose-soft p-3 text-rose-deep">{error}</p>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : 'Save memory'}</button>
        <button type="button" onClick={onCancel} className="btn-soft flex-1">Cancel</button>
      </div>
    </form>
  )
}

function DetailField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block font-semibold" htmlFor={id}>{label}
    <input id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder="Separate items with commas" className="mt-1 min-h-[56px] w-full rounded-xl border-2 border-mint-200 bg-white px-4" />
  </label>
}