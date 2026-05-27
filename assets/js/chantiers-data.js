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
    type:     'Remplacement colonne et collecteur',
    titre:    'Colonne EU/EV complète — immeuble 1910',
    lieu:     'Paris 17e',
    details:  '6 niveaux · 8 jours · Rapport assurance fourni',
    tags:     ['6 niveaux', '8 jours', 'Décennale'],
    gradient: 'linear-gradient(135deg,#1a3a5c,#0d2438)',
    icon:     '🏗️',
    cover:    'photos/chantiers/paris17-colonne-2024/COUVERTURE_PARIS%2017.jpg',
    photos: [
      { src: 'photos/chantiers/paris17-colonne-2024/COUVERTURE_PARIS%2017.jpg', cap: 'Collecteur SME DN125/150/200 — chantier Paris 17e',               tag: 'SME DN100 · DN125 · DN150 · DN200' },
      { src: 'photos/chantiers/paris17-colonne-2024/IMG-20250812-WA0003.jpg',   cap: 'Collecteur — travaux en cours',                                   tag: 'SME DN125 · DN150 · DN200' },
      { src: 'photos/chantiers/paris17-colonne-2024/IMG20250617133227.jpg',     cap: 'Reprise colonne fonte — logement étage 2 A',                      tag: 'SME DN100' },
      { src: 'photos/chantiers/paris17-colonne-2024/IMG20250618162740.jpg',     cap: 'Fin des travaux de reprise de la colonne — logement étage 2 A',   tag: 'SME DN100' },
      { src: 'photos/chantiers/paris17-colonne-2024/IMG20250619124530.jpg',     cap: 'Reprise coffrage et appareillage après travaux sur la colonne — logement étage 2 A' },
      { src: 'photos/chantiers/paris17-colonne-2024/IMG-20250826-WA0022.jpg',   cap: 'Reprise raccordement colonne 1 sur collecteur',                   tag: 'SME DN100' },
      { src: 'photos/chantiers/paris17-colonne-2024/IMG-20250826-WA0008.jpg',   cap: 'Collecteur après reprise, pose, tests et finitions',              tag: 'SME DN125 · DN150 · DN200' },
    ]
  },
  {
    id:       'neuilly-urgence-2025',
    featured: true,
    type:     'Urgence fuite',
    titre:    'Fuite fonte cave — intervention J+1',
    lieu:     'Neuilly-sur-Seine (92)',
    details:  '2 jours · Remplacement colonnes EU/EV DN100',
    tags:     ['2 jours', 'Colonnes EU/EV', 'DN100'],
    gradient: 'linear-gradient(135deg,#1a4a3a,#0d3028)',
    icon:     '⚡',
    cover:    'photos/chantiers/Fuite%20fonte%20cave%20%E2%80%94%20Neuilly%2092/Couverture.jpg',
    photos: [
      { src: 'photos/chantiers/Fuite%20fonte%20cave%20%E2%80%94%20Neuilly%2092/Couverture.jpg',            cap: 'Colonne fonte en cave — état avant intervention',    tag: 'Fonte SMU — existant' },
      { src: 'photos/chantiers/Fuite%20fonte%20cave%20%E2%80%94%20Neuilly%2092/IMG20250717112550.jpg',     cap: 'Diagnostic — localisation de la fuite',              tag: 'Fonte SMU — existant' },
      { src: 'photos/chantiers/Fuite%20fonte%20cave%20%E2%80%94%20Neuilly%2092/IMG-20250717-WA0036.jpg',   cap: 'Colonne EV — vétusté avancée constatée',            tag: 'Fonte SMU EV — existant' },
      { src: 'photos/chantiers/Fuite%20fonte%20cave%20%E2%80%94%20Neuilly%2092/IMG-20250717-WA0040.jpg',   cap: 'Dépose de la colonne fonte existante',               tag: 'Fonte SMU EU — existant' },
      { src: 'photos/chantiers/Fuite%20fonte%20cave%20%E2%80%94%20Neuilly%2092/IMG-20250717-WA0049.jpg',   cap: 'Mise en place nouvelle colonne SME DN100',           tag: 'SME DN100 — neuf' },
      { src: 'photos/chantiers/Fuite%20fonte%20cave%20%E2%80%94%20Neuilly%2092/IMG-20250901-WA0001.jpg',   cap: 'Raccordements et finitions',                         tag: 'SME DN100 — neuf' },
      { src: 'photos/chantiers/Fuite%20fonte%20cave%20%E2%80%94%20Neuilly%2092/IMG-20250901-WA0003.jpg',   cap: 'Travaux terminés — colonnes EU/EV remplacées',       tag: 'SME DN100 — neuf' },
      { src: 'photos/chantiers/Fuite%20fonte%20cave%20%E2%80%94%20Neuilly%2092/IMG20250829094333.jpg',     cap: 'Vue d\'ensemble cave après travaux',                 tag: 'SME DN100 — neuf' },
    ]
  },
  {
    id:       'paris14-jonction-2024',
    featured: true,
    type:     'Reprise jonction Fonte/PVC/Plomb',
    titre:    'Collecteur & jonctions — boutique RDC',
    lieu:     'Paris 14e',
    details:  '2 jours · Collecteur SME DN125 · Mise en conformité',
    tags:     ['2 jours', 'DN125', 'Fonte/PVC/Plomb'],
    gradient: 'linear-gradient(135deg,#2a1a3a,#1a0d2a)',
    icon:     '🔧',
    cover:    'photos/chantiers/Paris%2014%20Reprise%20jonction%20fontePVC/couverture.jpg',
    photos: [
      { src: 'photos/chantiers/Paris%2014%20Reprise%20jonction%20fontePVC/couverture.jpg',        cap: 'Boutique RDC — état des jonctions avant intervention',          tag: 'Fonte · PVC · Plomb — existant' },
      { src: 'photos/chantiers/Paris%2014%20Reprise%20jonction%20fontePVC/IMG20250514140336.jpg', cap: 'Collecteur fonte DN125 fuillard en faux-plafond boutique',     tag: 'Fonte SMU DN125 — existant' },
      { src: 'photos/chantiers/Paris%2014%20Reprise%20jonction%20fontePVC/IMG20250515093845.jpg', cap: 'Dépose du faux-plafond — accès au collecteur',                 tag: 'Fonte SMU DN125 — existant' },
      { src: 'photos/chantiers/Paris%2014%20Reprise%20jonction%20fontePVC/IMG20250515093855.jpg', cap: 'Collecteur et jonctions Fonte/PVC/Plomb avant reprise',        tag: 'Fonte · PVC · Plomb — existant' },
      { src: 'photos/chantiers/Paris%2014%20Reprise%20jonction%20fontePVC/IMG20250515093908.jpg', cap: 'Détail jonction non conforme — cause du défaut d\'étanchéité', tag: 'Jonction Fonte/PVC' },
      { src: 'photos/chantiers/Paris%2014%20Reprise%20jonction%20fontePVC/IMG20250515100759.jpg', cap: 'Pose nouveau collecteur SME DN125 — reprise des jonctions',    tag: 'SME DN125 — neuf' },
      { src: 'photos/chantiers/Paris%2014%20Reprise%20jonction%20fontePVC/IMG20250515100817.jpg', cap: 'Travaux terminés — collecteur et jonctions mis en conformité', tag: 'SME DN125 — neuf' },
    ]
  },
  {
    id:       'paris16-ep-2025',
    featured: true,
    type:     'Remplacement descente EP',
    titre:    'Descente EP fonte — immeuble haussmannien',
    lieu:     'Paris 16e',
    details:  '7 étages · Dépose, pose, mise en peinture · DN100',
    tags:     ['7 étages', 'DN100', 'EP fonte'],
    gradient: 'linear-gradient(135deg,#1a2a3a,#0d1a28)',
    icon:     '🏛️',
    cover:    'photos/chantiers/paris16-ep-2025/couverture.jpg',
    photos: [
      { src: 'photos/chantiers/paris16-ep-2025/couverture.jpg',  cap: '', tag: 'EP DN100 · Immeuble haussmannien 7 étages' },
      { src: 'photos/chantiers/paris16-ep-2025/photo-01.jpg',    cap: '', tag: 'Dépose EP fonte DN100' },
      { src: 'photos/chantiers/paris16-ep-2025/photo-02.jpg',    cap: '', tag: 'Dépose EP fonte DN100' },
      { src: 'photos/chantiers/paris16-ep-2025/photo-03.jpg',    cap: '', tag: 'Fourniture · Pose EP DN100' },
      { src: 'photos/chantiers/paris16-ep-2025/photo-04.jpg',    cap: '', tag: 'Fourniture · Pose EP DN100' },
      { src: 'photos/chantiers/paris16-ep-2025/photo-05.jpg',    cap: '', tag: 'Pose EP SME DN100' },
      { src: 'photos/chantiers/paris16-ep-2025/photo-06.jpg',    cap: '', tag: 'Mise en peinture · EP DN100' },
      { src: 'photos/chantiers/paris16-ep-2025/photo-07.jpg',    cap: '', tag: 'EP DN100 · Paris 16e' },
    ]
  },
  {
    id:       'chateau-normandie-2026',
    featured: true,
    type:     'Création réseau évacuation fonte',
    titre:    'Réseau EU — château prestige en réhabilitation',
    lieu:     'Normandie',
    details:  '4 jours · Fonte SMU DN100 · Conception & pose',
    tags:     ['4 jours', 'SMU DN100', 'Prestige'],
    gradient: 'linear-gradient(135deg,#1a2a1a,#0d1a0d)',
    icon:     '🏰',
    cover:    'photos/chantiers/chateau-normandie-2026/couverture.jpg',
    photos: [
      { src: 'photos/chantiers/chateau-normandie-2026/couverture.jpg',  cap: '', tag: 'Château prestige · Normandie' },
      { src: 'photos/chantiers/chateau-normandie-2026/photo-01.jpg',    cap: '', tag: 'Création réseau EU · SMU DN100' },
      { src: 'photos/chantiers/chateau-normandie-2026/photo-02.jpg',    cap: '', tag: 'Création réseau EU · SMU DN100' },
      { src: 'photos/chantiers/chateau-normandie-2026/photo-03.jpg',    cap: '', tag: 'Création réseau évacuation' },
      { src: 'photos/chantiers/chateau-normandie-2026/photo-04.jpg',    cap: '', tag: 'Création réseau évacuation' },
      { src: 'photos/chantiers/chateau-normandie-2026/photo-05.jpg',    cap: '', tag: 'Pose SMU DN100 · Château' },
      { src: 'photos/chantiers/chateau-normandie-2026/photo-06.jpg',    cap: '', tag: 'Pose SMU DN100 · Château' },
      { src: 'photos/chantiers/chateau-normandie-2026/photo-07.jpg',    cap: '', tag: 'Réseau EU · Design & mise en place' },
      { src: 'photos/chantiers/chateau-normandie-2026/photo-08.jpg',    cap: '', tag: 'Réseau EU · Design & mise en place' },
      { src: 'photos/chantiers/chateau-normandie-2026/photo-09.jpg',    cap: '', tag: 'Raccordements SMU DN100' },
      { src: 'photos/chantiers/chateau-normandie-2026/photo-10.jpg',    cap: '', tag: 'Raccordements SMU DN100' },
    ]
  },
  {
    id:       'vincennes-reparation-2024',
    featured: true,
    type:     'Remplacement fonte SME + reprise carrelage',
    titre:    'Colonne SDB — dégât des eaux voisin',
    lieu:     'Vincennes (94)',
    details:  '3 jours · Fonte SME DN100 · Reprise plomberie & carrelage',
    tags:     ['3 jours', 'DN100', 'Tout compris'],
    gradient: 'linear-gradient(135deg,#1a2a3a,#0d1a28)',
    icon:     '🔧',
    cover:    'photos/chantiers/vincennes-reparation-2024/couverture.jpg',
    photos: [
      { src: 'photos/chantiers/vincennes-reparation-2024/couverture.jpg',  cap: '', tag: 'Fonte SMU DN100 — existant' },
      { src: 'photos/chantiers/vincennes-reparation-2024/photo-01.jpg',    cap: '', tag: 'Fonte SMU DN100 — existant' },
      { src: 'photos/chantiers/vincennes-reparation-2024/photo-02.jpg',    cap: '', tag: 'Fonte SMU DN100 — existant' },
      { src: 'photos/chantiers/vincennes-reparation-2024/photo-03.jpg',    cap: '', tag: 'Fonte SMU DN100 — existant' },
      { src: 'photos/chantiers/vincennes-reparation-2024/photo-04.jpg',    cap: '', tag: 'SME DN100 — en cours' },
      { src: 'photos/chantiers/vincennes-reparation-2024/photo-05.jpg',    cap: '', tag: 'SME DN100 — en cours' },
      { src: 'photos/chantiers/vincennes-reparation-2024/photo-06.jpg',    cap: '', tag: 'SME DN100 — neuf' },
      { src: 'photos/chantiers/vincennes-reparation-2024/photo-07.jpg',    cap: '', tag: 'SME DN100 — neuf' },
      { src: 'photos/chantiers/vincennes-reparation-2024/photo-08.jpg',    cap: '', tag: 'Reprise SME DN100 · Vincennes' },
      { src: 'photos/chantiers/vincennes-reparation-2024/photo-09.jpg',    cap: '', tag: 'Reprise SME DN100 · Vincennes' },
      { src: 'photos/chantiers/vincennes-reparation-2024/photo-10.jpg',    cap: '', tag: 'Remplacement fonte SME DN100' },
      { src: 'photos/chantiers/vincennes-reparation-2024/photo-11.jpg',    cap: '', tag: 'Remplacement fonte SME DN100' },
      { src: 'photos/chantiers/vincennes-reparation-2024/photo-12.jpg',    cap: '', tag: 'Reprise carrelage SDB' },
      { src: 'photos/chantiers/vincennes-reparation-2024/photo-13.jpg',    cap: '', tag: 'Reprise carrelage SDB' },
      { src: 'photos/chantiers/vincennes-reparation-2024/photo-14.jpg',    cap: '', tag: 'Tout compris — fonte & carrelage' },
    ]
  },
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
      '<button onclick="window._lbNav(-1)" style="position:absolute;left:8px;background:rgba(0,0,0,0.45);border:none;color:white;font-size:28px;cursor:pointer;width:44px;height:44px;border-radius:50%;z-index:2">‹</button>' +
      '<img id="sf-lb-img" src="" alt="" style="max-width:90vw;max-height:80vh;object-fit:contain;border-radius:8px;display:block">' +
      '<div id="sf-lb-tag" style="position:absolute;bottom:12px;left:12px;background:rgba(23,181,166,0.92);color:white;font-family:Poppins,sans-serif;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:5px 12px;border-radius:20px;backdrop-filter:blur(4px);display:none;pointer-events:none"></div>' +
      '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;user-select:none">' +
        '<span style="font-family:Poppins,sans-serif;font-size:clamp(18px,4vw,32px);font-weight:700;color:rgba(255,255,255,0.22);letter-spacing:.15em;text-transform:uppercase;transform:rotate(-30deg);white-space:nowrap;text-shadow:0 1px 4px rgba(0,0,0,0.4)">SOS FONTE</span>' +
      '</div>' +
      '<button onclick="window._lbNav(1)" style="position:absolute;right:8px;background:rgba(0,0,0,0.45);border:none;color:white;font-size:28px;cursor:pointer;width:44px;height:44px;border-radius:50%;z-index:2">›</button>' +
    '</div>' +
    '<div id="sf-lb-cap" style="color:rgba(255,255,255,0.6);font-size:13px;margin-top:14px;text-align:center;max-width:600px;padding:0 20px;display:none"></div>' +
    '<div id="sf-lb-dots" style="display:flex;gap:8px;margin-top:12px"></div>';
  el.addEventListener('click', function (e) { if (e.target === el) window._lbClose(); });
  var _touchX = 0;
  el.addEventListener('touchstart', function(e){ _touchX = e.changedTouches[0].clientX; }, {passive:true});
  el.addEventListener('touchend', function(e){
    var dx = e.changedTouches[0].clientX - _touchX;
    if (Math.abs(dx) > 50) { if (dx < 0) window._lbNav(1); else window._lbNav(-1); }
  }, {passive:true});
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
  var photo = _lb.photos[_lb.cur];
  document.getElementById('sf-lb-img').src = photo.src;
  var capEl = document.getElementById('sf-lb-cap');
  capEl.textContent = photo.cap;
  capEl.style.display = photo.cap ? 'block' : 'none';
  var tagEl = document.getElementById('sf-lb-tag');
  if (photo.tag) {
    tagEl.textContent = photo.tag;
    tagEl.style.display = 'block';
  } else {
    tagEl.style.display = 'none';
  }
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
