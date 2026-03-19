// ── Liturgical Calendar Engine ────────────────────────────────────────────────
// Implements: EasterCalculator → LiturgicalCalendarService → LectionaryContext
// Works fully offline. Deterministic for any year.

export type Season = 'ADVENT' | 'CHRISTMAS' | 'LENT' | 'EASTER' | 'ORDINARY'
export type YearCycle = 'I' | 'II'
export type SundayCycle = 'A' | 'B' | 'C'
export type Rank = 'SOLEMNITY' | 'FEAST' | 'MEMORIAL' | 'OPT_MEMORIAL' | 'FERIA'
export type DayOfWeek =
  | 'SUNDAY'
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'

export interface LiturgicalContext {
  date: Date
  season: Season
  week: number
  dayOfWeek: DayOfWeek
  yearCycle: YearCycle
  sundayCycle: SundayCycle
  rank: Rank
  celebrationKey: string | null  // 'MM-DD' format for sanctoral lookup
  specialKey: string | null       // Special day key: ASH_WEDNESDAY, PALM_SUNDAY, etc.
  isHolyWeek: boolean
}

const DAYS: DayOfWeek[] = [
  'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY',
]

// ── Date helpers ──────────────────────────────────────────────────────────────

export function daysBetween(a: Date, b: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000
  const aMs = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  const bMs = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((bMs - aMs) / msPerDay)
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function isOnOrAfter(a: Date, b: Date): boolean {
  return daysBetween(b, a) >= 0
}

function isBefore(a: Date, b: Date): boolean {
  return daysBetween(a, b) > 0
}

// ── Easter calculation (Meeus/Jones/Butcher algorithm) ────────────────────────

export function calculateEaster(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1  // 0-indexed
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month, day)
}

// ── Cycle calculators ─────────────────────────────────────────────────────────

function getYearCycle(liturgicalYear: number): YearCycle {
  return liturgicalYear % 2 === 0 ? 'II' : 'I'
}

function getSundayCycle(liturgicalYear: number): SundayCycle {
  const r = liturgicalYear % 3
  if (r === 1) return 'A'
  if (r === 2) return 'B'
  return 'C'
}

// ── Advent helpers ────────────────────────────────────────────────────────────

// First Sunday of Advent = Sunday on or before Dec 3
function getFirstSundayOfAdvent(year: number): Date {
  const dec3 = new Date(year, 11, 3)
  const dow = dec3.getDay()
  return addDays(dec3, -dow)  // go back to the Sunday
}

// ── Baptism of the Lord helper ────────────────────────────────────────────────

// Epiphany = Jan 6 (fixed, as used in Argentina and most of Latin America)
// Baptism of the Lord = Sunday after Epiphany
// If Epiphany falls on Sunday, Baptism is the following Sunday
function getBaptismOfTheLord(year: number): Date {
  const jan6 = new Date(year, 0, 6)
  const dow = jan6.getDay()
  const daysToNextSunday = dow === 0 ? 7 : 7 - dow
  return new Date(year, 0, 6 + daysToNextSunday)
}

// ── Main context calculator ───────────────────────────────────────────────────

export function getLiturgicalContext(date: Date): LiturgicalContext {
  const year = date.getFullYear()
  const month = date.getMonth()   // 0-indexed
  const day = date.getDate()
  const dow = date.getDay()

  const dayOfWeek: DayOfWeek = DAYS[dow]
  const celebrationKey =
    `${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  // Liturgical year: Advent starts in November/December of year N for year N+1
  const liturgicalYear = month >= 10 ? year + 1 : year
  const yearCycle = getYearCycle(liturgicalYear)
  const sundayCycle = getSundayCycle(liturgicalYear)

  // Key dates for current calendar year
  const easter = calculateEaster(year)
  const ashWednesday = addDays(easter, -46)
  const palmSunday = addDays(easter, -7)
  const pentecost = addDays(easter, 49)
  const firstSundayOfLent = addDays(ashWednesday, 4) // Ash Wed is always Wed → +4 = Sun

  // ── Lent / Holy Week / Triduum ───────────────────────────────────────────

  if (isOnOrAfter(date, ashWednesday) && isBefore(date, easter)) {
    if (isSameDay(date, ashWednesday)) {
      return mkCtx(date, 'LENT', 0, dayOfWeek, yearCycle, sundayCycle,
        celebrationKey, 'ASH_WEDNESDAY', false)
    }

    if (isBefore(date, firstSundayOfLent)) {
      // Thu/Fri/Sat between Ash Wed and first Sunday of Lent
      const specialKey = `AFTER_ASH_WED_${dayOfWeek}`
      return mkCtx(date, 'LENT', 0, dayOfWeek, yearCycle, sundayCycle,
        celebrationKey, specialKey, false)
    }

    if (isOnOrAfter(date, palmSunday)) {
      // Holy Week
      const holyKeys: Record<number, string> = {
        0: 'PALM_SUNDAY',
        1: 'HOLY_MONDAY',
        2: 'HOLY_TUESDAY',
        3: 'HOLY_WEDNESDAY',
        4: 'HOLY_THURSDAY',
        5: 'GOOD_FRIDAY',
        6: 'HOLY_SATURDAY',
      }
      return mkCtx(date, 'LENT', 6, dayOfWeek, yearCycle, sundayCycle,
        celebrationKey, holyKeys[dow] ?? null, true)
    }

    // Regular Lent weeks 1-5
    const daysSinceFirstSunday = daysBetween(firstSundayOfLent, date)
    const week = Math.floor(daysSinceFirstSunday / 7) + 1
    return mkCtx(date, 'LENT', week, dayOfWeek, yearCycle, sundayCycle,
      celebrationKey, null, false)
  }

  // ── Easter Season ────────────────────────────────────────────────────────

  if (isOnOrAfter(date, easter) && isOnOrAfter(pentecost, date)) {
    const daysSinceEaster = daysBetween(easter, date)

    if (daysSinceEaster === 0) {
      return mkCtx(date, 'EASTER', 1, 'SUNDAY', yearCycle, sundayCycle,
        celebrationKey, 'EASTER_SUNDAY', false)
    }

    // Octave days (Mon-Sat of Easter week)
    const octaveKeys: Record<number, string> = {
      1: 'EASTER_MON', 2: 'EASTER_TUE', 3: 'EASTER_WED',
      4: 'EASTER_THU', 5: 'EASTER_FRI', 6: 'EASTER_SAT',
    }
    const specialKey = daysSinceEaster <= 6 ? octaveKeys[daysSinceEaster] ?? null : null
    const week = Math.floor(daysSinceEaster / 7) + 1
    return mkCtx(date, 'EASTER', week, dayOfWeek, yearCycle, sundayCycle,
      celebrationKey, specialKey, false)
  }

  // ── Advent ───────────────────────────────────────────────────────────────

  const firstAdvent = getFirstSundayOfAdvent(liturgicalYear - 1)
  // Advent goes from its first Sunday to Dec 24 (inclusive)
  if (isOnOrAfter(date, firstAdvent) && (month === 10 || (month === 11 && day <= 24))) {
    // Dec 17-24: O Antiphon days with special readings
    const specialKey = (month === 11 && day >= 17 && day <= 24)
      ? `DEC_${day}`
      : null
    const daysSinceAdvent = daysBetween(firstAdvent, date)
    const week = Math.min(Math.floor(daysSinceAdvent / 7) + 1, 4)
    return mkCtx(date, 'ADVENT', week, dayOfWeek, yearCycle, sundayCycle,
      celebrationKey, specialKey, false)
  }

  // ── Christmas ────────────────────────────────────────────────────────────

  if ((month === 11 && day >= 25) || (month === 0 && day <= 13)) {
    const specialKey = month === 11 ? `DEC_${day}` : `JAN_${day}`
    return mkCtx(date, 'CHRISTMAS', 1, dayOfWeek, yearCycle, sundayCycle,
      celebrationKey, specialKey, false)
  }

  // ── Ordinary Time ────────────────────────────────────────────────────────

  // Determine the year's Baptism of the Lord
  const baptismYear = month === 0 ? year : year
  const baptismOfTheLord = getBaptismOfTheLord(baptismYear)

  if (isOnOrAfter(date, baptismOfTheLord) && isBefore(date, ashWednesday)) {
    // First period of ordinary time
    const daysSinceBaptism = daysBetween(baptismOfTheLord, date)
    const week = Math.floor(daysSinceBaptism / 7) + 1
    return mkCtx(date, 'ORDINARY', week, dayOfWeek, yearCycle, sundayCycle,
      celebrationKey, null, false)
  }

  if (isOnOrAfter(date, addDays(pentecost, 1))) {
    // Second period of ordinary time (after Pentecost Monday)
    // Continue numbering from where first period left off
    const daysBaptismToAsh = daysBetween(baptismOfTheLord, ashWednesday)
    const weeksInFirstPeriod = Math.floor(daysBaptismToAsh / 7) + 1
    const pentecostMon = addDays(pentecost, 1)
    const daysSincePentecost = daysBetween(pentecostMon, date)
    const week = Math.min(weeksInFirstPeriod + Math.floor(daysSincePentecost / 7) + 1, 34)
    return mkCtx(date, 'ORDINARY', week, dayOfWeek, yearCycle, sundayCycle,
      celebrationKey, null, false)
  }

  // Fallback (shouldn't happen for valid dates)
  return mkCtx(date, 'ORDINARY', 1, dayOfWeek, yearCycle, sundayCycle,
    celebrationKey, null, false)
}

function mkCtx(
  date: Date,
  season: Season,
  week: number,
  dayOfWeek: DayOfWeek,
  yearCycle: YearCycle,
  sundayCycle: SundayCycle,
  celebrationKey: string | null,
  specialKey: string | null,
  isHolyWeek: boolean,
): LiturgicalContext {
  return { date, season, week, dayOfWeek, yearCycle, sundayCycle, rank: 'FERIA', celebrationKey, specialKey, isHolyWeek }
}

// ── Human-readable labels ─────────────────────────────────────────────────────

const WEEK_ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
  'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV', 'XXVI', 'XXVII', 'XXVIII', 'XXIX', 'XXX',
  'XXXI', 'XXXII', 'XXXIII', 'XXXIV']

const DAY_ES: Record<DayOfWeek, string> = {
  SUNDAY: 'Domingo',
  MONDAY: 'Lunes',
  TUESDAY: 'Martes',
  WEDNESDAY: 'Miércoles',
  THURSDAY: 'Jueves',
  FRIDAY: 'Viernes',
  SATURDAY: 'Sábado',
}

const SEASON_ES: Record<Season, string> = {
  LENT: 'Cuaresma',
  EASTER: 'Pascua',
  ADVENT: 'Adviento',
  CHRISTMAS: 'Navidad',
  ORDINARY: 'Tiempo Ordinario',
}

export function buildLiturgicalLabel(ctx: LiturgicalContext): string {
  const { season, week, dayOfWeek, specialKey } = ctx
  const roman = WEEK_ROMAN[week - 1] ?? week.toString()
  const seasonName = SEASON_ES[season]
  const dayName = DAY_ES[dayOfWeek]

  if (specialKey === 'ASH_WEDNESDAY') return 'Miércoles de Ceniza'
  if (specialKey === 'PALM_SUNDAY') return 'Domingo de Ramos'
  if (specialKey === 'HOLY_MONDAY') return 'Lunes Santo'
  if (specialKey === 'HOLY_TUESDAY') return 'Martes Santo'
  if (specialKey === 'HOLY_WEDNESDAY') return 'Miércoles Santo'
  if (specialKey === 'HOLY_THURSDAY') return 'Jueves Santo'
  if (specialKey === 'GOOD_FRIDAY') return 'Viernes Santo'
  if (specialKey === 'HOLY_SATURDAY') return 'Sábado Santo'
  if (specialKey === 'EASTER_SUNDAY') return 'Domingo de Pascua de Resurrección'
  if (specialKey?.startsWith('EASTER_')) return `${dayName} de la Octava de Pascua`
  if (season === 'CHRISTMAS') return 'Tiempo de Navidad'

  if (dayOfWeek === 'SUNDAY') {
    return `${roman} Domingo de ${seasonName}`
  }
  if (week === 0) {
    return `${dayName} después del Miércoles de Ceniza`
  }
  return `${dayName} de la ${roman} Semana de ${seasonName}`
}

// Color associated with the liturgical day
export function getLiturgicalColor(ctx: LiturgicalContext, rank?: Rank): string {
  if (rank === 'SOLEMNITY' || rank === 'FEAST') {
    // Most feasts are white; martyrs are red
    return 'white'
  }
  if (ctx.specialKey === 'GOOD_FRIDAY' || ctx.specialKey === 'PALM_SUNDAY') return 'red'
  if (ctx.season === 'LENT' || ctx.season === 'ADVENT') return 'violet'
  if (ctx.season === 'EASTER' || ctx.season === 'CHRISTMAS') return 'white'
  return 'green'
}
