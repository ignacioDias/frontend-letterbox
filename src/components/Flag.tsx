import { countryName } from '../lib/format'

interface FlagProps {
  country?: string
  className?: string
}

export function Flag({ country, className }: FlagProps) {
  if (!country || !/^[A-Za-z]{2}$/.test(country.trim())) return null

  const code = country.trim().toUpperCase()
  const emoji = String.fromCodePoint(...Array.from(code, (letter) => 127397 + letter.charCodeAt(0)))
  const label = countryName(code)

  return (
    <span
      className={className ? `flag ${className}` : 'flag'}
      role="img"
      aria-label={label}
      title={label}
    >
      {emoji}
    </span>
  )
}
