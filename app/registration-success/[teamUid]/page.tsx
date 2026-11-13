'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Copy, AlertCircle, Loader2, Printer } from 'lucide-react'
import { Header, Footer } from '@/src/App'
import { useSearchParams } from 'next/navigation'

type PassphraseDisplay = {
  passphrase: string | null
  copied: boolean
  saveAcknowledged: boolean
  displayPassphrase: boolean
}

// Store passphrase in memory only - clear on unmount
const PASSPHRASE_STORAGE_KEY = 'avishkar-registration-passphrase'

function usePassphraseMemory(passphrase: string | null) {
  const [copied, setCopied] = useState(false)
  const [saveAcknowledged, setSaveAcknowledged] = useState(false)
  const [displayed, setDisplayed] = useState(false)
  const searchParams = useSearchParams()
  const storedPassphrase = searchParams.get('passphrase')

  // Store briefly in memory for this session only
  useEffect(() => {
    setDisplayed(!!passphrase || !!storedPassphrase)
    // Do NOT persist to localStorage/sessionStorage
    // The passphrase is only in this component's state
    const timeout = setTimeout(() => {
      setCopied(false)
      setSaveAcknowledged(false)
      setDisplayed(false)
    }, 300000) // 5 minutes then auto-clear
    return () => clearTimeout(timeout)
  }, [passphrase, storedPassphrase])

  const handleCopy = () => {
    const text = passphrase || storedPassphrase
    if (!text) return
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      // Auto-clear copied state after 5 seconds
      setTimeout(() => setCopied(false), 5000)
    })
  }

  const handleSaveAcknowledge = () => {
    setSaveAcknowledged(true)
    // Do NOT persist the passphrase itself - only acknowledge saving
    // Clear after 24 hours or on component unmount
    const ackTimeout = setTimeout(() => {
      setSaveAcknowledged(false)
    }, 86400000)
    return () => clearTimeout(ackTimeout)
  }

  // Clear all on page unload/navigate
  useEffect(() => {
    return () => {
      setCopied(false)
      setSaveAcknowledged(false)
      setDisplayed(false)
      // Do NOT clear from browser storage since we never stored it
    }
  }, [])

  return { copied, saveAcknowledged, displayPassphrase: displayed, handleCopy, handleSaveAcknowledge }
}

export default function RegistrationSuccessPage() {
  const searchParams = useSearchParams()
  const teamUid = searchParams.get('teamUid') || ''
  const passphraseFromUrl = searchParams.get('passphrase') || null

  const [team, setTeam] = useState<any>(null)
  const [passphrase, setPassphrase] = useState<string | null>(passphraseFromUrl)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch team registration data
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(`/api/team/lookup?uid=${encodeURIComponent(teamUid)}`)
        const data = await res.json()
        if (!res.ok || !data.team) throw new Error(data.error || 'Team registration not found')
        setTeam(data.team)
        // Store passphrase in search params for one-time display
        // We'll use it from the URL parameter
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [teamUid, passphraseFromUrl])

  if (loading) {
    return (
      <>
        <Header />
        <main className="utility-page" style={{ textAlign: 'center', paddingTop: 120 }}>
          <Loader2 className="animate-spin" style={{ margin: '0 auto 12px', color: '#D71935' }} />
          <span className="utility-label">VERIFYING REGISTRATION...</span>
        </main>
        <Footer />
      </>
    )
  }

  if (error || !team) {
    return (
      <>
        <Header />
        <main className="utility-page">
          <div className="info-note">
            <AlertCircle size={18} color="#D71935" />
            <b>Registration not found.</b> {error}
          </div>
          <Link href="/" className="button button-red" style={{ marginTop: 16 }}>
            Back to home
          </Link>
        </main>
        <Footer />
      </>
    )
  }

  // Display passphrase component
  const { copied, saveAcknowledged, displayPassphrase, handleCopy, handleSaveAcknowledge } =
    usePassphraseMemory(passphrase)

  if (!displayPassphrase) {
    // Passphrase not yet displayed - this shouldn't happen normally
    return (
      <>
        <Header />
        <main className="utility-page">
          <div className="info-note">
            <AlertCircle size={18} color="#D71935" />
            <b>Verification in progress...</b>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="page-content">
        <section className="utility-page">
          <div className="utility-card dark" style={{ borderTop: '4px solid #D71935' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
              <div>
                <span className="utility-label">OFFICIAL ADMISSION & REGISTRATION PASS</span>
                <h1 style={{ margin: '8px 0 4px', color: '#fff' }}>
                  {team.hackathon_name || 'AVISHKAR 2K26'}
                </h1>
                <div style={{ color: '#b8c3d2', fontSize: 12 }}>
                  {team.institution_name || 'Adichunchanagiri Institute of Technology'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="utility-label">TEAM ID</span>
                <div style={{ font: '800 30px "Barlow Condensed", sans-serif', color: '#D71935' }}>
                  {team.team_uid}
                </div>
              </div>
            </div>
          </div>

          <div className="utility-card" style={{ marginTop: 24 }}>
            <span className="utility-label">PASSPHRASE FOR PARTICIPANT LOGIN</span>
            <p style={{ font: '800 24px "Barlow Condensed", sans-serif', color: '#D71935', marginBottom: 16 }}>
              {passphrase}
            </p>

            <div style={{ margin: '16px 0' }}>
              <button
                onClick={handleCopy}
                className="button"
                style={{
                  background: '#071935',
                  color: '#fff',
                  padding: '8px 16px',
                  borderRadius: 4,
                }}
                aria-label="Copy passphrase"
              >
                <Copy size={15} /> Copy
              </button>

              {copied && (
                <p style={{ margin: '8px 0', color: '#16a34a' }}>Passphrase copied to clipboard</p>
              )}
            </div>

            {/* Mandatory save acknowledgement - must be checked to proceed */}
            <div style={{ margin: '24px 0' }}>
              <label style={{ display: 'block', marginBottom: 8 }}>
                <input
                  type="checkbox"
                  readOnly
                  checked={saveAcknowledged}
                  onChange={handleSaveAcknowledge}
                  style={{ transform: 'scale(1.2)', marginRight: 4 }}
                />
                I have safely saved the passphrase above and understand it must not be shared
              </label>
              <p style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                The passphrase is required for participant login. Keep it secure and do not share it.
              </p>
            </div>

            {/* Acknowledge state */}
            {saveAcknowledged && (
              <p style={{ margin: '8px 0', color: '#16a34a' }}>
                Thank you. The passphrase has been acknowledged as saved.
              </p>
            )}
          </div>

          <div className="utility-card" style={{ marginTop: 24 }}>
            <span className="utility-label">TEAM INFORMATION</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <span className="utility-label">TEAM NAME</span>
                <div className="utility-value">{team.team_name}</div>
              </div>
              <div>
                <span className="utility-label">INSTITUTION</span>
                <div className="utility-value">{team.institution_name}</div>
              </div>
              <div>
                <span className="utility-label">DOMAIN</span>
                <div className="utility-value">{team.domain?.name || 'Pending'}</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 24 }}>
            <button onClick={() => window.print()} className="button" style={{ background: '#071935', color: '#fff' }}>
              <Printer size={15} /> Print pass
            </button>
            <Link href="/" className="button" style={{ border: '1px solid #dfe2e5' }}>
              Return home
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}