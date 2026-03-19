package com.mana.routes

import com.mana.db.NovenaDiasTable
import com.mana.db.NovenasTable
import com.mana.models.*
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.transactions.transaction

fun Route.novenasRoutes() {
    route("/novenas") {

        get {
            val novenas = transaction {
                NovenasTable.selectAll()
                    .where { NovenasTable.estado eq "aprobada" }
                    .map { row ->
                        Novena(
                            id = row[NovenasTable.id],
                            nombre = row[NovenasTable.nombre],
                            santo = row[NovenasTable.santo],
                            descripcion = row[NovenasTable.descripcion],
                            intencionSugerida = row[NovenasTable.intencionSugerida],
                            autor = row[NovenasTable.autor],
                            estado = row[NovenasTable.estado]
                        )
                    }
            }
            call.respond(novenas)
        }

        get("/{id}") {
            val id = call.parameters["id"]?.toIntOrNull()
                ?: return@get call.respond(HttpStatusCode.BadRequest, MessageResponse("ID inválido"))

            val novena = transaction {
                val row = NovenasTable.selectAll()
                    .where { NovenasTable.id eq id }
                    .firstOrNull() ?: return@transaction null

                val dias = NovenaDiasTable.selectAll()
                    .where { NovenaDiasTable.novenaId eq id }
                    .orderBy(NovenaDiasTable.dia)
                    .map { d ->
                        NovenaDia(
                            id = d[NovenaDiasTable.id],
                            novenaId = id,
                            dia = d[NovenaDiasTable.dia],
                            titulo = d[NovenaDiasTable.titulo],
                            oracion = d[NovenaDiasTable.oracion],
                            reflexion = d[NovenaDiasTable.reflexion]
                        )
                    }

                Novena(
                    id = row[NovenasTable.id],
                    nombre = row[NovenasTable.nombre],
                    santo = row[NovenasTable.santo],
                    descripcion = row[NovenasTable.descripcion],
                    intencionSugerida = row[NovenasTable.intencionSugerida],
                    autor = row[NovenasTable.autor],
                    estado = row[NovenasTable.estado],
                    dias = dias
                )
            }

            if (novena == null) {
                call.respond(HttpStatusCode.NotFound, MessageResponse("Novena no encontrada"))
            } else {
                call.respond(novena)
            }
        }

        post {
            val req = call.receive<NovenaCreateRequest>()

            if (req.nombre.isBlank() || req.santo.isBlank()) {
                return@post call.respond(HttpStatusCode.BadRequest, MessageResponse("El nombre y el santo son obligatorios"))
            }
            if (req.dias.size != 9) {
                return@post call.respond(HttpStatusCode.BadRequest, MessageResponse("Una novena debe tener exactamente 9 días"))
            }

            val novenaId = transaction {
                val newId = NovenasTable.insert {
                    it[nombre] = req.nombre
                    it[santo] = req.santo
                    it[descripcion] = req.descripcion
                    it[intencionSugerida] = req.intencionSugerida
                    it[autor] = req.autor
                    it[estado] = "pendiente"
                }[NovenasTable.id]

                req.dias.forEachIndexed { index, dia ->
                    NovenaDiasTable.insert {
                        it[NovenaDiasTable.novenaId] = newId
                        it[NovenaDiasTable.dia] = index + 1
                        it[titulo] = dia.titulo
                        it[oracion] = dia.oracion
                        it[reflexion] = dia.reflexion
                    }
                }

                newId
            }

            call.respond(HttpStatusCode.Created, IdResponse(novenaId, "Novena enviada. Está pendiente de revisión."))
        }
    }
}
