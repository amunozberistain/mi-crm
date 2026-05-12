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
