export const PIPELINE_STAGES = [
  'Nuevo lead',
  'Contactado',
  'Follow up 1',
  'Follow up 2',
  'Cerrado ganado',
  'Cerrado perdido',
] as const

export type PipelineStage = (typeof PIPELINE_STAGES)[number]

export const CLOSED_WON_STAGE  = 'Cerrado ganado'
export const CLOSED_LOST_STAGE = 'Cerrado perdido'

export const FORMA_PAGO_OPTIONS = [
  'Upfront (pago completo por adelantado)',
  '50% inicio — 50% final',
] as const

export const EVENT_COLORS = [
  { label: 'Índigo',    value: '#4f46e5' },
  { label: 'Tomate',    value: '#d50000' },
  { label: 'Flamingo',  value: '#e91e63' },
  { label: 'Naranja',   value: '#f57c00' },
  { label: 'Banana',    value: '#f9a825' },
  { label: 'Salvia',    value: '#33b679' },
  { label: 'Albahaca',  value: '#0b8043' },
  { label: 'Pavo real', value: '#039be5' },
  { label: 'Arándano',  value: '#3f51b5' },
  { label: 'Lavanda',   value: '#7986cb' },
  { label: 'Uva',       value: '#8e24aa' },
  { label: 'Grafito',   value: '#616161' },
]
