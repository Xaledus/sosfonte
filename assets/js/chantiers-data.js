/* ═══════════════════════════════════════════════════════════════════
   SOS FONTE — Données chantiers centralisées
   Source unique pour index.html (featured) et realisations.html (tous)

   AJOUTER UN CHANTIER :
     1. Ajouter un objet dans window.CHANTIERS ci-dessous
     2. featured: true  → apparaît aussi dans le shortcut accueil (max 5)
     3. featured: false → visible uniquement sur realisations.html
     4. cover + photos  → carte avec photo + galerie lightbox
   ═══════════════════════════════════════════════════════════════════ */

(function () {

// ── Données ──────────────────────────────────────────────────────────

window.CHANTIERS = [
  {
    id:       'paris17-colonne-2024',
    featured: true,
    type:     'Remplacement colonne',
    titre:    'Colonne EU complète — immeuble 1910',
    lieu:     'Paris 17e',
    details:  '6 niveaux · 8 jours · Rapport assurance fourni',
    tags:     ['6 niveaux', '8 jours', 'Décennale'],
    gradient: 'linear-gradient(135deg,#1a3a5c,#0d2438)',
    icon:     '🏗️',
    cover:    'photos/chantiers/paris17-colonne-2024/IMG-20250812-WA0003.jpg',
    photos: [
      { src: 'photos/chantiers/paris17-colonne-2024/IMG-20250812-WA0003.jpg', cap: 'Collecteur — travaux en cours' },
      { src: 'photos/chantiers/paris17-colonne-2024/IMG20250617133227.jpg',   cap: 'Reprise colonne fonte — logement étage 2 A' },
      { src: 'photos/chantiers/paris17-colonne-2024/IMG20250618162740.jpg',   cap: 'Fin des travaux de reprise de la colonne — logement étage 2 A' },
      { src: 'photos/chantiers/paris17-colonne-2024/IMG20250619124530.jpg',   cap: 'Reprise coffrage et appareillage après travaux sur la colonne — logement étage 2 A' },
      { src: 'photos/chantiers/paris17-colonne-2024/IMG-20250826-WA0022.jpg', cap: 'Reprise raccordement colonne 1 sur collecteur' },
      { src: 'photos/chantiers/paris17-colonne-2024/IMG-20250826-WA0008.jpg', cap: 'Collecteur après reprise, pose, tests et finitions' },
    ]
  },
  {
    id:       'neuilly-urgence-2024',
    featured: true,
    type:     'Urgence fuite',
    titre:    'Fuite fonte cave — intervention J+1',
    lieu:     'Neuilly-sur-Seine (92)',
    details:  'Diagnostic + réparation jonction fonte/PVC',
    tags:     [],
    gradient: 'linear-gradient(135deg,#1a4a3a,#0d3028)',
    icon:     '⚡',
    cover:    null,
    photos:   []
  },
  {
    id:       'paris16-diagnostic-2024',
    featured: true,
    type:     'Diagnostic',
    titre:    'Inspection réseau — rapport assurance',
    lieu:     'Paris 16e',
    details:  'Copropriété 32 lots · Caméra auto-propulsée',
    tags:     [],
    gradient: 'linear-gradient(135deg,#3a2a1a,#281a0d)',
    icon:     '🔍',
    cover:    null,
    photos:   []
  },
  {
    id:       'vincennes-reparation-2024',
    featured: true,
    type:     'Réparation',
    titre:    'Reprise jonction fonte/PVC',
    lieu:     'Vincennes (94)',
    details:  'Intervention cave · Rapport technique fourni',
    tags:     [],
    gradient: 'linear-gradient(135deg,#1a2a1a,#0d1a0d)',
    icon:     '🔧',
    cover:    null,
    photos:   []
  },
  {
    id:       'paris-syndic-2024',
    featured: true,
    type:     'Contrat syndic',
    titre:    'Maintenance annuelle — 4 immeubles',
    lieu:     'Cabinet Paris Ouest',
    details:  'Tarifs bloqués 12 mois · Urgences prioritaires',
    tags:     [],
    gradient: 'linear-gradient(135deg,#2a1a3a,#1a0d28)',
    icon:     '📋',
    cover:    null,
    photos:   []
  },
  {
    id:       'paris8-colonne-2024',
    featured: false,
    type:     'Remplacement colonne',
    titre:    'Colonne EV — immeuble haussmannien',
    lieu:     'Paris 8e',
    details:  '5 niveaux · Sans casse parties communes',
    tags:     [],
    gradient: 'linear-gradient(135deg,#3a1a1a,#280d0d)',
    icon:     '🏛️',
    cover:    null,
    photos:   []
  }
];

// ── Lightbox partagée ────────────────────────────────────────────────

var _lb = { cur: 0, photos: [] };

function _lbInit() {
  if (document.getElementById('sf-lightbox')) return;
  var el = document.createElement('div');
  el.id = 'sf-lightbox';
  el.style.cssText = 'display:none;position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,0.92);align-items:center;justify-content:center;flex-direction:column';
  el.innerHTML =
    '<button onclick="window._lbClose()" style="position:absolute;top:16px;right:20px;background:none;border:none;color:white;font-size:32px;cursor:pointer;line-height:1;z-index:1">✕</button>' +
    '<div style="position:relative;max-width:90vw;max-height:80vh;display:flex;align-items:center;justify-content:center">' +
      '<button onclick="window._lbNav(-1)" style="position:absolute;left:-52px;background:rgba(255,255,255,0.1);border:none;color:white;font-size:28px;cursor:pointer;width:44px;height:44px;border-radius:50%">‹</button>' +
      '<img id="sf-lb-img" src="" alt="" style="max-width:90vw;max-height:80vh;object-fit:contain;border-radius:8px;display:block">' +
      '<button onclick="window._lbNav(1)" style="position:absolute;right:-52px;background:rgba(255,255,255,0.1);border:none;color:white;font-size:28px;cursor:pointer;width:44px;height:44px;border-radius:50%">›</button>' +
    '</div>' +
    '<div id="sf-lb-cap" style="color:rgba(255,255,255,0.6);font-size:13px;margin-top:14px;text-align:center;max-width:600px;padding:0 20px"></div>' +
    '<div id="sf-lb-dots" style="display:flex;gap:8px;margin-top:12px"></div>';
  el.addEventListener('click', function (e) { if (e.target === el) window._lbClose(); });
  document.body.appendChild(el);
  document.addEventListener('keydown', function (e) {
    if (document.getElementById('sf-lightbox').style.display === 'none') return;
    if (e.key === 'ArrowRight') window._lbNav(1);
    if (e.key === 'ArrowLeft')  window._lbNav(-1);
    if (e.key === 'Escape')     window._lbClose();
  });
}

function _lbShow(idx) {
  _lb.cur = (idx + _lb.photos.length) % _lb.photos.length;
  document.getElementById('sf-lb-img').src = _lb.photos[_lb.cur].src;
  document.getElementById('sf-lb-cap').textContent = _lb.photos[_lb.cur].cap;
  var ds = document.getElementById('sf-lb-dots').children;
  for (var i = 0; i < ds.length; i++)
    ds[i].style.background = i === _lb.cur ? '#4dd9c0' : 'rgba(255,255,255,0.3)';
}

window._lbOpen = function (photos, startIdx) {
  _lbInit();
  _lb.photos = photos;
  var dots = document.getElementById('sf-lb-dots');
  dots.innerHTML = '';
  photos.forEach(function (_, i) {
    var d = document.createElement('div');
    d.style.cssText = 'width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,0.3);cursor:pointer;transition:background .2s';
    (function (ii) { d.addEventListener('click', function () { _lbShow(ii); }); })(i);
    dots.appendChild(d);
  });
  _lbShow(startIdx || 0);
  document.getElementById('sf-lightbox').style.display = 'flex';
  document.body.style.overflow = 'hidden';
};

window._lbClose = function () {
  document.getElementById('sf-lightbox').style.display = 'none';
  document.body.style.overflow = '';
};

window._lbNav = function (dir) { _lbShow(_lb.cur + dir); };

// ── Render : realisations.html (tous les chantiers) ──────────────────

window.renderRealisations = function () {
  var grid = document.getElementById('chantiers-grid');
  if (!grid) return;
  grid.innerHTML = '';

  window.CHANTIERS.forEach(function (c) {
    var div = document.createElement('div');
    div.style.cssText = 'background:' + c.gradient + ';border-radius:16px;overflow:hidden;position:relative;cursor:pointer;transition:transform .3s';
    div.addEventListener('mouseenter', function () { this.style.transform = 'translateY(-4px)'; });
    div.addEventListener('mouseleave', function () { this.style.transform = 'translateY(0)'; });

    var html = '';

    if (c.cover) {
      html +=
        '<div style="height:200px;background-image:url(\'' + c.cover + '\');background-size:cover;background-position:center;position:relative">' +
          '<div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,0) 40%,rgba(0,0,0,0.7) 100%)"></div>' +
          (c.photos.length > 1
            ? '<div style="position:absolute;top:12px;right:12px;background:rgba(0,0,0,0.5);color:white;font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;backdrop-filter:blur(4px)">📸 ' + c.photos.length + ' photos</div>'
            : '') +
        '</div>';
      div.addEventListener('click', (function (photos) {
        return function () { window._lbOpen(photos, 0); };
      })(c.photos));
    }

    var pad = c.cover ? '20px 24px 24px' : '48px 36px 36px';
    html +=
      '<div style="padding:' + pad + ';position:relative">' +
        (c.cover ? '' : '<div style="font-size:48px;margin-bottom:20px;opacity:0.15;position:absolute;top:20px;right:20px">' + c.icon + '</div>') +
        '<span style="font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--teal-light)">' + c.type + '</span>' +
        '<h3 style="font-family:\'Poppins\',sans-serif;font-size:20px;font-weight:700;color:white;margin:' + (c.cover ? '8px' : '10px') + ' 0 6px;line-height:1.2">' + c.titre + '</h3>' +
        '<p style="font-size:13px;color:rgba(255,255,255,0.5);margin-bottom:' + (c.cover ? '6px' : '8px') + '">' + c.lieu + '</p>' +
        '<p style="font-size:13px;color:rgba(255,255,255,0.35);font-weight:300">' + c.details + '</p>' +
      '</div>';

    div.innerHTML = html;
    grid.appendChild(div);
  });
};

// ── Render : index.html (featured uniquement, max 5) ─────────────────

window.renderIndexChantiers = function () {
  var grid = document.getElementById('index-chantiers-grid');
  if (!grid) return;
  grid.innerHTML = '';

  var featured = window.CHANTIERS.filter(function (c) { return c.featured; }).slice(0, 5);

  featured.forEach(function (c) {
    var div = document.createElement('div');
    div.className = 'real-card';

    if (c.photos.length) {
      div.style.cursor = 'pointer';
      div.addEventListener('click', (function (photos) {
        return function () { window._lbOpen(photos, 0); };
      })(c.photos));
    }

    var tagsHtml = '';
    if (c.tags.length) {
      tagsHtml = '<div style="display:flex;gap:8px;flex-wrap:wrap">';
      c.tags.forEach(function (t, ti) {
        tagsHtml +=
          '<span style="background:' +
            (ti === 0
              ? 'rgba(23,181,166,0.25);border:1px solid rgba(23,181,166,0.4);color:var(--teal-light);font-weight:600'
              : 'rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);color:rgba(255,255,255,0.6);font-weight:500') +
            ';padding:4px 10px;border-radius:100px;font-size:11px">' + t + '</span>';
      });
      tagsHtml += '</div>';
    }

    var locStr = c.lieu;
    if (!c.tags.length && c.details) locStr += ' — ' + c.details;

    div.innerHTML =
      '<div class="real-card-bg" style="' +
        (c.cover ? 'background-image:url(\'' + c.cover + '\');background-size:cover;background-position:center' : '') +
      '">' +
        (c.cover ? '' : '<div class="real-pipe-icon">' + c.icon + '</div>') +
      '</div>' +
      '<div class="real-overlay">' +
        tagsHtml +
        '<div>' +
          '<p class="real-type">' + c.type + '</p>' +
          '<p class="real-title">' + c.titre + '</p>' +
          '<p class="real-loc">' + locStr + '</p>' +
        '</div>' +
      '</div>';

    grid.appendChild(div);
  });
};

})();
