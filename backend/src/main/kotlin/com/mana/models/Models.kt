package com.mana.models

import kotlinx.serialization.Serializable

// ── AI Chat ──────────────────────────────────────────────

@Serializable
data class ChatMessage(
    val role: String,    // "user" | "assistant"
    val content: String
)

@Serializable
data class ExamenRequest(
    val messages: List<ChatMessage>,
    val estadoDeVida: String  // Soltero | Casado | Consagrado | Adolescente
)

@Serializable
data class SantoAxesRequest(
    val quickProfile: Map<String, Int>,
    val extendedProfile: Map<String, Int> = emptyMap(),
    val intent: String? = null
)

@Serializable
data class LectioRequest(
    val messages: List<ChatMessage>,
    val pasaje: String
)

@Serializable
data class QARequest(
    val messages: List<ChatMessage>
)

@Serializable
data class AIResponse(
    val response: String
)

// Internal: Claude's JSON response for conversational endpoints
@Serializable
data class AIJsonResponse(
    val texto: String,
    val opciones: List<String> = emptyList(),
    val santos: List<SantoSugerido> = emptyList()
)

// External: returned to frontend for conversational endpoints
@Serializable
data class AIResponseWithOptions(
    val response: String,
    val opciones: List<String> = emptyList(),
    val santos: List<SantoSugerido> = emptyList()
)

@Serializable
data class SantoSugerido(
    val nombre: String,
    val epoca: String,
    val conexion: String,
    val bio: String,
    val frase: String,
    val cuandoInvocarlo: String
)

// ── Novenas ──────────────────────────────────────────────

@Serializable
data class NovenaDia(
    val id: Int = 0,
    val novenaId: Int = 0,
    val dia: Int,
    val titulo: String? = null,
    val oracion: String,
    val reflexion: String? = null
)

@Serializable
data class Novena(
    val id: Int = 0,
    val nombre: String,
    val santo: String,
    val descripcion: String? = null,
    val intencionSugerida: String? = null,
    val autor: String = "comunidad",
    val estado: String = "pendiente",
    val dias: List<NovenaDia> = emptyList()
)

@Serializable
data class NovenaCreateRequest(
    val nombre: String,
    val santo: String,
    val descripcion: String? = null,
    val intencionSugerida: String? = null,
    val autor: String = "comunidad",
    val dias: List<NovenaDia>
)

// ── Web Push ─────────────────────────────────────────────

@Serializable
data class PushSubscriptionRequest(
    val endpoint: String,
    val p256dh: String,
    val auth: String
)

@Serializable
data class NovenaActivaRequest(
    val subscriptionEndpoint: String,
    val novenaId: Int,
    val horaNotificacion: String = "08:00"
)

@Serializable
data class NovenaActiva(
    val id: Int,
    val novenaId: Int,
    val diaActual: Int,
    val horaNotificacion: String
)

// ── Admin / Moderación ────────────────────────────────────

@Serializable
data class ModerationResult(
    val aprobada: Boolean,
    val observaciones: String
)

// ── Bible ─────────────────────────────────────────────────

@Serializable
data class BookInfo(
    val abbr: String,
    val name: String,
    val testament: String,
    val chaptersCount: Int
)

@Serializable
data class VerseData(
    val number: Int,
    val text: String
)

@Serializable
data class ChapterData(
    val book: String,
    val bookName: String,
    val chapter: Int,
    val verses: List<VerseData>
)

@Serializable
data class BibliaRecomendacionRequest(
    val estadoAnimo: String
)

// Parsed from Claude (no verse text — IA nunca provee texto bíblico)
@Serializable
data class BibliaRecomendacionRaw(
    val mensaje: String,
    val libro: String,
    val libroNombre: String,
    val capitulo: Int,
    val versiculo: Int
)

// Sent to frontend (verse text resolved from bible_es.json)
@Serializable
data class BibliaRecomendacion(
    val mensaje: String,
    val libro: String,
    val libroNombre: String,
    val capitulo: Int,
    val versiculo: Int,
    val textoVersiculo: String
)

// ── Lectio Divina bíblica ─────────────────────────────────

@Serializable
data class LectioBiblicaRequest(
    val libro: String,
    val libroNombre: String,
    val capitulo: Int,
    val versos: List<Int>,
    val textos: List<String>   // verse texts resolved from bible_es.json
)

@Serializable
data class LectioBiblicaResponse(
    val pasaje: String,
    val lectio: String,
    val meditatioIntro: String,
    val meditatioPreguntas: List<String>,
    val oratio: String,
    val contemplatio: String,
    val preguntasProfundas: List<String>
)

// ── Respuestas genéricas ──────────────────────────────────

@Serializable
data class MessageResponse(val message: String)

@Serializable
data class IdResponse(val id: Int, val message: String)

@Serializable
data class NovenaPendiente(val id: Int, val nombre: String, val santo: String, val autor: String)
