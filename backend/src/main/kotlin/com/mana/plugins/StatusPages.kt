package com.mana.plugins

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.plugins.statuspages.*
import io.ktor.server.response.*
import kotlinx.serialization.Serializable

@Serializable
data class ErrorResponse(val error: String, val message: String)

fun Application.configureStatusPages() {
    install(StatusPages) {
        exception<IllegalArgumentException> { call, cause ->
            call.respond(
                HttpStatusCode.BadRequest,
                ErrorResponse("bad_request", cause.message ?: "Solicitud inválida")
            )
        }
        exception<Throwable> { call, cause ->
            call.application.log.error("Unhandled exception", cause)
            call.respond(
                HttpStatusCode.InternalServerError,
                ErrorResponse("server_error", "Ocurrió un error. Por favor intentá de nuevo.")
            )
        }
        status(HttpStatusCode.NotFound) { call, _ ->
            call.respond(HttpStatusCode.NotFound, ErrorResponse("not_found", "Recurso no encontrado"))
        }
        status(HttpStatusCode.TooManyRequests) { call, _ ->
            call.respond(
                HttpStatusCode.TooManyRequests,
                ErrorResponse("rate_limit", "Demasiadas solicitudes. Esperá un momento.")
            )
        }
    }
}
