import { createClient } from '@/lib/supabase/server'
import { fetchTotalAdClicks } from '@/lib/meta/graph-api'
import { CLOSED_WON_STAGE, CLOSED_LOST_STAGE } from '@/lib/constants'
import FunnelViz from '@/components/funnel/funnel-chart'

// ── Helpers ────────────────────────────────────────────────────────────────

function pct(num: number, den: number) {
  if (!den) return '—'
  return ((num / den) * 100).toFixed(1) + '%'
}

function fmt(n: number) {
  return n.toLocaleString('es-ES')
}

const CLOSED_STAGES = [CLOSED_WON_STAGE, CLOSED_LOST_STAGE]

// ── Page ───────────────────────────────────────────────────────────────────

export default async function FunnelPage() {
  const supabase = createClient()

  // Consultas en paralelo para no esperar dos veces
  const [
    { data: contacts },
    { data: allDeals },
    adClicks,
  ] = await Promise.all([
    supabase
      .from('contacts')
      .select('id, lead_source, meta_campaign_id, utm_campaign, created_at'),
    supabase
      .from('deals')
      .select('id, stage, value, contact_id, contacts(lead_source, meta_campaign_id, utm_campaign)')
      .order('created_at', { ascending: false }),
    fetchTotalAdClicks('last_30d'),
  ])

  // Leads procedentes de Meta (excluye los manuales)
  const metaLeads   = (contacts ?? []).filter((c) =>
    c.lead_source === 'meta_lead_ads' || c.lead_source === 'meta_landing'
  )
  const totalLeads  = metaLeads.length

  // Deals activos vinculados a leads de Meta
  const metaDeals = (allDeals ?? []).filter((d) => {
    const contact = d.contacts as { lead_source: string | null } | null
    return contact?.lead_source === 'meta_lead_ads' || contact?.lead_source === 'meta_landing'
  })
  const activeDeals = metaDeals.filter((d) => !CLOSED_STAGES.includes(d.stage)).length
  const wonDeals    = metaDeals.filter((d) => d.stage === CLOSED_WON_STAGE).length
  const wonValue    = metaDeals
    .filter((d) => d.stage === CLOSED_WON_STAGE)
    .reduce((sum, d) => sum + ((d.value as number) ?? 0), 0)

  // ── Desglose por campaña ────────────────────────────────────────────────
  type CampaignRow = { leads: number; active: number; won: number; value: number }
  const campaignMap: Record<string, CampaignRow> = {}

  for (const c of metaLeads) {
    const key = c.utm_campaign ?? c.meta_campaign_id ?? 'Sin campaña'
    if (!campaignMap[key]) campaignMap[key] = { leads: 0, active: 0, won: 0, value: 0 }
    campaignMap[key].leads++
  }

  for (const d of metaDeals) {
    const contact = d.contacts as { utm_campaign: string | null; meta_campaign_id: string | null } | null
    const key = contact?.utm_campaign ?? contact?.meta_campaign_id ?? 'Sin campaña'
    if (!campaignMap[key]) continue
    if (d.stage === CLOSED_WON_STAGE) {
      campaignMap[key].won++
      campaignMap[key].value += (d.value as number) ?? 0
    } else if (!CLOSED_STAGES.includes(d.stage)) {
      campaignMap[key].active++
    }
  }

  const campaignRows = Object.entries(campaignMap)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.leads - a.leads)

  // ── Datos para el gráfico ────────────────────────────────────────────────
  const funnelSteps = [
    { name: 'Clics en anuncios', value: adClicks,   fill: '#4f46e5' },
    { name: 'Leads creados',     value: totalLeads,  fill: '#7c3aed' },
    { name: 'Deals activos',     value: activeDeals, fill: '#9333ea' },
    { name: 'Cerrado ganado',    value: wonDeals,    fill: '#a855f7' },
  ]

  const hasMetaCredentials = !!process.env.META_ACCESS_TOKEN && !!process.env.META_AD_ACCOUNT_ID

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Funnel de captación</h1>
        <p className="text-sm text-gray-500 mt-0.5">Últimos 30 días · leads procedentes de Meta Ads</p>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Clics en anuncios"
          value={hasMetaCredentials ? fmt(adClicks) : '—'}
          sub={hasMetaCredentials ? undefined : 'Credenciales Meta pendientes'}
          color="indigo"
        />
        <MetricCard
          label="Leads creados"
          value={fmt(totalLeads)}
          sub={hasMetaCredentials && adClicks ? `${pct(totalLeads, adClicks)} de los clics` : undefined}
          color="violet"
        />
        <MetricCard
          label="Deals activos"
          value={fmt(activeDeals)}
          sub={`${pct(activeDeals, totalLeads)} de los leads`}
          color="purple"
        />
        <MetricCard
          label="Cerrado ganado"
          value={fmt(wonDeals)}
          sub={`${pct(wonDeals, totalLeads)} conversión · ${
            new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(wonValue)
          }`}
          color="fuchsia"
        />
      </div>

      {/* Gráfico */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Visualización del funnel</h2>
        {!hasMetaCredentials && (
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-4">
            Los clics en anuncios no están disponibles hasta configurar <code>META_ACCESS_TOKEN</code> y <code>META_AD_ACCOUNT_ID</code>.
          </p>
        )}
        <FunnelViz steps={funnelSteps} />
      </div>

      {/* Desglose por campaña */}
      {campaignRows.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Desglose por campaña</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Campaña</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Leads</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Activos</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Ganados</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Conversión</th>
                <th className="px-6 py-3 text-right font-semibold text-gray-600">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {campaignRows.map((row) => (
                <tr key={row.name} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-gray-900">{row.name}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{row.leads}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{row.active}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{row.won}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${row.won / row.leads >= 0.1 ? 'text-green-600' : 'text-gray-600'}`}>
                      {pct(row.won, row.leads)}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right text-gray-600">
                    {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(row.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {campaignRows.length === 0 && (
        <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-200">
          <p className="text-sm">Aún no hay leads de Meta Ads en el CRM.</p>
          <p className="text-xs mt-1">Los datos aparecerán cuando lleguen los primeros leads desde el webhook o la página de captación.</p>
        </div>
      )}
    </div>
  )
}

// ── Sub-componente tarjeta ─────────────────────────────────────────────────

type Color = 'indigo' | 'violet' | 'purple' | 'fuchsia'

const colorMap: Record<Color, { bg: string; text: string; dot: string }> = {
  indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-700',  dot: 'bg-indigo-500' },
  violet:  { bg: 'bg-violet-50',  text: 'text-violet-700',  dot: 'bg-violet-500' },
  purple:  { bg: 'bg-purple-50',  text: 'text-purple-700',  dot: 'bg-purple-500' },
  fuchsia: { bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', dot: 'bg-fuchsia-500' },
}

function MetricCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: Color }) {
  const c = colorMap[color]
  return (
    <div className={`${c.bg} rounded-xl p-5`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2 h-2 rounded-full ${c.dot}`} />
        <p className={`text-xs font-semibold uppercase tracking-wide ${c.text}`}>{label}</p>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}
