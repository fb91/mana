package com.mana.routes

import com.mana.db.NovenaDiasTable
import com.mana.db.NovenasTable
import com.mana.models.*
import com.mana.services.ClaudeService
import io.github.cdimascio.dotenv.Dotenv
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.transactions.transaction

fun Route.adminRoutes(dotenv: Dotenv) {
    val claude = ClaudeService(dotenv)

    route("/admin") {

        post("/moderar/{novenaId}") {
            val novenaId = call.parameters["novenaId"]?.toIntOrNull()
                ?: return@post call.respond(HttpStatusCode.BadRequest, MessageResponse("ID inválido"))

            val novenaData = transaction {
                val row = NovenasTable.selectAll()
                    .where { NovenasTable.id eq novenaId }
                    .firstOrNull() ?: return@transaction null

                val dias = NovenaDiasTable.selectAll()
                    .where { NovenaDiasTable.novenaId eq novenaId }
                    .orderBy(NovenaDiasTable.dia)
                    .map { d -> "Día ${d[NovenaDiasTable.dia]}: ${d[NovenaDiasTable.oracion]}" }
                    .joinToString("\n\n")

                """
                Novena: ${row[NovenasTable.nombre]}
                Santo: ${row[NovenasTable.santo]}
                Descripción: ${row[NovenasTable.descripcion] ?: "N/A"}

                Oraciones:
                $dias
                """.trimIndent()
            } ?: return@post call.respond(HttpStatusCode.NotFound, MessageResponse("Novena no encontrada"))

            val systemPrompt = """
                Sos un moderador de contenido católico. Revisá la novena y determiná si es apropiada.
                Criterios: doctrina correcta, 9 oraciones completas, lenguaje respetuoso.
                Respondé ÚNICAMENTE con JSON: {"aprobada": true/false, "observaciones": "..."}
            """.trimIndent()

            val response = claude.chat(
                systemPrompt,
                listOf(ChatMessage("user", "Revisá esta novena:\n\n$novenaData"))
            )

            val result = try {
                val jsonStr = response.trim().let {
                    val start = it.indexOf('{')
                    val end = it.lastIndexOf('}')
                    if (start >= 0 && end > start) it.substring(start, end + 1) else it
                }
                val json = Json.parseToJsonElement(jsonStr).jsonObject
                val aprobada = json["aprobada"]?.jsonPrimitive?.boolean ?: false
                val observaciones = json["observaciones"]?.jsonPrimitive?.content ?: "Sin observaciones"

                transaction {
                    NovenasTable.update({ NovenasTable.id eq novenaId }) {
                        it[estado] = if (aprobada) "aprobada" else "rechazada"
                    }
                }

                ModerationResult(aprobada, observaciones)
            } catch (e: Exception) {
                ModerationResult(false, "Error al procesar: ${e.message}")
            }

            call.respond(result)
        }

        get("/pendientes") {
            val pendientes = transaction {
                NovenasTable.selectAll()
                    .where { NovenasTable.estado eq "pendiente" }
                    .map { row ->
                        NovenaPendiente(
                            id = row[NovenasTable.id],
                            nombre = row[NovenasTable.nombre],
                            santo = row[NovenasTable.santo],
                            autor = row[NovenasTable.autor]
                        )
                    }
            }
            call.respond(pendientes)
        }
    }
}
