const BASE_URL = import.meta.env.VITE_API_BASE_URL

export async function apiClient<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = new URL(endpoint, BASE_URL).toString()

  // `...options` has to come first: it's spread at the top level, so if it
  // comes after `headers`, an options.headers (e.g. the submission-token
  // header on update/delete calls) would replace the whole `headers` key
  // outright instead of merging into it, silently dropping Content-Type.
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
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
