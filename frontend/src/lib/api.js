/**
 * Configuration API — Event Analytics
 *
 * Comportement selon VITE_API_URL au moment du build :
 *
 *   VITE_API_URL=http://localhost:8001  → appels absolus  (dev local + package local)
 *   VITE_API_URL=                       → appels relatifs (build hébergé — Nginx route /api/)
 *   VITE_API_URL non défini             → fallback localhost:8001 (sécurité dev)
 *
 * NOTE SÉCURITÉ : ne jamais mettre ANTHROPIC_API_KEY dans ce fichier ou dans une
 * variable VITE_*. La clé Anthropic reste exclusivement côté backend (.env serveur).
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
