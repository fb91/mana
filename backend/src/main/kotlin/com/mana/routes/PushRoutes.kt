package com.mana.routes

import com.mana.db.NovenasActivasTable
import com.mana.db.PushSubscriptionsTable
import com.mana.models.*
import io.github.cdimascio.dotenv.Dotenv
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.transactions.transaction

fun Route.pushRoutes(dotenv: Dotenv) {

    post("/push/subscribe") {
        val req = call.receive<PushSubscriptionRequest>()

        transaction {
            val existing = PushSubscriptionsTable.selectAll()
                .where { PushSubscriptionsTable.endpoint eq req.endpoint }
                .firstOrNull()

            if (existing == null) {
                PushSubscriptionsTable.insert {
                    it[endpoint] = req.endpoint
                    it[p256dh] = req.p256dh
                    it[auth] = req.auth
                }
            } else {
                PushSubscriptionsTable.update({ PushSubscriptionsTable.endpoint eq req.endpoint }) {
                    it[p256dh] = req.p256dh
                    it[auth] = req.auth
                }
            }
        }

        call.respond(HttpStatusCode.Created, MessageResponse("Suscripción guardada"))
    }

    post("/push/novena-activa") {
        val req = call.receive<NovenaActivaRequest>()

        val newId = transaction {
            NovenasActivasTable.insert {
                it[subscriptionEndpoint] = req.subscriptionEndpoint
                it[novenaId] = req.novenaId
                it[horaNotificacion] = req.horaNotificacion
                it[diaActual] = 1
            }[NovenasActivasTable.id]
        }

        call.respond(HttpStatusCode.Created, IdResponse(newId, "Novena iniciada con recordatorios diarios"))
    }

    delete("/push/novena-activa/{id}") {
        val localId = call.parameters["id"]?.toIntOrNull()
            ?: return@delete call.respond(HttpStatusCode.BadRequest, MessageResponse("ID inválido"))

        transaction {
            NovenasActivasTable.deleteWhere { NovenasActivasTable.id eq localId }
        }

        call.respond(MessageResponse("Novena cancelada"))
    }

    get("/push/novenas-activas/{endpoint}") {
        val endpoint = call.parameters["endpoint"]
            ?: return@get call.respond(HttpStatusCode.BadRequest, MessageResponse("Endpoint requerido"))

        val activas = transaction {
            NovenasActivasTable.selectAll()
                .where {
                    (NovenasActivasTable.subscriptionEndpoint eq endpoint) and
                    (NovenasActivasTable.diaActual lessEq 9)
                }
                .map { row ->
                    NovenaActiva(
                        id = row[NovenasActivasTable.id],
                        novenaId = row[NovenasActivasTable.novenaId],
                        diaActual = row[NovenasActivasTable.diaActual],
                        horaNotificacion = row[NovenasActivasTable.horaNotificacion]
                    )
                }
        }

        call.respond(activas)
    }
}
