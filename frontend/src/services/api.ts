const BASE_URL = ''

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type Novena = {
  id: number
  nombre: string
  santo: string
  descripcion?: string
  intencionSugerida?: string
  autor?: string
  estado: string
  categoria?: string
  fechaFestividad?: string | null
  imagenUrl?: string
  imagenCropX?: number
  imagenCropY?: number
  dias?: NovenaDia[]
}

export type NovenaDia = {
  id: number
  novenaId: number
  dia: number
  titulo?: string
  oracion: string
  reflexion?: string
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.error || err.message || 'Error del servidor')
  }
  return res.json()
}

export type SantoSugerido = {
  nombre: string
  epoca: string
  conexion: string
  bio: string
  frase: string
  cuandoInvocarlo: string
}

export type AIResponseWithOptions = {
  response: string
  opciones: string[]
  santos?: SantoSugerido[]
}

// ── Examen de Conciencia ─────────────────────────────────────────

export type ExamenSeccion = {
  id: string
  titulo: string
  preguntas: string[]
}

export type ExamenPerfil = {
  id: string
  label: string
  introduccion: {
    cita_papa_francisco: string
    definicion: string
    nota?: string
  }
  secciones?: ExamenSeccion[]
  preguntas?: string[]
  nota_final?: string
}

export type ExamenData = {
  titulo: string
  descripcion: string
  oracion_contricion: string
  perfiles: ExamenPerfil[]
}

// ── AI ──────────────────────────────────────────────────────────

export const api = {
  examen: (messages: ChatMessage[], estadoDeVida: string) =>
    request<AIResponseWithOptions>('/api/ai/examen', {
      method: 'POST',
      body: JSON.stringify({ messages, estadoDeVida }),
    }),

  santo: (
    quickProfile: Record<string, number>,
    extendedProfile: Record<string, number> = {},
    intent?: string,
  ) =>
    request<AIResponseWithOptions>('/api/ai/santo', {
      method: 'POST',
      body: JSON.stringify({ quickProfile, extendedProfile, intent }),
    }),

  lectio: (messages: ChatMessage[], pasaje: string) =>
    request<{ response: string }>('/api/ai/lectio', {
      method: 'POST',
      body: JSON.stringify({ messages, pasaje }),
    }),

  // ── Bible (served from public/data/bible_es.json) ──────────────

  getBibleBooks: () =>
    import('../lib/bible').then(m => m.getBibleBooks()),

  getBibleChapter: (book: string, chapter: number) =>
    import('../lib/bible').then(m => m.getBibleChapter(book, chapter)),

  getBibliaRecomendacion: (estadoAnimo: string) =>
    request<BibliaRecomendacion>('/api/ai/biblia-recomendacion', {
      method: 'POST',
      body: JSON.stringify({ estadoAnimo }),
    }),

  getLectioBiblica: (libro: string, libroNombre: string, capitulo: number, versos: number[], textos: string[]) =>
    request<LectioBiblicaResponse>('/api/ai/lectio-biblica', {
      method: 'POST',
      body: JSON.stringify({ libro, libroNombre, capitulo, versos, textos }),
    }),

  reportBug: (page: string, description: string, url: string) =>
    request<{ ok: boolean }>('/api/report-bug', {
      method: 'POST',
      body: JSON.stringify({ page, description, url }),
    }),

  // ── Push Notifications ──────────────────────────────────────────

  subscribeNotification: (
    subscription: PushSubscriptionJSON,
    novenaId: number,
    nombreNovena: string,
    hora: string,
  ) =>
    request<{ ok: boolean }>('/api/notifications/subscribe', {
      method: 'POST',
      body: JSON.stringify({ subscription, novenaId, nombreNovena, hora }),
    }),

  unsubscribeNotification: (endpoint: string, novenaId: number) =>
    request<{ ok: boolean }>('/api/notifications/unsubscribe', {
      method: 'POST',
      body: JSON.stringify({ endpoint, novenaId }),
    }),

  generarPlanEspiritual: (params: PlanEspiritualParams) =>
    request<PlanEspiritual>('/api/ai/asistente', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
}

export type BibleBook = {
  abbr: string
  name: string
  testament: string
  chaptersCount: number
}

export type BibleVerse = {
  number: number
  text: string
}

export type BibleChapter = {
  book: string
  bookName: string
  chapter: number
  verses: BibleVerse[]
}

export type BibliaRecomendacion = {
  mensaje: string
  libro: string
  libroNombre: string
  capitulo: number
  versiculo: number
  textoVersiculo: string
}

export type LectioBiblicaResponse = {
  pasaje: string
  lectio: string
  meditatioIntro: string
  meditatioPreguntas: string[]
  oratio: string
  contemplatio: string
}

// ── Asistente Espiritual ─────────────────────────────────────────────────────

export type PlanEspiritualDia = {
  dia: number
  tema: string
  lectura: string
  reflexion: string
  oracion: string
  accion: string
}

export type PlanEspiritual = {
  titulo: string
  duracionDias: number
  objetivo: string
  plan: PlanEspiritualDia[]
}

export type PlanEspiritualParams = {
  duracion: number
  edad: string
  estado: string
  objetivo: string
  contextoLiturgico: string
  frecuenciaOracion: string
  asistenciaMisa: string
}
