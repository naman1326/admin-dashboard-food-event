import { useState } from 'react'
import { adminPassword } from '../supabaseClient.js'

export default function PasswordGate({ onSuccess }) {
  const [username, setUsername] = useState('')
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)

  function submit(e) {
    e.preventDefault()
    if (username.trim() !== 'naman1326') {
      setError(true)
      return
    }
    if (!adminPassword) {
      // No password configured — don't lock the organizer out of their own dashboard over it.
      onSuccess()
      return
    }
    if (value === adminPassword) {
      onSuccess()
    } else {
      setError(true)
    }
  }

  return (
    <div className="gate-screen">
      <div className="gate-brand-container">
        <img src="/logo.png" alt="Swarajya Logo" className="gate-logo" />
        <h1 className="gate-brand-title">स्वराज्य</h1>
        <p className="gate-brand-subtitle">Food Pass Admin</p>
      </div>
      <div className="gate-card">
        <h2>Organizer Access</h2>
        <form onSubmit={submit}>
          <input
            type="text"
            autoFocus
            placeholder="Username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value)
              setError(false)
            }}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setError(false)
            }}
            required
          />
          {error && <p className="gate-error">Invalid username or password</p>}
          <button type="submit" className="primary-button">
            Enter
          </button>
        </form>
        <p className="gate-note">
          This is a light deterrent, not real security — anyone holding your Supabase anon key can
          already read this data directly. Keep the dashboard URL and the anon key out of anything
          public.
        </p>
      </div>
    </div>
  )
}
