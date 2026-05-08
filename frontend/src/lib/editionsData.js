/**
 * Store multi-années — données de démonstration Way of Life Festival
 */

export const CONSO = {
  2023: {
    ca:           888537,
    clients:      11735,
    transactions: 71547,
    panier:       75.7,
    plateforme:   'Cashless (système événementiel)',
    pdv: [
      { name: 'Bar Sunset Lounge',    short: 'Sunset',      ca: 160441 },
      { name: 'Bar Oasis Nord A',     short: 'Oasis Nord A',ca: 135897 },
      { name: 'Bar Oasis Nord B',     short: 'Oasis Nord B',ca: 126160 },
      { name: 'Bar Terrasse Sud',     short: 'Terrasse Sud',ca: 107133 },
      { name: 'Bar Natura',           short: 'Natura',      ca: 75032  },
      { name: 'Bar Partenaire',       short: 'Partenaire',  ca: 58356  },
    ],
    familles: [
      { name: 'Cocktails',          ca: 321724, color: '#F59E0B' },
      { name: 'Bières Artisanales', ca: 98418,  color: '#068EEA' },
      { name: 'Vins Naturels',      ca: 94321,  color: '#8B5CF6' },
      { name: 'Soft & Hydration',   ca: 81369,  color: '#06B6D4' },
      { name: 'Spiritueux',         ca: 45401,  color: '#EF4444' },
      { name: 'Rhum & Punch',       ca: 27078,  color: '#F97316' },
    ],
  },
  2024: {
    ca:           742968,
    clients:      9177,
    transactions: 55096,
    panier:       80.9,
    plateforme:   'Weezpay',
    pdv: [
      { name: 'Bar Sunset Lounge',    short: 'Sunset',      ca: 128178 },
      { name: 'Bar Oasis',            short: 'Oasis',       ca: 101454 },
      { name: 'Bar Terrasse Sud',     short: 'Terrasse Sud',ca: 94561  },
      { name: 'Bar Natura',           short: 'Natura',      ca: 75981  },
      { name: 'Bar VIP Nomad',        short: 'VIP Nomad',   ca: 53810  },
      { name: 'Bar Partenaire',       short: 'Partenaire',  ca: 53172  },
    ],
    familles: [
      { name: 'Cocktails',          ca: 304606, color: '#F59E0B' },
      { name: 'Vins Naturels',      ca: 109198, color: '#8B5CF6' },
      { name: 'Bières Artisanales', ca: 65238,  color: '#068EEA' },
      { name: 'Soft & Hydration',   ca: 44606,  color: '#06B6D4' },
      { name: 'Rhum & Punch',       ca: 25447,  color: '#F97316' },
      { name: 'Street Food',        ca: 20468,  color: '#10B981' },
    ],
  },
  2025: {
    ca:           496585,
    clients:      7251,
    transactions: 32523,
    panier:       68.5,
    plateforme:   'Weezpay enrichi',
    pdv: [
      { name: 'Bar Oasis',            short: 'Oasis',       ca: 96164  },
      { name: 'Bar Sunset Lounge',    short: 'Sunset',      ca: 73879  },
      { name: 'Bar Terrasse Sud',     short: 'Terrasse Sud',ca: 55907  },
      { name: 'Bar VIP Nomad',        short: 'VIP Nomad',   ca: 46108  },
      { name: 'Bar Natura',           short: 'Natura',      ca: 37771  },
      { name: 'Village Street Food',  short: 'Street Food', ca: 27581  },
    ],
    familles: [
      { name: 'Cocktails',          ca: 178857, color: '#F59E0B' },
      { name: 'Bières Artisanales', ca: 59005,  color: '#068EEA' },
      { name: 'Soft & Hydration',   ca: 44386,  color: '#06B6D4' },
      { name: 'Vins Naturels',      ca: 33924,  color: '#8B5CF6' },
      { name: 'Street Food',        ca: 27581,  color: '#F97316' },
      { name: 'Spiritueux',         ca: 18775,  color: '#10B981' },
      { name: 'Kombucha & Bio',     ca: 17678,  color: '#EF4444' },
    ],
  },
}

export const BILLETTERIE = {
  2023: {
    plateforme: 'Plateforme billetterie externe',
    scans:      null,
    ca_billet:  null,
    familles_tarifaires: [
      { tarif: 'Pass Full Experience',  nb: 8000,  color: '#068EEA' },
      { tarif: 'Pass Saturday Vibes',   nb: 1200,  color: '#8B5CF6' },
      { tarif: 'Pass Sunday Chill',     nb: 1100,  color: '#06B6D4' },
      { tarif: 'Community Pass',        nb: 1444,  color: '#F59E0B' },
    ],
  },
  2024: {
    plateforme:   'Canal billetterie principal',
    scans:        20346,
    ca_billet:    1019418,
    panier_cmd:   219.46,
    prix_moyen:   112.29,
    familles_tarifaires: [
      { tarif: 'Pass Full Experience',  nb: 6978,  color: '#068EEA' },
      { tarif: 'VIP Access',            nb: 555,   color: '#8B5CF6' },
      { tarif: 'CSE & Partenaires',     nb: 1898,  color: '#F59E0B' },
      { tarif: 'Pass Saturday Vibes',   nb: 596,   color: '#06B6D4' },
      { tarif: 'Pass Sunday Chill',     nb: 1885,  color: '#10B981' },
      { tarif: 'Community Pass',        nb: 166,   color: '#F97316' },
    ],
  },
  2025: {
    plateforme:   'Canal billetterie principal',
    scans:        16810,
    ca_billet:    929695,
    nb_commandes: 2002,
    familles_tarifaires: [
      { tarif: 'Pass Full Experience',  nb: 8689,  color: '#068EEA' },
      { tarif: 'VIP Access',            nb: 333,   color: '#8B5CF6' },
      { tarif: 'CSE & Partenaires',     nb: 2704,  color: '#F59E0B' },
      { tarif: 'Friends & Family A',    nb: 2928,  color: '#F97316' },
      { tarif: 'Friends & Family B',    nb: 2312,  color: '#EF4444' },
      { tarif: 'Pass Jour (Sam+Dim)',   nb: 576,   color: '#06B6D4' },
    ],
  },
}

export const OVERVIEW = [
  { year: 2023, ca_conso: 888537, festivaliers: null,  ca_billet: null,    clients: 11735, panier: 75.7 },
  { year: 2024, ca_conso: 742968, festivaliers: 20346, ca_billet: 1019418, clients: 9177,  panier: 80.9 },
  { year: 2025, ca_conso: 496585, festivaliers: 16810, ca_billet: 929695,  clients: 7251,  panier: 68.5 },
]

export const AFFLUENCE = {
  2024: { samedi: 9762,  dimanche: 10584, total: 20346 },
  2025: { samedi: 8289,  dimanche: 8521,  total: 16810 },
}
