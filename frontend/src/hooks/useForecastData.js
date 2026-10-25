import { useEffect, useMemo, useState } from 'react'
import { FORECAST_URL, SUMMARY_URL } from '../config'
import { getPeakValue } from '../utils/forecast'

async function readJson(response, fallbackMessage) {
  if (response.ok) return response.json()
  const body = await response.json().catch(() => ({}))
  throw new Error(body.detail || fallbackMessage)
}

export function useForecastData(deliveryDate, page) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [summary, setSummary] = useState(null)
  const [summaryError, setSummaryError] = useState(false)
  const summaryLoading = page === 'monthly' && !summary

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${FORECAST_URL}?delivery_date=${deliveryDate}`, { signal: controller.signal })
      .then((response) => readJson(response, 'Forecast request failed'))
      .then(setData)
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') {
          setData(null)
          setError(requestError.message)
        }
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [deliveryDate])

  useEffect(() => {
    if (page !== 'monthly' || summary) return
    const controller = new AbortController()
    fetch(SUMMARY_URL, { signal: controller.signal })
      .then((response) => readJson(response, 'Monthly summary failed'))
      .then(setSummary)
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') {
          setSummary(null)
          setSummaryError(true)
        }
      })
    return () => controller.abort()
  }, [page, summary])

  const points = useMemo(() => data?.forecast ?? [], [data])
  const peakValue = useMemo(() => getPeakValue(points), [points])

  return { data, loading, error, summary, summaryLoading: summaryLoading && !summaryError, points, peakValue }
}
