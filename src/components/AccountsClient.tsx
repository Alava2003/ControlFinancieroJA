'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Building2, Banknote, Trash2, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import type { Account } from '@/lib/types'

const fmt = (n: number) => new Intl.NumberFormat('es-EC', {
  style: 'currency', currency: 'USD', minimumFractionDigits: 2
}).format(n)

const ACCOUNT_COLORS = [
  { bg: '#3b82f620', border: '#3b82f640', text: '#60a5fa', dot: '#3b82f6' },
  { bg: '#f43f5e20', border: '#f43f5e40', text: '#fb7185', dot: '#f43f5e' },
  { bg: '#22c55e20', border: '#22c55e40', text: '#4ade80', dot: '#22c55e' },
  { bg: '#a855f720', border: '#a855f740', text: '#c084fc', dot: '#a855f7' },
]

const PRESET_ACCOUNTS = [
  { name: 'Banco Guayaquil', type: 'banco' as const },
  { name: 'Banco Pichincha', type: 'banco' as const },
  { name: 'Efectivo', type: 'efectivo' as const },
]

export default function AccountsClient({ accounts }: { accounts: Account[] }) {
  const router = useRouter()
  const supabase = createClient()

  const [showForm, setShowForm] = useState(accounts.length === 0)
  const [name, setName] = useState('')
  const [type, setType] = useState<'banco' | 'efectivo'>('banco')
  const [balance, setBalance] = useState('')
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('El nombre es requerido'); return }
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    const { error: err } = await supabase.from('accounts').insert({
      user_id: user!.id,
      name: name.trim(),
      type,
      balance: parseFloat(balance) || 0,
    })

    if (err) { setError(err.message); setLoading(false); return }

    setName(''); setBalance(''); setShowForm(false)
    router.refresh()
    setLoading(false)
  }

  const handlePreset = async (preset: typeof PRESET_ACCOUNTS[0]) => {
    const already = accounts.some(a => a.name.toLowerCase() === preset.name.toLowerCase())
    if (already) return
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('accounts').insert({
      user_id: user!.id,
      name: preset.name,
      type: preset.type,
      balance: 0,
    })

    router.refresh()
    setLoading(false)
  }

  const handleDelete = async (account: Account) => {
    if (!confirm(`¿Eliminar "${account.name}"? Esta acción no se puede deshacer.`)) return
    setDeletingId(account.id)
    await supabase.from('accounts').delete().eq('id', account.id)
    router.refresh()
    setDeletingId(null)
  }

  const missingPresets = PRESET_ACCOUNTS.filter(
    p => !accounts.some(a => a.name.toLowerCase() === p.name.toLowerCase())
  )

  return (
    <div className="space-y-5">

      {/* Cuentas actuales */}
      {accounts.length > 0 ? (
        <div className="space-y-2">
          {accounts.map((account, i) => {
            const c = ACCOUNT_COLORS[i % ACCOUNT_COLORS.length]
            return (
              <div key={account.id}
                className="flex items-center justify-between px-4 py-3.5 rounded-xl"
                style={{ background: 'var(--bg-card)', border: `1px solid ${c.border}` }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: c.bg }}>
                    {account.type === 'banco'
                      ? <Building2 size={18} style={{ color: c.dot }} />
                      : <Banknote size={18} style={{ color: c.dot }} />
                    }
                  </div>
                  <div>
                    <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                      {account.name}
                    </p>
                    <p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>
                      {account.type}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-semibold text-sm"
                    style={{ color: Number(account.balance) < 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                    {fmt(Number(account.balance))}
                  </p>
                  <button onClick={() => handleDelete(account)} disabled={deletingId === account.id}
                    className="p-2 rounded-xl active:opacity-70 transition-opacity"
                    style={{ background: '#ef444415', color: 'var(--danger)' }}>
                    {deletingId === account.id
                      ? <Loader2 size={15} className="animate-spin" />
                      : <Trash2 size={15} />
                    }
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-8 rounded-2xl space-y-2"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-3xl">🏦</p>
          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Sin cuentas</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Crea tus cuentas para empezar a registrar movimientos
          </p>
        </div>
      )}

      {/* Restaurar cuentas por defecto */}
      {missingPresets.length > 0 && (
        <div className="rounded-2xl p-4 space-y-3"
          style={{ background: '#6366f110', border: '1px solid #6366f130' }}>
          <p className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
            RESTAURAR CUENTAS POR DEFECTO
          </p>
          <div className="flex flex-wrap gap-2">
            {missingPresets.map(preset => (
              <button key={preset.name} onClick={() => handlePreset(preset)} disabled={loading}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium active:opacity-70 transition-opacity"
                style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                {loading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Formulario nueva cuenta */}
      <button onClick={() => setShowForm(!showForm)}
        className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl font-medium transition-all"
        style={{
          background: showForm ? 'var(--accent)' : 'var(--bg-card)',
          color: showForm ? 'white' : 'var(--accent)',
          border: `1px solid ${showForm ? 'var(--accent)' : 'var(--border)'}`,
        }}>
        <div className="flex items-center gap-2">
          <Plus size={18} />
          <span>Nueva Cuenta</span>
        </div>
        {showForm ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-2xl p-4 space-y-4"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>

          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
              Nombre de la cuenta
            </label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Ej: Banco del Pacífico, Ahorros..."
              required autoFocus
              className="w-full px-4 py-3 rounded-xl text-base"
              style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              {(['banco', 'efectivo'] as const).map(t => (
                <button key={t} type="button" onClick={() => setType(t)}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: type === t ? '#6366f120' : 'var(--bg-surface)',
                    color: type === t ? 'var(--accent)' : 'var(--text-muted)',
                    border: `1px solid ${type === t ? 'var(--accent)' : 'var(--border)'}`,
                  }}>
                  {t === 'banco' ? <Building2 size={16} /> : <Banknote size={16} />}
                  <span className="capitalize">{t}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
              Saldo inicial <span style={{ fontWeight: 400 }}>(opcional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold"
                style={{ color: 'var(--text-muted)' }}>$</span>
              <input type="number" step="0.01" min="0" value={balance}
                onChange={e => setBalance(e.target.value)}
                placeholder="0.00" inputMode="decimal"
                className="w-full pl-9 pr-4 py-3 rounded-xl text-base"
                style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl px-4 py-3 text-sm"
              style={{ background: '#ef444420', color: '#fca5a5', border: '1px solid #ef444440' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 active:opacity-80"
            style={{ background: loading ? 'var(--bg-surface)' : 'var(--accent)' }}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Crear Cuenta'}
          </button>
        </form>
      )}
    </div>
  )
}
