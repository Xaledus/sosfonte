/* ═══════════════════════════════════════════════════════════
   BOT BEN — SOS FONTE  |  JS Vanilla  |  No dependencies
   v2 — validation, stickers, boucle "autres questions"
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── CONFIG ─────────────────────────────────────────────── */
  /* Lecture depuis site-config.js (window.SFC) si disponible,
     sinon valeurs de repli intégrées — NE PAS modifier ici,
     mettre à jour assets/js/site-config.js uniquement.       */
  const _S = window.SFC || {};
  const _p = (_S.phone) || {};
  const CFG = {
    formspree:      (_S.formspree)  || 'https://formspree.io/f/xpqnzoyg',
    phone:          'tel:' + (_p.raw     || '0180846040'),
    phoneDisplay:   (_p.display          || '01 80 84 60 40'),
    wa:             _S.waUrl ? _S.waUrl('urgence') : 'https://wa.me/33180846040?text=Bonjour%2C%20j%27ai%20une%20urgence%20sur%20une%20canalisation%20en%20fonte.',
    email:          (_S.email            || 'contact@sosfonte.com'),
    autreQDelay:    10000,   // ms avant "avez-vous d'autres questions ?"
    autoCloseDelay: 30000,   // ms d'inactivité avant fermeture auto
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
  let countdownInterval = null;
  let hasOpenedOnce = false;

  /* ── HELPERS ─────────────────────────────────────────────── */
  function isOffHours() { const h = new Date().getHours(); return h < 7 || h >= 22; }

  /* Ding notification (Web Audio API — aucun fichier externe) */
  function playDing() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const play = (freq, t0, dur) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(0.22, t0 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
        osc.start(t0);
        osc.stop(t0 + dur);
      };
      play(880,  ctx.currentTime,        0.38); // La5
      play(1320, ctx.currentTime + 0.14, 0.32); // Mi6 — quinte → ding doux
    } catch (e) { /* audio non disponible (politique autoplay) */ }
  }

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
    trigger.innerHTML = `<img src="${IMG.face}" alt="Ben SOS FONTE" loading="lazy">`;

    const showTrigger = () => {
      trigger.style.opacity = '1';
      trigger.style.pointerEvents = 'auto';
    };

    /* Popup invitation ─────────────────────────────── */
    const popup = document.createElement('div');
    popup.id = 'ben-popup';
    popup.setAttribute('role', 'complementary');
    popup.setAttribute('aria-label', 'Invitation à chatter avec Ben');
    popup.innerHTML = `
      <img src="${IMG.face}" alt="Ben">
      <p>Je suis <strong>Ben</strong> — comment puis-je vous aider ? 👋</p>
      <button id="ben-popup-close" aria-label="Fermer">✕</button>`;
    document.body.appendChild(popup);

    document.getElementById('ben-popup-close').addEventListener('click', e => {
      e.stopPropagation();
      popup.classList.remove('ben-popup-visible');
      showTrigger();
    });
    popup.addEventListener('click', () => {
      popup.classList.remove('ben-popup-visible');
      showTrigger();
      openWidget();
    });

    /* Afficher popup + trigger après 10-15s ─────────── */
    const delay = 10000 + Math.floor(Math.random() * 5000);
    setTimeout(() => {
      if (!isOpen && !hasOpenedOnce) {
        popup.classList.add('ben-popup-visible');
        showTrigger();
        playDing();                              // ding quand Ben apparaît
      }
    }, delay);

    /* Clic sur le trigger masque aussi le popup ────── */
    trigger.addEventListener('click', () => {
      popup.classList.remove('ben-popup-visible');
      showTrigger();
      toggleWidget();
    });
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
    hasOpenedOnce = true;        // bloque le re-déclenchement du popup
    clearAutoClose();
    document.getElementById('ben-widget').classList.add('ben-open');
    clearBody(); clearFooter();
    isOffHours() ? stepOffHours() : stepAccueil();
  }

  function closeWidget() {
    clearAutoClose();
    setBenImage(IMG.auRevoir);
    addSticker(STK.auRevoir);                         // sticker "au revoir" — cohérent avec farewell
    setTimeout(closeWidgetSilent, 1500);
  }

  function closeWidgetSilent() {
    document.getElementById('ben-widget').classList.remove('ben-open');
    isOpen = false;
    formData = {};
    setTimeout(() => { clearBody(); clearFooter(); }, 400);
  }

  function clearAutoClose() {
    if (autoCloseTimer)    { clearTimeout(autoCloseTimer);  autoCloseTimer = null; }
    if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
    const cb = document.querySelector('.ben-countdown');
    if (cb) cb.remove();
  }

  /* ── DOM HELPERS ─────────────────────────────────────────── */
  function clearBody()   { document.getElementById('ben-body').innerHTML = ''; }
  function clearFooter() { document.getElementById('ben-footer').innerHTML = ''; }
  function scrollBottom() {
    requestAnimationFrame(() => {
      const b = document.getElementById('ben-body');
      if (b) b.scrollTop = b.scrollHeight;
    });
  }

  function addBubble(who, html, delay) {
    return new Promise(resolve => {
      setTimeout(() => {
        removeTyping();
        const b = document.createElement('div');
        b.className = 'ben-bubble ' + who;
        b.innerHTML = html;
        /* Tous les liens → nouvel onglet, widget reste ouvert */
        b.querySelectorAll('a[href]').forEach(function(a) {
          a.target = '_blank';
          a.rel    = 'noopener noreferrer';
        });
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
      ? 'https://wa.me/' + ((_S.phone && _S.phone.wa) || '33180846040') + '?text=' + encodeURIComponent(waMsg)
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
      btn.addEventListener('click', async () => {
        wrap.querySelectorAll('.ben-choice-btn').forEach(b => b.disabled = true);
        clearFooter();                    // retire les boutons immédiatement
        await addBubble('user', c.label); // bulle client visible avant l'action
        c.action();
      });
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
    const doSend = async () => {
      const v = ta.value.trim();
      if (!v) return;
      ta.disabled = true;
      clearFooter();
      await addBubble('user', v);   // bulle client visible avant l'action
      onSend(v);
    };
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

    /* Countdown visible ────────────────────────────── */
    let secsLeft = Math.floor(CFG.autoCloseDelay / 1000);
    const countdownEl = document.createElement('div');
    countdownEl.className = 'ben-bubble bot ben-countdown';
    countdownEl.innerHTML = `Ce chat se ferme dans <strong>${secsLeft}s</strong>`;
    document.getElementById('ben-body').appendChild(countdownEl);
    scrollBottom();

    countdownInterval = setInterval(() => {
      secsLeft--;
      if (countdownEl.parentNode) {
        countdownEl.innerHTML = `Ce chat se ferme dans <strong>${secsLeft}s</strong>`;
      }
      if (secsLeft <= 0) { clearInterval(countdownInterval); countdownInterval = null; }
    }, 1000);

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
    addSticker(STK.auRevoir);                         // sticker unique "au revoir"
    setTimeout(closeWidgetSilent, 5000);              // fermeture auto 5s
  }

  /* ══════════════════════════════════════════════════════════
     STEPS
  ══════════════════════════════════════════════════════════ */

  /* Bouton retour réutilisable dans tous les showChoices ── */
  const RETOUR = {
    label: '↩ Retour à l\'accueil',
    action: () => { clearBody(); setBenImage(IMG.bonjour); stepAccueil(); },
  };

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
      { label: '❓ J\'ai une question',             action: stepFAQ },
    ]);
  }

  /* ── STEP 1A — URGENCE ────────────────────────────────── */
  async function stepUrgence() {
    clearFooter();
    setBenImage(IMG.cestChaud);
    addSticker(STK.urgence);
    await addBubble('bot', '📞 Appelez maintenant :', 600);
    addCTABlock("Bonjour, j'ai une urgence sur une canalisation en fonte. Pouvez-vous intervenir ?");
    await showTyping(1200);                          // respiration avant le message de rassurence
    setBenImage(IMG.jinterviens);
    addSticker(STK.enRoute);
    await addBubble('bot', 'Paris et IDF — <strong>sous 4h</strong>. 🚐', 800);
    stepAutresQuestions();
  }

  /* ── STEP 1B — INTERVENTION FONTE ────────────────────── */
  async function stepIntervention() {
    clearFooter();
    setBenImage(IMG.jecoute);
    await showTyping(300);
    await addBubble('bot', 'Je vous écoute. Décrivez votre situation en quelques mots.', 800);
    showTextInput('Ex : fuite colonne EU cave immeuble 1920…', async (txt) => {
      clearFooter();
      setBenImage(IMG.pensif);
      await showTyping(400);

      /* ── Analyse contextuelle ─────────────────────────
         Si le texte ressemble à une question (? final ou
         verbe interrogatif) → on cherche dans la FAQ.   */
      const faqMatch = matchFAQ(txt);
      /* Détection question : ? final OU mot interrogatif en tête
         (après normalisation accents + majuscules)              */
      const _txtN = _norm(txt.trim());
      const looksQ = /\?/.test(txt) ||
        /^(quel(le)?s?|qu.est|qu.y|pourquoi|comment|combien|ou\b|quand|qui\b|lequel|laquelle|lesquel|est.ce|pouvez|peut.on|avez.vous|faites.vous|proposez.vous|intervenez|d.placez|venez|couvrez|vous\b|c.est.quoi|quelle.est|quel.est|difference|y.a.t.il)/i
          .test(_txtN);

      if (faqMatch) {
        addSticker(STK.diag);                           // sticker diagnostic en cours
        await new Promise(r => setTimeout(r, 3500));   // 3,5 s de "réflexion"
        setBenImage(IMG.jexplique);
        await addBubble('bot', faqMatch.text, 0);
        if (faqMatch.link) {
          await addBubble('bot',
            '<a href="' + faqMatch.link + '" class="ben-page-link">En savoir plus →</a>', 300);
        }
        await showTyping(300);
        await addBubble('bot', 'Vous avez aussi une situation à me décrire ?', 600);
        showChoices([
          { label: '🔧 Oui, j\'ai un problème à régler', action: stepIntervention },
          RETOUR,
        ]);
        return;
      }

      if (looksQ) {
        setBenImage(IMG.jexplique);
        await addBubble('bot',
          'Ça ressemble à une question 🤔 Utilisez le bouton <strong>"❓ J\'ai une question"</strong> — je réponds à plus de 20 sujets.',
          800);
        await showTyping(300);
        await addBubble('bot', 'Vous avez aussi une situation à me décrire ?', 600);
        showChoices([
          { label: '❓ Poser ma question',              action: stepFAQ },
          { label: '🔧 Non, décrire mon problème',      action: stepIntervention },
          RETOUR,
        ]);
        return;
      }

      /* ── Situation normale : formulaire de rappel ─── */
      formData.situation = txt;
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
        const prenom = data.nom.split(' ')[0];
        addSticker(STK.rdv);
        await addBubble('bot', `<strong>${prenom}</strong>, rappel sous 2h. 📞 ${CFG.phoneDisplay}`, 600);
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
      RETOUR,
    ]);
  }

  async function stepDiagForm(type) {
    formData.typeDiag = type;
    clearFooter();
    setBenImage(IMG.jexplique);
    await showTyping(300);
    await addBubble('bot', 'On intervient partout en IDF.<br>Quel est le code postal du bien ?', 800);
    showForm([
      {
        key: 'codepostal', placeholder: 'Code postal * (ex : 92200)', required: true,
        validate: V.postal, errorMsg: V.msgs.postal,
      },
      {
        key: 'tel', placeholder: 'Téléphone (optionnel)', type: 'tel',
        validate: V.phone, errorMsg: V.msgs.phone,
      },
      {
        key: 'email', placeholder: 'Email pour le devis *', type: 'email', required: true,
        validate: V.email, errorMsg: V.msgs.email,
      },
    ], 'Recevoir le devis →', async (data) => {
      clearFooter();
      setBenImage(IMG.reconnaissant);
      addSticker(STK.attendez);                    // "on note / on gère"
      await addBubble('bot', `Noté ! On vous rappelle sous 24h pour votre devis.<br>📞 ${CFG.phoneDisplay}`, 700);
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
    await showTyping(200);
    await addBubble('bot', 'Vous êtes :', 600);
    showChoices([
      { label: 'Gestionnaire / Syndic professionnel', action: () => stepSyndicPortefeuille('Syndic professionnel') },
      { label: 'Membre du Conseil Syndical',          action: () => stepSyndicPortefeuille('Conseil Syndical') },
      { label: 'Administrateur de biens',             action: () => stepSyndicPortefeuille('Administrateur de biens') },
      RETOUR,
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
      RETOUR,
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
    ], 'Envoyer ma demande →', async (data) => {
      clearFooter();
      setBenImage(IMG.merci);
      const prenom = data.nom.split(' ')[0];
      addSticker(STK.merci);                       // sticker = merci, pas de doublon
      await addBubble('bot',
        `<strong>${prenom}</strong>, notre responsable vous contacte sous 24h.<br><a href="syndics.html" class="ben-page-link">Offre syndics →</a>`,
        500);
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
      RETOUR,
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
        addSticker(STK.bravo);                        // sticker = "Bravo / message reçu"
        await addBubble('bot', `Un collègue vous répond sous 48h.<br>📧 ${CFG.email}`, 600);
        sendLead('Partenaire — ' + type, data);
        stepAutresQuestions();
      });
    });
  }

  /* ── NORMALISATION — accent-strip robuste ─────────── */
  function _norm(s) {
    s = String(s).toLowerCase().normalize('NFD');
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c < 0x0300 || c > 0x036F) out += s[i]; // retire diacritiques
    }
    return out
      .replace(/[‘’‛`]/g, "'") // guillemets -> apostrophe
      .replace(/[–—-]/g, ' ');       // tirets -> espace
  }

  /* ── FAQ ENTRIES — référentiel ───────────────────────── */
  /* Scoring : phrase multi-mots = 3 pts, mot seul = 1 pt.
     Retourne l'entrée avec le MEILLEUR score.             */
  var FAQ_ENTRIES = [
    /* Urgence & disponibilité */
    { keys: ['24h','24/7','nuit','weekend','week end','ferie','dimanche','samedi','heure'],
      text: 'On intervient <strong>24h/24 — 7j/7</strong>, week-ends et jours fériés inclus. Les tarifs sont revalorisés hors horaires — on vous communique le détail à l\'appel.',
      link: 'faq.html#urgence' },
    { keys: ['delai','arrive','vite','rapide','combien de temps','quand','attendre','temps reponse'],
      text: 'En urgence : <strong>moins de 2h en IDF</strong>. Si nos équipes sont en cours d\'intervention, nous rappelons avec un horaire précis.',
      link: 'faq.html#urgence' },
    { keys: ['colonne montante','fuite colonne','urgence','eau partout','inondation'],
      text: 'Une colonne fonte sous pression peut provoquer des dégâts aux étages inférieurs en quelques minutes. <strong>Appelez immédiatement.</strong>',
      link: 'faq.html#urgence' },
    /* Zone & déplacement */
    { keys: ['banlieue','province','periph','banlieusard','hors paris',
             'deplacez','deployez','venez','intervenez','couvrez','desservez',
             'deplacement','vous venez','vous intervenez','vous deplacez',
             'couvert','desservi','passez'],
      text: 'Oui, on est aussi banlieusards 😄 Nous couvrons toute l\'Île-de-France — Paris + 92, 93, 94, 91, 95. Contactez-nous pour vérifier votre secteur exact.',
      link: 'faq.html#zone' },
    { keys: ['hors idf','normandie','hors ile','region','province','departement','loin'],
      text: 'Plusieurs interventions hors IDF ont déjà été réalisées, notamment en Normandie. Envoyez votre demande — on l\'étudie et on revient vers vous rapidement.',
      link: 'faq.html#zone' },
    { keys: ['16e','paris 16','haussmann','classe','standing','patrimoine','prestige','hotel particulier','monument'],
      text: 'Oui, c\'est notre cœur de métier. Immeubles classés, contraintes architecturales, copropriétés de standing — découvrez notre <a href="prestige.html" class="ben-page-link">offre Prestige</a>.',
      link: null },
    { keys: ['zone','secteur','idf','ile de france','couvert','ville','paris'],
      text: 'Paris intra-muros + Hauts-de-Seine (92), Seine-Saint-Denis (93), Val-de-Marne (94) et grande couronne. Contactez-nous pour confirmer votre secteur.',
      link: 'faq.html#zone' },
    /* Tarifs & paiement */
    { keys: ['gratuit','devis','estimation','prix','combien','cout','tarif','cher'],
      text: 'Le devis est <strong>gratuit</strong> pour les demandes en ligne avec photos claires (WhatsApp bienvenu). Pour les projets complexes sur place, les conditions sont définies ensemble.',
      link: 'faq.html#tarif' },
    { keys: ['paiement','payer','virement','cheque','carte bancaire','cb','echelon','facilite de paiement'],
      text: 'Virement bancaire, CB via lien sécurisé, chèque. Un <strong>échelonnement</strong> est possible — on étudie chaque situation.',
      link: 'faq.html#tarif' },
    { keys: ['assurance','degat des eaux','sinistre','declaration','anah','aide','rembourse'],
      text: 'Souvent oui pour les dégâts des eaux. Nous fournissons un <strong>rapport d\'intervention complet</strong> reconnu par les assureurs et les notaires.',
      link: 'faq.html#tarif' },
    /* Technique */
    { keys: ['chemisage','chemiser','rehabilitation','sans demolition','relogement','sans travaux','gaine'],
      text: 'Le chemisage insère une gaine dans la canalisation existante — <strong>aucune démolition, aucun relogement</strong>. Souvent 2 à 3× moins coûteux qu\'un remplacement, durée de vie 30-50 ans.',
      link: 'faq.html#technique' },
    { keys: ['duree chantier','combien de jours','temps remplacement','etages','chantier dure'],
      text: 'En moyenne <strong>3 à 5 jours</strong> pour une colonne de 6 étages — planning établi avec le syndic pour minimiser la gêne des résidents.',
      link: 'faq.html#technique' },
    { keys: ['plomb','tuyau plomb','canalisation plomb'],
      text: 'Le plomb est interdit depuis 1995. Nous remplaçons par du <strong>cuivre ou du multicouche</strong> selon la configuration et les contraintes techniques.',
      link: 'faq.html#technique' },
    { keys: ['diagnostic','inspection','camera','endoscop','rapport','expertise'],
      text: 'Diagnostic visuel, test mécanique ou inspection caméra selon la situation. Résultat : rapport écrit avec photos et recommandations chiffrées, reconnu par les assureurs et notaires.',
      link: 'faq.html#technique' },
    { keys: ['fonte','pvc','reconnaitre','identifier','materiau','metal','tuyau'],
      text: 'Frappez doucement le tuyau : la fonte rend un son <strong>sourd et mat</strong>, le plastique sonne creux. La fonte est gris foncé (souvent peinte). Immeubles <strong>avant 1980</strong> : forte probabilité fonte.',
      link: 'faq.html#technique' },
    { keys: ['pourquoi fonte','avantage fonte','bruit','acoustique','feu','reglementation','solide','dure longtemps'],
      text: 'La fonte dure <strong>80 à 100 ans</strong>, amortit les bruits d\'écoulement et résiste au feu. Elle est parfois imposée par la réglementation dans les immeubles haussmanniens.',
      link: 'faq.html#technique' },
    /* Syndic */
    { keys: ['syndic','contrat','maintenance','gestionnaire','assemblee generale','copropriete'],
      text: 'Oui : contrats annuels avec visite préventive, accès prioritaire 24h/7j et tarifs bloqués sur 12 mois. Rapport technique pour votre AG inclus.',
      link: 'faq.html#syndic' },
    { keys: ['gardien','mandate','accord cadre','mandat syndic','gardiennage'],
      text: 'Oui, on intervient sur appel du gardien avec mandat du syndic. Plusieurs cabinets en accord-cadre.',
      link: 'faq.html#syndic' },
    /* Partenaires / RH */
    { keys: ['recrut','emploi','rejoindre','travail','embauche','candidat','poste','offre emploi'],
      text: 'Notre communauté grandit ! Envoyez votre dossier à <strong>contact@sosfonte.com</strong> — technicien, sous-traitant ou profil complémentaire. On revient vers vous rapidement.',
      link: 'faq.html#partenaires' },
    { keys: ['sous traitant','partenaire','partenariat','sous traite','reseau pro'],
      text: 'Oui, nous travaillons avec un réseau de partenaires sélectionnés pour leur sérieux et leur expertise technique.',
      link: 'faq.html#partenaires' },
  ];

  function matchFAQ(q) {
    var l = _norm(q);
    var best = null, bestScore = 0;
    FAQ_ENTRIES.forEach(function(e) {
      var score = 0;
      e.keys.forEach(function(k) {
        var nk = _norm(k);
        if (nk.length > 2 && l.indexOf(nk) !== -1) {
          score += (nk.indexOf(' ') !== -1) ? 3 : 1; // phrase > mot seul
        }
      });
      if (score > bestScore) { bestScore = score; best = e; }
    });
    return bestScore > 0 ? best : null;
  }

  /* ── STEP 1F — FAQ (texte libre + retry) ─────────────── */
  async function stepFAQ() {
    clearFooter();
    setBenImage(IMG.jexplique);
    await showTyping(300);
    await addBubble('bot', 'Posez votre question directement — je vous réponds.', 700);
    await showTyping(200);
    await addBubble('bot', '<span style="font-size:12px;color:rgba(255,255,255,0.45)">Ex : "Vous déplacez-vous en banlieue ?" · "Le devis est gratuit ?" · "Combien de temps dure le chantier ?"</span>', 400);

    /* Affiche la réponse trouvée + lien FAQ optionnel */
    async function showAnswer(match) {
      setBenImage(IMG.jexplique);
      await addBubble('bot', match.text, 600);
      if (match.link) {
        await showTyping(200);
        await addBubble('bot', '<a href="' + match.link + '" class="ben-page-link">En savoir plus →</a>', 400);
      }
      stepAutresQuestions();
    }

    /* 1re saisie */
    showTextInput('Tapez votre question…', async (question) => {
      clearFooter();
      setBenImage(IMG.pensif);
      await showTyping(700);

      const match = matchFAQ(question);
      if (match) { await showAnswer(match); return; }

      /* ── Raté #1 : on demande de reformuler ─────────── */
      setBenImage(IMG.pensif);
      await addBubble('bot', 'Je n\'ai pas bien saisi votre question 🤔<br>Pouvez-vous la reformuler en quelques mots-clés ?', 800);
      await showTyping(200);
      await addBubble('bot', '<span style="font-size:12px;color:rgba(255,255,255,0.45)">Ex : "devis gratuit" · "couvert 92" · "durée chantier" · "paiement échelonné"</span>', 300);

      /* 2e saisie */
      showTextInput('Reformulez votre question…', async (question2) => {
        clearFooter();
        setBenImage(IMG.pensif);
        await showTyping(700);

        const match2 = matchFAQ(question2);
        if (match2) { await showAnswer(match2); return; }

        /* ── Raté #2 : orientation équipe (sans demander coordonnées) */
        setBenImage(IMG.sourire);
        await addBubble('bot', 'Votre question sort de mon périmètre — l\'équipe vous répondra précisément 😊', 900);
        await showTyping(300);
        await addBubble('bot', '<a href="faq.html" class="ben-page-link">📖 FAQ complète (20 questions) →</a>', 400);
        addCTABlock("Bonjour, j'ai une question concernant vos services.");
        stepAutresQuestions();
      });
    });
  }

  /* ── STEP HORS HORAIRES ───────────────────────────────── */
  async function stepOffHours() {
    setBenImage(IMG.deborde);
    addSticker(STK.hs);                               // sticker = "je suis HS", remplace le texte émotionnel
    await addBubble('bot', "Hors ligne pour l'instant. Laissez votre numéro — rappel dès 7h !", 700);
    showForm([
      {
        key: 'tel', placeholder: 'Votre téléphone *', type: 'tel', required: true,
        validate: V.phone, errorMsg: V.msgs.phone,
      },
    ], 'Me rappeler demain', async (data) => {
      clearFooter();
      setBenImage(IMG.reconnaissant);
      addSticker(STK.ok);
      await addBubble('bot', 'Noté — rappel dès 7h. 📞 ' + CFG.phoneDisplay, 600);
      sendLead('Rappel hors-horaires', data);
      stepAutresQuestions();
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
