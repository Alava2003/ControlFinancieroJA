export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { TrendingUp, TrendingDown, Handshake, Building2, Banknote, ArrowLeftRight } from 'lucide-react'
import type { Account, Loan, Transaction } from '@/lib/types'

// Colores fijos por posición de cuenta (el orden es el de created_at)
const ACCOUNT_COLORS = [
  { bg: '#3b82f620', border: '#3b82f640', text: '#60a5fa', dot: '#3b82f6' },  // Guayaquil → azul
  { bg: '#f43f5e20', border: '#f43f5e40', text: '#fb7185', dot: '#f43f5e' },  // Pichincha → rosa/rojo
  { bg: '#22c55e20', border: '#22c55e40', text: '#4ade80', dot: '#22c55e' },  // Efectivo → verde
  { bg: '#a855f720', border: '#a855f740', text: '#c084fc', dot: '#a855f7' },  // extra
]

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: accounts }, { data: loans }, { data: transactions }] = await Promise.all([
    supabase.from('accounts').select('*').eq('user_id', user!.id).order('created_at'),
    supabase.from('loans').select('*').eq('user_id', user!.id).eq('status', 'pendiente').order('date', { ascending: false }),
    supabase.from('transactions').select('*, accounts!transactions_account_id_fkey(name, type)')
      .eq('user_id', user!.id).order('date', { ascending: false }).order('created_at', { ascending: false }).limit(30),
  ])

  const accs = (accounts as Account[] ?? [])
  const lns = (loans as Loan[] ?? [])
  const txs = (transactions as (Transaction & { accounts: { name: string; type: string } })[] ?? [])

  const totalBalance = accs.reduce((sum, a) => sum + Number(a.balance), 0)
  const totalLoaned = lns.reduce((sum, l) => sum + Number(l.amount), 0)
  const patrimony = totalBalance + totalLoaned

  // Mapa id → índice de color
  const colorByAccountId: Record<string, number> = {}
  accs.forEach((a, i) => { colorByAccountId[a.id] = i })

  const fmt = (n: number) => new Intl.NumberFormat('es-EC', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2
  }).format(n)

  const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('es-EC', {
    day: '2-digit', month: 'short'
  })

  return (
    <div className="px-4 py-4 space-y-5 max-w-lg mx-auto">

      {/* ── Patrimonio neto ── */}
      <div className="rounded-2xl p-5"
        style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}>
        <p className="text-xs font-semibold tracking-widest text-indigo-300 mb-1">PATRIMONIO NETO</p>
        <p className="text-4xl font-bold text-white tracking-tight">{fmt(patrimony)}</p>
        {totalLoaned > 0 && (
          <p className="text-xs text-indigo-300 mt-1">
            {fmt(totalBalance)} en cuentas · {fmt(totalLoaned)} prestado
          </p>
        )}
      </div>

      {/* ── Saldos por cuenta ── */}
      <div className="grid grid-cols-3 gap-2">
        {accs.map((account, i) => {
          const c = ACCOUNT_COLORS[i] ?? ACCOUNT_COLORS[0]
          const bal = Number(account.balance)
          const nameParts = account.name.split(' ')
          // Abreviatura: "Banco Guayaquil" → "Guayaquil", "Efectivo" → "Efectivo"
          const shortName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : account.name
          return (
            <div key={account.id} className="rounded-2xl p-3.5 flex flex-col gap-2"
              style={{ background: c.bg, border: `1px solid ${c.border}` }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: `${c.dot}25` }}>
                {account.type === 'banco'
                  ? <Building2 size={15} style={{ color: c.dot }} />
                  : <Banknote size={15} style={{ color: c.dot }} />
                }
              </div>
              <div>
                <p className="text-xs font-medium leading-tight mb-0.5" style={{ color: c.text }}>
                  {shortName}
                </p>
                <p className="text-base font-bold leading-tight"
                  style={{ color: bal < 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                  {fmt(bal)}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Préstamos pendientes ── */}
      {lns.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold tracking-widest mb-3 px-1" style={{ color: 'var(--text-muted)' }}>
            DINERO EN LA CALLE
          </h2>
          <div className="space-y-2">
            {lns.map(loan => (
              <div key={loan.id}
                className="flex items-center justify-between px-4 py-3 rounded-xl"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: '#f59e0b20' }}>
                    <Handshake size={16} style={{ color: 'var(--warning)' }} />
                  </div>
                  <div>
                    <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                      {loan.debtor_name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {fmtDate(loan.date)}
                    </p>
                  </div>
                </div>
                <p className="font-semibold" style={{ color: 'var(--warning)' }}>
                  {fmt(Number(loan.amount))}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Acciones rápidas ── */}
      <div className="grid grid-cols-3 gap-2">
        <a href="/transactions/new?type=ingreso"
          className="flex flex-col items-center gap-1.5 py-3 rounded-xl active:scale-95 transition-transform"
          style={{ background: '#22c55e15', border: '1px solid #22c55e30' }}>
          <TrendingUp size={18} style={{ color: 'var(--success)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--success)' }}>Ingreso</span>
        </a>
        <a href="/transactions/new?type=gasto"
          className="flex flex-col items-center gap-1.5 py-3 rounded-xl active:scale-95 transition-transform"
          style={{ background: '#ef444415', border: '1px solid #ef444430' }}>
          <TrendingDown size={18} style={{ color: 'var(--danger)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--danger)' }}>Gasto</span>
        </a>
        <a href="/transactions/new?type=transferencia"
          className="flex flex-col items-center gap-1.5 py-3 rounded-xl active:scale-95 transition-transform"
          style={{ background: '#6366f115', border: '1px solid #6366f130' }}>
          <ArrowLeftRight size={18} style={{ color: 'var(--accent)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>Transferir</span>
        </a>
      </div>

      {/* ── Historial de transacciones ── */}
      <section className="pb-4">
        <h2 className="text-xs font-semibold tracking-widest mb-3 px-1" style={{ color: 'var(--text-muted)' }}>
          ÚLTIMAS TRANSACCIONES
        </h2>
        {txs.length === 0 ? (
          <div className="text-center py-10 space-y-1">
            <p className="text-3xl">📋</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin movimientos aún</p>
          </div>
        ) : (
          <div className="space-y-2">
            {txs.map(tx => {
              const ci = colorByAccountId[tx.account_id] ?? 0
              const c = ACCOUNT_COLORS[ci] ?? ACCOUNT_COLORS[0]
              const isIngreso = tx.type === 'ingreso'
              const isGasto = tx.type === 'gasto'
              const amtColor = isIngreso ? 'var(--success)' : isGasto ? 'var(--danger)' : 'var(--accent)'
              const amtPrefix = isIngreso ? '+' : isGasto ? '-' : '↔'
              const label = tx.description || tx.category || (tx.type === 'transferencia' ? 'Transferencia' : '—')
              return (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  {/* Indicador de cuenta */}
                  <div className="w-1.5 self-stretch rounded-full shrink-0"
                    style={{ background: c.dot }} />
                  {/* Icono tipo */}
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: isIngreso ? '#22c55e15' : isGasto ? '#ef444415' : '#6366f115' }}>
                    {isIngreso
                      ? <TrendingUp size={15} style={{ color: 'var(--success)' }} />
                      : isGasto
                        ? <TrendingDown size={15} style={{ color: 'var(--danger)' }} />
                        : <ArrowLeftRight size={15} style={{ color: 'var(--accent)' }} />
                    }
                  </div>
                  {/* Detalle */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {label}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {/* Badge de cuenta */}
                      <span className="text-xs px-1.5 py-0.5 rounded-md font-medium"
                        style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
                        {tx.accounts?.name ?? '—'}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        · {fmtDate(tx.date)}
                      </span>
                    </div>
                  </div>
                  {/* Monto */}
                  <p className="font-semibold text-sm shrink-0" style={{ color: amtColor }}>
                    {amtPrefix}{fmt(Number(tx.amount))}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
