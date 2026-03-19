// ── Lectionary Resolver ───────────────────────────────────────────────────────
// Resolves a LiturgicalContext into reading references and celebration metadata.

import {
  LiturgicalContext,
  Season,
  SundayCycle,
  YearCycle,
  Rank,
  buildLiturgicalLabel,
} from './liturgicalCalendar'

import sanctoralData from '../data/lectionary/sanctoral.json'
import temporalData from '../data/lectionary/temporal.json'
import ordinaryData from '../data/lectionary/ordinary.json'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ReadingRefs {
  first: string
  psalm: string
  second?: string
  gospel: string
}

export interface ResolvedDay {
  label: string            // Human-readable liturgical day name
  celebrationName: string  // Specific celebration name (feast, Sunday, etc.)
  rank: Rank
  season: Season
  color: string            // liturgical color
  week: number
  sundayCycle: SundayCycle
  yearCycle: YearCycle
  readings: ReadingRefs | null
  hasData: boolean
}

// ── JSON type aliases (typed access) ─────────────────────────────────────────

type ReadingObj = { first: string; psalm: string; second?: string; gospel: string }
type CycleObj = { A?: ReadingObj; B?: ReadingObj; C?: ReadingObj }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const temporal = temporalData as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sanctoral = sanctoralData as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ordinary = ordinaryData as any

// ── Resolver ──────────────────────────────────────────────────────────────────

export function resolveDay(ctx: LiturgicalContext): ResolvedDay {
  const { season, week, dayOfWeek, yearCycle, sundayCycle, celebrationKey, specialKey } = ctx

  const label = buildLiturgicalLabel(ctx)
  let celebrationName = label
  let rank: Rank = 'FERIA'
  let color = getSeasonColor(season, specialKey)
  let readings: ReadingRefs | null = null

  // ── 1. Sanctoral override (SOLEMNITY or FEAST takes precedence) ─────────────

  if (celebrationKey) {
    const feast = sanctoral[celebrationKey]
    if (feast && (feast.rank === 'SOLEMNITY' || feast.rank === 'FEAST')) {
      celebrationName = feast.name
      rank = feast.rank as Rank
      color = feast.color ?? color
      readings = feast.readings ?? null
      return mkResult(ctx, celebrationName, rank, color, readings)
    }
    // Lower-rank sanctoral (MEMORIAL / OPT_MEMORIAL) defers to temporal in strong seasons
    if (feast && season === 'ORDINARY') {
      // Memorials in ordinary time can be used
      celebrationName = feast.name
      rank = feast.rank as Rank
      color = feast.color ?? color
      readings = feast.readings ?? null
      return mkResult(ctx, celebrationName, rank, color, readings)
    }
  }

  // ── 2. Special days (Ash Wed, Holy Week, Easter octave) ────────────────────

  if (specialKey) {
    // Ash Wednesday
    if (specialKey === 'ASH_WEDNESDAY') {
      readings = temporal.LENT?.ASH_WEDNESDAY ?? null
      celebrationName = 'Miércoles de Ceniza'
      rank = 'FERIA'
      return mkResult(ctx, celebrationName, rank, 'violet', readings)
    }

    // After Ash Wednesday (Thu/Fri/Sat)
    if (specialKey.startsWith('AFTER_ASH_WED_')) {
      readings = temporal.LENT?.[specialKey] ?? null
      celebrationName = label
      return mkResult(ctx, celebrationName, rank, 'violet', readings)
    }

    // Palm Sunday (Passion Sunday)
    if (specialKey === 'PALM_SUNDAY') {
      const palmData = temporal.LENT?.['6']?.PALM_SUNDAY
      readings = palmData?.[sundayCycle] ?? palmData?.A ?? null
      celebrationName = 'Domingo de Ramos de la Pasión del Señor'
      rank = 'FERIA'
      return mkResult(ctx, celebrationName, rank, 'red', readings)
    }

    // Holy Week Mon/Tue/Wed
    if (['HOLY_MONDAY', 'HOLY_TUESDAY', 'HOLY_WEDNESDAY'].includes(specialKey)) {
      readings = temporal.LENT?.['6']?.[specialKey] ?? null
      celebrationName = label
      return mkResult(ctx, celebrationName, rank, 'violet', readings)
    }

    // Holy Thursday
    if (specialKey === 'HOLY_THURSDAY') {
      readings = temporal.LENT?.['6']?.HOLY_THURSDAY ?? null
      celebrationName = 'Jueves Santo — Misa de la Cena del Señor'
      rank = 'SOLEMNITY'
      return mkResult(ctx, celebrationName, rank, 'white', readings)
    }

    // Good Friday
    if (specialKey === 'GOOD_FRIDAY') {
      readings = temporal.LENT?.['6']?.GOOD_FRIDAY ?? null
      celebrationName = 'Viernes Santo — Pasión del Señor'
      rank = 'SOLEMNITY'
      return mkResult(ctx, celebrationName, rank, 'red', readings)
    }

    // Holy Saturday (Vigil)
    if (specialKey === 'HOLY_SATURDAY') {
      readings = temporal.LENT?.['6']?.HOLY_SATURDAY ?? null
      celebrationName = 'Sábado Santo — Vigilia Pascual'
      rank = 'SOLEMNITY'
      return mkResult(ctx, celebrationName, rank, 'white', readings)
    }

    // Easter Sunday
    if (specialKey === 'EASTER_SUNDAY') {
      readings = temporal.EASTER?.EASTER_SUNDAY ?? null
      celebrationName = 'Domingo de Pascua de Resurrección'
      rank = 'SOLEMNITY'
      return mkResult(ctx, celebrationName, rank, 'white', readings)
    }

    // Easter Octave weekdays
    if (specialKey?.startsWith('EASTER_')) {
      readings = temporal.EASTER?.[specialKey] ?? null
      celebrationName = label
      rank = 'FERIA'
      return mkResult(ctx, celebrationName, rank, 'white', readings)
    }

    // O Antiphon days in Advent (Dec 17-23)
    if (specialKey?.startsWith('DEC_') && season === 'ADVENT') {
      readings = temporal.ADVENT?.['4']?.[specialKey] ?? null
      celebrationName = label
      return mkResult(ctx, celebrationName, rank, 'violet', readings)
    }

    // Christmas days
    if (specialKey?.startsWith('DEC_') && season === 'CHRISTMAS') {
      readings = temporal.CHRISTMAS?.[specialKey] ?? null
      return mkResult(ctx, celebrationName, rank, 'white', readings)
    }
    if (specialKey?.startsWith('JAN_') && season === 'CHRISTMAS') {
      readings = temporal.CHRISTMAS?.[specialKey] ?? null
      return mkResult(ctx, celebrationName, rank, 'white', readings)
    }
  }

  // ── 3. Temporal seasons (Lent & Easter regular days) ───────────────────────

  if (season === 'LENT' && week >= 1 && week <= 5) {
    const weekData = temporal.LENT?.[week.toString()]
    if (weekData) {
      if (dayOfWeek === 'SUNDAY') {
        const cycleData = weekData.SUNDAY as CycleObj
        readings = cycleData?.[sundayCycle] ?? cycleData?.A ?? null
      } else {
        readings = weekData[dayOfWeek] ?? null
      }
    }
    return mkResult(ctx, celebrationName, rank, 'violet', readings)
  }

  if (season === 'EASTER' && week >= 2 && week <= 7) {
    const weekData = temporal.EASTER?.[week.toString()]
    if (weekData) {
      if (dayOfWeek === 'SUNDAY') {
        const cycleData = weekData.SUNDAY as CycleObj
        readings = cycleData?.[sundayCycle] ?? cycleData?.A ?? null
      } else {
        readings = weekData[dayOfWeek] ?? null
      }
    }
    return mkResult(ctx, celebrationName, rank, 'white', readings)
  }

  if (season === 'ADVENT' && week >= 1 && week <= 4) {
    const weekData = temporal.ADVENT?.[week.toString()]
    if (weekData) {
      if (dayOfWeek === 'SUNDAY') {
        const cycleData = weekData.SUNDAY as CycleObj
        readings = cycleData?.[sundayCycle] ?? cycleData?.A ?? null
      } else {
        readings = weekData[dayOfWeek] ?? null
      }
    }
    return mkResult(ctx, celebrationName, rank, 'violet', readings)
  }

  // ── 4. Ordinary time ───────────────────────────────────────────────────────

  if (season === 'ORDINARY') {
    if (dayOfWeek === 'SUNDAY') {
      const weekData = ordinary.sunday?.[week.toString()]
      const cycleData = weekData as CycleObj
      readings = cycleData?.[sundayCycle] ?? null
      return mkResult(ctx, celebrationName, rank, 'green', readings)
    }
    // Weekday ordinary time: no data yet for v1 (future: load weekday ordinary JSON)
    return mkResult(ctx, celebrationName, rank, 'green', null)
  }

  return mkResult(ctx, celebrationName, rank, color, null)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mkResult(
  ctx: LiturgicalContext,
  celebrationName: string,
  rank: Rank,
  color: string,
  readings: ReadingRefs | null,
): ResolvedDay {
  return {
    label: buildLiturgicalLabel(ctx),
    celebrationName,
    rank,
    season: ctx.season,
    color,
    week: ctx.week,
    sundayCycle: ctx.sundayCycle,
    yearCycle: ctx.yearCycle,
    readings,
    hasData: readings !== null,
  }
}

function getSeasonColor(season: Season, specialKey?: string | null): string {
  if (specialKey === 'GOOD_FRIDAY' || specialKey === 'PALM_SUNDAY') return 'red'
  if (season === 'LENT' || season === 'ADVENT') return 'violet'
  if (season === 'EASTER' || season === 'CHRISTMAS') return 'white'
  return 'green'
}

// ── Color UI helpers ──────────────────────────────────────────────────────────

export const COLOR_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  violet: {
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    text: 'text-purple-800 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
    dot: 'bg-purple-500',
  },
  white: {
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    text: 'text-amber-800 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-700',
    dot: 'bg-amber-400',
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-950/30',
    text: 'text-red-800 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
    dot: 'bg-red-500',
  },
  green: {
    bg: 'bg-green-50 dark:bg-green-950/20',
    text: 'text-green-800 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
    dot: 'bg-green-500',
  },
  black: {
    bg: 'bg-stone-100 dark:bg-stone-900/40',
    text: 'text-stone-700 dark:text-stone-300',
    border: 'border-stone-300 dark:border-stone-700',
    dot: 'bg-stone-600',
  },
}

export const RANK_LABEL: Record<Rank, string> = {
  SOLEMNITY: 'Solemnidad',
  FEAST: 'Fiesta',
  MEMORIAL: 'Memorial',
  OPT_MEMORIAL: 'Memorial Opcional',
  FERIA: '',
}
