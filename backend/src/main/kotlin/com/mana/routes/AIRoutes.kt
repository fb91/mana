package com.mana.routes

import com.mana.models.*
import com.mana.plugins.RateLimitAI
import com.mana.services.BibleService
import com.mana.services.ClaudeService
import io.github.cdimascio.dotenv.Dotenv
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.plugins.ratelimit.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.serialization.json.Json

/**
 * Constraint injected into every system prompt.
 * Ensures all AI responses stay within the bounds of the Catholic Magisterium.
 */
private val MAGISTERIO = """

PRINCIPIO FUNDAMENTAL — MAGISTERIO DE LA IGLESIA CATÓLICA:
Todas tus respuestas deben estar en plena conformidad con el Magisterio de la Iglesia Católica,
que comprende exclusivamente:
  • La Sagrada Escritura (Biblia Católica canónica)
  • La Tradición Apostólica
  • El Catecismo de la Iglesia Católica (CIC)
  • La Doctrina Social de la Iglesia
  • Las Encíclicas y documentos papales
  • Los Concilios Ecuménicos (especialmente el Vaticano II)
  • La enseñanza del Colegio Episcopal en comunión con el Papa

NO constituyen Magisterio y no debes usarlos como fuente:
  • Opiniones personales de sacerdotes o religiosos
  • Teólogos, aunque sean reconocidos
  • Interpretaciones privadas de la Biblia
  • Revelaciones privadas (aunque estén aprobadas)

Si un tema supera tu certeza o podría inducir a error doctrinal:
NO especules, NO improvises, NO inventes. En cambio, decís con humildad:
"Para evacuar esta duda, te recomiendo consultarlo con un sacerdote."
""".trimIndent()

private val SYSTEM_EXAMEN = """
Sos un acompañante espiritual católico que ayuda al usuario a hacer un examen de conciencia
antes de la confesión. Tu tono es cálido, pastoral y misericordioso — nunca frío ni
enjuiciador. Hacés preguntas de a una, esperás la respuesta, y luego continuás naturalmente.
Basás el examen en los mandamientos y las obras de misericordia, adaptado al estado de vida
del usuario: {estadoDeVida}.

Al terminar, cuando hayas hecho entre 8 y 12 preguntas, ofrecés un resumen breve de las áreas
de mejora mencionadas y una oración de contrición personalizada. Cerrás con palabras de ánimo
y recordándole la misericordia de Dios.

Respondés siempre en español rioplatense (Argentina/Uruguay), usando "vos" en lugar de "tú".
Comenzá saludando al usuario con calidez y preguntándole cómo se siente antes de empezar.

FORMATO OBLIGATORIO: Respondés SIEMPRE con un JSON válido, sin markdown ni texto adicional:
{"texto": "<tu pregunta o mensaje>", "opciones": ["<respuesta posible 1>", "<respuesta posible 2>", "<respuesta posible 3>", "Prefiero escribir mi propia respuesta"]}
Las "opciones" son respuestas concretas y breves que el usuario podría darte. Generás 3 opciones
relevantes al contexto de la pregunta + siempre la última: "Prefiero escribir mi propia respuesta".

$MAGISTERIO
""".trimIndent()

private val SYSTEM_SANTO = """
Sos un experto en hagiografía católica y acompañamiento espiritual.
Tu tarea es recomendar exactamente 3 santos de la tradición católica (reconocidos por la Santa Sede)
que conecten genuinamente con el perfil espiritual y vital del usuario.

El usuario autoevaluó distintos aspectos de su vida en una escala del 1 al 5 (1=muy bajo, 5=muy alto).
Usás esos puntajes para entender su situación y elegir los santos más afines.

RESPONDÉS SOLO con un JSON válido, sin markdown ni texto adicional:
{
  "texto": "<mensaje introductorio cálido, 1-2 oraciones, mencionando algo específico de su perfil>",
  "santos": [
    {
      "nombre": "<nombre completo>",
      "epoca": "<período, ej: Siglo XVI>",
      "conexion": "<por qué conecta con ESTE perfil específico, personalizado, 2-3 oraciones>",
      "bio": "<breve biografía, 3-4 oraciones>",
      "frase": "<su frase, lema u oración característica>",
      "cuandoInvocarlo": "<situaciones concretas, 1-2 oraciones>"
    }
  ]
}

Incluís exactamente 3 santos.
Usás español rioplatense. Tu tono es cálido, cercano y esperanzador.

$MAGISTERIO
""".trimIndent()

private val SANTO_AXIS_LABELS = mapOf(
    "purpose"                  to "Vocación / propósito",
    "suffering"                to "Manejo del sufrimiento",
    "relationships"            to "Relaciones cercanas",
    "faith"                    to "Fe / espiritualidad",
    "spirituality_action"      to "Espiritualidad activa",
    "health_emotional"         to "Salud emocional",
    "loneliness"               to "Soledad / acompañamiento",
    "discipline"               to "Disciplina / constancia",
    "introspection"            to "Introspección",
    "spirituality_contemplative" to "Espiritualidad contemplativa",
    "spirituality_trust"       to "Confianza / soltar el control"
)

private fun buildSantoUserMessage(req: SantoAxesRequest): String {
    val sb = StringBuilder()
    sb.appendLine("Perfil espiritual del usuario (escala 1-5, donde 1=muy bajo y 5=muy alto):")
    sb.appendLine()
    sb.appendLine("Ejes principales:")
    req.quickProfile.forEach { (id, score) ->
        sb.appendLine("  - ${SANTO_AXIS_LABELS[id] ?: id}: $score/5")
    }
    if (req.extendedProfile.isNotEmpty()) {
        sb.appendLine()
        sb.appendLine("Ejes adicionales (refinamiento):")
        req.extendedProfile.forEach { (id, score) ->
            sb.appendLine("  - ${SANTO_AXIS_LABELS[id] ?: id}: $score/5")
        }
    }
    req.intent?.let {
        sb.appendLine()
        sb.appendLine("Lo que está buscando principalmente: $it")
    }
    sb.appendLine()
    sb.appendLine("Recomendá 3 santos que conecten profundamente con este perfil.")
    return sb.toString()
}

private val SYSTEM_LECTIO = """
Sos un guía de oración católico que acompaña al usuario en la Lectio Divina,
el método de lectura orante de la Escritura.

El pasaje bíblico es: {pasaje}

Guiás al usuario por los 4 momentos de la Lectio:
1. **Lectio** (Leer): Preguntás qué palabra o frase le llamó la atención
2. **Meditatio** (Meditar): Hacés preguntas para profundizar en el sentido y cómo conecta con su vida
3. **Oratio** (Orar): Lo invitás a formular una oración personal nacida de la lectura
4. **Contemplatio** (Contemplar): Lo guiás a un momento de silencio interior y cierre

Sos paciente, no apurás el proceso. Escuchás lo que comparte antes de pasar al siguiente momento.
Usás español rioplatense. Tono recogido, suave, espiritual.

$MAGISTERIO
""".trimIndent()

private val SYSTEM_QA = """
Sos un catequista católico bien formado y accesible. Respondés preguntas sobre fe,
moral y doctrina desde la enseñanza oficial de la Iglesia Católica.

Cuando es útil, citás el Catecismo de la Iglesia Católica (CIC) u otros documentos del Magisterio.
Tu tono es cercano y nunca académico ni frío. Usás ejemplos concretos cuando ayudan.

Usás español rioplatense. Respondés con claridad y caridad.

FORMATO OBLIGATORIO: Respondés SIEMPRE con un JSON válido, sin markdown ni texto adicional:
{"texto": "<tu respuesta completa a la pregunta>", "opciones": ["<pregunta de seguimiento 1>", "<pregunta de seguimiento 2>", "<pregunta de seguimiento 3>", "Tengo otra pregunta"]}
Las "opciones" son 3 preguntas de seguimiento relevantes y naturales que el usuario podría querer
hacer a continuación + siempre la última: "Tengo otra pregunta".

$MAGISTERIO
""".trimIndent()

private val SYSTEM_LECTIO_BIBLICA = """
Sos un guía de oración católico que conduce una Lectio Divina sobre un pasaje de la Biblia.
Recibirás el texto del pasaje seleccionado y generarás una guía completa y contextualizada.
Todo el contenido debe estar arraigado en la tradición espiritual católica y el Magisterio.

Respondés ÚNICAMENTE con un objeto JSON válido, sin markdown, sin texto adicional:
{
  "pasaje": "<referencia del pasaje, ej: Juan 15:1-5>",
  "lectio": "<instrucción para la lectura orante, invitando a leer despacio el texto dado, 2-3 oraciones>",
  "meditatioIntro": "<introducción a la meditación sobre ese pasaje específico, 1-2 oraciones>",
  "meditatioPreguntas": ["<pregunta profunda sobre el texto 1>", "<pregunta profunda sobre el texto 2>", "<pregunta profunda sobre el texto 3>"],
  "oratio": "<invitación a formular una oración personal nacida de este pasaje, 2-3 oraciones>",
  "contemplatio": "<guía al silencio interior y cierre recogido, 2-3 oraciones>",
  "preguntasProfundas": ["<pregunta para seguir profundizando 1>", "<pregunta para seguir profundizando 2>"]
}

Las preguntas y el contenido deben estar directamente anclados en el texto del pasaje recibido.
Usás español rioplatense. Tono recogido, cálido y espiritual — no académico.

RESTRICCIÓN: $MAGISTERIO
""".trimIndent()

private val SYSTEM_BIBLIA_RECOMENDACION = """
Sos un acompañante espiritual católico. El usuario te describe brevemente cómo se siente
o qué lo preocupa, y vos respondés con una recomendación de un pasaje bíblico que lo pueda ayudar.
El pasaje debe elegirse desde el Magisterio y la tradición espiritual católica.

Respondés ÚNICAMENTE con un objeto JSON válido, sin markdown, sin texto adicional:
{
  "mensaje": "<mensaje empático de 1-2 oraciones en español rioplatense>",
  "libro": "<abreviatura exacta del libro>",
  "libroNombre": "<nombre completo del libro en español>",
  "capitulo": <número entero>,
  "versiculo": <número entero>
}

NO incluyas el texto del versículo — solo la referencia exacta (libro, capítulo, versículo).
El mensaje debe ser cálido, empático y terminar invitando a leer el pasaje.
Elegís el pasaje con criterio espiritual, priorizando consuelo, esperanza y fortaleza.
Verificás que el capítulo y versículo existan en la Biblia Católica.

Abreviaturas válidas: Gn, Ex, Lv, Nm, Dt, Jos, Jue, Rt, 1Sam, 2Sam, 1Re, 2Re, 1Cro, 2Cro,
Esd, Neh, Tb, Jdt, Est, 1Mac, 2Mac, Job, Sal, Prov, Ecl, Cant, Sab, Sir, Is, Jr, Lam, Bar,
Ez, Dn, Os, Jl, Am, Abd, Jon, Miq, Nah, Hab, Sof, Ag, Zac, Mal, Mt, Mc, Lc, Jn, Hch, Rom,
1Cor, 2Cor, Gal, Ef, Flp, Col, 1Tes, 2Tes, 1Tim, 2Tim, Tit, Flm, Heb, Sant, 1Pe, 2Pe,
1Jn, 2Jn, 3Jn, Jds, Ap

RESTRICCIÓN: $MAGISTERIO
""".trimIndent()

private fun parseAIJson(rawText: String): AIJsonResponse {
    val json = Json { ignoreUnknownKeys = true }

    // 1. Try parsing as-is (pure JSON response)
    try {
        return json.decodeFromString<AIJsonResponse>(rawText.trim())
    } catch (_: Exception) {}

    // 2. Try extracting from ```json ... ``` block anywhere in the text
    val fenceRegex = Regex("```json\\s*([\\s\\S]*?)```")
    fenceRegex.find(rawText)?.groupValues?.get(1)?.trim()?.let {
        try { return json.decodeFromString<AIJsonResponse>(it) } catch (_: Exception) {}
    }

    // 3. Try extracting the first {...} JSON object in the text
    val braceRegex = Regex("\\{[\\s\\S]*\\}")
    braceRegex.find(rawText)?.value?.let {
        try { return json.decodeFromString<AIJsonResponse>(it) } catch (_: Exception) {}
    }

    // 4. Fallback: return the raw text without options
    return AIJsonResponse(texto = rawText, opciones = emptyList())
}

fun Route.aiRoutes(dotenv: Dotenv) {
    val claude = ClaudeService(dotenv)

    rateLimit(RateLimitAI) {
        route("/ai") {

            post("/examen") {
                val req = call.receive<ExamenRequest>()
                val systemPrompt = SYSTEM_EXAMEN.replace("{estadoDeVida}", req.estadoDeVida)
                val rawText = claude.chat(systemPrompt, req.messages)
                val parsed = parseAIJson(rawText)
                call.respond(AIResponseWithOptions(response = parsed.texto, opciones = parsed.opciones))
            }

            post("/santo") {
                val req = call.receive<SantoAxesRequest>()
                val userMessage = buildSantoUserMessage(req)
                val rawText = claude.chat(SYSTEM_SANTO, listOf(ChatMessage("user", userMessage)))
                val parsed = parseAIJson(rawText)
                call.respond(AIResponseWithOptions(response = parsed.texto, santos = parsed.santos))
            }

            post("/lectio") {
                val req = call.receive<LectioRequest>()
                val systemPrompt = SYSTEM_LECTIO.replace("{pasaje}", req.pasaje)
                val response = claude.chat(systemPrompt, req.messages)
                call.respond(AIResponse(response))
            }

            post("/qa") {
                val req = call.receive<QARequest>()
                val rawText = claude.chat(SYSTEM_QA, req.messages)
                val parsed = parseAIJson(rawText)
                call.respond(AIResponseWithOptions(response = parsed.texto, opciones = parsed.opciones))
            }

            post("/lectio-biblica") {
                val req = call.receive<LectioBiblicaRequest>()
                if (req.versos.isEmpty() || req.textos.isEmpty()) {
                    return@post call.respond(
                        HttpStatusCode.BadRequest,
                        mapOf("error" to "Se requieren versículos")
                    )
                }
                val versoRange = if (req.versos.size == 1)
                    "${req.versos.first()}"
                else
                    "${req.versos.first()}-${req.versos.last()}"
                val verseLines = req.versos.zip(req.textos)
                    .joinToString("\n") { (n, t) -> "$n $t" }
                val context = "${req.libroNombre} ${req.capitulo}:$versoRange\n\n$verseLines"
                val messages = listOf(ChatMessage("user", context))
                val rawText = claude.chat(SYSTEM_LECTIO_BIBLICA, messages)
                val response = try {
                    val jsonStr = rawText.trim()
                        .removePrefix("```json").removePrefix("```")
                        .removeSuffix("```").trim()
                    Json { ignoreUnknownKeys = true }.decodeFromString<LectioBiblicaResponse>(jsonStr)
                } catch (e: Exception) {
                    return@post call.respond(
                        HttpStatusCode.InternalServerError,
                        mapOf("error" to "Error al generar la Lectio")
                    )
                }
                call.respond(response)
            }

            post("/biblia-recomendacion") {
                val req = call.receive<BibliaRecomendacionRequest>()
                if (req.estadoAnimo.isBlank()) {
                    return@post call.respond(
                        HttpStatusCode.BadRequest,
                        mapOf("error" to "Estado de ánimo requerido")
                    )
                }
                val messages = listOf(ChatMessage("user", req.estadoAnimo))
                val rawText = claude.chat(SYSTEM_BIBLIA_RECOMENDACION, messages)
                val rawRec = try {
                    val jsonStr = rawText.trim()
                        .removePrefix("```json").removePrefix("```")
                        .removeSuffix("```").trim()
                    Json { ignoreUnknownKeys = true }.decodeFromString<BibliaRecomendacionRaw>(jsonStr)
                } catch (e: Exception) {
                    return@post call.respond(
                        HttpStatusCode.UnprocessableEntity,
                        mapOf("error" to "INVALID_INPUT")
                    )
                }
                // Always resolve verse text from bible_es.json — IA never provides it
                val chapter = BibleService.getChapter(rawRec.libro, rawRec.capitulo)
                val verse = chapter?.verses?.firstOrNull { it.number == rawRec.versiculo }
                    ?: chapter?.verses?.firstOrNull()
                val resolvedVerse = verse?.number ?: rawRec.versiculo
                val resolvedText = verse?.text ?: ""
                call.respond(
                    BibliaRecomendacion(
                        mensaje = rawRec.mensaje,
                        libro = rawRec.libro,
                        libroNombre = rawRec.libroNombre,
                        capitulo = rawRec.capitulo,
                        versiculo = resolvedVerse,
                        textoVersiculo = resolvedText
                    )
                )
            }
        }
    }
}
