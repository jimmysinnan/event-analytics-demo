/**
 * Compatibilité — re-exporte depuis EventContext
 * Toutes les pages existantes importent depuis ici sans modification
 */
export { useEdition, EventProvider as EditionProvider } from './EventContext'

// EDITIONS legacy — généré dynamiquement depuis le store au runtime via useEdition()
export const EDITIONS = []
