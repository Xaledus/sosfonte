/* ═══════════════════════════════════════════════════════════════════════════
   SOS FONTE — Configuration globale du site
   ► Modifier ICI pour mettre à jour téléphone, WhatsApp, email, adresse, etc.
   ► Chargé en premier dans <head> de chaque page HTML.
   ══════════════════════════════════════════════════════════════════════════ */

window.SFC = {

  /* ── TÉLÉPHONE ─────────────────────────────────────────────────────────── */
  phone: {
    raw:     '0180846040',       // href="tel:{raw}"
    e164:    '+33180846040',     // JSON-LD / international
    wa:      '33180846040',      // wa.me/{wa}?text=... (sans le +)
    display: '01 80 84 60 40',  // texte affiché
  },

  /* ── EMAIL ──────────────────────────────────────────────────────────────── */
  email: 'contact@sosfonte.com',

  /* ── ADRESSE ────────────────────────────────────────────────────────────── */
  address: {
    street:  '108B rue des Maraîchers',
    zip:     '91140',
    city:    'Villebon-sur-Yvette',
    full:    '108B rue des Maraîchers, 91140 Villebon-sur-Yvette',
    mapsQ:   '108B+rue+des+Maraîchers,+91140+Villebon-sur-Yvette,+France',
  },

  /* ── SOCIÉTÉ ────────────────────────────────────────────────────────────── */
  company: {
    name:    'SOS FONTE',
    legal:   'FX Services SAS',
    siret:   '950 771 527',
    siren:   '948 147 962',
    owner:   'AIFOS',
  },

  /* ── WHATSAPP — textes pré-remplis ──────────────────────────────────────── */
  wa: {
    default:  'Bonjour%2C%20j%27ai%20une%20question%20concernant%20mes%20canalisations%20en%20fonte.',
    urgence:  'Bonjour%2C%20j%27ai%20une%20urgence%20sur%20une%20canalisation%20en%20fonte.',
    devis:    'Bonjour%2C%20je%20souhaite%20obtenir%20un%20devis%20pour%20mes%20canalisations.',
    contact:  'Bonjour%2C%20j%27ai%20une%20question%20concernant%20mes%20canalisations%20en%20fonte.',
  },

  /* ── FORMSPREE ──────────────────────────────────────────────────────────── */
  formspree: 'https://formspree.io/f/xpqnzoyg',

  /* ── SUPABASE — Edge Function ingest-lead ───────────────────────────────── */
  /* Remplacer YOUR_PROJECT_REF par la référence du projet Supabase.           */
  /* Visible dans : Supabase Dashboard → Settings → API → Project URL          */
  supabase: {
    ingestUrl: 'https://xhxqxyojhloylysaqhjg.supabase.co/functions/v1/ingest-lead',
    anonKey:   'sb_publishable_3rUf6bkw-WVb-z6SBUchIQ_h2sjWCKI',
  },

  /* ── COPY CLÉ — titres modifiables sans toucher au HTML ─────────────────── */
  copy: {
    prestige: {
      ctaTitle:    'Votre lieu mérite une intervention à sa hauteur',  // prestige.html CTA h2
      heroTitle:   "L'intervention d'exception pour les lieux sensibles", // services.html service 08
      teaserTitle: 'Copropriétés de prestige & lieux sensibles',          // syndics.html teaser
    },
    faq: {
      heroTitle: 'Tout ce que vous voulez savoir sur la fonte & nos interventions',
    },
  },

};

/* Helper : construit une URL WhatsApp complète */
window.SFC.waUrl = function(type) {
  var t = (window.SFC.wa[type] || window.SFC.wa.default);
  return 'https://wa.me/' + window.SFC.phone.wa + '?text=' + t;
};
