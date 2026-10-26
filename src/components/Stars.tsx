import { useState } from 'react'
import { cx } from '../lib/format'

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 2.6l2.92 5.92 6.53.95-4.72 4.6 1.11 6.5L12 17.5l-5.84 3.07 1.11-6.5-4.72-4.6 6.53-.95L12 2.6z" />
    </svg>
  )
}

export function Stars({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
  const clamped = Math.max(0, Math.min(10, score))
  const percentage = (clamped / 10) * 100

  return (
    <span className={cx('stars', `stars--${size}`)} aria-label={`${clamped.toFixed(1)} out of 10`}>
      <span className="stars__base">
        {Array.from({ length: 10 }, (_, index) => (
          <StarIcon key={index} />
        ))}
      </span>
      <span className="stars__fill" style={{ width: `${percentage}%` }} aria-hidden="true">
        {Array.from({ length: 10 }, (_, index) => (
          <StarIcon key={index} />
        ))}
      </span>
    </span>
  )
}

interface StarInputProps {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}

export function StarInput({ value, onChange, disabled }: StarInputProps) {
  const [preview, setPreview] = useState(0)
  const shown = preview || value

  return (
    <div className="star-input" role="group" aria-label="Choose a score from 1 to 10 stars">
      {Array.from({ length: 10 }, (_, index) => {
        const score = index + 1
        return (
          <button
            key={score}
            type="button"
            className={cx('star-input__button', score <= shown && 'is-filled')}
            aria-label={`${score} out of 10`}
            aria-pressed={value === score}
            disabled={disabled}
            onMouseEnter={() => setPreview(score)}
            onMouseLeave={() => setPreview(0)}
            onFocus={() => setPreview(score)}
            onBlur={() => setPreview(0)}
            onClick={() => onChange(value === score ? 0 : score)}
          >
            <StarIcon />
          </button>
        )
      })}
    </div>
  )
}
