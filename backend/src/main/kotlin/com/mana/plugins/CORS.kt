package com.mana.plugins

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.plugins.cors.routing.*

fun Application.configureCORS() {
    install(CORS) {
        allowMethod(HttpMethod.Options)
        allowMethod(HttpMethod.Get)
        allowMethod(HttpMethod.Post)
        allowMethod(HttpMethod.Put)
        allowMethod(HttpMethod.Delete)
        allowHeader(HttpHeaders.ContentType)
        allowHeader(HttpHeaders.Authorization)
        // Dev: localhost:5173, prod: tu dominio
        allowHost("localhost:5173")
        allowHost("localhost:4173")
        allowHost("localhost:8080")
        // Producción — ajustar a tu dominio
        allowHost("mana.app", schemes = listOf("https"))
        anyHost() // Quitar en producción
    }
}
