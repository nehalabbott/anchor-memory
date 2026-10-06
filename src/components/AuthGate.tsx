import { useEffect, useState, type ReactNode } from 'react'
import { HeartHandshake, LockKeyhole } from 'lucide-react'
import { getSession, login, logout, register } from '@/lib/apiClient'
import { useApp } from '@/store/useApp'
import type { SupportedPerson } from '@/lib/types'
import { DEFAULT_PERSONAL_PREFERENCES } from '@/lib/personalization'

function activateAuthenticatedPatient(patient: SupportedPerson) {
  const state = useApp.getState()
  const changedPatient = state.supportedPerson.id !== patient.id
  if (changedPatient) {
    state.clearChat()
    useApp.setState({
      memories: [], preferences: DEFAULT_PERSONAL_PREFERENCES, lastSessionExperience: null,
      localDataImported: true, pendingPersonSync: false, pendingMemoryIds: [], events: [], interactionState: 'normal',
    })
  }
  state.hydrateServerData(patient, changedPatient ? [] : state.memories)
  state.setCachedPerson(patient)
  state.setUserName(patient.name)
}

export default function AuthGate({ children }: { children: ReactNode }) {
  const [checking, setChecking] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  useEffect(() => {
    let active = true
    getSession().then((session) => {
      if (!active) return
      if (session) {
        activateAuthenticatedPatient(session.patient)
        setAuthenticated(true)
      }
      setChecking(false)
    }).catch(() => {
      if (active) setChecking(false)
    })
    return () => { active = false }
  }, [])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setMessage('')
    try {
      const session = mode === 'register'
        ? await register({ email, password, name })
        : await login({ email, password })
      activateAuthenticatedPatient(session.patient)
      setAuthenticated(true)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to continue.')
    } finally {
      setSubmitting(false)
    }
  }

  const signOut = async () => {
    try { await logout() } finally {
      setChecking(true)
      useApp.setState({ supportedPerson: useApp.getState().supportedPerson, userName: 'Margaret' })
      window.location.reload()
    }
  }

  if (checking) {
    return <main className="min-h-screen grid place-items-center bg-mist px-6 text-center"><div><HeartHandshake className="mx-auto text-garden-700" size={42} /><p className="mt-4 font-display text-xl font-bold">Opening your private space…</p></div></main>
  }

  if (authenticated) return <>{children}</>

  return (
    <main className="min-h-screen bg-mist px-5 py-8">
      <div className="mx-auto max-w-md rounded-[28px] bg-white p-6 shadow-soft">
        <div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-full bg-garden-100 text-garden-700"><HeartHandshake size={26} /></span><div><p className="font-display text-2xl font-bold">Anchor</p><p className="text-sm text-ink/70">A private space for your memories</p></div></div>
        <h1 className="mt-7 text-2xl font-bold">{mode === 'login' ? 'Welcome back' : 'Create your private space'}</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink/70">Your account and memories stay on this Anchor server. Session cookies are HttpOnly and expire automatically.</p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          {mode === 'register' && <label className="block"><span className="mb-1 block text-sm font-semibold">Your name</span><input required minLength={1} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-xl border-2 border-mint-200 bg-white px-4 py-3" placeholder="Name" /></label>}
          <label className="block"><span className="mb-1 block text-sm font-semibold">Email</span><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border-2 border-mint-200 bg-white px-4 py-3" placeholder="you@example.com" /></label>
          <label className="block"><span className="mb-1 block text-sm font-semibold">Password</span><input required minLength={10} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border-2 border-mint-200 bg-white px-4 py-3" placeholder="At least 10 characters" /></label>
          {message && <p role="alert" className="rounded-xl bg-rose-soft px-3 py-2 text-sm text-rose-deep">{message}</p>}
          <button disabled={submitting} className="btn-primary w-full min-h-[52px]">{submitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
        </form>
        <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setMessage('') }} className="mt-4 w-full text-sm font-semibold text-garden-700">{mode === 'login' ? 'New here? Create an account' : 'Already have an account? Sign in'}</button>
        <button type="button" onClick={signOut} className="mt-8 flex w-full items-center justify-center gap-2 text-sm text-ink/60"><LockKeyhole size={16} /> Sign out of this browser</button>
      </div>
    </main>
  )
}
