import { Mic, MicOff, ShieldCheck, ShieldOff } from 'lucide-react'
import { useApp } from '@/store/useApp'

export default function VoicePrivacyControl() {
  const privacyShieldEnabled = useApp((state) => state.privacyShieldEnabled)
  const voiceListeningEnabled = useApp((state) => state.voiceListeningEnabled)
  const voiceSupported = useApp((state) => state.voiceSupported)
  const voiceListening = useApp((state) => state.voiceListening)
  const voiceError = useApp((state) => state.voiceError)
  const assistantOpen = useApp((state) => state.assistantOpen)
  const setPrivacyShieldEnabled = useApp((state) => state.setPrivacyShieldEnabled)
  const setVoiceListeningEnabled = useApp((state) => state.setVoiceListeningEnabled)
  const denied = /permission was blocked/i.test(voiceError)
  const status = privacyShieldEnabled ? 'Mic Off / Private'
    : !voiceSupported ? 'Listening unavailable'
      : denied ? 'Permission denied. Mic is off.'
        : voiceError ? 'Listening unavailable'
        : assistantOpen && voiceListeningEnabled ? 'Ambient listening paused while Mo is open'
          : voiceListening ? 'Listening'
            : voiceListeningEnabled ? 'Starting voice listening'
              : 'Mic Off'

  return (
    <section aria-label="Voice and privacy controls" className="flex items-center gap-2 border-t border-mint-200 bg-white px-3 py-2">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mist text-garden-900" aria-hidden>
        {privacyShieldEnabled ? <ShieldCheck size={20} /> : voiceListening ? <Mic size={20} /> : <ShieldOff size={20} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink" aria-live="polite">{status}</p>
        {voiceError && !privacyShieldEnabled && <p className="text-xs text-rose-deep" role="status">{voiceError}</p>}
        <p className="text-[10px] leading-tight text-ink/65">Anchor does not send mic audio. Browser speech recognition may process audio under its own privacy settings.</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={privacyShieldEnabled}
        aria-label={`Privacy Shield: microphone is ${privacyShieldEnabled ? 'off' : 'available'}`}
        onClick={() => setPrivacyShieldEnabled(!privacyShieldEnabled)}
        className={`min-h-10 rounded-xl border px-2 text-xs font-semibold ${privacyShieldEnabled ? 'border-garden-700 bg-mint-100 text-garden-900' : 'border-ink/40 bg-white text-ink'}`}
      >
        {privacyShieldEnabled ? 'Private' : 'Privacy Shield'}
      </button>
      {!privacyShieldEnabled && voiceSupported && (
        <button
          type="button"
          aria-pressed={voiceListeningEnabled}
          aria-label={voiceListeningEnabled ? 'Stop voice listening' : denied ? 'Try microphone permission again' : 'Enable voice listening'}
          onClick={() => setVoiceListeningEnabled(!voiceListeningEnabled)}
          className="flex min-h-10 items-center gap-1 rounded-xl border border-garden-700 bg-white px-2 text-xs font-semibold text-garden-900"
        >
          {voiceListeningEnabled ? <MicOff size={16} aria-hidden /> : <Mic size={16} aria-hidden />}
          {voiceListeningEnabled ? 'Stop' : denied ? 'Retry mic' : 'Listen'}
        </button>
      )}
      {!privacyShieldEnabled && !voiceSupported && <span className="sr-only">Voice listening is not supported by this browser.</span>}
    </section>
  )
}
