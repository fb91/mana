package com.mana

import com.mana.db.DatabaseFactory
import com.mana.plugins.*
import com.mana.services.BibleService
import com.mana.services.PushNotificationScheduler
import io.github.cdimascio.dotenv.dotenv
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*

fun main() {
    val dotenv = dotenv {
        ignoreIfMissing = true
    }

    val port = dotenv["PORT", "8080"].toInt()

    embeddedServer(Netty, port = port, host = "0.0.0.0", module = Application::module)
        .start(wait = true)
}

fun Application.module() {
    val dotenv = dotenv {
        ignoreIfMissing = true
    }

    DatabaseFactory.init()
    BibleService.load("data/bible_es.json")
    configureSerialization()
    configureCORS()
    configureStatusPages()
    configureCallLogging()
    configureRateLimit()
    configureRouting(dotenv)

    PushNotificationScheduler.start(dotenv)
}
