import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import { loadUser, peekUser } from '../lib/cache'
import type { PublicUser } from '../types'

export function useUsers(ids: number[]): Record<number, PublicUser> {
  const key = useMemo(() => Array.from(new Set(ids)).sort((a, b) => a - b).join(','), [ids])
  const [users, setUsers] = useState<Record<number, PublicUser>>(() => {
    const initial: Record<number, PublicUser> = {}
    for (const id of ids) {
      const user = peekUser(id)
      if (user) initial[id] = user
    }
    return initial
  })

  useEffect(() => {
    if (!key) return
    let active = true
    const missing = key
      .split(',')
      .map(Number)
      .filter((id) => !peekUser(id))
    if (missing.length === 0) {
      const found: Record<number, PublicUser> = {}
      for (const id of key.split(',').map(Number)) {
        const user = peekUser(id)
        if (user) found[id] = user
      }
      setUsers(found)
      return
    }
    void Promise.allSettled(missing.map((id) => loadUser(id, (userID) => api.getUserByID(userID)))).then(() => {
      if (!active) return
      const next: Record<number, PublicUser> = {}
      for (const id of key.split(',').map(Number)) {
        const user = peekUser(id)
        if (user) next[id] = user
      }
      setUsers(next)
    })
    return () => {
      active = false
    }
  }, [key])

  return users
}
