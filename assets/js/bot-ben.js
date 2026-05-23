/* ═══════════════════════════════════════════════════════════
   BOT BEN — SOS FONTE  |  JS Vanilla  |  No dependencies
   v2 — validation, stickers, boucle "autres questions"
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── CONFIG ─────────────────────────────────────────────── */
  const CFG = {
    formspree:    'https://formspree.io/f/xpqnzoyg',
    phone:        'tel:0180846040',
    phoneDisplay: '01 80 84 60 40',
    wa:           'https://wa.me/33695494371?text=Bonjour%2C%20j%27ai%20une%20urgence%20sur%20une%20canalisation%20en%20fonte.',
    email:        'contact@sosfonte.com',
    autreQDelay:  10000,   // ms avant "avez-vous d'autres questions ?"
    autoCloseDelay: 30000, // ms d'inactivité avant fermeture auto après cette question
  };

  /* ── VALIDATION ─────────────────────────────────────────── */
  const V = {
    phone(v) {
      return /^(\+33|0033|0)[1-9](\s?[\d]{2}){4}$/.test(v.replace(/[\s\.\-]/g, ''));
    },
    email(v) {
      return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(v.trim());
    },
    postal(v) {
      return /^\d{5}$/.test(v.trim());
    },
    msgs: {
      phone:  'Format invalide. Ex : 06 12 34 56 78',
      email:  'Email invalide. Ex : nom@domaine.fr',
      postal: 'Code postal invalide (5 chiffres requis)',
    },
  };

  /* ── ASSET BASE PATH ─────────────────────────────────────── */
  const BASE = (function () {
    const s = document.querySelector('script[src*="bot-ben"]');
    return s ? s.src.replace(/\/js\/bot-ben\.js.*$/, '') : '/assets';
  })();

  const IMG = {
    /* Profile — trigger + header */
    face:          BASE + '/ben/master/Ben_profil_badge_orange_fond_noir.png',
    faceAlt:       BASE + '/ben/master/ben-face_large_fond_noir.png',
    idle:          BASE + '/ben/master/ben_idle.png',
    /* Animations */
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
    /* Expressions */
    sourire:       BASE + '/ben/expressions/ben-expression-sourire.png',
    pensif:        BASE + '/ben/expressions/ben-expression-pensif.png',
    rassurant:     BASE + '/ben/expressions/ben-expression-rassurant.png',
    reconnaissant: BASE + '/ben/expressions/ben-expression-reconnaissant.png',
    clinOeil:      BASE + '/ben/expressions/ben-expression-clin_doeil.png',
  };

  const STK = {
    urgence:    BASE + '/ben/stickers/Ben-stickers-urgence.png',
    enRoute:    BASE + '/ben/stickers/Ben-stickers-En-route.png',
    attendez:   BASE + '/ben/stickers/Ben-stickers-Attendez.png',
    rdv:        BASE + '/ben/stickers/Ben-stickers-rdv_planifie.png',
    cestRegle:  BASE + '/ben/stickers/Ben-stickers-c_est_regle.png',
    diag:       BASE + '/ben/stickers/Ben-stickers-diagnostic_en_cours.png',
    bravo:      BASE + '/ben/stickers/Ben-stickers-bravo.png',
    merci:      BASE + '/ben/stickers/Ben-stickers-Merci.png',
    auRevoir:   BASE + '/ben/stickers/Ben-stickers-au_revoir.png',
    aBientot:   BASE + '/ben/stickers/Ben-stickers-A_bientot.png',
    deborde:    BASE + '/ben/stickers/Ben-stickers-Débordé.png',
    hs:         BASE + '/ben/stickers/Ben-stickers-je_suis_HS.png',
    ok:         BASE + '/ben/stickers/Ben-stickers-OK.png',
    jecoute:    BASE + '/ben/stickers/Ben-stickers-j_ecoute.png',
    onGere:     BASE + '/ben/stickers/Ben-stickers-on_gere.png',
    bonCourage: BASE + '/ben/stickers/Ben-stickers-bon_courage.png',
  };

  /* ── STATE ───────────────────────────────────────────────── */
  let isOpen = false, imgA, imgB, currentSlot = 'A';
  let typingEl = null, preloaded = false;
  let formData = {};
  let autoCloseTimer = null;

  /* ── HELPERS ─────────────────────────────────────────────── */
  function isOffHours() { const h = new Date().getHours(); return h < 7 || h >= 22; }

  function preloadImages() {
    if (preloaded) return;
    preloaded = true;
    [...Object.values(IMG), ...Object.values(STK)].forEach(src => {
      const i = new Image(); i.src = src;
    });
  }

  /* ── BEN IMAGE FADE ──────────────────────────────────────── */
  function setBenImage(src) {
    const next = currentSlot === 'A' ? imgB : imgA;
    const curr = currentSlot === 'A' ? imgA : imgB;
    next.src = src;
    const swap = () => {
      next.classList.remove('ben-img-hidden');
      curr.classList.add('ben-img-hidden');
      currentSlot = currentSlot === 'A' ? 'B' : 'A';
    };
    next.complete ? swap() : (next.onload = swap);
    next.onerror = () => { next.src = IMG.face; swap(); };
  }

  /* ── BUILD WIDGET ────────────────────────────────────────── */
  function buildWidget() {
    const trigger = document.createElement('button');
    trigger.id = 'ben-trigger';
    trigger.setAttribute('aria-label', 'Ouvrir le chat avec Ben');
    trigger.innerHTML = `<img src="${IMG.face}" alt="Ben SOS FONTE" loading="lazy">
      <span class="ben-notif"></span>`;
    trigger.addEventListener('click', toggleWidget);
    document.body.appendChild(trigger);

    const widget = document.createElement('div');
    widget.id = 'ben-widget';
    widget.setAttribute('role', 'dialog');
    widget.setAttribute('aria-label', 'Chat Ben — SOS FONTE');
    widget.innerHTML = `
      <div class="ben-header">
        <div class="ben-header-img-wrap">
          <img id="ben-img-a" src="${IMG.face}" alt="Ben">
          <img id="ben-img-b" src="${IMG.face}" alt="Ben" class="ben-img-hidden">
        </div>
        <div class="ben-header-info">
          <strong>Ben · SOS FONTE</strong>
          <span id="ben-status">
            <span class="ben-status-dot" id="ben-dot"></span>
            <span id="ben-status-text">En ligne</span>
          </span>
        </div>
        <button class="ben-close-btn" id="ben-close" aria-label="Fermer">✕</button>
      </div>
      <div class="ben-body" id="ben-body"></div>
      <div class="ben-footer" id="ben-footer"></div>`;
    document.body.appendChild(widget);

    imgA = document.getElementById('ben-img-a');
    imgB = document.getElementById('ben-img-b');
    document.getElementById('ben-close').addEventListener('click', closeWidget);

    const dot  = document.getElementById('ben-dot');
    const text = document.getElementById('ben-status-text');
    if (isOffHours()) { dot.classList.add('offline'); text.textContent = 'Hors ligne · rappel demain'; }
  }

  /* ── TOGGLE / OPEN / CLOSE ───────────────────────────────── */
  function toggleWidget() { isOpen ? closeWidget() : openWidget(); }

  function openWidget() {
    preloadImages();
    isOpen = true;
    formData = {};
    clearAutoClose();
    document.getElementById('ben-widget').classList.add('ben-open');
    clearBody(); clearFooter();
    isOffHours() ? stepOffHours() : stepAccueil();
  }

  function closeWidget() {
    clearAutoClose();
    setBenImage(IMG.auRevoir);
    addSticker(STK.aBientot);
    addBubble('bot', 'À bientôt ! 👋<br>📞 ' + CFG.phoneDisplay);
    setTimeout(closeWidgetSilent, 1800);
  }

  function closeWidgetSilent() {
    document.getElementById('ben-widget').classList.remove('ben-open');
    isOpen = false;
    formData = {};
    setTimeout(() => { clearBody(); clearFooter(); }, 400);
  }

  function clearAutoClose() {
    if (autoCloseTimer) { clearTimeout(autoCloseTimer); autoCloseTimer = null; }
  }

  /* ── DOM HELPERS ─────────────────────────────────────────── */
  function clearBody()   { document.getElementById('ben-body').innerHTML = ''; }
  function clearFooter() { document.getElementById('ben-footer').innerHTML = ''; }
  function scrollBottom() { const b = document.getElementById('ben-body'); b.scrollTop = b.scrollHeight; }

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

  function addSticker(src, delay) {
    return new Promise(resolve => {
      setTimeout(() => {
        removeTyping();
        const wrap = document.createElement('div');
        wrap.className = 'ben-sticker-wrap';
        const img = document.createElement('img');
        img.src = src;
        img.alt = '';
        img.className = 'ben-sticker';
        img.loading = 'lazy';
        wrap.appendChild(img);
        document.getElementById('ben-body').appendChild(wrap);
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
  function removeTyping() { if (typingEl) { typingEl.remove(); typingEl = null; } }

  function addCTABlock(waMsg) {
    const waUrl = waMsg
      ? 'https://wa.me/33695494371?text=' + encodeURIComponent(waMsg)
      : CFG.wa;
    const block = document.createElement('div');
    block.className = 'ben-cta-block';
    block.innerHTML = `
      <a href="${CFG.phone}" class="ben-cta-phone">📞 ${CFG.phoneDisplay}</a>
      <a href="${waUrl}" class="ben-cta-wa" target="_blank" rel="noopener">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        WhatsApp
      </a>`;
    document.getElementById('ben-body').appendChild(block);
    scrollBottom();
  }

  /* ── CHOICES ─────────────────────────────────────────────── */
  function showChoices(choices) {
    clearFooter();
    const wrap = document.createElement('div');
    wrap.className = 'ben-choices';
    choices.forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'ben-choice-btn';
      btn.innerHTML = c.label;
      btn.addEventListener('click', () => { addBubble('user', c.label); c.action(); });
      wrap.appendChild(btn);
    });
    document.getElementById('ben-footer').appendChild(wrap);
  }

  /* ── TEXT INPUT ──────────────────────────────────────────── */
  function showTextInput(placeholder, onSend) {
    clearFooter();
    const row = document.createElement('div');
    row.className = 'ben-input-row';
    row.innerHTML = `
      <textarea placeholder="${placeholder}" rows="1"></textarea>
      <button class="ben-send-btn" aria-label="Envoyer">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      </button>`;
    const ta = row.querySelector('textarea');
    const doSend = () => { const v = ta.value.trim(); if (v) onSend(v); };
    row.querySelector('.ben-send-btn').addEventListener('click', doSend);
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); } });
    document.getElementById('ben-footer').appendChild(row);
    ta.focus();
  }

  /* ── VALIDATED FORM ──────────────────────────────────────── */
  /*
   * fields: [{ key, placeholder, type, required, validate, errorMsg }]
   * validate: function(value) → boolean
   */
  function showForm(fields, submitLabel, onSubmit) {
    clearFooter();
    const form = document.createElement('div');
    form.className = 'ben-form';
    const inputs = {};
    const errors = {};

    fields.forEach(f => {
      const wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex;flex-direction:column;gap:3px';

      const inp = document.createElement('input');
      inp.type        = f.type || 'text';
      inp.placeholder = f.placeholder;
      inp.required    = !!f.required;
      inp.autocomplete = f.key === 'tel' ? 'tel' : f.key === 'email' ? 'email' : 'off';
      inputs[f.key]   = inp;

      const err = document.createElement('span');
      err.className = 'ben-field-error';
      err.style.cssText = 'font-size:11px;color:#ef4444;display:none;padding-left:4px';
      errors[f.key] = err;

      /* Validate on blur */
      inp.addEventListener('blur', () => {
        if (f.validate) {
          const ok = !inp.value.trim() && !f.required ? true : f.validate(inp.value);
          inp.style.borderColor = ok ? '' : '#ef4444';
          err.textContent = ok ? '' : (f.errorMsg || 'Valeur invalide');
          err.style.display = ok ? 'none' : 'block';
        }
      });
      /* Clear error on focus */
      inp.addEventListener('focus', () => {
        inp.style.borderColor = '#FF5A00';
        err.style.display = 'none';
      });

      wrap.appendChild(inp);
      wrap.appendChild(err);
      form.appendChild(wrap);
    });

    const btn = document.createElement('button');
    btn.className = 'ben-submit-btn';
    btn.textContent = submitLabel;
    btn.addEventListener('click', () => {
      const data = {};
      let valid = true;
      fields.forEach(f => {
        const v = inputs[f.key].value.trim();
        if (f.required && !v) {
          inputs[f.key].style.borderColor = '#ef4444';
          errors[f.key].textContent = 'Champ requis';
          errors[f.key].style.display = 'block';
          valid = false;
          return;
        }
        if (f.validate && v) {
          const ok = f.validate(v);
          inputs[f.key].style.borderColor = ok ? '' : '#ef4444';
          errors[f.key].textContent = ok ? '' : (f.errorMsg || 'Valeur invalide');
          errors[f.key].style.display = ok ? 'none' : 'block';
          if (!ok) { valid = false; return; }
        }
        data[f.key] = v;
      });
      if (!valid) { scrollBottom(); return; }
      Object.assign(formData, data);
      onSubmit(data);
    });
    form.appendChild(btn);
    document.getElementById('ben-footer').appendChild(form);
  }

  /* ══════════════════════════════════════════════════════════
     BOUCLE "AUTRES QUESTIONS"
  ══════════════════════════════════════════════════════════ */
  async function stepAutresQuestions() {
    clearFooter();
    await new Promise(r => setTimeout(r, CFG.autreQDelay));
    if (!isOpen) return;

    setBenImage(IMG.sourire);
    await showTyping(300);
    await addBubble('bot', 'Avez-vous d\'autres questions ? 😊', 900);

    autoCloseTimer = setTimeout(() => {
      if (isOpen) stepFarewell();
    }, CFG.autoCloseDelay);

    showChoices([
      {
        label: '✅ Oui, j\'ai une autre question',
        action: () => {
          clearAutoClose();
          clearBody();
          setBenImage(IMG.bonjour);
          stepAccueil();
        },
      },
      {
        label: '👋 Non merci, à bientôt !',
        action: () => {
          clearAutoClose();
          stepFarewell();
        },
      },
    ]);
  }

  async function stepFarewell() {
    clearFooter();
    setBenImage(IMG.auRevoir);
    await showTyping(300);
    addSticker(STK.aBientot);
    await addBubble('bot', 'À bientôt ! 😊<br>📞 ' + CFG.phoneDisplay, 800);
    setTimeout(closeWidgetSilent, 2000);
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
      { label: '🔴 Urgence — fuite active',       action: stepUrgence },
      { label: '🔧 Intervention fonte',            action: stepIntervention },
      { label: '🔍 Diagnostic / curage',           action: stepDiagnostic },
      { label: '📋 Syndic ou Conseil Syndical',    action: stepSyndic },
      { label: '🤝 Professionnel — partenariat',   action: stepPartenaire },
    ]);
  }

  /* ── STEP 1A — URGENCE ────────────────────────────────── */
  async function stepUrgence() {
    clearFooter();
    setBenImage(IMG.cestChaud);
    await showTyping(300);
    await addBubble('bot', "C'est urgent, on ne perd pas de temps !", 800);
    addSticker(STK.urgence);
    addBubble('bot', '📞 Appelez maintenant :');
    addCTABlock("Bonjour, j'ai une urgence sur une canalisation en fonte. Pouvez-vous intervenir ?");
    setTimeout(async () => {
      setBenImage(IMG.jinterviens);
      await showTyping(0);
      addSticker(STK.enRoute);
      await addBubble('bot', 'Nos techniciens interviennent<br>Paris et IDF <strong>sous 4h</strong>. 🚐', 1200);
      clearFooter();
      stepAutresQuestions();
    }, 3000);
  }

  /* ── STEP 1B — INTERVENTION FONTE ────────────────────── */
  async function stepIntervention() {
    clearFooter();
    setBenImage(IMG.jecoute);
    addSticker(STK.jecoute);
    await showTyping(300);
    await addBubble('bot', 'Je vous écoute. Décrivez votre situation en quelques mots.', 800);
    showTextInput('Ex : fuite colonne EU cave immeuble 1920…', async (txt) => {
      formData.situation = txt;
      clearFooter();
      setBenImage(IMG.pensif);
      await showTyping(400);
      await addBubble('bot', 'Compris. Pour vous rappeler rapidement :', 900);
      showForm([
        {
          key: 'nom', placeholder: 'Prénom et Nom *', required: true,
        },
        {
          key: 'tel', placeholder: 'Téléphone *', type: 'tel', required: true,
          validate: V.phone, errorMsg: V.msgs.phone,
        },
        {
          key: 'codepostal', placeholder: 'Code postal * (ex : 75017)', required: true,
          validate: V.postal, errorMsg: V.msgs.postal,
        },
      ], 'Je veux être rappelé sous 2h →', async (data) => {
        clearFooter();
        setBenImage(IMG.okParfait);
        addSticker(STK.rdv);
        const prenom = data.nom.split(' ')[0];
        await showTyping(400);
        await addBubble('bot', `Parfait <strong>${prenom}</strong> 👌<br>Un technicien vous rappelle sous 2h.<br>📞 ${CFG.phoneDisplay}`, 900);
        sendLead('Intervention fonte', data);
        stepAutresQuestions();
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
    addSticker(STK.diag);
    await showTyping(300);
    await addBubble('bot', 'On intervient partout en IDF.<br>Quel est le code postal du bien ?', 800);
    showForm([
      {
        key: 'codepostal', placeholder: 'Code postal * (ex : 92200)', required: true,
        validate: V.postal, errorMsg: V.msgs.postal,
      },
      {
        key: 'email', placeholder: 'Votre email pour le devis *', type: 'email', required: true,
        validate: V.email, errorMsg: V.msgs.email,
      },
    ], 'Recevoir le devis →', async (data) => {
      clearFooter();
      setBenImage(IMG.cestRegle);
      addSticker(STK.cestRegle);
      await showTyping(400);
      await addBubble('bot', `C'est noté ✅<br>Vous recevez un devis sous 24h.<br>📞 ${CFG.phoneDisplay} pour toute urgence.`, 900);
      sendLead(type, data);
      stepAutresQuestions();
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
      { label: 'Membre du Conseil Syndical',          action: () => stepSyndicPortefeuille('Conseil Syndical') },
      { label: 'Administrateur de biens',             action: () => stepSyndicPortefeuille('Administrateur de biens') },
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
      { key: 'nom',     placeholder: 'Nom et Prénom *', required: true },
      { key: 'cabinet', placeholder: 'Cabinet / Société' },
      {
        key: 'email', placeholder: 'Email professionnel *', type: 'email', required: true,
        validate: V.email, errorMsg: V.msgs.email,
      },
      {
        key: 'tel', placeholder: 'Téléphone *', type: 'tel', required: true,
        validate: V.phone, errorMsg: V.msgs.phone,
      },
    ], 'Recevoir notre offre partenaire →', async (data) => {
      clearFooter();
      setBenImage(IMG.merci);
      addSticker(STK.merci);
      const prenom = data.nom.split(' ')[0];
      await showTyping(400);
      await addBubble('bot',
        `Merci <strong>${prenom}</strong> 🙏<br>Notre responsable vous contacte sous 24h ouvrées.<br><br><a href="syndics.html" class="ben-page-link">Découvrez notre offre syndics →</a>`,
        900);
      sendLead('Syndic', data);
      stepAutresQuestions();
    });
  }

  /* ── STEP 1E — PARTENAIRE PRO ─────────────────────────── */
  async function stepPartenaire() {
    clearFooter();
    setBenImage(IMG.sourire);
    await showTyping(300);
    await addBubble('bot', 'Super, on aime travailler avec des pros 💪<br>Vous êtes :', 800);
    showChoices([
      { label: 'Plombier / Artisan',            action: () => stepPartenaireForm('Plombier / Artisan') },
      { label: "Bureau d'études / Architecte",  action: () => stepPartenaireForm("Bureau d'études") },
      { label: 'Gestionnaire immobilier',       action: () => stepPartenaireForm('Gestionnaire immobilier') },
      { label: 'Autre professionnel',           action: () => stepPartenaireForm('Autre professionnel') },
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
        {
          key: 'email', placeholder: 'Email *', type: 'email', required: true,
          validate: V.email, errorMsg: V.msgs.email,
        },
        {
          key: 'tel', placeholder: 'Téléphone', type: 'tel',
          validate: V.phone, errorMsg: V.msgs.phone,
        },
      ], 'Envoyer ma demande →', async (data) => {
        clearFooter();
        setBenImage(IMG.bravo);
        addSticker(STK.bravo);
        await showTyping(400);
        await addBubble('bot', `Message reçu 🎉<br>Khaled vous répond personnellement sous 48h.<br>📧 ${CFG.email}`, 900);
        sendLead('Partenaire — ' + type, data);
        stepAutresQuestions();
      });
    });
  }

  /* ── STEP HORS HORAIRES ───────────────────────────────── */
  async function stepOffHours() {
    setBenImage(IMG.deborde);
    addSticker(STK.hs);
    await showTyping(200);
    await addBubble('bot', "On est hors ligne pour l'instant 😅<br>Laissez votre numéro, on vous rappelle dès demain matin !", 900);
    showForm([
      {
        key: 'tel', placeholder: 'Votre téléphone *', type: 'tel', required: true,
        validate: V.phone, errorMsg: V.msgs.phone,
      },
    ], 'Me rappeler demain', async (data) => {
      clearFooter();
      setBenImage(IMG.reconnaissant);
      addSticker(STK.ok);
      await showTyping(400);
      await addBubble('bot', 'Noté 🙏 On vous rappelle dès 7h !', 900);
      sendLead('Rappel hors-horaires', data);
    });
  }

  /* ── SEND LEAD ───────────────────────────────────────── */
  function sendLead(branch, data) {
    const payload = {
      _subject:   '[BOT BEN] ' + branch + ' — ' + (data.nom || data.tel || 'Lead'),
      branche:    branch,
      nom:        data.nom        || '—',
      telephone:  data.tel        || '—',
      email:      data.email      || '—',
      codepostal: data.codepostal || formData.codepostal || '—',
      message:    data.message    || formData.situation  || '—',
      cabinet:    data.cabinet    || '—',
      profil:     formData.profil      || '—',
      nb_immeubles: formData.nbImmeubles || '—',
      timestamp:  new Date().toLocaleString('fr-FR'),
      page:       window.location.href,
    };

    fetch(CFG.formspree, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body:    JSON.stringify(payload),
    })
      .then(r => r.json())
      .then(r => { if (r.ok) console.log('[BenBot] Lead envoyé ✓'); else throw r; })
      .catch(err => {
        const leads = JSON.parse(localStorage.getItem('ben_leads') || '[]');
        leads.push(payload);
        localStorage.setItem('ben_leads', JSON.stringify(leads));
        console.warn('[BenBot] Fallback localStorage', err);
      });
  }

  /* ── INIT ─────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildWidget);
  } else {
    buildWidget();
  }

})();
