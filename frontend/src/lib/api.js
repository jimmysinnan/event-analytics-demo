/**
 * Configuration API — Event Analytics
 * URL et headers centralisés, configurable via .env.local
 */

export const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8001'

export const API_TOKEN = import.meta.env.VITE_API_TOKEN ?? ''

/** Headers communs pour les requêtes JSON */
export function apiHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    ...(API_TOKEN ? { 'X-API-Token': API_TOKEN } : {}),
    ...extra,
  }
}

/** Headers pour les uploads multipart (sans Content-Type — laissé au browser) */
export function uploadHeaders() {
  return API_TOKEN ? { 'X-API-Token': API_TOKEN } : {}
}
