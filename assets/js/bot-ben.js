/* ═══════════════════════════════════════════════════════════
   BOT BEN — SOS FONTE  |  JS Vanilla  |  No dependencies
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── CONFIG ─────────────────────────────────────────────── */
  const CFG = {
    formspree:   'https://formspree.io/f/xpqnzoyg',  // même endpoint que les formulaires du site
    phone:       'tel:0180846040',
    phoneDisplay: '01 80 84 60 40',
    wa:          'https://wa.me/33695494371?text=Bonjour%2C%20je%20souhaite%20un%20renseignement%20sur%20mes%20canalisations%20en%20fonte.',
    email:       'contact@sosfonte.com',
  };

  /* ── ASSET PATHS ─────────────────────────────────────────── */
  const BASE = (function () {
    const scripts = document.querySelectorAll('script[src*="bot-ben"]');
    if (scripts.length) {
      const src = scripts[scripts.length - 1].src;
      return src.replace(/\/js\/bot-ben\.js.*$/, '');
    }
    return '/assets';
  })();

  const IMG = {
    face:          BASE + '/ben/master/ben-face.png',
    idle:          BASE + '/ben/master/ben_idle.png',
    bonjour:       BASE + '/ben/animations/Ben-Animation-Bonjour.png',
    jecoute:       BASE + '/ben/animations/Ben-Animation-jecoute.png',
    jexplique:     BASE + '/ben/animations/Ben-Animation-jexplique.png',
    jinterviens:   BASE + '/ben/animations/Ben-Animation-jinterviens.png',
    okParfait:     BASE + '/ben/animations/Ben-Animation-ok_parfait.png',
    cestRegle:     BASE + '/ben/animations/Ben-Animation-c-est-regle.png',
    deborde:       BASE + '/ben/animations/Ben-Animation-deborde.png',
    cestChaud:     BASE + '/ben/animations/Ben-Animation-c-est-chaud.png',
    merci:         BASE + '/ben/animations/Ben-Animation-merci.png',
    bravo:         BASE + '/ben/animations/Ben-Animation-bravo.png',
    auRevoir:      BASE + '/ben/animations/Ben-Animation-au_revoir.png',
    sourire:       BASE + '/ben/expressions/ben-expression-sourire.png',
    clinOeil:      BASE + '/ben/expressions/ben-expression-clin_doeil.png',
    pensif:        BASE + '/ben/expressions/ben-expression-pensif.png',
    rassurant:     BASE + '/ben/expressions/ben-expression-rassurant.png',
    reconnaissant: BASE + '/ben/expressions/ben-expression-reconnaissant.png',
  };

  /* ── STATE ───────────────────────────────────────────────── */
  let isOpen      = false;
  let isOnline    = true;
  let formData    = {};
  let imgA, imgB, currentSlot = 'A';
  let typingEl    = null;
  let preloaded   = false;

  /* ── HELPERS ─────────────────────────────────────────────── */
  function isOffHours() {
    const h = new Date().getHours();
    return h < 7 || h >= 22;
  }

  function preloadImages() {
    if (preloaded) return;
    preloaded = true;
    Object.values(IMG).forEach(src => {
      const i = new Image(); i.src = src;
    });
  }

  /* ── BEN IMAGE FADE ──────────────────────────────────────── */
  function setBenImage(src) {
    const next = currentSlot === 'A' ? imgB : imgA;
    const curr = currentSlot === 'A' ? imgA : imgB;
    next.src = src;
    next.onload = () => {
      next.classList.remove('ben-img-hidden');
      curr.classList.add('ben-img-hidden');
      currentSlot = currentSlot === 'A' ? 'B' : 'A';
    };
    next.onerror = () => { next.src = IMG.face; };
  }

  /* ── DOM BUILD ───────────────────────────────────────────── */
  function buildWidget() {
    /* Trigger button */
    const trigger = document.createElement('button');
    trigger.id = 'ben-trigger';
    trigger.setAttribute('aria-label', 'Ouvrir le chat avec Ben');
    trigger.innerHTML = `<img src="${IMG.face}" alt="Ben SOS FONTE" loading="lazy">
      <span class="ben-notif"></span>`;
    trigger.addEventListener('click', toggleWidget);
    document.body.appendChild(trigger);

    /* Widget window */
    const widget = document.createElement('div');
    widget.id = 'ben-widget';
    widget.setAttribute('role', 'dialog');
    widget.setAttribute('aria-label', 'Chat Ben — SOS FONTE');

    widget.innerHTML = `
      <div class="ben-header">
        <div class="ben-header-img-wrap">
          <img id="ben-img-a" src="${IMG.face}" alt="Ben" loading="lazy">
          <img id="ben-img-b" src="${IMG.face}" alt="Ben" class="ben-img-hidden" loading="lazy">
        </div>
        <div class="ben-header-info">
          <strong>Ben · SOS FONTE</strong>
          <span id="ben-status"><span class="ben-status-dot" id="ben-dot"></span><span id="ben-status-text">En ligne</span></span>
        </div>
        <button class="ben-close-btn" id="ben-close" aria-label="Fermer">✕</button>
      </div>
      <div class="ben-body" id="ben-body"></div>
      <div class="ben-footer" id="ben-footer"></div>`;

    document.body.appendChild(widget);

    imgA = document.getElementById('ben-img-a');
    imgB = document.getElementById('ben-img-b');

    document.getElementById('ben-close').addEventListener('click', closeWidget);
    isOnline = !isOffHours();
    updateStatusUI();
  }

  function updateStatusUI() {
    const dot  = document.getElementById('ben-dot');
    const text = document.getElementById('ben-status-text');
    if (!dot || !text) return;
    if (isOnline) {
      dot.classList.remove('offline');
      text.textContent = 'En ligne';
    } else {
      dot.classList.add('offline');
      text.textContent = 'Hors ligne · rappel demain';
    }
  }

  /* ── WIDGET TOGGLE ───────────────────────────────────────── */
  function toggleWidget() { isOpen ? closeWidget() : openWidget(); }

  function openWidget() {
    preloadImages();
    isOpen = true;
    const w = document.getElementById('ben-widget');
    w.classList.add('ben-open');
    clearBody();
    clearFooter();
    if (isOffHours()) {
      stepOffHours();
    } else {
      stepAccueil();
    }
  }

  function closeWidget() {
    setBenImage(IMG.auRevoir);
    addBubble('bot', 'À bientôt ! 👋<br>📞 ' + CFG.phoneDisplay);
    setTimeout(() => {
      const w = document.getElementById('ben-widget');
      w.classList.remove('ben-open');
      isOpen = false;
      formData = {};
    }, 1500);
  }

  /* ── BODY / FOOTER HELPERS ───────────────────────────────── */
  function clearBody()   { document.getElementById('ben-body').innerHTML   = ''; }
  function clearFooter() { document.getElementById('ben-footer').innerHTML = ''; }

  function addBubble(who, html, delay) {
    return new Promise(resolve => {
      setTimeout(() => {
        removeTyping();
        const b = document.createElement('div');
        b.className = 'ben-bubble ' + who;
        b.innerHTML = html;
        document.getElementById('ben-body').appendChild(b);
        scrollBottom();
        resolve();
      }, delay || 0);
    });
  }

  function showTyping(delay) {
    return new Promise(resolve => {
      setTimeout(() => {
        typingEl = document.createElement('div');
        typingEl.className = 'ben-typing';
        typingEl.innerHTML = '<span></span><span></span><span></span>';
        document.getElementById('ben-body').appendChild(typingEl);
        scrollBottom();
        resolve();
      }, delay || 0);
    });
  }

  function removeTyping() {
    if (typingEl) { typingEl.remove(); typingEl = null; }
  }

  function scrollBottom() {
    const b = document.getElementById('ben-body');
    b.scrollTop = b.scrollHeight;
  }

  /* Render quick-choice buttons in footer */
  function showChoices(choices) {
    clearFooter();
    const wrap = document.createElement('div');
    wrap.className = 'ben-choices';
    choices.forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'ben-choice-btn';
      btn.innerHTML = c.label;
      btn.addEventListener('click', () => {
        addBubble('user', c.label);
        c.action();
      });
      wrap.appendChild(btn);
    });
    document.getElementById('ben-footer').appendChild(wrap);
  }

  /* Render text input + send button */
  function showTextInput(placeholder, onSend) {
    clearFooter();
    const row = document.createElement('div');
    row.className = 'ben-input-row';
    row.innerHTML = `
      <textarea placeholder="${placeholder}" rows="1"></textarea>
      <button class="ben-send-btn" aria-label="Envoyer">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      </button>`;
    const ta   = row.querySelector('textarea');
    const send = row.querySelector('.ben-send-btn');
    const doSend = () => {
      const v = ta.value.trim();
      if (!v) return;
      onSend(v);
    };
    send.addEventListener('click', doSend);
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); } });
    document.getElementById('ben-footer').appendChild(row);
    ta.focus();
  }

  /* Render form fields */
  function showForm(fields, submitLabel, onSubmit) {
    clearFooter();
    const form = document.createElement('div');
    form.className = 'ben-form';
    const inputs = {};
    fields.forEach(f => {
      const inp = document.createElement('input');
      inp.type        = f.type || 'text';
      inp.placeholder = f.placeholder;
      inp.required    = !!f.required;
      inp.id          = 'ben-field-' + f.key;
      inputs[f.key]   = inp;
      form.appendChild(inp);
    });
    const btn = document.createElement('button');
    btn.className = 'ben-submit-btn';
    btn.textContent = submitLabel;
    btn.addEventListener('click', () => {
      const data = {};
      let valid = true;
      fields.forEach(f => {
        const v = inputs[f.key].value.trim();
        if (f.required && !v) { inputs[f.key].style.borderColor = '#ef4444'; valid = false; return; }
        inputs[f.key].style.borderColor = '';
        data[f.key] = v;
      });
      if (!valid) return;
      Object.assign(formData, data);
      onSubmit(data);
    });
    form.appendChild(btn);
    document.getElementById('ben-footer').appendChild(form);
  }

  /* CTA block (phone + WA) */
  function addCTABlock(waMsg) {
    const waUrl = waMsg
      ? 'https://wa.me/33695494371?text=' + encodeURIComponent(waMsg)
      : CFG.wa;
    const block = document.createElement('div');
    block.className = 'ben-cta-block';
    block.innerHTML = `
      <a href="${CFG.phone}" class="ben-cta-phone">
        📞 ${CFG.phoneDisplay}
      </a>
      <a href="${waUrl}" class="ben-cta-wa" target="_blank" rel="noopener">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        WhatsApp
      </a>`;
    document.getElementById('ben-body').appendChild(block);
    scrollBottom();
  }

  /* ══════════════════════════════════════════════════════════
     STEPS
  ══════════════════════════════════════════════════════════ */

  /* ── STEP 0 — ACCUEIL ─────────────────────────────────── */
  async function stepAccueil() {
    setBenImage(IMG.bonjour);
    await showTyping(200);
    await addBubble('bot', 'Bonjour 👋 Je suis <strong>Ben</strong>, technicien SOS FONTE.<br>Comment puis-je vous aider ?', 900);
    showChoices([
      { label: '🔴 Urgence — fuite active',          action: stepUrgence },
      { label: '🔧 Intervention fonte',               action: stepIntervention },
      { label: '🔍 Diagnostic / curage',              action: stepDiagnostic },
      { label: '📋 Syndic ou Conseil Syndical',       action: stepSyndic },
      { label: '🤝 Professionnel — partenariat',      action: stepPartenaire },
    ]);
  }

  /* ── STEP 1A — URGENCE ────────────────────────────────── */
  async function stepUrgence() {
    clearFooter();
    setBenImage(IMG.cestChaud);
    await showTyping(300);
    await addBubble('bot', "C'est urgent, on ne perd pas de temps !", 800);
    addBubble('bot', '📞 Appelez maintenant :');
    addCTABlock("Bonjour, j'ai une urgence sur une canalisation en fonte. Pouvez-vous intervenir ?");
    setTimeout(async () => {
      setBenImage(IMG.jinterviens);
      await showTyping(0);
      await addBubble('bot', 'Nos techniciens interviennent<br>Paris et IDF <strong>sous 4h</strong>. 🚐', 1200);
      clearFooter();
    }, 3000);
  }

  /* ── STEP 1B — INTERVENTION FONTE ────────────────────── */
  async function stepIntervention() {
    clearFooter();
    setBenImage(IMG.jecoute);
    await showTyping(300);
    await addBubble('bot', 'Je vous écoute. Décrivez votre situation en quelques mots.', 800);
    showTextInput('Ex: fuite colonne EU cave immeuble 1920…', async (txt) => {
      formData.situation = txt;
      clearFooter();
      setBenImage(IMG.pensif);
      await showTyping(400);
      await addBubble('bot', 'Compris. Pour vous rappeler rapidement :', 900);
      showForm([
        { key: 'nom',   placeholder: 'Prénom et Nom *',          required: true },
        { key: 'tel',   placeholder: 'Téléphone *', type: 'tel', required: true },
        { key: 'ville', placeholder: 'Ville de l\'intervention *', required: true },
      ], 'Je veux être rappelé sous 2h →', async (data) => {
        clearFooter();
        setBenImage(IMG.okParfait);
        await showTyping(400);
        await addBubble('bot', `Parfait <strong>${data.nom.split(' ')[0]}</strong> 👌<br>Un technicien vous rappelle sous 2h.<br>📞 ${CFG.phoneDisplay}`, 900);
        sendEmail('Intervention fonte', data);
      });
    });
  }

  /* ── STEP 1C — DIAGNOSTIC / CURAGE ───────────────────── */
  async function stepDiagnostic() {
    clearFooter();
    setBenImage(IMG.pensif);
    await showTyping(300);
    await addBubble('bot', 'Quel type de diagnostic vous concerne ?', 800);
    showChoices([
      { label: 'Recherche de fuite — colorant / gaz traceur', action: () => stepDiagForm('Recherche de fuite') },
      { label: 'Inspection caméra — rapport assurance',        action: () => stepDiagForm('Inspection caméra') },
      { label: 'Curage haute pression',                        action: () => stepDiagForm('Curage haute pression') },
      { label: 'Diagnostic avant achat immobilier',            action: () => stepDiagForm('Diagnostic achat') },
    ]);
  }

  async function stepDiagForm(type) {
    formData.typeDiag = type;
    clearFooter();
    setBenImage(IMG.jexplique);
    await showTyping(300);
    await addBubble('bot', 'On intervient partout en IDF.<br>Dans quelle ville se trouve le bien ?', 800);
    showTextInput('Ex: Paris 15e, Vincennes, Neuilly…', async (ville) => {
      formData.ville = ville;
      clearFooter();
      await showTyping(300);
      await addBubble('bot', 'Votre email pour recevoir le devis ?', 800);
      showTextInput('email@exemple.com', async (email) => {
        formData.email = email;
        clearFooter();
        setBenImage(IMG.cestRegle);
        await showTyping(400);
        await addBubble('bot', `C'est noté ✅<br>Vous recevez un devis sous 24h.<br>📞 ${CFG.phoneDisplay} pour toute urgence.`, 900);
        sendEmail(type, formData);
      });
    });
  }

  /* ── STEP 1D — SYNDIC ─────────────────────────────────── */
  async function stepSyndic() {
    clearFooter();
    setBenImage(IMG.rassurant);
    await showTyping(300);
    await addBubble('bot', 'Bienvenue. Vous êtes au bon endroit.<br>Nous travaillons avec les grands gestionnaires IDF.', 800);
    await addBubble('bot', 'Vous êtes :');
    showChoices([
      { label: 'Gestionnaire / Syndic professionnel', action: () => stepSyndicPortefeuille('Syndic professionnel') },
      { label: 'Membre du Conseil Syndical',           action: () => stepSyndicPortefeuille('Conseil Syndical') },
      { label: 'Administrateur de biens',              action: () => stepSyndicPortefeuille('Administrateur de biens') },
    ]);
  }

  async function stepSyndicPortefeuille(profil) {
    formData.profil = profil;
    clearFooter();
    setBenImage(IMG.jexplique);
    await showTyping(300);
    await addBubble('bot', 'Combien d\'immeubles concernés<br>par des réseaux en fonte ?', 800);
    showChoices([
      { label: '1 immeuble',          action: () => stepSyndicForm('1') },
      { label: '2 à 5 immeubles',     action: () => stepSyndicForm('2-5') },
      { label: 'Plus de 5 immeubles', action: () => stepSyndicForm('5+') },
    ]);
  }

  async function stepSyndicForm(nb) {
    formData.nbImmeubles = nb;
    clearFooter();
    await showTyping(300);
    await addBubble('bot', 'Parfait. Laissez-nous vos coordonnées :', 800);
    showForm([
      { key: 'nom',     placeholder: 'Nom et Prénom *',              required: true },
      { key: 'cabinet', placeholder: 'Cabinet / Société' },
      { key: 'email',   placeholder: 'Email professionnel *', type: 'email', required: true },
      { key: 'tel',     placeholder: 'Téléphone *', type: 'tel', required: true },
    ], 'Recevoir notre offre partenaire →', async (data) => {
      clearFooter();
      setBenImage(IMG.merci);
      await showTyping(400);
      const prenom = data.nom.split(' ')[0];
      await addBubble('bot',
        `Merci <strong>${prenom}</strong> 🙏<br>Notre responsable vous contacte sous 24h ouvrées.<br><br><a href="syndics.html" class="ben-page-link">Découvrez notre offre syndics →</a>`,
        900);
      sendEmail('Syndic', data);
    });
  }

  /* ── STEP 1E — PARTENAIRE PRO ─────────────────────────── */
  async function stepPartenaire() {
    clearFooter();
    setBenImage(IMG.sourire);
    await showTyping(300);
    await addBubble('bot', 'Super, on aime travailler avec des pros 💪<br>Vous êtes :', 800);
    showChoices([
      { label: 'Plombier / Artisan',             action: () => stepPartenaireForm('Plombier / Artisan') },
      { label: 'Bureau d\'études / Architecte',  action: () => stepPartenaireForm('Bureau d\'études') },
      { label: 'Gestionnaire immobilier',        action: () => stepPartenaireForm('Gestionnaire immobilier') },
      { label: 'Autre professionnel',            action: () => stepPartenaireForm('Autre professionnel') },
    ]);
  }

  async function stepPartenaireForm(type) {
    formData.typePartenaire = type;
    clearFooter();
    setBenImage(IMG.jecoute);
    await showTyping(300);
    await addBubble('bot', 'Décrivez votre activité et ce que vous recherchez.', 800);
    showTextInput('Votre message…', async (msg) => {
      formData.message = msg;
      clearFooter();
      await showTyping(300);
      await addBubble('bot', 'Vos coordonnées :', 800);
      showForm([
        { key: 'email', placeholder: 'Email *', type: 'email', required: true },
        { key: 'tel',   placeholder: 'Téléphone', type: 'tel' },
      ], 'Envoyer ma demande →', async (data) => {
        clearFooter();
        setBenImage(IMG.bravo);
        await showTyping(400);
        await addBubble('bot', `Message reçu 🎉<br>Khaled vous répond personnellement sous 48h.<br>📧 ${CFG.email}`, 900);
        sendEmail('Partenaire — ' + type, data);
      });
    });
  }

  /* ── STEP HORS HORAIRES ───────────────────────────────── */
  async function stepOffHours() {
    setBenImage(IMG.deborde);
    await showTyping(200);
    await addBubble('bot', 'On est hors ligne pour l\'instant 😅<br>Laissez votre numéro, on vous rappelle dès demain matin !', 900);
    showForm([
      { key: 'tel', placeholder: 'Votre téléphone *', type: 'tel', required: true },
    ], 'Me rappeler demain', async (data) => {
      clearFooter();
      setBenImage(IMG.reconnaissant);
      await showTyping(400);
      await addBubble('bot', 'Noté 🙏 On vous rappelle dès 7h !', 900);
      sendEmail('Rappel hors-horaires', data);
    });
  }

  /* ── ENVOI FORMSPREE ─────────────────────────────────── */
  function sendEmail(branch, data) {
    const payload = {
      _subject:  '[BOT BEN] ' + branch + ' — ' + (data.nom || data.tel || 'Inconnu'),
      branche:   branch,
      nom:       data.nom       || '—',
      telephone: data.tel       || '—',
      email:     data.email     || '—',
      ville:     data.ville     || formData.ville     || '—',
      message:   data.message   || formData.situation || '—',
      cabinet:   data.cabinet   || '—',
      timestamp: new Date().toLocaleString('fr-FR'),
      page:      window.location.href,
    };

    fetch(CFG.formspree, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body:    JSON.stringify(payload),
    })
      .then(r => r.json())
      .then(r => {
        if (r.ok) {
          console.log('[BenBot] Lead envoyé via Formspree ✓');
        } else {
          throw new Error(JSON.stringify(r));
        }
      })
      .catch(err => {
        console.warn('[BenBot] Formspree error — fallback localStorage', err);
        const leads = JSON.parse(localStorage.getItem('ben_leads') || '[]');
        leads.push(payload);
        localStorage.setItem('ben_leads', JSON.stringify(leads));
      });
  }

  /* ── INIT ─────────────────────────────────────────────── */
  function init() {
    buildWidget();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
