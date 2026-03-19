package com.mana.services

import com.mana.models.ChatMessage
import io.github.cdimascio.dotenv.Dotenv
import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.engine.cio.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.request.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

@Serializable
private data class ClaudeRequest(
    val model: String = "claude-haiku-4-5-20251001",
    val max_tokens: Int = 2048,
    val system: String,
    val messages: List<ClaudeMessage>
)

@Serializable
private data class ClaudeMessage(val role: String, val content: String)

@Serializable
private data class ClaudeResponse(val content: List<ClaudeContent>)

@Serializable
private data class ClaudeContent(val type: String, val text: String)

class ClaudeService(private val dotenv: Dotenv) {

    private val client = HttpClient(CIO) {
        install(ContentNegotiation) {
            json(Json { ignoreUnknownKeys = true; encodeDefaults = true })
        }
    }

    private val apiKey: String get() = dotenv["ANTHROPIC_API_KEY"]

    suspend fun chat(systemPrompt: String, messages: List<ChatMessage>): String {
        val claudeMessages = if (messages.isEmpty()) {
            listOf(ClaudeMessage("user", "Comenzá"))
        } else {
            messages.map { ClaudeMessage(it.role, it.content) }
        }

        val response = client.post("https://api.anthropic.com/v1/messages") {
            headers {
                append("x-api-key", apiKey)
                append("anthropic-version", "2023-06-01")
                contentType(ContentType.Application.Json)
            }
            setBody(
                ClaudeRequest(
                    system = systemPrompt,
                    messages = claudeMessages
                )
            )
        }

        if (!response.status.isSuccess()) {
            val body = response.body<String>()
            throw IllegalStateException("Error de Claude API: ${response.status} — $body")
        }

        val claudeResponse = response.body<ClaudeResponse>()
        return claudeResponse.content.firstOrNull { it.type == "text" }?.text
            ?: throw IllegalStateException("Respuesta vacía de Claude")
    }
}
