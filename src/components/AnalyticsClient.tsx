'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { Transaction } from '@/lib/types'

// ── Utilidades ────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)

const todayStr = () => new Date().toISOString().split('T')[0]

const firstOfMonthStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000)

// Agrupa transacciones por período (día / semana / mes)
function groupByPeriod(txs: Transaction[], from: string, to: string) {
  const days = daysBetween(from, to)
  const map: Record<string, { ingresos: number; gastos: number }> = {}

  txs.forEach(tx => {
    if (tx.type === 'transferencia') return
    const d = new Date(tx.date + 'T00:00:00')
    let key: string

    if (days <= 35) {
      key = d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })
    } else if (days <= 120) {
      // Número de semana ISO simplificado
      const startOfYear = new Date(d.getFullYear(), 0, 1)
      const week = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86_400_000 + startOfYear.getDay() + 1) / 7)
      key = `Sem ${week}`
    } else {
      key = d.toLocaleDateString('es-EC', { month: 'short', year: '2-digit' })
    }

    if (!map[key]) map[key] = { ingresos: 0, gastos: 0 }
    if (tx.type === 'ingreso') map[key].ingresos += Number(tx.amount)
    else map[key].gastos += Number(tx.amount)
  })

  return Object.entries(map).map(([period, v]) => ({ period, ...v }))
}

// Agrupa gastos por categoría
function groupByCategory(txs: Transaction[]) {
  const map: Record<string, number> = {}
  txs.forEach(tx => {
    if (tx.type !== 'gasto') return
    const cat = tx.category || 'Sin categoría'
    map[cat] = (map[cat] ?? 0) + Number(tx.amount)
  })
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

// ── Colores ───────────────────────────────────────────────────

const PIE_COLORS = ['#6366f1', '#f43f5e', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6']

const TOOLTIP_STYLE = {
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '12px',
  color: '#f1f5f9',
  fontSize: 13,
}

// ── Componentes auxiliares ─────────────────────────────────────

function SummaryCard({
  label, value, delta, icon,
}: { label: string; value: number; delta?: number; icon: 'up' | 'down' | 'net' }) {
  const colors = { up: 'var(--success)', down: 'var(--danger)', net: 'var(--accent)' }
  const bgs = { up: '#22c55e15', down: '#ef444415', net: '#6366f115' }
  const borders = { up: '#22c55e30', down: '#ef444430', net: '#6366f130' }
  const Icon = icon === 'up' ? TrendingUp : icon === 'down' ? TrendingDown : Minus
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-2"
      style={{ background: bgs[icon], border: `1px solid ${borders[icon]}` }}>
      <div className="flex items-center gap-2">
        <Icon size={15} style={{ color: colors[icon] }} />
        <span className="text-xs font-medium uppercase tracking-wide" style={{ color: colors[icon] }}>{label}</span>
      </div>
      <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(value)}</p>
      {delta !== undefined && (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {delta >= 0 ? '+' : ''}{fmt(delta)} neto
        </p>
      )}
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────

export default function AnalyticsClient() {
  const supabase = createClient()

  const [from, setFrom] = useState(firstOfMonthStr())
  const [to, setTo] = useState(todayStr())
  const [txs, setTxs] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .gte('date', from)
      .lte('date', to)
      .order('date')
    setTxs((data as Transaction[]) ?? [])
    setLoading(false)
  }, [from, to])

  useEffect(() => { fetchData() }, [fetchData])

  const totalIngresos = txs.filter(t => t.type === 'ingreso').reduce((s, t) => s + Number(t.amount), 0)
  const totalGastos = txs.filter(t => t.type === 'gasto').reduce((s, t) => s + Number(t.amount), 0)
  const neto = totalIngresos - totalGastos

  const barData = groupByPeriod(txs, from, to)
  const pieData = groupByCategory(txs)

  return (
    <div className="space-y-5 pb-4">

      {/* ── Filtro de fechas ── */}
      <div className="rounded-2xl p-4 space-y-3"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <p className="text-xs font-semibold tracking-widest" style={{ color: 'var(--text-muted)' }}>RANGO DE FECHAS</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs" style={{ color: 'var(--text-muted)' }}>Desde</label>
            <input type="date" value={from} max={to}
              onChange={e => setFrom(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm"
              style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs" style={{ color: 'var(--text-muted)' }}>Hasta</label>
            <input type="date" value={to} min={from} max={todayStr()}
              onChange={e => setTo(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm"
              style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            />
          </div>
        </div>
        {/* Atajos rápidos */}
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Este mes', fn: () => { setFrom(firstOfMonthStr()); setTo(todayStr()) } },
            { label: 'Últimos 30d', fn: () => { const d = new Date(); d.setDate(d.getDate() - 30); setFrom(d.toISOString().split('T')[0]); setTo(todayStr()) } },
            { label: 'Últimos 90d', fn: () => { const d = new Date(); d.setDate(d.getDate() - 90); setFrom(d.toISOString().split('T')[0]); setTo(todayStr()) } },
            { label: 'Este año', fn: () => { setFrom(`${new Date().getFullYear()}-01-01`); setTo(todayStr()) } },
          ].map(({ label, fn }) => (
            <button key={label} onClick={fn}
              className="px-3 py-1.5 rounded-xl text-xs font-medium active:opacity-70 transition-opacity"
              style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        </div>
      ) : txs.filter(t => t.type !== 'transferencia').length === 0 ? (
        <div className="text-center py-16 rounded-2xl space-y-2"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-3xl">📊</p>
          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Sin datos en este período</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Ajusta el rango de fechas</p>
        </div>
      ) : (
        <>
          {/* ── Resumen ── */}
          <div className="grid grid-cols-3 gap-2">
            <SummaryCard label="Ingresos" value={totalIngresos} icon="up" />
            <SummaryCard label="Gastos" value={totalGastos} icon="down" />
            <SummaryCard label="Neto" value={neto} icon="net" />
          </div>

          {/* ── Barras: Ingresos vs Gastos ── */}
          {barData.length > 0 && (
            <div className="rounded-2xl p-4"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-semibold tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
                INGRESOS VS GASTOS
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData} barCategoryGap="30%" barGap={4}>
                  <XAxis dataKey="period" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={v => `$${v}`} width={48} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(val, name) => [fmt(Number(val)), name === 'ingresos' ? 'Ingresos' : 'Gastos']}
                    cursor={{ fill: '#334155' }}
                  />
                  <Bar dataKey="ingresos" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-3 justify-center">
                <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span className="w-3 h-3 rounded-sm" style={{ background: '#22c55e' }} />Ingresos
                </span>
                <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span className="w-3 h-3 rounded-sm" style={{ background: '#ef4444' }} />Gastos
                </span>
              </div>
            </div>
          )}

          {/* ── Dona: Gastos por categoría ── */}
          {pieData.length > 0 && (
            <div className="rounded-2xl p-4"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-semibold tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
                GASTOS POR CATEGORÍA
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                    dataKey="value" paddingAngle={3}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(val) => [fmt(Number(val))]}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Leyenda manual */}
              <div className="space-y-2 mt-2">
                {pieData.map((item, i) => {
                  const pct = totalGastos > 0 ? ((item.value / totalGastos) * 100).toFixed(1) : '0'
                  return (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{pct}%</span>
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {fmt(item.value)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Tabla de movimientos del período ── */}
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs font-semibold tracking-widest" style={{ color: 'var(--text-muted)' }}>
                MOVIMIENTOS DEL PERÍODO ({txs.filter(t => t.type !== 'transferencia').length})
              </p>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {txs.filter(t => t.type !== 'transferencia').slice(0, 50).map(tx => (
                <div key={tx.id} className="flex items-center justify-between px-4 py-3 gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                      {tx.description || tx.category || '—'}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {new Date(tx.date + 'T00:00:00').toLocaleDateString('es-EC', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      })}
                    </p>
                  </div>
                  <p className="text-sm font-semibold shrink-0"
                    style={{ color: tx.type === 'ingreso' ? 'var(--success)' : 'var(--danger)' }}>
                    {tx.type === 'ingreso' ? '+' : '-'}{fmt(Number(tx.amount))}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
