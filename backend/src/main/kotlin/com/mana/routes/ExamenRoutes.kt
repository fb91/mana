package com.mana.routes

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import java.io.File

fun Route.examenRoutes() {
    get("/examen/data") {
        val file = File("data/conscience_examination_guidance.json")
        if (!file.exists()) {
            call.respond(HttpStatusCode.NotFound, mapOf("error" to "Archivo no encontrado"))
            return@get
        }
        call.respondText(file.readText(), ContentType.Application.Json)
    }
}
