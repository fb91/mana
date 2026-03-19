package com.mana.services

import com.mana.models.BookInfo
import com.mana.models.ChapterData
import com.mana.models.VerseData
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.io.File

object BibleService {

    // Order follows the Vatican's canonical index: vatican.va/archive/ESL0506/_INDEX.HTM
    private val bookMeta: LinkedHashMap<String, Pair<String, String>> = linkedMapOf(
        // ── Pentateuco ──────────────────────────────────────────
        "Gn"   to Pair("Génesis",                "AT"),
        "Ex"   to Pair("Éxodo",                  "AT"),
        "Lv"   to Pair("Levítico",               "AT"),
        "Nm"   to Pair("Números",                "AT"),
        "Dt"   to Pair("Deuteronomio",           "AT"),
        // ── Libros históricos ───────────────────────────────────
        "Jos"  to Pair("Josué",                  "AT"),
        "Jue"  to Pair("Jueces",                 "AT"),
        "1Sam" to Pair("1 Samuel",               "AT"),
        "2Sam" to Pair("2 Samuel",               "AT"),
        "1Re"  to Pair("1 Reyes",                "AT"),
        "2Re"  to Pair("2 Reyes",                "AT"),
        // ── Profetas mayores ────────────────────────────────────
        "Is"   to Pair("Isaías",                 "AT"),
        "Jr"   to Pair("Jeremías",               "AT"),
        "Ez"   to Pair("Ezequiel",               "AT"),
        // ── Profetas menores ────────────────────────────────────
        "Os"   to Pair("Oseas",                  "AT"),
        "Jl"   to Pair("Joel",                   "AT"),
        "Am"   to Pair("Amós",                   "AT"),
        "Abd"  to Pair("Abdías",                 "AT"),
        "Jon"  to Pair("Jonás",                  "AT"),
        "Miq"  to Pair("Miqueas",                "AT"),
        "Nah"  to Pair("Nahúm",                  "AT"),
        "Hab"  to Pair("Habacuc",                "AT"),
        "Sof"  to Pair("Sofonías",               "AT"),
        "Ag"   to Pair("Ageo",                   "AT"),
        "Zac"  to Pair("Zacarías",               "AT"),
        "Mal"  to Pair("Malaquías",              "AT"),
        // ── Libros poéticos y sapienciales ──────────────────────
        "Sal"  to Pair("Salmos",                 "AT"),
        "Job"  to Pair("Job",                    "AT"),
        "Prov" to Pair("Proverbios",             "AT"),
        "Rt"   to Pair("Rut",                    "AT"),
        "Cant" to Pair("Cantar de los Cantares", "AT"),
        "Ecl"  to Pair("Eclesiastés",            "AT"),
        "Lam"  to Pair("Lamentaciones",          "AT"),
        "Est"  to Pair("Ester",                  "AT"),
        "Dn"   to Pair("Daniel",                 "AT"),
        "1Cro" to Pair("1 Crónicas",             "AT"),
        "2Cro" to Pair("2 Crónicas",             "AT"),
        "Esd"  to Pair("Esdras",                 "AT"),
        "Neh"  to Pair("Nehemías",               "AT"),
        // ── Deuterocanónicos ────────────────────────────────────
        "Jdt"  to Pair("Judit",                  "AT"),
        "Tb"   to Pair("Tobías",                 "AT"),
        "1Mac" to Pair("1 Macabeos",             "AT"),
        "2Mac" to Pair("2 Macabeos",             "AT"),
        "Sab"  to Pair("Sabiduría",              "AT"),
        "Sir"  to Pair("Eclesiástico",           "AT"),
        "Bar"  to Pair("Baruc",                  "AT"),
        // ── Evangelios ──────────────────────────────────────────
        "Mt"   to Pair("Mateo",                  "NT"),
        "Mc"   to Pair("Marcos",                 "NT"),
        "Lc"   to Pair("Lucas",                  "NT"),
        "Jn"   to Pair("Juan",                   "NT"),
        // ── Hechos y cartas paulinas ────────────────────────────
        "Hch"  to Pair("Hechos",                 "NT"),
        "Rom"  to Pair("Romanos",                "NT"),
        "1Cor" to Pair("1 Corintios",            "NT"),
        "2Cor" to Pair("2 Corintios",            "NT"),
        "Gal"  to Pair("Gálatas",                "NT"),
        "Ef"   to Pair("Efesios",                "NT"),
        "Flp"  to Pair("Filipenses",             "NT"),
        "Col"  to Pair("Colosenses",             "NT"),
        "1Tes" to Pair("1 Tesalonicenses",       "NT"),
        "2Tes" to Pair("2 Tesalonicenses",       "NT"),
        "1Tim" to Pair("1 Timoteo",              "NT"),
        "2Tim" to Pair("2 Timoteo",              "NT"),
        "Tit"  to Pair("Tito",                   "NT"),
        "Flm"  to Pair("Filemón",                "NT"),
        "Heb"  to Pair("Hebreos",                "NT"),
        // ── Cartas católicas ────────────────────────────────────
        "Sant" to Pair("Santiago",               "NT"),
        "1Pe"  to Pair("1 Pedro",                "NT"),
        "2Pe"  to Pair("2 Pedro",                "NT"),
        "1Jn"  to Pair("1 Juan",                 "NT"),
        "2Jn"  to Pair("2 Juan",                 "NT"),
        "3Jn"  to Pair("3 Juan",                 "NT"),
        "Jds"  to Pair("Judas",                  "NT"),
        // ── Apocalipsis ─────────────────────────────────────────
        "Ap"   to Pair("Apocalipsis",            "NT"),
    )

    private lateinit var data: Map<String, Map<String, Map<String, String>>>
    private val json = Json { ignoreUnknownKeys = true }

    fun load(path: String) {
        val raw = File(path).readText()
        val root = json.parseToJsonElement(raw).jsonObject
        data = root.mapValues { (_, chapObj) ->
            chapObj.jsonObject.mapValues { (_, verseObj) ->
                verseObj.jsonObject.mapValues { (_, textEl) ->
                    textEl.jsonPrimitive.content
                }
            }
        }
    }

    fun getBooks(): List<BookInfo> {
        return bookMeta.keys
            .filter { data.containsKey(it) }
            .map { abbr ->
                val (name, testament) = bookMeta[abbr]!!
                BookInfo(abbr, name, testament, data[abbr]!!.size)
            }
    }

    fun getChapter(book: String, chapter: Int): ChapterData? {
        val verses = data[book]?.get(chapter.toString()) ?: return null
        val (name, _) = bookMeta[book] ?: Pair(book, "AT")
        val verseList = verses.entries
            .sortedBy { it.key.toIntOrNull() ?: 0 }
            .map { (num, text) -> VerseData(num.toInt(), text) }
        return ChapterData(book, name, chapter, verseList)
    }

    fun getBookName(abbr: String): String = bookMeta[abbr]?.first ?: abbr
}
