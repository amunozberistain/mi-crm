'use client'

import {
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  LabelList,
  Tooltip,
  Cell,
} from 'recharts'

export interface FunnelStep {
  name:  string
  value: number
  fill:  string
}

interface Props {
  steps: FunnelStep[]
}

const COLORS = ['#4f46e5', '#7c3aed', '#9333ea', '#a855f7']

// Tooltip personalizado para mostrar porcentaje de conversión desde el paso anterior
function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: FunnelStep }[] }) {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0].payload
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold text-gray-900">{name}</p>
      <p className="text-gray-600">{value.toLocaleString('es-ES')} {name === 'Clics en anuncios' ? 'clics' : name === 'Leads creados' ? 'leads' : 'deals'}</p>
    </div>
  )
}

export default function FunnelViz({ steps }: Props) {
  const data = steps.map((s, i) => ({ ...s, fill: COLORS[i] ?? COLORS[COLORS.length - 1] }))

  return (
    <ResponsiveContainer width="100%" height={320}>
      <FunnelChart>
        <Tooltip content={<CustomTooltip />} />
        <Funnel dataKey="value" data={data} isAnimationActive lastShapeType="rectangle">
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.fill} />
          ))}
          <LabelList
            position="right"
            fill="#374151"
            stroke="none"
            dataKey="name"
            style={{ fontSize: 13, fontWeight: 500 }}
          />
          <LabelList
            position="center"
            fill="#fff"
            stroke="none"
            dataKey="value"
            formatter={(v: unknown) => Number(v).toLocaleString('es-ES')}
            style={{ fontSize: 14, fontWeight: 700 }}
          />
        </Funnel>
      </FunnelChart>
    </ResponsiveContainer>
  )
}
