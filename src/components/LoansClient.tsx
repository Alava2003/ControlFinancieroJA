'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, CheckCircle2, Clock, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import type { Account, Loan } from '@/lib/types'

const fmt = (n: number) => new Intl.NumberFormat('es-EC', {
  style: 'currency', currency: 'USD', minimumFractionDigits: 2
}).format(n)

export default function LoansClient({ loans, accounts }: { loans: Loan[], accounts: Account[] }) {
  const router = useRouter()
  const supabase = createClient()

  const [showForm, setShowForm] = useState(false)
  const [debtorName, setDebtorName] = useState('')
  const [amount, setAmount] = useState('')
  const [originAccountId, setOriginAccountId] = useState(accounts[0]?.id ?? '')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [markingId, setMarkingId] = useState<string | null>(null)

  const pending = loans.filter(l => l.status === 'pendiente')
  const paid = loans.filter(l => l.status === 'pagado')
  const totalPending = pending.reduce((s, l) => s + Number(l.amount), 0)

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) { setError('Monto inválido'); setLoading(false); return }

    const { error: err } = await supabase.from('loans').insert({
      user_id: user!.id,
      debtor_name: debtorName,
      amount: amt,
      date,
      origin_account_id: originAccountId || null,
      description: description || null,
      status: 'pendiente',
    })

    if (err) { setError(err.message); setLoading(false); return }

    // Descontar de la cuenta origen
    if (originAccountId) {
      const srcAccount = accounts.find(a => a.id === originAccountId)
      if (srcAccount) {
        await supabase.from('accounts')
          .update({ balance: Number(srcAccount.balance) - amt })
          .eq('id', originAccountId)
      }
    }

    setDebtorName(''); setAmount(''); setDescription('')
    setDate(new Date().toISOString().split('T')[0])
    setShowForm(false)
    router.refresh()
    setLoading(false)
  }

  const handleMarkPaid = async (loan: Loan) => {
    setMarkingId(loan.id)
    await supabase.from('loans').update({ status: 'pagado', paid_at: new Date().toISOString() }).eq('id', loan.id)

    // Devolver el dinero a la cuenta origen
    if (loan.origin_account_id) {
      const srcAccount = accounts.find(a => a.id === loan.origin_account_id)
      if (srcAccount) {
        await supabase.from('accounts')
          .update({ balance: Number(srcAccount.balance) + Number(loan.amount) })
          .eq('id', loan.origin_account_id)
      }
    }

    router.refresh()
    setMarkingId(null)
  }

  return (
    <div className="space-y-5">

      {/* Resumen */}
      {pending.length > 0 && (
        <div className="rounded-2xl p-4"
          style={{ background: '#f59e0b15', border: '1px solid #f59e0b30' }}>
          <p className="text-xs font-medium mb-1" style={{ color: '#f59e0b' }}>
            TOTAL EN LA CALLE
          </p>
          <p className="text-3xl font-bold" style={{ color: '#f59e0b' }}>
            {fmt(totalPending)}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {pending.length} préstamo{pending.length !== 1 ? 's' : ''} pendiente{pending.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Botón + formulario */}
      <button onClick={() => setShowForm(!showForm)}
        className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl font-medium transition-all active:scale-98"
        style={{
          background: showForm ? 'var(--accent)' : 'var(--bg-card)',
          color: showForm ? 'white' : 'var(--accent)',
          border: `1px solid ${showForm ? 'var(--accent)' : 'var(--border)'}`,
        }}>
        <div className="flex items-center gap-2">
          <Plus size={18} />
          <span>Nuevo Préstamo</span>
        </div>
        {showForm ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {showForm && (
        <form onSubmit={handleCreateLoan} className="rounded-2xl p-4 space-y-4"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>

          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
              ¿A quién le prestaste?
            </label>
            <input type="text" value={debtorName} onChange={e => setDebtorName(e.target.value)}
              placeholder="Nombre del deudor" required
              className="w-full px-4 py-3 rounded-xl text-base"
              style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Monto</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold"
                style={{ color: 'var(--text-muted)' }}>$</span>
              <input type="number" step="0.01" min="0.01" value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00" required inputMode="decimal"
                className="w-full pl-9 pr-4 py-3.5 rounded-xl text-xl font-bold"
                style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
              Salió de (cuenta)
            </label>
            <select value={originAccountId} onChange={e => setOriginAccountId(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl text-base"
              style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
              <option value="">Sin cuenta específica</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Fecha</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl text-base"
              style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
              Nota <span style={{ fontWeight: 400 }}>(opcional)</span>
            </label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Ej: Para el arriendo, Emergencia médica..."
              className="w-full px-4 py-3 rounded-xl text-base"
              style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            />
          </div>

          {error && (
            <div className="rounded-xl px-4 py-3 text-sm"
              style={{ background: '#ef444420', color: '#fca5a5', border: '1px solid #ef444440' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 active:opacity-80"
            style={{ background: loading ? 'var(--bg-surface)' : 'var(--warning)' }}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Registrar Préstamo'}
          </button>
        </form>
      )}

      {/* Lista pendientes */}
      {pending.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold mb-3 px-1" style={{ color: 'var(--text-muted)' }}>
            PENDIENTES
          </h2>
          <div className="space-y-2">
            {pending.map(loan => (
              <LoanCard key={loan.id} loan={loan} onMarkPaid={handleMarkPaid}
                isMarking={markingId === loan.id} />
            ))}
          </div>
        </section>
      )}

      {/* Lista pagados */}
      {paid.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold mb-3 px-1" style={{ color: 'var(--text-muted)' }}>
            PAGADOS
          </h2>
          <div className="space-y-2 opacity-60">
            {paid.map(loan => (
              <LoanCard key={loan.id} loan={loan} onMarkPaid={handleMarkPaid} isMarking={false} />
            ))}
          </div>
        </section>
      )}

      {loans.length === 0 && (
        <div className="text-center py-16 space-y-2">
          <p className="text-4xl">🤝</p>
          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Sin préstamos</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Registra cuando le prestes dinero a alguien
          </p>
        </div>
      )}
    </div>
  )
}

function LoanCard({ loan, onMarkPaid, isMarking }: {
  loan: Loan
  onMarkPaid: (loan: Loan) => void
  isMarking: boolean
}) {
  return (
    <div className="rounded-xl p-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {loan.status === 'pendiente'
              ? <Clock size={14} style={{ color: 'var(--warning)' }} />
              : <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />
            }
            <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
              {loan.debtor_name}
            </p>
          </div>
          {loan.description && (
            <p className="text-xs mb-1 truncate" style={{ color: 'var(--text-muted)' }}>
              {loan.description}
            </p>
          )}
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {new Date(loan.date + 'T00:00:00').toLocaleDateString('es-EC', {
              day: '2-digit', month: 'short', year: 'numeric'
            })}
            {(loan.accounts as { name: string } | undefined)?.name && (
              <> · {(loan.accounts as { name: string }).name}</>
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <p className="font-bold text-base"
            style={{ color: loan.status === 'pendiente' ? 'var(--warning)' : 'var(--success)' }}>
            {fmt(Number(loan.amount))}
          </p>
          {loan.status === 'pendiente' && (
            <button onClick={() => onMarkPaid(loan)} disabled={isMarking}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium active:opacity-70 transition-opacity"
              style={{ background: '#22c55e20', color: 'var(--success)', border: '1px solid #22c55e40' }}>
              {isMarking
                ? <Loader2 size={12} className="animate-spin" />
                : <CheckCircle2 size={12} />
              }
              Pagado
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
