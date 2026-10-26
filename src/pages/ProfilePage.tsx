import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { CalendarDays, MapPin, Settings, Users } from 'lucide-react'
import { api, ApiError } from '../api/client'
import { Avatar } from '../components/Avatar'
import { Flag } from '../components/Flag'
import { FollowButton } from '../components/FollowButton'
import { ReviewCard } from '../components/ReviewCard'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import { useAuth } from '../context/AuthContext'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useMovies } from '../hooks/useMovies'
import { countryName, cx } from '../lib/format'
import { rememberUser, rememberUsers } from '../lib/cache'
import type { PublicUser, Review, User } from '../types'

type Tab = 'reviews' | 'followers' | 'following' | 'settings'

const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'reviews', label: 'Reviews' },
  { id: 'followers', label: 'Followers' },
  { id: 'following', label: 'Following' },
  { id: 'settings', label: 'Settings' },
]

export function ProfilePage() {
  const { username: routeUsername } = useParams()
  const { user, loading: authLoading, refresh, setUser } = useAuth()
  const [params, setParams] = useSearchParams()
  const username = routeUsername ?? user?.username
  const isSelf = Boolean(user && username && user.username.toLowerCase() === username.toLowerCase())
  const requestedTab = params.get('tab') as Tab | null
  const validTab = tabs.some((tab) => tab.id === requestedTab) ? requestedTab : 'reviews'
  const tab: Tab = !isSelf && validTab === 'settings' ? 'reviews' : (validTab as Tab)

  const [profile, setProfile] = useState<PublicUser | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [counts, setCounts] = useState({ followers: 0, following: 0 })
  const [followingIds, setFollowingIds] = useState<Set<number>>(new Set())
  const [lists, setLists] = useState<Partial<Record<'followers' | 'following', PublicUser[]>>>({})
  const [listLoading, setListLoading] = useState(false)
  const [listError, setListError] = useState('')
  const [reviewsError, setReviewsError] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)

  useDocumentTitle(profile?.username ?? username ?? 'Profile')

  const reviewMovieIDs = useMemo(() => reviews.map((review) => review.movie_id), [reviews])
  const movies = useMovies(reviewMovieIDs)

  useEffect(() => {
    if (!username) return
    let active = true
    setLoading(true)
    setError('')
    setNotFound(false)
    setReviewsError('')
    setLists({})
    setListError('')
    const currentUsername = user?.username

    const followingRequest = currentUsername
      ? api
          .getFollowing(currentUsername, 100, 0)
          .then((list) => {
            rememberUsers(list)
            return new Set(list.map((person) => person.id))
          })
          .catch(() => new Set<number>())
      : Promise.resolve(new Set<number>())

    const reviewsRequest = api
      .getUserReviews(username, 100, 0)
      .catch((cause: unknown) => {
        if (active) {
          setReviewsError(cause instanceof Error ? cause.message : 'Could not load reviews.')
        }
        return [] as Review[]
      })

    void Promise.all([
      api.getUser(username),
      api.getFollowersCount(username),
      api.getFollowingCount(username),
      reviewsRequest,
      followingRequest,
    ])
      .then(([person, followers, following, userReviews, ids]) => {
        if (!active) return
        rememberUser(person)
        setProfile(person)
        setCounts({ followers: followers.count, following: following.count })
        setReviews(userReviews)
        setFollowingIds(ids)
      })
      .catch((cause: unknown) => {
        if (!active) return
        if (cause instanceof ApiError && cause.status === 404) {
          setNotFound(true)
        } else {
          setError(cause instanceof Error ? cause.message : 'Could not load this profile.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [username, user?.username])

  useEffect(() => {
    if (tab !== 'followers' && tab !== 'following') return
    if (!profile || lists[tab]) return
    let active = true
    setListLoading(true)
    setListError('')
    const request = tab === 'followers' ? api.getFollowers(profile.username, 100, 0) : api.getFollowing(profile.username, 100, 0)
    void request
      .then((list) => {
        if (!active) return
        rememberUsers(list)
        setLists((current) => ({ ...current, [tab]: list }))
      })
      .catch((cause: unknown) => {
        if (active) setListError(cause instanceof Error ? cause.message : 'Could not load this list.')
      })
      .finally(() => {
        if (active) setListLoading(false)
      })
    return () => {
      active = false
    }
  }, [tab, profile, lists])

  if (authLoading && !username) {
    return <LoadingState label="Opening the journal" />
  }

  if (!username) {
    return <LoadingState label="Opening the journal" />
  }

  if (loading) {
    return <LoadingState label="Opening the journal" />
  }

  if (notFound) {
    return (
      <div className="page">
        <EmptyState title="No such member" action={{ label: 'Explore films', to: '/explore' }}>
          That username is not part of Letterbox. Check the spelling, or start your own journal.
        </EmptyState>
      </div>
    )
  }

  if (error || !profile) {
    return <ErrorState message={error || 'Could not load this profile.'} onRetry={() => window.location.reload()} />
  }

  const reviewTotal = reviews.length >= 100 ? '100+' : String(reviews.length)

  function selectTab(next: Tab) {
    setParams(next === 'reviews' ? {} : { tab: next })
  }

  function handleTabKeys(event: KeyboardEvent<HTMLDivElement>) {
    const index = visibleTabs.findIndex((item) => item.id === tab)
    let nextIndex = index
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % visibleTabs.length
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + visibleTabs.length) % visibleTabs.length
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = visibleTabs.length - 1
    else return
    event.preventDefault()
    const next = visibleTabs[nextIndex]?.id
    if (!next) return
    selectTab(next)
    requestAnimationFrame(() => document.getElementById(`tab-${next}`)?.focus())
  }

  function handleFollowingChange(targetID: number, following: boolean) {
    setFollowingIds((current) => {
      const next = new Set(current)
      if (following) next.add(targetID)
      else next.delete(targetID)
      return next
    })
    setCounts((current) => {
      const next = { ...current }
      if (isSelf) next.following = Math.max(0, next.following + (following ? 1 : -1))
      if (targetID === profile?.id) next.followers = Math.max(0, next.followers + (following ? 1 : -1))
      return next
    })
  }

  const visibleTabs = tabs.filter((item) => item.id !== 'settings' || isSelf)
  const listTab = tab === 'followers' || tab === 'following' ? tab : null
  const list = listTab ? lists[listTab] : undefined

  return (
    <div className="page profile-page">
      <header className="profile-hero">
        <Avatar username={profile.username} src={profile.profilePictureURL} size="xl" />
        <div className="profile-hero__identity">
          <p className="profile-hero__kicker">{isSelf ? 'Your journal' : 'Member journal'}</p>
          <h1>
            {profile.username} <Flag country={profile.country} />
          </h1>
          <div className="profile-hero__meta">
            {profile.country ? (
              <span>
                <MapPin size={14} aria-hidden="true" /> {countryName(profile.country)}
              </span>
            ) : null}
            <span>
              <CalendarDays size={14} aria-hidden="true" /> Member #{profile.id}
            </span>
          </div>
        </div>
        <div className="profile-hero__actions">
          {isSelf ? (
            <button type="button" className="button button--ghost" onClick={() => selectTab('settings')}>
              <Settings size={16} aria-hidden="true" /> Edit profile
            </button>
          ) : (
            <FollowButton target={profile} following={followingIds.has(profile.id)} onChange={(next) => handleFollowingChange(profile.id, next)} />
          )}
        </div>
      </header>

      <dl className="profile-stats">
        <div>
          <dt>Reviews</dt>
          <dd>{reviewTotal}</dd>
        </div>
        <div>
          <dt>Followers</dt>
          <dd>{counts.followers}</dd>
        </div>
        <div>
          <dt>Following</dt>
          <dd>{counts.following}</dd>
        </div>
      </dl>

      <div className="profile-tabs" role="tablist" aria-label="Profile sections" onKeyDown={handleTabKeys}>
        {visibleTabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`tab-${item.id}`}
            tabIndex={tab === item.id ? 0 : -1}
            aria-selected={tab === item.id}
            aria-controls={`panel-${item.id}`}
            className={cx('profile-tab', tab === item.id && 'is-active')}
            onClick={() => selectTab(item.id)}
          >
            {item.label}
            {item.id === 'reviews' ? <span>{reviewTotal}</span> : null}
            {item.id === 'followers' ? <span>{counts.followers}</span> : null}
            {item.id === 'following' ? <span>{counts.following}</span> : null}
          </button>
        ))}
      </div>

      <div
        className="profile-panel"
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
      >
        {tab === 'reviews' ? (
          reviewsError ? (
            <ErrorState message={reviewsError} />
          ) : reviews.length === 0 ? (
            <EmptyState title="No reviews yet" action={isSelf ? { label: 'Find a film', to: '/explore' } : undefined}>
              {isSelf
                ? 'Your journal is waiting for its first entry. Find a film and leave a score.'
                : `${profile.username} has not left a review yet.`}
            </EmptyState>
          ) : (
            <>
              <div className="section-head">
                <h2>Newest activity first</h2>
                <span className="section-head__rule" aria-hidden="true" />
              </div>
              <div className="review-list">
                {reviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    author={profile}
                    movie={movies[review.movie_id]}
                    movieHref={`/movies/${review.movie_id}`}
                    showMovie
                    onDeleted={(id) => setReviews((current) => current.filter((item) => item.id !== id))}
                  />
                ))}
              </div>
              {reviews.length >= 100 ? <p className="muted-note">Showing the newest 100 reviews.</p> : null}
            </>
          )
        ) : null}

        {listTab ? (
          listLoading ? (
            <LoadingState label={`Loading ${listTab}`} />
          ) : listError ? (
            <ErrorState message={listError} />
          ) : list && list.length > 0 ? (
            <ul className="people-list">
              {list.map((person) => (
                <li key={person.id} className="people-row">
                  <Link to={`/u/${person.username}`} className="people-row__identity">
                    <Avatar username={person.username} src={person.profilePictureURL} />
                    <span>
                      <strong>
                        {person.username} <Flag country={person.country} />
                      </strong>
                      <small>{person.country ? countryName(person.country) : 'Letterbox member'}</small>
                    </span>
                  </Link>
                  <FollowButton
                    target={person}
                    following={followingIds.has(person.id)}
                    onChange={(next) => handleFollowingChange(person.id, next)}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title={listTab === 'followers' ? 'No followers yet' : 'Not following anyone yet'}>
              {listTab === 'followers'
                ? `${profile.username} has not gathered followers yet.`
                : `${profile.username} is not following anyone yet.`}
            </EmptyState>
          )
        ) : null}

        {tab === 'settings' && isSelf && user ? (
          <SettingsPanel
            user={user}
            onSaved={() => {
              void refresh()
            }}
            onDeleted={() => {
              setUser(null)
              selectTab('reviews')
            }}
          />
        ) : null}
      </div>

      {isSelf ? (
        <p className="profile-footnote">
          <Users size={14} aria-hidden="true" /> Your journal is private by default to the open web,
          but public to members.
        </p>
      ) : null}
    </div>
  )
}

function SettingsPanel({
  user,
  onSaved,
  onDeleted,
}: {
  user: User
  onSaved: () => void
  onDeleted: () => void
}) {
  const navigate = useNavigate()
  const [username, setUsername] = useState(user.username)
  const [email, setEmail] = useState(user.email)
  const [country, setCountry] = useState(user.country)
  const [picture, setPicture] = useState(user.profilePictureURL)
  const [profileError, setProfileError] = useState('')
  const [profileNote, setProfileNote] = useState('')
  const [profileBusy, setProfileBusy] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordNote, setPasswordNote] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)

  const [confirmDelete, setConfirmDelete] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleteBusy, setDeleteBusy] = useState(false)

  useEffect(() => {
    setUsername(user.username)
    setEmail(user.email)
    setCountry(user.country)
    setPicture(user.profilePictureURL)
  }, [user.username, user.email, user.country, user.profilePictureURL])

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setProfileError('')
    setProfileNote('')
    if (!/^[A-Za-z0-9_]{3,20}$/.test(username.trim())) {
      setProfileError('Usernames are 3–20 letters, numbers, or underscores.')
      return
    }
    if (country && !/^[A-Za-z]{2}$/.test(country.trim())) {
      setProfileError('Country must be a two-letter code.')
      return
    }
    setProfileBusy(true)
    try {
      await api.updateMe({
        username: username.trim(),
        email: email.trim(),
        country: country.trim().toUpperCase(),
        profilePicture: picture.trim(),
      })
      setProfileNote('Profile saved.')
      onSaved()
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) {
        setProfileError('That username or email is already in use.')
      } else if (cause instanceof ApiError && cause.status === 400) {
        setProfileError('The server did not accept one of these fields.')
      } else {
        setProfileError(cause instanceof Error ? cause.message : 'Could not save the profile.')
      }
    } finally {
      setProfileBusy(false)
    }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPasswordError('')
    setPasswordNote('')
    if (newPassword.length < 8 || newPassword.length > 72) {
      setPasswordError('Passwords must be 8–72 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('The new passwords do not match.')
      return
    }
    setPasswordBusy(true)
    try {
      await api.updatePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordNote('Password changed. Your other sessions have been signed out.')
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        setPasswordError('The current password is not correct.')
      } else if (cause instanceof ApiError && cause.status === 400) {
        setPasswordError('The new password does not meet the requirements.')
      } else {
        setPasswordError(cause instanceof Error ? cause.message : 'Could not change the password.')
      }
    } finally {
      setPasswordBusy(false)
    }
  }

  async function deleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setDeleteError('')
    if (confirmDelete !== user.username) {
      setDeleteError('Type your username exactly to confirm.')
      return
    }
    setDeleteBusy(true)
    try {
      await api.deleteMe()
      onDeleted()
      navigate('/login', { replace: true })
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : 'Could not delete the account.')
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div className="settings">
      <section className="settings-card" aria-labelledby="profile-settings-heading">
        <div className="settings-card__head">
          <h2 id="profile-settings-heading">Profile details</h2>
          <p>Your username and profile picture are public. Email stays private.</p>
        </div>
        <form className="form" onSubmit={(event) => void saveProfile(event)}>
          {profileError ? (
            <p className="form__error" role="alert">
              {profileError}
            </p>
          ) : null}
          {profileNote ? (
            <p className="form__success" role="status">
              {profileNote}
            </p>
          ) : null}
          <div className="form__row">
            <label className="field">
              <span>Username</span>
              <input value={username} onChange={(event) => setUsername(event.target.value)} minLength={3} maxLength={20} required />
            </label>
            <label className="field">
              <span>Country</span>
              <input value={country} onChange={(event) => setCountry(event.target.value)} maxLength={2} placeholder="AR" />
            </label>
          </div>
          <label className="field">
            <span>Email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label className="field">
            <span>Profile picture URL</span>
            <input value={picture} onChange={(event) => setPicture(event.target.value)} placeholder="https://…" />
            <small>Leave the existing value to keep your current picture.</small>
          </label>
          <div className="settings-card__actions">
            <button type="submit" className="button button--accent" disabled={profileBusy}>
              {profileBusy ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </form>
      </section>

      <section className="settings-card" aria-labelledby="password-settings-heading">
        <div className="settings-card__head">
          <h2 id="password-settings-heading">Password</h2>
          <p>Changing your password signs out every other session but keeps this one.</p>
        </div>
        <form className="form" onSubmit={(event) => void savePassword(event)}>
          {passwordError ? (
            <p className="form__error" role="alert">
              {passwordError}
            </p>
          ) : null}
          {passwordNote ? (
            <p className="form__success" role="status">
              {passwordNote}
            </p>
          ) : null}
          <label className="field">
            <span>Current password</span>
            <input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
          </label>
          <div className="form__row">
            <label className="field">
              <span>New password</span>
              <input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} maxLength={72} required />
            </label>
            <label className="field">
              <span>Confirm new password</span>
              <input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} maxLength={72} required />
            </label>
          </div>
          <div className="settings-card__actions">
            <button type="submit" className="button button--ghost" disabled={passwordBusy}>
              {passwordBusy ? 'Changing…' : 'Change password'}
            </button>
          </div>
        </form>
      </section>

      <section className="settings-card settings-card--danger" aria-labelledby="delete-account-heading">
        <div className="settings-card__head">
          <h2 id="delete-account-heading">Delete account</h2>
          <p>This removes your reviews, follows, and reactions. It cannot be undone.</p>
        </div>
        <form className="form" onSubmit={(event) => void deleteAccount(event)}>
          {deleteError ? (
            <p className="form__error" role="alert">
              {deleteError}
            </p>
          ) : null}
          <label className="field">
            <span>Type “{user.username}” to confirm</span>
            <input value={confirmDelete} onChange={(event) => setConfirmDelete(event.target.value)} autoComplete="off" />
          </label>
          <div className="settings-card__actions">
            <button type="submit" className="button button--danger" disabled={deleteBusy || !confirmDelete}>
              {deleteBusy ? 'Deleting…' : 'Delete my account'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
