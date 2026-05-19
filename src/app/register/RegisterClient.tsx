'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DollarSign, Eye, EyeOff, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${location.origin}/dashboard` },
    })

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  if (success) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6"
        style={{ background: 'var(--bg-primary)' }}>
        <div className="w-full max-w-sm rounded-2xl p-8 text-center space-y-4"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center text-3xl"
            style={{ background: '#22c55e20' }}>✓</div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            ¡Cuenta creada!
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Revisa tu email para confirmar tu cuenta y luego inicia sesión.
          </p>
          <Link href="/login"
            className="block w-full py-3.5 rounded-xl font-semibold text-white text-center"
            style={{ background: 'var(--accent)' }}>
            Ir al Login
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ background: 'var(--bg-primary)' }}>

      <div className="mb-10 flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: 'var(--accent)' }}>
          <DollarSign size={32} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Crear Cuenta
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Empieza a controlar tus finanzas
        </p>
      </div>

      <div className="w-full max-w-sm rounded-2xl p-6 space-y-5"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>

        {error && (
          <div className="rounded-xl px-4 py-3 text-sm"
            style={{ background: '#ef444420', color: '#fca5a5', border: '1px solid #ef444440' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              autoComplete="email"
              className="w-full px-4 py-3 rounded-xl text-base"
              style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Contraseña</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mín. 6 caracteres"
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full px-4 py-3 pr-12 rounded-xl text-base"
                style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                style={{ color: 'var(--text-muted)' }}>
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3.5 rounded-xl font-semibold text-white text-base flex items-center justify-center gap-2 transition-opacity active:opacity-80"
            style={{ background: loading ? 'var(--bg-surface)' : 'var(--accent)' }}>
            {loading ? <Loader2 size={20} className="animate-spin" /> : 'Crear Cuenta'}
          </button>
        </form>

        <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="font-semibold" style={{ color: 'var(--accent)' }}>
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  )
}
