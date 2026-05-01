/**
 * Store multi-années — données anonymisées (version démonstration)
 */

export const CONSO = {
  2023: {
    ca:           888537,
    clients:      11735,
    transactions: 71547,
    panier:       75.7,
    plateforme:   'Cashless (système événementiel)',
    pdv: [
      { name: 'Bar Zone VIP',        short: 'Zone VIP',    ca: 160441 },
      { name: 'Bar Zone Nord A',     short: 'Zone Nord A', ca: 135897 },
      { name: 'Bar Zone Nord B',     short: 'Zone Nord B', ca: 126160 },
      { name: 'Bar Zone Sud',        short: 'Zone Sud',    ca: 107133 },
      { name: 'Bar Zone Centrale',   short: 'Zone Centr.', ca: 75032  },
      { name: 'Bar Partenaire',      short: 'Partenaire',  ca: 58356  },
    ],
    familles: [
      { name: 'Champagne', ca: 321724, color: '#F59E0B' },
      { name: 'Bières',    ca: 98418,  color: '#068EEA' },
      { name: 'Cocktail',  ca: 94321,  color: '#8B5CF6' },
      { name: 'Soft',      ca: 81369,  color: '#06B6D4' },
      { name: 'Hard',      ca: 45401,  color: '#EF4444' },
      { name: 'Rhum',      ca: 27078,  color: '#F97316' },
    ],
  },
  2024: {
    ca:           742968,
    clients:      9177,
    transactions: 55096,
    panier:       80.9,
    plateforme:   'Weezpay',
    pdv: [
      { name: 'Bar Zone VIP',        short: 'Zone VIP',    ca: 128178 },
      { name: 'Bar Zone Nord',       short: 'Zone Nord',   ca: 101454 },
      { name: 'Bar Zone Sud',        short: 'Zone Sud',    ca: 94561  },
      { name: 'Bar Zone Centrale',   short: 'Zone Centr.', ca: 75981  },
      { name: 'Bar VIP Extérieur',   short: 'VIP Ext.',    ca: 53810  },
      { name: 'Bar Partenaire',      short: 'Partenaire',  ca: 53172  },
    ],
    familles: [
      { name: 'Champagne', ca: 304606, color: '#F59E0B' },
      { name: 'Cocktail',  ca: 109198, color: '#8B5CF6' },
      { name: 'Bières',    ca: 65238,  color: '#068EEA' },
      { name: 'Soft',      ca: 44606,  color: '#06B6D4' },
      { name: 'Rhum',      ca: 25447,  color: '#F97316' },
      { name: 'Food',      ca: 20468,  color: '#10B981' },
    ],
  },
  2025: {
    ca:           496585,
    clients:      7251,
    transactions: 32523,
    panier:       68.5,
    plateforme:   'Weezpay enrichi',
    pdv: [
      { name: 'Bar Zone Nord',       short: 'Zone Nord',   ca: 96164  },
      { name: 'Bar Zone VIP',        short: 'Zone VIP',    ca: 73879  },
      { name: 'Bar Zone Sud',        short: 'Zone Sud',    ca: 55907  },
      { name: 'Bar VIP Intérieur',   short: 'VIP Int.',    ca: 46108  },
      { name: 'Bar Zone Centrale',   short: 'Zone Centr.', ca: 37771  },
      { name: 'Restauration 1',      short: 'Food 1',      ca: 27581  },
    ],
    familles: [
      { name: 'Champagne', ca: 178857, color: '#F59E0B' },
      { name: 'Bières',    ca: 59005,  color: '#068EEA' },
      { name: 'Soft',      ca: 44386,  color: '#06B6D4' },
      { name: 'Cocktail',  ca: 33924,  color: '#8B5CF6' },
      { name: 'Food',      ca: 27581,  color: '#F97316' },
      { name: 'Vodka',     ca: 18775,  color: '#10B981' },
      { name: 'Hard',      ca: 17678,  color: '#EF4444' },
    ],
  },
}

export const BILLETTERIE = {
  2023: {
    plateforme: 'Plateforme billetterie externe',
    scans:      null,
    ca_billet:  null,
    familles_tarifaires: [
      { tarif: 'Pass Week-End Regular', nb: 8000,  color: '#068EEA' },
      { tarif: 'Pass Samedi',           nb: 1200,  color: '#8B5CF6' },
      { tarif: 'Pass Dimanche',         nb: 1100,  color: '#06B6D4' },
      { tarif: 'Ambassadeur',           nb: 1444,  color: '#F59E0B' },
    ],
  },
  2024: {
    plateforme:   'Canal billetterie principal',
    scans:        20346,
    ca_billet:    1019418,
    panier_cmd:   219.46,
    prix_moyen:   112.29,
    familles_tarifaires: [
      { tarif: 'Pass Week-End Regular', nb: 6978,  color: '#068EEA' },
      { tarif: 'Pass Zone Premium',     nb: 555,   color: '#8B5CF6' },
      { tarif: 'CSE & Partenaires',     nb: 1898,  color: '#F59E0B' },
      { tarif: 'Pass Samedi',           nb: 596,   color: '#06B6D4' },
      { tarif: 'Pass Dimanche',         nb: 1885,  color: '#10B981' },
      { tarif: 'Ambassadeur',           nb: 166,   color: '#F97316' },
    ],
  },
  2025: {
    plateforme:   'Canal billetterie principal',
    scans:        16810,
    ca_billet:    929695,
    nb_commandes: 2002,
    familles_tarifaires: [
      { tarif: 'Pass Week-End Regular', nb: 8689,  color: '#068EEA' },
      { tarif: 'Pass Zone Premium',     nb: 333,   color: '#8B5CF6' },
      { tarif: 'CSE & Partenaires',     nb: 2704,  color: '#F59E0B' },
      { tarif: 'Invitation Zone A',     nb: 2928,  color: '#F97316' },
      { tarif: 'Invitation Zone B',     nb: 2312,  color: '#EF4444' },
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
