const TOKEN_KEY = 'descon-auth-token'

export function setAuthToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY)
}
