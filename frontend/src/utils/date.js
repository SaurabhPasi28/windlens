import { JANUARY_END, JANUARY_START } from '../config'

export function formatDateLabel(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export function formatShortDate(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatTime(iso) {
  return `${new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  })} UTC`
}

export function isJanuaryDate(value) {
  return value >= JANUARY_START && value <= JANUARY_END
}

export function shiftJanuaryDate(value, days) {
  const next = new Date(`${value}T12:00:00`)
  next.setDate(next.getDate() + days)
  const nextValue = next.toISOString().slice(0, 10)
  return isJanuaryDate(nextValue) ? nextValue : value
}
