package com.mana.routes

import io.github.cdimascio.dotenv.Dotenv
import io.ktor.client.*
import io.ktor.client.engine.cio.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

@Serializable
data class BugReportRequest(
    val page: String,
    val description: String
)

fun Route.reportRoutes(dotenv: Dotenv) {

    val client = HttpClient(CIO) {
        install(ContentNegotiation) {
            json(Json { ignoreUnknownKeys = true })
        }
    }

    post("/report-bug") {
        val body = call.receive<BugReportRequest>()

        val page = body.page.trim().take(200)
        val description = body.description.trim().take(1000)

        if (description.isBlank()) {
            call.respond(HttpStatusCode.BadRequest, mapOf("error" to "La descripción es requerida."))
            return@post
        }

        val resendKey = runCatching { dotenv["RESEND_API_KEY"] }.getOrNull()
        if (resendKey.isNullOrBlank()) {
            // No email provider configured — log and accept gracefully
            application.log.warn("BugReport recibido (sin RESEND_API_KEY): [$page] $description")
            call.respond(HttpStatusCode.OK, mapOf("ok" to true))
            return@post
        }

        val emailJson = """
            {
              "from": "Maná App <onboarding@resend.dev>",
              "to": ["fabriciob91@gmail.com"],
              "subject": "🐛 Reporte de error — $page",
              "text": "Página: $page\n\nDescripción:\n$description"
            }
        """.trimIndent()

        val response: HttpResponse = client.post("https://api.resend.com/emails") {
            header("Authorization", "Bearer $resendKey")
            contentType(ContentType.Application.Json)
            setBody(emailJson)
        }

        if (response.status.isSuccess()) {
            call.respond(HttpStatusCode.OK, mapOf("ok" to true))
        } else {
            application.log.error("Resend error ${response.status}: ${response.bodyAsText()}")
            call.respond(HttpStatusCode.InternalServerError, mapOf("error" to "No se pudo enviar el reporte."))
        }
    }
}
