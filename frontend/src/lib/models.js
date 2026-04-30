/**
 * Modèles de données cibles — architecture Organisation → Event → Edition
 * Préparé pour une évolution SaaS/hybride future
 */

// ── Types d'événements ─────────────────────────────────────────────────────────
export const EVENT_TYPES = [
  { id: 'festival',    label: 'Festival',             icon: '🎪' },
  { id: 'concert',     label: 'Concert / Spectacle',  icon: '🎵' },
  { id: 'salon',       label: 'Salon / Exposition',   icon: '🏛️' },
  { id: 'conference',  label: 'Conférence',            icon: '🎤' },
  { id: 'afterwork',   label: 'Afterwork / Soirée',   icon: '🥂' },
  { id: 'sportif',     label: 'Événement sportif',    icon: '🏆' },
  { id: 'marche',      label: 'Marché / Pop-up',      icon: '🛍️' },
  { id: 'corporate',   label: 'Corporate / Institutionnel', icon: '🏢' },
  { id: 'autre',       label: 'Autre',                icon: '📋' },
]

// ── Modules disponibles ────────────────────────────────────────────────────────
export const MODULES = {
  billetterie:   { id: 'billetterie',   label: 'Billetterie',          route: '/billetterie',   icon: 'Ticket'         },
  consommation:  { id: 'consommation',  label: 'Consommation',         route: '/consommation',  icon: 'ShoppingCart'   },
  profil:        { id: 'profil',        label: 'Profil Client',        route: '/profil-client', icon: 'Users'          },
  invitations:   { id: 'invitations',   label: 'Invitations',          route: '/invitations',   icon: 'Gift'           },
  stocks:        { id: 'stocks',        label: 'Stocks & Prévisions',  route: '/stocks',        icon: 'Package'        },
  restitution:   { id: 'restitution',   label: 'Restitution PDF',      route: '/restitution',   icon: 'FileText'       },
  historique:    { id: 'historique',    label: 'Historique',           route: '/historique',    icon: 'BarChart3'      },
}

// ── Modules recommandés par type d'événement ──────────────────────────────────
export const RECOMMENDED_MODULES = {
  festival:   ['billetterie', 'consommation', 'profil', 'invitations', 'stocks', 'historique'],
  concert:    ['billetterie', 'consommation', 'profil', 'invitations', 'stocks'],
  salon:      ['billetterie', 'profil', 'historique', 'restitution'],
  conference: ['billetterie', 'profil', 'historique', 'restitution'],
  afterwork:  ['billetterie', 'consommation', 'profil', 'historique'],
  sportif:    ['billetterie', 'consommation', 'invitations', 'historique'],
  marche:     ['consommation', 'stocks', 'historique'],
  corporate:  ['billetterie', 'profil', 'invitations', 'restitution'],
  autre:      ['billetterie', 'consommation', 'historique'],
}

// ── Statuts ────────────────────────────────────────────────────────────────────
export const EDITION_STATUS = {
  upcoming:  { id: 'upcoming',  label: 'À venir',   color: '#F59E0B' },
  active:    { id: 'active',    label: 'En cours',  color: '#10B981' },
  completed: { id: 'completed', label: 'Terminée',  color: '#8B9BB4' },
  archived:  { id: 'archived',  label: 'Archivée',  color: '#4A5568' },
}

// ── Factories ─────────────────────────────────────────────────────────────────
let _id = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

export function createOrganisation(data = {}) {
  return {
    id:        data.id        ?? _id(),
    name:      data.name      ?? 'Nouvelle organisation',
    createdAt: data.createdAt ?? new Date().toISOString(),
  }
}

export function createEvent(data = {}) {
  return {
    id:           data.id           ?? _id(),
    orgId:        data.orgId        ?? null,
    name:         data.name         ?? 'Nouvel événement',
    type:         data.type         ?? 'autre',
    description:  data.description  ?? '',
    modules:      data.modules      ?? RECOMMENDED_MODULES[data.type ?? 'autre'],
    createdAt:    data.createdAt    ?? new Date().toISOString(),
    archived:     data.archived     ?? false,
  }
}

export function createEdition(data = {}) {
  return {
    id:          data.id          ?? _id(),
    eventId:     data.eventId     ?? null,
    name:        data.name        ?? 'Nouvelle édition',
    year:        data.year        ?? new Date().getFullYear(),
    dateStart:   data.dateStart   ?? null,
    dateEnd:     data.dateEnd     ?? null,
    jaugeEst:    data.jaugeEst    ?? null,
    caEst:       data.caEst       ?? null,
    status:      data.status      ?? 'upcoming',
    modules:     data.modules     ?? [],
    imports:     data.imports     ?? [],
    createdAt:   data.createdAt   ?? new Date().toISOString(),
  }
}

// ── Canaux de distribution ─────────────────────────────────────────────────────
export const CHANNEL_TYPES = [
  { id: 'weezevent',  label: 'Weezevent',              icon: '🎫' },
  { id: 'bizouk',     label: 'Bizouk',                  icon: '🎟️' },
  { id: 'cse',        label: 'CSE / Comité entreprise', icon: '🏢' },
  { id: 'physique',   label: 'Vente physique / Réseau', icon: '🏪' },
  { id: 'helloasso',  label: 'HelloAsso',               icon: '💙' },
  { id: 'billetweb',  label: 'Billetweb',               icon: '🏷️' },
  { id: 'autre',      label: 'Autre',                   icon: '📋' },
]

export function createChannel(data = {}) {
  return {
    id:        data.id        ?? _id(),
    editionId: data.editionId ?? null,
    name:      data.name      ?? 'Nouveau canal',
    type:      data.type      ?? 'autre',
    color:     data.color     ?? null,
    active:    data.active    ?? true,
    createdAt: data.createdAt ?? new Date().toISOString(),
  }
}

// ── Thème visuel d'un événement ────────────────────────────────────────────────
export function createEventTheme(data = {}) {
  return {
    imageUrl:     data.imageUrl     ?? null,
    primary:      data.primary      ?? '#6366F1',
    secondary:    data.secondary    ?? '#F59E0B',
    fontFamily:   data.fontFamily   ?? 'Outfit',
    textColor:    data.textColor    ?? '#FFFFFF',
    textSize:     data.textSize     ?? 'md',
    bannerOn:     data.bannerOn     ?? false,
    bannerHeight: data.bannerHeight ?? 160,
  }
}

// ── Paramètres par édition ─────────────────────────────────────────────────────
// Default VIP keywords — user can customize per edition
export const DEFAULT_VIP_KEYWORDS = [
  'vip', 'premium', 'palmeraie', 'prestige', 'gold', 'platine', 'ultra',
  'carré or', 'golden', 'diamond', 'loge', 'tribune',
]

export function createEditionSettings(data = {}) {
  return {
    editionId:   data.editionId   ?? null,
    vipKeywords: data.vipKeywords ?? [...DEFAULT_VIP_KEYWORDS],
    invitKeywords: data.invitKeywords ?? [
      'invitation', 'invit', 'invite', 'gratuit', 'offert', 'compl',
      'press', 'artiste', 'staff', 'accréditation',
    ],
    // Mapping tarif → zone custom: { 'PASS WEEK-END LAGOON': 'fosse', 'PALMERAIE VIP': 'vip' }
    tarifZoneMap: data.tarifZoneMap ?? {},
    updatedAt:   data.updatedAt   ?? new Date().toISOString(),
  }
}