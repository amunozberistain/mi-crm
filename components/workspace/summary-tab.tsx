'use client'

import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import type { DealWithContact } from '@/app/(dashboard)/workspace/page'
import type { Expense } from '@/types'

type Period = 'month' | 'quarter' | 'year'

interface Props {
  wonDeals: DealWithContact[]
  expenses: Expense[]
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function getPeriodRange(period: Period): { start: Date; end: Date } {
  const now   = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth()
  if (period === 'month')   return { start: new Date(year, month, 1),     end: new Date(year, month + 1, 0, 23, 59, 59) }
  if (period === 'quarter') {
    const q = Math.floor(month / 3)
    return { start: new Date(year, q * 3, 1), end: new Date(year, q * 3 + 3, 0, 23, 59, 59) }
  }
  return { start: new Date(year, 0, 1), end: new Date(year, 11, 31, 23, 59, 59) }
}

const PERIOD_LABELS: Record<Period, string> = {
  month:   'Este mes',
  quarter: 'Este trimestre',
  year:    'Este año',
}

export default function SummaryTab({ wonDeals, expenses }: Props) {
  const [period, setPeriod] = useState<Period>('year')

  const { start, end } = getPeriodRange(period)

  // Deals facturados en el periodo (by created_at)
  const periodDeals = useMemo(() =>
    wonDeals.filter(d => {
      const t = new Date(d.created_at)
      return t >= start && t <= end
    }),
  [wonDeals, start, end])  // eslint-disable-line react-hooks/exhaustive-deps

  // Deals cobrados en el periodo (by invoice_paid_at)
  const paidDeals = useMemo(() =>
    wonDeals.filter(d => {
      if (!d.invoice_paid || !d.invoice_paid_at) return false
      const t = new Date(d.invoice_paid_at)
      return t >= start && t <= end
    }),
  [wonDeals, start, end])  // eslint-disable-line react-hooks/exhaustive-deps

  // Gastos en el periodo (by date)
  const periodExpenses = useMemo(() =>
    expenses.filter(e => {
      const t = new Date(e.date)
      return t >= start && t <= end
    }),
  [expenses, start, end])  // eslint-disable-line react-hooks/exhaustive-deps

  const totalFacturado = periodDeals.reduce((s, d) => s + (d.invoice_amount ?? d.value ?? 0), 0)
  const totalCobrado   = paidDeals.reduce((s, d) => s + (d.invoice_amount ?? d.value ?? 0), 0)
  const totalGastos    = periodExpenses.reduce((s, e) => s + e.amount, 0)
  const beneficioNeto  = totalCobrado - totalGastos

  // Chart: ingresos vs gastos by month (last 12 months)
  const chartData = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1)
      const y = d.getFullYear()
      const m = d.getMonth()
      const key = `${y}-${String(m + 1).padStart(2, '0')}`

      const ingresos = wonDeals
        .filter(deal => deal.invoice_paid && deal.invoice_paid_at?.startsWith(key))
        .reduce((s, deal) => s + (deal.invoice_amount ?? deal.value ?? 0), 0)

      const gastos = expenses
        .filter(e => e.date.startsWith(key))
        .reduce((s, e) => s + e.amount, 0)

      return { month: MONTH_NAMES[m], ingresos, gastos }
    })
  }, [wonDeals, expenses])

  const metrics = [
    { label: 'Total facturado', value: fmt(totalFacturado), sub: 'Deals cerrados ganados', dot: 'bg-[#5C3D2E]' },
    { label: 'Total cobrado',   value: fmt(totalCobrado),   sub: 'Facturas pagadas',       dot: 'bg-[#6E9E6B]' },
    { label: 'Total gastos',    value: fmt(totalGastos),    sub: 'Gastos registrados',     dot: 'bg-[#C4A35A]' },
    {
      label: 'Beneficio neto',
      value: fmt(beneficioNeto),
      sub: 'Cobrado menos gastos',
      dot: beneficioNeto >= 0 ? 'bg-[#6E9E6B]' : 'bg-[#C47878]',
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Period selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-[#8B6F5E] uppercase tracking-wide mr-1">Periodo</span>
        {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              period === p
                ? 'bg-[#5C3D2E] text-white shadow-sm'
                : 'border border-[#D4C5B0] text-[#8B6F5E] hover:bg-[#EDE8DF]'
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(m => (
          <div key={m.label} className="bg-white rounded-xl border border-[#D4C5B0] p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${m.dot}`} />
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8B6F5E]">{m.label}</p>
            </div>
            <p className="font-display text-3xl font-semibold text-[#2C1810]">{m.value}</p>
            <p className="text-xs text-[#8B6F5E] mt-1">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="bg-white rounded-xl border border-[#D4C5B0] p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-[#2C1810] mb-5">
          Ingresos vs Gastos — últimos 12 meses
        </h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#D4C5B0" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: '#8B6F5E', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#8B6F5E', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => v === 0 ? '0' : `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #D4C5B0',
                borderRadius: '8px',
                fontSize: 13,
                color: '#2C1810',
              }}
              formatter={(value) => [fmt(Number(value ?? 0))]}
              cursor={{ fill: '#F5F0E8' }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, color: '#8B6F5E', paddingTop: 16 }}
              formatter={v => v === 'ingresos' ? 'Ingresos cobrados' : 'Gastos'}
            />
            <Bar dataKey="ingresos" fill="#5C3D2E" radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Bar dataKey="gastos"   fill="#D4C5B0" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
