package com.mana.db

import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.transactions.transaction
import java.io.File

object DatabaseFactory {
    fun init() {
        val dataDir = File("data")
        if (!dataDir.exists()) dataDir.mkdirs()

        Database.connect(
            url = "jdbc:sqlite:data/mana.db",
            driver = "org.sqlite.JDBC"
        )

        transaction {
            SchemaUtils.createMissingTablesAndColumns(
                NovenasTable,
                NovenaDiasTable,
                PushSubscriptionsTable,
                NovenasActivasTable,
                RecomendacionesCacheTable
            )
        }
    }
}
