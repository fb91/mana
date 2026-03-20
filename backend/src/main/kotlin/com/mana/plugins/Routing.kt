package com.mana.plugins

import com.mana.models.MessageResponse
import com.mana.routes.*
import io.github.cdimascio.dotenv.Dotenv
import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

fun Application.configureRouting(dotenv: Dotenv) {
    routing {
        route("/api") {
            aiRoutes(dotenv)
            bibleRoutes()
            examenRoutes()
            novenasRoutes()
            pushRoutes(dotenv)
            adminRoutes(dotenv)
            reportRoutes(dotenv)
        }

        // Health check
        get("/health") {
            call.respond(MessageResponse("Maná OK"))
        }
    }
}
