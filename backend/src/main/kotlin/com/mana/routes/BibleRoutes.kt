package com.mana.routes

import com.mana.services.BibleService
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

fun Route.bibleRoutes() {
    route("/bible") {

        get("/books") {
            call.respond(BibleService.getBooks())
        }

        get("/books/{book}/{chapter}") {
            val book = call.parameters["book"]
                ?: return@get call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Libro requerido"))
            val chapter = call.parameters["chapter"]?.toIntOrNull()
                ?: return@get call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Capítulo inválido"))
            val data = BibleService.getChapter(book, chapter)
                ?: return@get call.respond(HttpStatusCode.NotFound, mapOf("error" to "No encontrado"))
            call.respond(data)
        }
    }
}
