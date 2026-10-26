import { useEffect, useState } from 'react'
import { initials } from '../lib/format'
import { cx } from '../lib/format'

interface AvatarProps {
  username?: string
  src?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function Avatar({ username = '?', src = '', size = 'md', className }: AvatarProps) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [src])

  return (
    <span className={cx('avatar', `avatar--${size}`, className)} aria-hidden="true">
      {src && !failed ? (
        <img src={src} alt="" onError={() => setFailed(true)} />
      ) : (
        <span>{initials(username) || '?'}</span>
      )}
    </span>
  )
}
