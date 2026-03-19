package com.mana.db

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.CurrentTimestamp
import org.jetbrains.exposed.sql.javatime.timestamp

object NovenasTable : Table("novenas") {
    val id = integer("id").autoIncrement()
    val nombre = text("nombre")
    val santo = text("santo")
    val descripcion = text("descripcion").nullable()
    val intencionSugerida = text("intencion_sugerida").nullable()
    val autor = text("autor").default("comunidad")
    val estado = text("estado").default("pendiente")
    val creadoAt = timestamp("creado_at").defaultExpression(CurrentTimestamp)
    override val primaryKey = PrimaryKey(id)
}

object NovenaDiasTable : Table("novena_dias") {
    val id = integer("id").autoIncrement()
    val novenaId = integer("novena_id")
    val dia = integer("dia")
    val titulo = text("titulo").nullable()
    val oracion = text("oracion")
    val reflexion = text("reflexion").nullable()
    override val primaryKey = PrimaryKey(id)
}

object PushSubscriptionsTable : Table("push_subscriptions") {
    val id = integer("id").autoIncrement()
    val endpoint = text("endpoint").uniqueIndex()
    val p256dh = text("p256dh")
    val auth = text("auth")
    val creadoAt = timestamp("creado_at").defaultExpression(CurrentTimestamp)
    override val primaryKey = PrimaryKey(id)
}

object NovenasActivasTable : Table("novenas_activas") {
    val id = integer("id").autoIncrement()
    val subscriptionEndpoint = text("subscription_endpoint")
    val novenaId = integer("novena_id")
    val diaActual = integer("dia_actual").default(1)
    val horaNotificacion = text("hora_notificacion").default("08:00")
    val iniciadoAt = timestamp("iniciado_at").defaultExpression(CurrentTimestamp)
    val ultimoRecordatorio = timestamp("ultimo_recordatorio").nullable()
    override val primaryKey = PrimaryKey(id)
}
