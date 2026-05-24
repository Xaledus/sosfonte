/* ═══════════════════════════════════════════════════════════════════════════
   SOS FONTE — Hydratation DOM depuis site-config.js
   ► Chargé en dernier, avant </body>, sur chaque page HTML.
   ► Dépend de window.SFC (défini dans site-config.js).

   Attributs HTML reconnus :
     data-sfc="tel"            → <a> : met à jour href="tel:{phone.raw}"
     data-sfc="tel-urgence"    → idem + texte interne mis à jour
     data-sfc="wa"             → <a> : href WhatsApp texte par défaut
     data-sfc="wa-urgence"     → <a> : href WhatsApp texte urgence
     data-sfc="wa-devis"       → <a> : href WhatsApp texte devis
     data-sfc="wa-contact"     → <a> : href WhatsApp texte contact
     data-sfc="email"          → <a> : href="mailto:{email}"
     data-sfc="phone-display"  → tout élément : textContent = numéro formaté
     data-sfc="address"        → tout élément : textContent = adresse complète
     data-sfc="jsonld"         → <script type="application/ld+json"> : re-sérialise
   ══════════════════════════════════════════════════════════════════════════ */

(function () {
  if (!window.SFC) return; // sécurité : site-config.js doit être chargé avant

  var S = window.SFC;

  /* ── Liens téléphone ──────────────────────────────────────────────────── */
  document.querySelectorAll('[data-sfc="tel"], [data-sfc="tel-urgence"]').forEach(function (el) {
    el.href = 'tel:' + S.phone.raw;
  });

  /* ── Liens WhatsApp ───────────────────────────────────────────────────── */
  ['wa', 'wa-urgence', 'wa-devis', 'wa-contact'].forEach(function (type) {
    var waType = type === 'wa' ? 'default' : type.replace('wa-', '');
    document.querySelectorAll('[data-sfc="' + type + '"]').forEach(function (el) {
      el.href = S.waUrl(waType);
    });
  });

  /* ── Liens email ──────────────────────────────────────────────────────── */
  document.querySelectorAll('[data-sfc="email"]').forEach(function (el) {
    el.href = 'mailto:' + S.email;
  });

  /* ── Texte numéro de téléphone ────────────────────────────────────────── */
  document.querySelectorAll('[data-sfc="phone-display"]').forEach(function (el) {
    el.textContent = S.phone.display;
  });

  /* ── Texte adresse ────────────────────────────────────────────────────── */
  document.querySelectorAll('[data-sfc="address"]').forEach(function (el) {
    el.textContent = S.address.full;
  });

  /* ── JSON-LD : mise à jour du bloc structuré ──────────────────────────── */
  var jsonldScript = document.querySelector('script[type="application/ld+json"]');
  if (jsonldScript) {
    try {
      var data = JSON.parse(jsonldScript.textContent);
      if (data.telephone !== undefined) data.telephone = S.phone.e164;
      if (data.email     !== undefined) data.email     = S.email;
      if (data.address) {
        data.address.streetAddress  = S.address.street;
        data.address.addressLocality = S.address.city;
        data.address.postalCode      = S.address.zip;
      }
      jsonldScript.textContent = JSON.stringify(data, null, 2);
    } catch (e) { /* JSON-LD mal formé — on laisse en l'état */ }
  }

  /* ── Iframe Google Maps ───────────────────────────────────────────────── */
  document.querySelectorAll('iframe[data-sfc="map"]').forEach(function (el) {
    var base = 'https://maps.google.com/maps?q=' + S.address.mapsQ + '&t=&z=15&ie=UTF8&iwloc=&output=embed';
    el.src = base;
    el.title = S.company.name + ' — ' + S.address.full;
  });

})();
