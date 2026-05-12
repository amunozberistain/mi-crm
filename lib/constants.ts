export const PIPELINE_STAGES = [
  'Nuevo lead',
  'Contactado',
  'Demo',
  'Propuesta',
  'Cerrado',
] as const

export type PipelineStage = (typeof PIPELINE_STAGES)[number]
