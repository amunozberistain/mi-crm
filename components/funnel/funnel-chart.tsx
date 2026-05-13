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

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: FunnelStep }[] }) {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0].payload
  return (
    <div className="bg-white border border-[#D4C5B0] rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold text-[#2C1810]">{name}</p>
      <p className="text-[#8B6F5E]">
        {value.toLocaleString('es-ES')}{' '}
        {name === 'Clics en anuncios' ? 'clics' : name === 'Leads creados' ? 'leads' : 'deals'}
      </p>
    </div>
  )
}

export default function FunnelViz({ steps }: Props) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <FunnelChart>
        <Tooltip content={<CustomTooltip />} />
        <Funnel dataKey="value" data={steps} isAnimationActive lastShapeType="rectangle">
          {steps.map((entry, i) => (
            <Cell key={i} fill={entry.fill} />
          ))}
          <LabelList
            position="right"
            fill="#8B6F5E"
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
