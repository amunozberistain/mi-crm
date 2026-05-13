import { createClient } from '@/lib/supabase/server'
import { fetchTotalAdClicks } from '@/lib/meta/graph-api'
import { CLOSED_WON_STAGE, CLOSED_LOST_STAGE } from '@/lib/constants'
import FunnelViz from '@/components/funnel/funnel-chart'

function pct(num: number, den: number) {
  if (!den) return '—'
  return ((num / den) * 100).toFixed(1) + '%'
}

function fmt(n: number) {
  return n.toLocaleString('es-ES')
}

const CLOSED_STAGES = [CLOSED_WON_STAGE, CLOSED_LOST_STAGE]

export default async function FunnelPage() {
  const supabase = createClient()

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

  const metaLeads   = (contacts ?? []).filter((c) =>
    c.lead_source === 'meta_lead_ads' || c.lead_source === 'meta_landing'
  )
  const totalLeads  = metaLeads.length

  const metaDeals = (allDeals ?? []).filter((d) => {
    const contact = (d.contacts as unknown) as { lead_source: string | null } | null
    return contact?.lead_source === 'meta_lead_ads' || contact?.lead_source === 'meta_landing'
  })
  const activeDeals = metaDeals.filter((d) => !CLOSED_STAGES.includes(d.stage)).length
  const wonDeals    = metaDeals.filter((d) => d.stage === CLOSED_WON_STAGE).length
  const wonValue    = metaDeals
    .filter((d) => d.stage === CLOSED_WON_STAGE)
    .reduce((sum, d) => sum + ((d.value as number) ?? 0), 0)

  type CampaignRow = { leads: number; active: number; won: number; value: number }
  const campaignMap: Record<string, CampaignRow> = {}

  for (const c of metaLeads) {
    const key = c.utm_campaign ?? c.meta_campaign_id ?? 'Sin campaña'
    if (!campaignMap[key]) campaignMap[key] = { leads: 0, active: 0, won: 0, value: 0 }
    campaignMap[key].leads++
  }

  for (const d of metaDeals) {
    const contact = (d.contacts as unknown) as { utm_campaign: string | null; meta_campaign_id: string | null } | null
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

  const funnelSteps = [
    { name: 'Clics en anuncios', value: adClicks,   fill: '#5C3D2E' },
    { name: 'Leads creados',     value: totalLeads,  fill: '#8B6F5E' },
    { name: 'Deals activos',     value: activeDeals, fill: '#C4A882' },
    { name: 'Cerrado ganado',    value: wonDeals,    fill: '#D4C5B0' },
  ]

  const hasMetaCredentials = !!process.env.META_ACCESS_TOKEN && !!process.env.META_AD_ACCOUNT_ID

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-[#2C1810] leading-tight">
          Funnel de captación
        </h1>
        <p className="text-sm text-[#8B6F5E] mt-1">
          Últimos 30 días · leads procedentes de Meta Ads
        </p>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Clics en anuncios"
          value={hasMetaCredentials ? fmt(adClicks) : '—'}
          sub={hasMetaCredentials ? undefined : 'Credenciales Meta pendientes'}
          dotColor="bg-[#5C3D2E]"
        />
        <MetricCard
          label="Leads creados"
          value={fmt(totalLeads)}
          sub={hasMetaCredentials && adClicks ? `${pct(totalLeads, adClicks)} de los clics` : undefined}
          dotColor="bg-[#8B6F5E]"
        />
        <MetricCard
          label="Deals activos"
          value={fmt(activeDeals)}
          sub={`${pct(activeDeals, totalLeads)} de los leads`}
          dotColor="bg-[#C4A882]"
        />
        <MetricCard
          label="Cerrado ganado"
          value={fmt(wonDeals)}
          sub={`${pct(wonDeals, totalLeads)} conversión · ${
            new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(wonValue)
          }`}
          dotColor="bg-[#D4C5B0]"
        />
      </div>

      {/* Gráfico */}
      <div className="bg-white rounded-xl border border-[#D4C5B0] p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-[#2C1810] mb-4">
          Visualización del funnel
        </h2>
        {!hasMetaCredentials && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-4">
            Los clics en anuncios no están disponibles hasta configurar{' '}
            <code>META_ACCESS_TOKEN</code> y <code>META_AD_ACCOUNT_ID</code>.
          </p>
        )}
        <FunnelViz steps={funnelSteps} />
      </div>

      {/* Desglose por campaña */}
      {campaignRows.length > 0 && (
        <div className="bg-white rounded-xl border border-[#D4C5B0] overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-[#D4C5B0] bg-[#F5F0E8]">
            <h2 className="font-display text-lg font-semibold text-[#2C1810]">
              Desglose por campaña
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-[#EDE8DF]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#8B6F5E] uppercase tracking-wide">Campaña</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#8B6F5E] uppercase tracking-wide">Leads</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#8B6F5E] uppercase tracking-wide">Activos</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#8B6F5E] uppercase tracking-wide">Ganados</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#8B6F5E] uppercase tracking-wide">Conversión</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-[#8B6F5E] uppercase tracking-wide">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D4C5B0]/40">
              {campaignRows.map((row) => (
                <tr key={row.name} className="hover:bg-[#F5F0E8] transition-colors">
                  <td className="px-6 py-3 font-medium text-[#2C1810]">{row.name}</td>
                  <td className="px-4 py-3 text-right text-[#8B6F5E]">{row.leads}</td>
                  <td className="px-4 py-3 text-right text-[#8B6F5E]">{row.active}</td>
                  <td className="px-4 py-3 text-right text-[#8B6F5E]">{row.won}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${row.won / row.leads >= 0.1 ? 'text-[#5C3D2E]' : 'text-[#8B6F5E]'}`}>
                      {pct(row.won, row.leads)}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right text-[#8B6F5E]">
                    {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(row.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {campaignRows.length === 0 && (
        <div className="text-center py-16 text-[#8B6F5E]/60 bg-white rounded-xl border border-[#D4C5B0] shadow-sm">
          <p className="text-sm">Aún no hay leads de Meta Ads en el CRM.</p>
          <p className="text-xs mt-1">Los datos aparecerán cuando lleguen los primeros leads desde el webhook o la página de captación.</p>
        </div>
      )}
    </div>
  )
}

// ── Tarjeta de métrica ──────────────────────────────────────────────────────

function MetricCard({ label, value, sub, dotColor }: {
  label: string; value: string; sub?: string; dotColor: string
}) {
  return (
    <div className="bg-white rounded-xl border border-[#D4C5B0] p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
        <p className="text-xs font-semibold uppercase tracking-wide text-[#8B6F5E]">{label}</p>
      </div>
      <p className="font-display text-3xl font-semibold text-[#2C1810]">{value}</p>
      {sub && <p className="text-xs text-[#8B6F5E] mt-1">{sub}</p>}
    </div>
  )
}
