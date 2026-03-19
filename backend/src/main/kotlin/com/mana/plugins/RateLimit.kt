package com.mana.plugins

import io.ktor.server.application.*
import io.ktor.server.plugins.ratelimit.*
import io.ktor.server.request.*
import kotlin.time.Duration.Companion.hours

val RateLimitAI = RateLimitName("ai")

fun Application.configureRateLimit() {
    install(RateLimit) {
        register(RateLimitAI) {
            rateLimiter(limit = 20, refillPeriod = 1.hours)
            requestKey { call ->
                // Clave por IP
                call.request.headers["X-Forwarded-For"]?.split(",")?.first()?.trim()
                    ?: call.request.local.remoteHost
            }
        }
    }
}
