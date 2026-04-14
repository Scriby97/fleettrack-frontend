/**
 * Health Check API
 *
 * Provides lightweight backend availability checks without authentication.
 * Industry best practice for startup/readiness probes.
 */

interface HealthCheckOptions {
  retries?: number
  retryDelay?: number
  useExponentialBackoff?: boolean
  onRetry?: (attempt: number, maxRetries: number) => void
  bypassCache?: boolean
}

interface HealthCheckResult {
  available: boolean
  retryCount: number
  error?: string
  cached?: boolean
}

// Cache for health check results
let healthCheckCache: {
  result: HealthCheckResult | null
  timestamp: number
} = {
  result: null,
  timestamp: 0,
}

const CACHE_DURATION_MS = 30000 // 30 seconds

/**
 * Check if backend is available using /health endpoint.
 * Falls back to /api/health for backwards compatibility.
 * Results are cached for 30 seconds to avoid unnecessary checks.
 */
export async function checkBackendHealth(
  options: HealthCheckOptions = {}
): Promise<HealthCheckResult> {
  const { bypassCache = false } = options

  const now = Date.now()
  const cacheAge = now - healthCheckCache.timestamp

  if (!bypassCache && healthCheckCache.result && cacheAge < CACHE_DURATION_MS) {
    return { ...healthCheckCache.result, cached: true }
  }

  const {
    retries = 8,
    retryDelay = 2000,
    useExponentialBackoff = true,
    onRetry,
  } = options

  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  if (!apiUrl) {
    return { available: false, retryCount: 0, error: 'API URL nicht konfiguriert' }
  }

  const healthEndpoints = [`${apiUrl}/health`, `${apiUrl}/api/health`]

  let lastError: string | undefined
  let retryCount = 0

  for (let attempt = 0; attempt <= retries; attempt++) {
    retryCount = attempt

    for (const endpoint of healthEndpoints) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

        const response = await fetch(endpoint, {
          method: 'GET',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          const result: HealthCheckResult = { available: true, retryCount }
          healthCheckCache = { result, timestamp: Date.now() }
          return result
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unbekannter Fehler'
      }
    }

    if (attempt >= retries) break

    const delay = useExponentialBackoff
      ? retryDelay * Math.pow(1.5, attempt)
      : retryDelay

    onRetry?.(attempt + 1, retries)
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  const result: HealthCheckResult = {
    available: false,
    retryCount,
    error: lastError || 'Backend nicht erreichbar',
  }

  // Cache failures too, to avoid hammering an unavailable backend
  healthCheckCache = { result, timestamp: Date.now() }

  return result
}

/**
 * Wait for backend to become available. Useful for startup scenarios.
 */
export async function waitForBackend(options: HealthCheckOptions = {}): Promise<boolean> {
  const result = await checkBackendHealth(options)
  return result.available
}
