export function getPeakForecast(points) {
  return points.reduce(
    (best, point) => point.forecast > best.forecast ? point : best,
    { forecast: 0, time: '—' },
  )
}

export function getPeakValue(points) {
  return Math.max(...points.map((point) => Math.max(point.actual, point.forecast)), 1)
}

export function downloadForecastCsv(points, deliveryDate) {
  if (!points.length) return
  const csv = [
    'startTime,forecastMW,actualMW,errorMW',
    ...points.map((point) => `${point.startTime},${point.forecast},${point.actual},${point.error}`),
  ].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `windlens-${deliveryDate || 'export'}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function getErrorDistribution(points) {
  if (!points.length) return []
  const maxError = Math.max(...points.map((point) => Math.abs(point.error)), 1)
  const bins = Array.from({ length: 10 }, (_, index) => ({
    label: `${(index - 5) * 100} to ${(index - 4) * 100}`,
    count: 0,
  }))
  return points.reduce((result, point) => {
    const index = Math.min(9, Math.max(0, Math.floor(((point.error + maxError) / (2 * maxError)) * 10)))
    result[index].count += 1
    return result
  }, bins)
}
