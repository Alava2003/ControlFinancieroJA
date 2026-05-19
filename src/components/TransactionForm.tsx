'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, TrendingUp, TrendingDown, ArrowLeftRight } from 'lucide-react'
import type { Account, TransactionType } from '@/lib/types'

const CATEGORIES = {
  ingreso: ['Salario', 'Freelance', 'Inversión', 'Regalo', 'Otro'],
  gasto: ['Comida', 'Transporte', 'Servicios', 'Salud', 'Entretenimiento', 'Ropa', 'Educación', 'Otro'],
  transferencia: [],
}

const TYPE_CONFIG = {
  ingreso: { label: 'Ingreso', icon: TrendingUp, color: 'var(--success)', bg: '#22c55e20' },
  gasto: { label: 'Gasto', icon: TrendingDown, color: 'var(--danger)', bg: '#ef444420' },
  transferencia: { label: 'Transferencia', icon: ArrowLeftRight, color: 'var(--accent)', bg: '#6366f120' },
}

export default function TransactionForm({ accounts }: { accounts: Account[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const initialType = (searchParams.get('type') as TransactionType) || 'gasto'
  const [type, setType] = useState<TransactionType>(initialType)
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [toAccountId, setToAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (type === 'transferencia' && accounts.length >= 2) {
      const other = accounts.find(a => a.id !== accountId)
      setToAccountId(other?.id ?? '')
    }
    setCategory('')
  }, [type])

  const INTERBANK_FEE = 0.41

  const isInterbankTransfer = () => {
    if (type !== 'transferencia' || !toAccountId) return false
    const src = accounts.find(a => a.id === accountId)
    const dst = accounts.find(a => a.id === toAccountId)
    return src?.type === 'banco' && dst?.type === 'banco'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('No autenticado'); setLoading(false); return }

    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) { setError('Monto inválido'); setLoading(false); return }

    if (type === 'transferencia' && (!toAccountId || toAccountId === accountId)) {
      setError('Selecciona una cuenta destino diferente')
      setLoading(false)
      return
    }

    const fee = isInterbankTransfer() ? INTERBANK_FEE : 0

    const { error: txErr } = await supabase.from('transactions').insert({
      user_id: user.id,
      account_id: accountId,
      to_account_id: type === 'transferencia' ? toAccountId : null,
      type,
      amount: amt,
      category: category || null,
      description: description || null,
      date,
    })

    if (txErr) { setError(txErr.message); setLoading(false); return }

    const srcAccount = accounts.find(a => a.id === accountId)!
    const srcBalance = Number(srcAccount.balance)
    const newSrcBalance = type === 'ingreso' ? srcBalance + amt : srcBalance - amt - fee

    await supabase.from('accounts').update({ balance: newSrcBalance }).eq('id', accountId)

    if (type === 'transferencia') {
      const dstAccount = accounts.find(a => a.id === toAccountId)!
      const newDstBalance = Number(dstAccount.balance) + amt
      await supabase.from('accounts').update({ balance: newDstBalance }).eq('id', toAccountId)
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Selector de tipo */}
      <div className="grid grid-cols-3 gap-2 p-1 rounded-xl"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        {(Object.entries(TYPE_CONFIG) as [TransactionType, typeof TYPE_CONFIG['gasto']][]).map(([key, cfg]) => {
          const Icon = cfg.icon
          const active = type === key
          return (
            <button key={key} type="button" onClick={() => setType(key)}
              className="flex flex-col items-center gap-1 py-3 rounded-xl transition-all text-xs font-medium"
              style={{
                background: active ? cfg.bg : 'transparent',
                color: active ? cfg.color : 'var(--text-muted)',
                border: active ? `1px solid ${cfg.color}40` : '1px solid transparent',
              }}>
              <Icon size={18} />
              {cfg.label}
            </button>
          )
        })}
      </div>

      {/* Monto */}
      <div className="space-y-2">
        <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Monto</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold"
            style={{ color: 'var(--text-muted)' }}>$</span>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            required
            inputMode="decimal"
            className="w-full pl-9 pr-4 py-4 rounded-xl text-2xl font-bold"
            style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          />
        </div>
      </div>

      {/* Cuenta origen */}
      <div className="space-y-2">
        <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
          {type === 'transferencia' ? 'Cuenta Origen' : 'Cuenta'}
        </label>
        <select value={accountId} onChange={e => setAccountId(e.target.value)} required
          className="w-full px-4 py-3.5 rounded-xl text-base"
          style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
          {accounts.map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>

      {/* Cuenta destino (solo transferencias) */}
      {type === 'transferencia' && (
        <div className="space-y-2">
          <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Cuenta Destino</label>
          <select value={toAccountId} onChange={e => setToAccountId(e.target.value)} required
            className="w-full px-4 py-3.5 rounded-xl text-base"
            style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
            <option value="">Seleccionar...</option>
            {accounts.filter(a => a.id !== accountId).map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Categoría */}
      {type !== 'transferencia' && (
        <div className="space-y-2">
          <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Categoría</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES[type].map(cat => (
              <button key={cat} type="button" onClick={() => setCategory(cat)}
                className="px-3.5 py-2 rounded-xl text-sm font-medium transition-all active:scale-95"
                style={{
                  background: category === cat ? 'var(--accent)' : 'var(--bg-card)',
                  color: category === cat ? 'white' : 'var(--text-muted)',
                  border: `1px solid ${category === cat ? 'var(--accent)' : 'var(--border)'}`,
                }}>
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Descripción */}
      <div className="space-y-2">
        <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
          Descripción <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opcional)</span>
        </label>
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Ej: Mercado semana, Gasolina..."
          className="w-full px-4 py-3 rounded-xl text-base"
          style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
        />
      </div>

      {/* Fecha */}
      <div className="space-y-2">
        <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Fecha</label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-xl text-base"
          style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
        />
      </div>

      {isInterbankTransfer() && amount && parseFloat(amount) > 0 && (
        <div className="rounded-xl px-4 py-3 text-sm flex items-start gap-2"
          style={{ background: '#f59e0b15', color: '#fbbf24', border: '1px solid #f59e0b30' }}>
          <span className="mt-0.5">⚠</span>
          <span>
            Transferencia interbancaria: se descontarán{' '}
            <strong>${(parseFloat(amount) + INTERBANK_FEE).toFixed(2)}</strong> de la cuenta origen
            (${parseFloat(amount).toFixed(2)} + $0.41 de comisión).
          </span>
        </div>
      )}

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm"
          style={{ background: '#ef444420', color: '#fca5a5', border: '1px solid #ef444440' }}>
          {error}
        </div>
      )}

      <button type="submit" disabled={loading}
        className="w-full py-4 rounded-xl font-semibold text-white text-base flex items-center justify-center gap-2 active:opacity-80 transition-opacity"
        style={{ background: loading ? 'var(--bg-surface)' : 'var(--accent)' }}>
        {loading ? <Loader2 size={20} className="animate-spin" /> : 'Guardar Transacción'}
      </button>
    </form>
  )
}
