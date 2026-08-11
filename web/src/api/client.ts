const BASE_URL = import.meta.env.VITE_API_BASE_URL

export async function apiClient<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = new URL(endpoint, BASE_URL).toString()

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }

  // DELETE endpoints return 204 No Content — .json() would throw on the
  // empty body, so skip it and hand back `undefined` (callers that expect
  // no data type this as Promise<void>).
  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}
