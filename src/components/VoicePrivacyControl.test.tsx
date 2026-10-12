import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import VoicePrivacyControl from './VoicePrivacyControl'
import { useApp } from '@/store/useApp'

describe('global voice privacy control', () => {
  beforeEach(() => {
    useApp.setState({
      privacyShieldEnabled: true,
      voiceListeningEnabled: false,
      voiceSupported: true,
      voiceListening: false,
      voiceError: '',
    })
  })

  it('starts private by default and requires an explicit listening action', async () => {
    const user = userEvent.setup()
    render(<VoicePrivacyControl />)

    expect(screen.getByText('Mic Off / Private')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Privacy Shield: microphone is off' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.queryByRole('button', { name: 'Enable voice listening' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('switch', { name: 'Privacy Shield: microphone is off' }))
    expect(screen.getByRole('button', { name: 'Enable voice listening' })).toBeInTheDocument()
    expect(useApp.getState().voiceListeningEnabled).toBe(false)

    await user.click(screen.getByRole('button', { name: 'Enable voice listening' }))
    expect(useApp.getState().voiceListeningEnabled).toBe(true)
  })

  it('communicates unsupported speech recognition without relying on color', () => {
    useApp.setState({ privacyShieldEnabled: false, voiceSupported: false })
    render(<VoicePrivacyControl />)

    expect(screen.getByText('Listening unavailable')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Enable voice listening' })).not.toBeInTheDocument()
  })

  it('shows a clear permission-denied state', () => {
    useApp.setState({ privacyShieldEnabled: false, voiceSupported: true, voiceError: 'Microphone permission was blocked. Mic is off and private.' })
    render(<VoicePrivacyControl />)

    expect(screen.getByText('Permission denied. Mic is off.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try microphone permission again' })).toBeInTheDocument()
  })
})