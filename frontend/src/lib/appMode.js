/**
 * appMode.js — Détection du mode démo vs production
 *
 * VITE_APP_MODE=demo       → données hardcodées affichées (version démo)
 * VITE_APP_MODE=production → seules les données importées sont affichées
 *
 * Défaut : 'demo' (rétrocompatible — ne casse pas l'existant)
 */
export const APP_MODE = import.meta.env.VITE_APP_MODE ?? 'demo'
export const IS_DEMO  = APP_MODE !== 'production'
