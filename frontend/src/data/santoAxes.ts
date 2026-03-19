// Ejes para recomendación de santos
// Modificar este archivo para ajustar los ejes, descripciones u opciones de intención.

export interface Axis {
  id: string
  label: string
  description: string
}

export const quickProfileAxes: Axis[] = [
  {
    id: 'purpose',
    label: 'Vocación / propósito',
    description: '¿Qué tan claro y alineado sentís tu rumbo en la vida?',
  },
  {
    id: 'suffering',
    label: 'Manejo del sufrimiento',
    description: '¿Qué tan bien atravesás dificultades o crisis?',
  },
  {
    id: 'relationships',
    label: 'Relaciones',
    description: '¿Qué tan satisfecho estás con tus relaciones cercanas?',
  },
  {
    id: 'faith',
    label: 'Fe / espiritualidad',
    description: '¿Qué tan conectado te sentís con lo espiritual o trascendente?',
  },
  {
    id: 'spirituality_action',
    label: 'Espiritualidad activa',
    description: '¿Qué tanto te atrae vivir la fe a través de la acción y ayudar a otros?',
  },
]

export const extendedProfileAxes: Axis[] = [
  {
    id: 'health_emotional',
    label: 'Salud emocional',
    description: '¿Qué tan en paz te sentís emocionalmente?',
  },
  {
    id: 'loneliness',
    label: 'Soledad',
    description: '¿Qué tan acompañado te sentís?',
  },
  {
    id: 'discipline',
    label: 'Disciplina',
    description: '¿Qué tan constante sos en tus hábitos?',
  },
  {
    id: 'introspection',
    label: 'Introspección',
    description: '¿Qué tanto reflexionás sobre tu vida interior?',
  },
  {
    id: 'spirituality_contemplative',
    label: 'Espiritualidad contemplativa',
    description: '¿Qué tanto te atrae la oración y el silencio?',
  },
  {
    id: 'spirituality_trust',
    label: 'Confianza / soltar',
    description: '¿Qué tanto te identificás con confiar y soltar el control?',
  },
]

export const intentOptions: string[] = [
  'Inspiración',
  'Ayuda en un problema',
  'Ejemplo de vida',
  'Acompañamiento espiritual',
  'Curiosidad',
]
