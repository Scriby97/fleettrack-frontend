/**
 * Health Check API
 * 
 * Provides lightweight backend availability checks without authentication.
 * Industry best practice for startup/readiness probes.
 */

interface HealthCheckOptions {
  retries?: number;
  retryDelay?: number;
  useExponentialBackoff?: boolean;
  onRetry?: (attempt: number, maxRetries: number) => void;
}

interface HealthCheckResult {
  available: boolean;
  retryCount: number;
  error?: string;
}

/**
 * Check if backend is available using /health endpoint
 * Falls back to /auth/me if /health doesn't exist (backwards compatibility)
 */
export async function checkBackendHealth(
  options: HealthCheckOptions = {}
): Promise<HealthCheckResult> {
  const {
    retries = 8,
    retryDelay = 2000,
    useExponentialBackoff = true,
    onRetry,
  } = options;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    return {
      available: false,
      retryCount: 0,
      error: 'API URL not configured',
    };
  }

  // Try /health endpoint first (lightweight, no auth needed)
  const healthEndpoints = [
    `${apiUrl}/health`,
    `${apiUrl}/api/health`,
  ];

  let lastError: string | undefined;
  let retryCount = 0;

  for (let attempt = 0; attempt <= retries; attempt++) {
    retryCount = attempt;

    // Try each health endpoint
    for (const endpoint of healthEndpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const response = await fetch(endpoint, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          console.log(`[HEALTH_CHECK] Backend available via ${endpoint}`);
          return {
            available: true,
            retryCount,
          };
        }
      } catch (error) {
        // Continue to next endpoint
        lastError = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    // If this was the last attempt, don't wait
    if (attempt >= retries) {
      break;
    }

    // Calculate delay with optional exponential backoff
    const delay = useExponentialBackoff
      ? retryDelay * Math.pow(1.5, attempt)
      : retryDelay;

    console.log(
      `[HEALTH_CHECK] Backend not available, retrying in ${Math.round(delay)}ms (${attempt + 1}/${retries})`
    );

    onRetry?.(attempt + 1, retries);

    // Wait before next retry
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  return {
    available: false,
    retryCount,
    error: lastError || 'Backend not available',
  };
}

/**
 * Wait for backend to become available
 * Useful for startup scenarios
 */
export async function waitForBackend(
  options: HealthCheckOptions = {}
): Promise<boolean> {
  const result = await checkBackendHealth(options);
  return result.available;
}
