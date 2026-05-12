export interface CampaignInsight {
  campaign_id:   string
  campaign_name: string
  impressions:   number
  clicks:        number
  ctr:           number   // porcentaje, ej. 3.25 = 3.25%
  spend:         number
}

// Obtiene métricas de campañas desde Meta Graph API.
// Devuelve null si las credenciales no están configuradas.
export async function fetchCampaignInsights(datePreset = 'last_7d'): Promise<CampaignInsight[] | null> {
  const token       = process.env.META_ACCESS_TOKEN
  const adAccountId = process.env.META_AD_ACCOUNT_ID

  if (!token || !adAccountId) return null

  const params = new URLSearchParams({
    fields:      'campaign_id,campaign_name,impressions,clicks,ctr,spend',
    date_preset: datePreset,
    level:       'campaign',
    access_token: token,
  })

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${adAccountId}/insights?${params}`,
    { cache: 'no-store' }
  )

  if (!res.ok) {
    console.error('Meta Graph API error:', await res.text())
    return null
  }

  const json = await res.json()

  return (json.data ?? []).map((row: Record<string, string>) => ({
    campaign_id:   row.campaign_id,
    campaign_name: row.campaign_name,
    impressions:   parseInt(row.impressions ?? '0', 10),
    clicks:        parseInt(row.clicks      ?? '0', 10),
    ctr:           parseFloat(row.ctr       ?? '0'),
    spend:         parseFloat(row.spend     ?? '0'),
  }))
}

// Suma total de clics en todas las campañas de los últimos N días.
export async function fetchTotalAdClicks(datePreset = 'last_30d'): Promise<number> {
  const insights = await fetchCampaignInsights(datePreset)
  if (!insights) return 0
  return insights.reduce((sum, c) => sum + c.clicks, 0)
}
