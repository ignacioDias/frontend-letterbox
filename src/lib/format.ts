const relativeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
const dateFormatter = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' })

const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 1000 * 60 * 60 * 24 * 365],
  ['month', 1000 * 60 * 60 * 24 * 30],
  ['week', 1000 * 60 * 60 * 24 * 7],
  ['day', 1000 * 60 * 60 * 24],
  ['hour', 1000 * 60 * 60],
  ['minute', 1000 * 60],
]

export function relativeTime(value: string): string {
  const date = new Date(value)
  const delta = date.getTime() - Date.now()
  for (const [unit, milliseconds] of units) {
    if (Math.abs(delta) >= milliseconds) {
      return relativeFormatter.format(Math.round(delta / milliseconds), unit)
    }
  }
  return 'just now'
}

export function fullDate(value: string): string {
  return dateFormatter.format(new Date(value))
}

export function initials(name: string): string {
  return name
    .split(/[\s_]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function countryName(code: string): string {
  if (!code) return ''
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code.toUpperCase()) ?? code
  } catch {
    return code
  }
}

export function scoreLabel(score: number): string {
  if (score >= 9) return 'A modern classic'
  if (score >= 8) return 'Worth the ticket'
  if (score >= 6) return 'A mixed print'
  if (score >= 4) return 'Rough cut'
  return 'Leave early'
}

export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ')
}
