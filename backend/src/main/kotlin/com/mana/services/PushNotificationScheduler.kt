package com.mana.services

import com.mana.db.NovenaDiasTable
import com.mana.db.NovenasActivasTable
import com.mana.db.PushSubscriptionsTable
import io.github.cdimascio.dotenv.Dotenv
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.transactions.transaction
import org.slf4j.LoggerFactory
import java.time.Instant
import java.time.LocalTime
import java.time.ZoneId
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

@Serializable
private data class PushPayload(
    val title: String,
    val body: String,
    val icon: String = "/icons/icon-192.png",
    val url: String = "/novenas"
)

object PushNotificationScheduler {
    private val logger = LoggerFactory.getLogger(PushNotificationScheduler::class.java)
    private val executor = Executors.newSingleThreadScheduledExecutor()

    fun start(dotenv: Dotenv) {
        val pushService = WebPushService(dotenv)

        executor.scheduleAtFixedRate({
            try {
                processNovenasActivas(pushService)
            } catch (e: Exception) {
                logger.error("Error en cron de novenas", e)
            }
        }, 0, 60, TimeUnit.MINUTES)

        logger.info("Scheduler de novenas iniciado")
    }

    private fun processNovenasActivas(pushService: WebPushService) {
        val horaActual = LocalTime.now(ZoneId.of("America/Argentina/Buenos_Aires"))
            .let { "%02d:%02d".format(it.hour, it.minute) }

        logger.info("Procesando novenas activas a las $horaActual")

        transaction {
            val activas = NovenasActivasTable
                .join(PushSubscriptionsTable, JoinType.INNER,
                    onColumn = NovenasActivasTable.subscriptionEndpoint,
                    otherColumn = PushSubscriptionsTable.endpoint)
                .selectAll()
                .where {
                    (NovenasActivasTable.horaNotificacion eq horaActual) and
                    (NovenasActivasTable.diaActual lessEq 9)
                }
                .toList()

            activas.forEach { row ->
                val activaId = row[NovenasActivasTable.id]
                val novenaId = row[NovenasActivasTable.novenaId]
                val diaActual = row[NovenasActivasTable.diaActual]
                val endpoint = row[PushSubscriptionsTable.endpoint]
                val p256dh = row[PushSubscriptionsTable.p256dh]
                val auth = row[PushSubscriptionsTable.auth]

                val diaRow = NovenaDiasTable.selectAll()
                    .where {
                        (NovenaDiasTable.novenaId eq novenaId) and
                        (NovenaDiasTable.dia eq diaActual)
                    }
                    .firstOrNull() ?: return@forEach

                val titulo = diaRow[NovenaDiasTable.titulo] ?: "Novena — Día $diaActual"
                val payload = Json.encodeToString(
                    PushPayload(
                        title = "🕯️ $titulo",
                        body = "Tu oración del día te espera. Que este momento te acerque a Dios.",
                        url = "/novenas/$novenaId/dia/$diaActual"
                    )
                )

                val enviado = pushService.sendPush(endpoint, p256dh, auth, payload)

                if (enviado) {
                    val siguienteDia = if (diaActual < 9) diaActual + 1 else 10
                    NovenasActivasTable.update({ NovenasActivasTable.id eq activaId }) {
                        it[NovenasActivasTable.diaActual] = siguienteDia
                        it[ultimoRecordatorio] = Instant.now()
                    }
                    logger.info("Push enviado: novena $novenaId, día $diaActual → $endpoint")
                } else {
                    logger.warn("Falló push para endpoint: $endpoint")
                }
            }
        }
    }

    fun stop() {
        executor.shutdown()
    }
}
