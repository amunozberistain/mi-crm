export const PIPELINE_STAGES = [
  'Nuevo lead',
  'Contactado',
  'Demo',
  'Propuesta',
  'Cerrado ganado',
  'Cerrado perdido',
] as const

export type PipelineStage = (typeof PIPELINE_STAGES)[number]

export const CLOSED_WON_STAGE  = 'Cerrado ganado'
export const CLOSED_LOST_STAGE = 'Cerrado perdido'
