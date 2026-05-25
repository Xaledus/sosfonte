/* ═══════════════════════════════════════════════════════════
   BOT BEN — SOS FONTE  |  JS Vanilla  |  No dependencies
   v2.0 — Dual priority · 7 branches · WhatsApp engine
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
    ingestUrl:      (_S.supabase && _S.supabase.ingestUrl) || null,
    anonKey:        (_S.supabase && _S.supabase.anonKey)   || null,
    phone:          'tel:' + (_p.raw     || '0180846040'),
    phoneDisplay:   (_p.display          || '01 80 84 60 40'),
    wa:             _S.waUrl ? _S.waUrl('urgence') : 'https://wa.me/33180846040?text=Bonjour%2C%20j%27ai%20une%20urgence%20sur%20une%20canalisation%20en%20fonte.',
    email:          (_S.email            || 'contact@sosfonte.com'),
    waNumber:       (_p.wa               || '33180846040'),
    autreQDelay:    10000,
    autoCloseDelay: 30000,
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
  let botSessionId = null;
  let faqAttempts = 0;

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
      play(880,  ctx.currentTime,        0.38);
      play(1320, ctx.currentTime + 0.14, 0.32);
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
        playDing();
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
    faqAttempts = 0;
    hasOpenedOnce = true;
    clearAutoClose();
    botSessionId = (crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : 'xxxx-xxxx-4xxx-yxxx'.replace(/[xy]/g, c => {
          const r = Math.random() * 16 | 0;
          return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    window.__BEN = window.__BEN || {};
    window.__BEN.sessionId = botSessionId;
    document.getElementById('ben-widget').classList.add('ben-open');
    clearBody(); clearFooter();
    trackEvent('bot_opened');
    // Détection hors-horaires EN PREMIER à l'accueil
    if (isOffHours()) {
      stepOffHours();
    } else {
      // Détection returning user (localStorage)
      var ru = loadReturningUser();
      ru ? stepReturningUser(ru) : stepAccueil();
    }
  }

  function closeWidget() {
    clearAutoClose();
    setBenImage(IMG.auRevoir);
    addSticker(STK.auRevoir);
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
        clearFooter();
        await addBubble('user', c.label);
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
      await addBubble('user', v);
      onSend(v);
    };
    row.querySelector('.ben-send-btn').addEventListener('click', doSend);
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); } });
    document.getElementById('ben-footer').appendChild(row);
    ta.focus();
  }

  /* ── VALIDATED FORM ──────────────────────────────────────── */
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

      inp.addEventListener('blur', () => {
        if (f.validate) {
          const ok = !inp.value.trim() && !f.required ? true : f.validate(inp.value);
          inp.style.borderColor = ok ? '' : '#ef4444';
          err.textContent = ok ? '' : (f.errorMsg || 'Valeur invalide');
          err.style.display = ok ? 'none' : 'block';
        }
      });
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
    addSticker(STK.auRevoir);
    setTimeout(closeWidgetSilent, 5000);
  }

  /* ══════════════════════════════════════════════════════════
     NORMALISATION
  ══════════════════════════════════════════════════════════ */
  function _norm(s) {
    s = String(s).toLowerCase().normalize('NFD');
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c < 0x0300 || c > 0x036F) out += s[i];
    }
    return out
      .replace(/[''‛`]/g, "'")
      .replace(/[–—-]/g, ' ');
  }

  /* ── FAQ ENTRIES ─────────────────────────────────────────── */
  var FAQ_ENTRIES = [
    { keys: ['24h','24/7','nuit','weekend','week end','we','wkd','ferie','feries',
             'dimanche','samedi','heure','hors horaire','intervenez vous le','venez le'],
      text: 'On intervient <strong>24h/24 — 7j/7</strong>, week-ends et jours fériés inclus. Les tarifs sont revalorisés hors horaires — on vous communique le détail à l\'appel.',
      link: 'faq.html#urgence' },
    { keys: ['delai','arrive','vite','rapide','combien de temps','quand','attendre','temps reponse'],
      text: 'En urgence : <strong>moins de 2h en IDF</strong>. Si nos équipes sont en cours d\'intervention, nous rappelons avec un horaire précis.',
      link: 'faq.html#urgence' },
    { keys: ['colonne montante','fuite colonne','urgence','eau partout','inondation'],
      text: 'Une colonne fonte sous pression peut provoquer des dégâts aux étages inférieurs en quelques minutes. <strong>Appelez immédiatement.</strong>',
      link: 'faq.html#urgence' },
    { keys: ['banlieue','province','periph','banlieusard','hors paris',
             'vous deplacez','vous intervenez en','vous venez dans',
             'deplacement','couvert','desservi','zone couverte'],
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
    { keys: ['gratuit','devis','estimation','prix','combien','cout','tarif','cher'],
      text: 'Le devis est <strong>gratuit</strong> pour les demandes en ligne avec photos claires (WhatsApp bienvenu). Pour les projets complexes sur place, les conditions sont définies ensemble.',
      link: 'faq.html#tarif' },
    { keys: ['paiement','payer','virement','cheque','carte bancaire','cb','echelon','facilite de paiement'],
      text: 'Virement bancaire, CB via lien sécurisé, chèque. Un <strong>échelonnement</strong> est possible — on étudie chaque situation.',
      link: 'faq.html#tarif' },
    { keys: ['assurance','degat des eaux','sinistre','declaration','anah','aide','rembourse'],
      text: 'Souvent oui pour les dégâts des eaux. Nous fournissons un <strong>rapport d\'intervention complet</strong> reconnu par les assureurs et les notaires.',
      link: 'faq.html#tarif' },
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
    { keys: ['syndic','contrat','maintenance','gestionnaire','assemblee generale','copropriete'],
      text: 'Oui : contrats annuels avec visite préventive, accès prioritaire 24h/7j et tarifs bloqués sur 12 mois. Rapport technique pour votre AG inclus.',
      link: 'faq.html#syndic' },
    { keys: ['gardien','mandate','accord cadre','mandat syndic','gardiennage'],
      text: 'Oui, on intervient sur appel du gardien avec mandat du syndic. Plusieurs cabinets en accord-cadre.',
      link: 'faq.html#syndic' },
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
          score += (nk.indexOf(' ') !== -1) ? 3 : 1;
        }
      });
      if (score > bestScore) { bestScore = score; best = e; }
    });
    return bestScore > 0 ? best : null;
  }

  /* ══════════════════════════════════════════════════════════
     RETURNING USER ENGINE
  ══════════════════════════════════════════════════════════ */
  var RU_KEY = 'ben_ru';

  function saveReturningUser(phone, branch, label) {
    try {
      localStorage.setItem(RU_KEY, JSON.stringify({
        phone: phone,
        branch: branch,
        label: label,
        date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' }),
      }));
    } catch(e) {}
  }

  function loadReturningUser() {
    try {
      var raw = localStorage.getItem(RU_KEY);
      if (!raw) return null;
      var d = JSON.parse(raw);
      return d;
    } catch(e) { return null; }
  }

  async function stepReturningUser(ru) {
    setBenImage(IMG.rassurant);
    await showTyping(300);
    await addBubble('bot', 'Bonjour. Vous avez déjà contacté SOS FONTE le <strong>' + ru.date + '</strong> pour <strong>' + ru.label + '</strong>.', 900);
    await showTyping(200);
    await addBubble('bot', 'Même sujet ou nouvelle demande ?', 500);
    trackEvent('returning_user_detected');
    showChoices([
      {
        label: '🔄 Même sujet — relancer',
        action: async () => {
          trackEvent('returning_same_subject');
          formData.isReturning = true;
          formData.returnBranch = ru.branch;
          formData.score_bonus = 20;
          setBenImage(IMG.jecoute);
          await showTyping(300);
          await addBubble('bot', 'Je relance votre demande en priorité.', 700);
          stepCanalContact();
        }
      },
      {
        label: '🆕 Nouveau problème',
        action: () => {
          trackEvent('returning_new_subject');
          formData.score_bonus = 10;
          clearBody();
          stepAccueil();
        }
      },
    ]);
  }

  /* ══════════════════════════════════════════════════════════
     WHATSAPP ENGINE
  ══════════════════════════════════════════════════════════ */
  function buildWAMessage() {
    var parts = [];
    if (formData.urgence) parts.push('🔴 URGENT — fuite active');
    if (formData.brancheLabel) parts.push(formData.brancheLabel);
    if (formData.sousType) parts.push(formData.sousType);
    if (formData.typeBien) parts.push(formData.typeBien);
    if (formData.codepostal) parts.push('CP ' + formData.codepostal);
    if (formData.situation) parts.push(formData.situation.slice(0, 80));
    var msg = parts.join(' — ');
    return msg || 'Bonjour, demande via le site SOS FONTE';
  }

  function openWhatsApp() {
    var msg = buildWAMessage();
    var url = 'https://wa.me/' + CFG.waNumber + '?text=' + encodeURIComponent(msg);
    trackEvent('whatsapp_clicked');
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function openEmail() {
    var subject = encodeURIComponent(
      'Demande SOS FONTE' + (formData.brancheLabel ? ' — ' + formData.brancheLabel : '') +
      (formData.codepostal ? ' — ' + formData.codepostal : '')
    );
    var lines = ['Bonjour,', ''];
    if (formData.urgence) lines.push('⚠️ URGENCE DÉCLARÉE', '');
    if (formData.brancheLabel) lines.push('Demande : ' + formData.brancheLabel);
    if (formData.sousType) lines.push('Type : ' + formData.sousType);
    if (formData.typeBien) lines.push('Bien : ' + formData.typeBien);
    if (formData.codepostal) lines.push('Code postal : ' + formData.codepostal);
    if (formData.situation) lines.push('Description : ' + formData.situation);
    lines.push('', 'Cordialement');
    var body = encodeURIComponent(lines.join('\n'));
    trackEvent('email_clicked');
    window.location.href = 'mailto:' + CFG.email + '?subject=' + subject + '&body=' + body;
  }

  /* ══════════════════════════════════════════════════════════
     STEP CANAL CONTACT
  ══════════════════════════════════════════════════════════ */
  async function stepCanalContact() {
    clearFooter();
    setBenImage(IMG.jexplique);
    await showTyping(300);
    await addBubble('bot', 'Comment souhaitez-vous transmettre votre demande ?', 800);
    await showTyping(200);
    await addBubble('bot', 'WhatsApp est le moyen le plus rapide — réponse SOS FONTE Front Desk sous 10 min en heures ouvrées.', 500);

    showChoices([
      {
        label: '💬 WhatsApp — rapide',
        action: () => {
          formData.canal = 'whatsapp';
          if (!formData.nom || !formData.codepostal) {
            stepCollectMinimal('whatsapp');
          } else {
            stepConfirmWA();
          }
        }
      },
      {
        label: '📞 Être rappelé',
        action: () => {
          formData.canal = 'tel';
          stepCollectRappel();
        }
      },
      {
        label: '✉️ Email',
        action: () => {
          formData.canal = 'email';
          if (!formData.codepostal) {
            stepCollectCP(() => {
              clearFooter();
              openEmail();
              sendLead();
              stepConfirmationEmail();
            });
          } else {
            openEmail();
            sendLead();
            stepConfirmationEmail();
          }
        }
      },
    ]);
  }

  async function stepCollectMinimal(canal) {
    clearFooter();
    await showTyping(300);
    await addBubble('bot', 'Quelques infos pour votre message :', 700);
    showForm([
      { key: 'nom', placeholder: 'Votre prénom *', required: true },
      {
        key: 'codepostal', placeholder: 'Code postal *', required: true,
        validate: V.postal, errorMsg: V.msgs.postal,
      },
    ], 'Continuer →', (data) => {
      trackEvent('zipcode_submitted');
      if (canal === 'whatsapp') {
        stepConfirmWA();
      }
    });
  }

  async function stepCollectRappel() {
    clearFooter();
    await showTyping(300);
    await addBubble('bot', 'Votre numéro pour vous rappeler :', 700);
    showForm([
      { key: 'nom', placeholder: 'Votre prénom *', required: true },
      {
        key: 'tel', placeholder: 'Téléphone *', type: 'tel', required: true,
        validate: V.phone, errorMsg: V.msgs.phone,
      },
      {
        key: 'codepostal', placeholder: 'Code postal *', required: true,
        validate: V.postal, errorMsg: V.msgs.postal,
      },
    ], 'Être rappelé →', async (data) => {
      clearFooter();
      setBenImage(IMG.reconnaissant);
      addSticker(STK.rdv);
      var prenom = (data.nom || '').split(' ')[0];
      await addBubble('bot', '<strong>' + prenom + '</strong>, SOS FONTE Front Desk vous rappelle sous 2h. 📞 ' + CFG.phoneDisplay, 700);
      trackEvent('callback_submitted');
      sendLead();
      stepAutresQuestions();
    });
  }

  async function stepCollectCP(cb) {
    clearFooter();
    await showTyping(200);
    await addBubble('bot', 'Votre code postal ?', 500);
    showForm([
      {
        key: 'codepostal', placeholder: 'Code postal *', required: true,
        validate: V.postal, errorMsg: V.msgs.postal,
      },
    ], 'Continuer →', (data) => {
      trackEvent('zipcode_submitted');
      cb && cb(data);
    });
  }

  async function stepConfirmWA() {
    clearFooter();
    setBenImage(IMG.okParfait);
    var waMsg = buildWAMessage();
    await showTyping(300);
    await addBubble('bot', 'Votre message WhatsApp sera :<br><em style="font-size:12px;opacity:0.8">' + waMsg.replace(/—/g, '·') + '</em>', 800);
    var block = document.createElement('div');
    block.className = 'ben-cta-block';
    block.innerHTML = '<button class="ben-cta-wa-btn" style="background:#25D366;color:#fff;border:none;border-radius:10px;padding:12px 20px;cursor:pointer;font-size:15px;width:100%">💬 Ouvrir WhatsApp</button>';
    document.getElementById('ben-body').appendChild(block);
    scrollBottom();
    block.querySelector('.ben-cta-wa-btn').addEventListener('click', function() {
      openWhatsApp();
      sendLead();
      addBubble('bot', 'Message envoyé à SOS FONTE Front Desk ✓ Réponse sous 10 min en heures ouvrées.', 400);
      stepAutresQuestions();
    });
  }

  async function stepConfirmationEmail() {
    clearFooter();
    setBenImage(IMG.reconnaissant);
    await addBubble('bot', 'Votre messagerie s\'ouvre avec le message pré-rempli. Envoyez-le à <strong>' + CFG.email + '</strong>.', 700);
    stepAutresQuestions();
  }

  /* ══════════════════════════════════════════════════════════
     7 BRANCHES — ACCUEIL
  ══════════════════════════════════════════════════════════ */
  const RETOUR = {
    label: '↩ Retour à l\'accueil',
    action: () => { clearBody(); setBenImage(IMG.bonjour); stepAccueil(); },
  };

  async function stepAccueil() {
    setBenImage(IMG.bonjour);
    await showTyping(200);
    await addBubble('bot', 'Bonjour — je suis <strong>Ben</strong>.<br>Fuite, bouchon, canalisation fonte — dites-moi ce qui se passe.', 900);
    showChoices([
      { label: '🔴 Fuite / urgence',               action: stepFuite },
      { label: '🚽 Canalisation bouchée',           action: stepBouchon },
      { label: '👃 Odeur / humidité',               action: stepOdeur },
      { label: '🏢 Colonne fonte / copropriété',    action: stepColonne },
      { label: '📷 Diagnostic / caméra',            action: stepDiagnostic },
      { label: '📋 Syndic / professionnel',         action: stepSyndic },
      { label: '❓ Autre question',                  action: stepFAQ },
    ]);
    trackEvent('option_clicked');
  }

  /* ── BRANCHE 1 — FUITE / URGENCE ────────────────────────── */
  async function stepFuite() {
    formData.branche = 'urgence';
    formData.brancheLabel = 'Fuite / urgence';
    clearFooter();
    setBenImage(IMG.cestChaud);
    await showTyping(300);
    await addBubble('bot', 'L\'eau coule en ce moment ?', 800);
    showChoices([
      {
        label: '⚠️ Oui, ça coule maintenant',
        action: async () => {
          formData.urgence = true;
          formData.sousType = 'Fuite active';
          addSticker(STK.urgence);
          setBenImage(IMG.jinterviens);
          await addBubble('bot', 'Coupez l\'arrivée d\'eau dès que vous pouvez. Je prépare votre demande pendant ce temps.', 700);
          await showTyping(200);
          await addBubble('bot', 'Pour les colonnes communes, signalez-le au gardien en parallèle.', 400);
          stepCollectCP(async () => {
            clearFooter();
            setBenImage(IMG.okParfait);
            await showTyping(300);
            await addBubble('bot', 'SOS FONTE Front Desk prend en charge. Canal de contact ?', 600);
            showChoices([
              {
                label: '💬 WhatsApp — immédiat',
                action: () => { formData.canal = 'whatsapp'; stepConfirmWA(); }
              },
              {
                label: '📞 Appeler maintenant — ' + CFG.phoneDisplay,
                action: () => {
                  formData.canal = 'tel_direct';
                  trackEvent('call_clicked');
                  sendLead();
                  window.location.href = CFG.phone;
                }
              },
              {
                label: '📞 Être rappelé',
                action: () => { formData.canal = 'tel'; stepCollectRappel(); }
              },
            ]);
          });
        }
      },
      {
        label: '💧 Oui, mais faible / intermittent',
        action: () => {
          formData.urgence = false;
          formData.sousType = 'Fuite faible';
          stepTypeBien(() => stepCanalContact());
        }
      },
      {
        label: '🟠 Trace ancienne / humidité',
        action: () => {
          formData.urgence = false;
          formData.sousType = 'Trace humidité';
          formData.branche = 'odeur';
          formData.brancheLabel = 'Humidité / trace';
          stepTypeBien(() => stepCanalContact());
        }
      },
      {
        label: 'Je ne sais pas',
        action: () => {
          formData.urgence = false;
          formData.sousType = 'Incertain';
          stepTypeBien(() => stepCanalContact());
        }
      },
    ]);
  }

  /* ── BRANCHE 2 — BOUCHON ─────────────────────────────────── */
  async function stepBouchon() {
    formData.branche = 'bouchon';
    formData.brancheLabel = 'Canalisation bouchée';
    clearFooter();
    setBenImage(IMG.pensif);
    await showTyping(300);
    await addBubble('bot', 'Où semble se situer le bouchon ?', 800);
    showChoices([
      { label: '🚽 WC / sanitaire',    action: () => { formData.sousType = 'WC/sanitaire'; stepTypeBien(() => stepCanalContact()); } },
      { label: '🍳 Cuisine / évier',   action: () => { formData.sousType = 'Cuisine';      stepTypeBien(() => stepCanalContact()); } },
      {
        label: '🏢 Colonne immeuble',
        action: () => {
          formData.sousType = 'Colonne immeuble';
          formData.branche = 'colonne';
          stepTypeBien(() => stepCanalContact());
        }
      },
      { label: 'Je ne sais pas',       action: () => { formData.sousType = 'Incertain';    stepTypeBien(() => stepCanalContact()); } },
      RETOUR,
    ]);
  }

  /* ── BRANCHE 3 — ODEUR / HUMIDITÉ ───────────────────────── */
  async function stepOdeur() {
    formData.branche = 'odeur';
    formData.brancheLabel = 'Odeur / humidité';
    clearFooter();
    setBenImage(IMG.pensif);
    await showTyping(300);
    await addBubble('bot', 'L\'odeur ou l\'humidité vient plutôt :', 800);
    showChoices([
      { label: 'Canalisations',          action: () => { formData.sousType = 'Canalisations';     stepTypeBien(() => stepCanalContact()); } },
      { label: 'Parties communes',       action: () => { formData.sousType = 'Parties communes';  stepTypeBien(() => stepCanalContact()); } },
      { label: 'Avec trace d\'humidité', action: () => { formData.sousType = 'Trace humidité';    stepTypeBien(() => stepCanalContact()); } },
      { label: 'Difficile à localiser',  action: () => { formData.sousType = 'Non localisé';      stepTypeBien(() => stepCanalContact()); } },
      RETOUR,
    ]);
  }

  /* ── BRANCHE 4 — COLONNE FONTE / COPROPRIÉTÉ ────────────── */
  async function stepColonne() {
    formData.branche = 'colonne';
    formData.brancheLabel = 'Colonne fonte / copropriété';
    clearFooter();
    setBenImage(IMG.rassurant);
    await showTyping(300);
    await addBubble('bot', 'Le problème concerne quel type de bien ?', 800);
    stepTypeBien(() => stepStatutColonne());
  }

  async function stepStatutColonne() {
    clearFooter();
    setBenImage(IMG.jexplique);
    await showTyping(300);
    await addBubble('bot', 'Vous êtes :', 700);
    showChoices([
      {
        label: '👤 Propriétaire',
        action: () => { formData.statut = 'proprietaire'; stepCanalContact(); }
      },
      {
        label: '🧾 Locataire',
        action: async () => {
          formData.statut = 'locataire';
          clearFooter();
          setBenImage(IMG.jexplique);
          await showTyping(300);
          await addBubble('bot', 'Votre propriétaire ou syndic doit nous contacter. Mais on peut réaliser un diagnostic préventif si vous le souhaitez.', 900);
          showChoices([
            { label: '📷 Demander un diagnostic', action: () => { formData.branche = 'diagnostic'; stepDiagnostic(); } },
            { label: '💬 Contacter le syndic d\'abord', action: stepFarewell },
            RETOUR,
          ]);
        }
      },
      {
        label: '📋 Syndic / gestionnaire',
        action: () => { formData.statut = 'syndic'; stepSyndic(); }
      },
      {
        label: '🏢 Conseil syndical',
        action: () => { formData.statut = 'conseil_syndical'; stepCanalContact(); }
      },
      {
        label: '🛠 Gardien / maintenance',
        action: () => { formData.statut = 'gardien'; stepCanalContact(); }
      },
      RETOUR,
    ]);
  }

  /* ── HELPER — TYPE DE BIEN ───────────────────────────────── */
  async function stepTypeBien(callback) {
    clearFooter();
    setBenImage(IMG.pensif);
    await showTyping(200);
    await addBubble('bot', 'Type de bien :', 600);
    showChoices([
      { label: '🏢 Appartement / immeuble', action: () => { formData.typeBien = 'Appartement / immeuble'; callback(); } },
      { label: '🏠 Maison individuelle',    action: () => { formData.typeBien = 'Maison';                  callback(); } },
      { label: '🏬 Local commercial',       action: () => { formData.typeBien = 'Local commercial';        callback(); } },
      { label: 'Je ne sais pas',            action: () => { formData.typeBien = null;                      callback(); } },
    ]);
  }

  /* ── BRANCHE 5 — DIAGNOSTIC ──────────────────────────────── */
  async function stepDiagnostic() {
    formData.branche = 'diagnostic';
    formData.brancheLabel = 'Diagnostic / caméra';
    clearFooter();
    setBenImage(IMG.pensif);
    await showTyping(300);
    await addBubble('bot', 'Quel diagnostic souhaitez-vous ?', 800);
    showChoices([
      { label: '📹 Inspection caméra',          action: () => { formData.typeDiag = 'Inspection caméra';    formData.sousType = 'camera';  stepCanalContact(); } },
      { label: '💧 Recherche de fuite',         action: () => { formData.typeDiag = 'Recherche de fuite';   formData.sousType = 'fuite';   stepCanalContact(); } },
      { label: '🧼 Curage haute pression',      action: () => { formData.typeDiag = 'Curage haute pression';formData.sousType = 'curage';  stepCanalContact(); } },
      { label: '🏢 Audit copropriété',          action: () => { formData.typeDiag = 'Audit copropriété';    formData.sousType = 'audit';   stepCanalContact(); } },
      { label: '🏠 Diagnostic avant achat',     action: () => { formData.typeDiag = 'Diagnostic avant achat';formData.sousType = 'achat'; stepCanalContact(); } },
      RETOUR,
    ]);
  }

  /* ── BRANCHE 6 — SYNDIC / PROFESSIONNEL ─────────────────── */
  async function stepSyndic() {
    formData.branche = formData.branche || 'syndic';
    formData.brancheLabel = formData.brancheLabel || 'Syndic / professionnel';
    clearFooter();
    setBenImage(IMG.rassurant);
    await showTyping(300);
    await addBubble('bot', 'Bienvenue. SOS FONTE travaille avec les principaux gestionnaires IDF.', 800);
    await showTyping(200);
    await addBubble('bot', 'Vous êtes :', 500);
    showChoices([
      { label: '📋 Syndic / gestionnaire professionnel', action: () => { formData.profil = 'Syndic professionnel';    formData.statut = 'syndic';          stepSyndicNbImmeubles(); } },
      { label: '🏢 Conseil syndical',                     action: () => { formData.profil = 'Conseil Syndical';        formData.statut = 'conseil_syndical'; stepSyndicDescription(); } },
      { label: '🛠 Plombier / artisan',                   action: () => { formData.profil = 'Plombier';               formData.statut = 'pro';             stepSyndicDescription(); } },
      { label: '🏗 Architecte / bureau d\'études',        action: () => { formData.profil = "Bureau d'études";        formData.statut = 'pro';             stepSyndicDescription(); } },
      { label: 'Autre professionnel',                      action: () => { formData.profil = 'Autre professionnel';   formData.statut = 'pro';             stepSyndicDescription(); } },
      RETOUR,
    ]);
  }

  async function stepSyndicNbImmeubles() {
    clearFooter();
    await showTyping(300);
    await addBubble('bot', 'Combien d\'immeubles en fonte dans votre portefeuille ?', 800);
    showChoices([
      { label: '1 immeuble',          action: () => { formData.nbImmeubles = '1';   stepSyndicDescription(); } },
      { label: '2 à 5 immeubles',     action: () => { formData.nbImmeubles = '2-5'; stepSyndicDescription(); } },
      { label: 'Plus de 5 immeubles', action: () => { formData.nbImmeubles = '5+';  stepSyndicDescription(); } },
      RETOUR,
    ]);
  }

  async function stepSyndicDescription() {
    clearFooter();
    setBenImage(IMG.jecoute);
    await showTyping(300);
    await addBubble('bot', 'Décrivez brièvement votre besoin (optionnel).', 700);
    showTextInput('Votre besoin (optionnel)…', (txt) => {
      formData.situation = txt;
      stepCanalContact();
    });
    // Bouton "Passer" discret sous l'input
    var footer = document.getElementById('ben-footer');
    var skipLink = document.createElement('div');
    skipLink.style.cssText = 'text-align:center;padding:6px 0 2px';
    skipLink.innerHTML = '<a href="#" style="font-size:12px;color:rgba(255,255,255,0.45);text-decoration:none;">Passer →</a>';
    skipLink.querySelector('a').addEventListener('click', function(e) {
      e.preventDefault();
      clearFooter();
      stepCanalContact();
    });
    footer.appendChild(skipLink);
  }

  /* ── BRANCHE 7 — FAQ ─────────────────────────────────────── */
  async function stepFAQ() {
    faqAttempts = 0;
    clearFooter();
    setBenImage(IMG.jexplique);
    await showTyping(300);
    await addBubble('bot', 'Posez votre question — je vais essayer de vous répondre simplement.', 700);
    await showTyping(200);
    await addBubble('bot', '<span style="font-size:12px;color:rgba(255,255,255,0.45)">Ex : "Vous intervenez le week-end ?" · "Le devis est gratuit ?" · "Durée du chantier ?"</span>', 400);

    async function showFAQAnswer(match) {
      addSticker(STK.diag);
      await new Promise(r => setTimeout(r, 2500));
      setBenImage(IMG.jexplique);
      await addBubble('bot', match.text, 0);
      if (match.link) {
        await addBubble('bot', '<a href="' + match.link + '" class="ben-page-link">En savoir plus →</a>', 400);
      }
      trackEvent('faq_match');
      showChoices([
        { label: '💬 WhatsApp', action: () => { formData.canal = 'whatsapp'; formData.branche = 'faq'; stepConfirmWA(); } },
        { label: '📞 Être rappelé', action: () => { formData.branche = 'faq'; stepCollectRappel(); } },
        RETOUR,
      ]);
    }

    showTextInput('Tapez votre question…', async (q) => {
      clearFooter();
      faqAttempts++;
      const match = matchFAQ(q);
      if (match) { await showFAQAnswer(match); return; }

      trackEvent('faq_miss_1');
      addSticker(STK.diag);
      await new Promise(r => setTimeout(r, 2000));
      setBenImage(IMG.pensif);
      await addBubble('bot', 'Je n\'ai pas trouvé de réponse précise. Pouvez-vous reformuler ?', 800);

      showTextInput('Reformulez…', async (q2) => {
        clearFooter();
        faqAttempts++;
        await showTyping(600);
        const match2 = matchFAQ(q2);
        if (match2) { await showFAQAnswer(match2); return; }

        trackEvent('faq_miss_2');
        trackEvent('handoff_requested');
        setBenImage(IMG.sourire);
        await addBubble('bot', 'Votre demande mérite une réponse précise. Je la transmets à SOS FONTE Front Desk.', 900);
        await addBubble('bot', '<a href="faq.html" class="ben-page-link">📖 FAQ complète →</a>', 400);
        formData.branche = 'faq';
        stepCanalContact();
      });
    });
  }

  /* ══════════════════════════════════════════════════════════
     HORS HORAIRES
  ══════════════════════════════════════════════════════════ */
  async function stepOffHours() {
    setBenImage(IMG.deborde);
    addSticker(STK.hs);
    await addBubble('bot', 'L\'équipe SOS FONTE Front Desk reprend à 7h.', 700);
    await showTyping(200);
    await addBubble('bot', 'Si votre demande est urgente, je peux préparer un message WhatsApp maintenant — il sera lu dès l\'ouverture.', 600);
    showChoices([
      {
        label: '💬 Préparer un WhatsApp',
        action: () => { formData.canal = 'whatsapp'; formData.branche = 'offhours'; stepFuite(); }
      },
      {
        label: '📞 Être rappelé à 7h',
        action: async () => {
          formData.branche = 'offhours';
          clearFooter();
          await showTyping(300);
          await addBubble('bot', 'Votre numéro — rappel à 7h15 :', 700);
          showForm([
            {
              key: 'tel', placeholder: 'Téléphone *', type: 'tel', required: true,
              validate: V.phone, errorMsg: V.msgs.phone,
            },
          ], 'Rappel à 7h15 →', async (data) => {
            clearFooter();
            setBenImage(IMG.reconnaissant);
            addSticker(STK.ok);
            await addBubble('bot', 'Noté — SOS FONTE Front Desk vous rappelle à 7h15. 📞 ' + CFG.phoneDisplay, 600);
            formData.canal = 'tel';
            sendLead();
            stepAutresQuestions();
          });
        }
      },
      {
        label: '❓ Poser une question',
        action: stepFAQ,
      },
    ]);
  }

  /* ══════════════════════════════════════════════════════════
     SEND LEAD — VERSION COMPLÈTE
  ══════════════════════════════════════════════════════════ */
  function sendLead() {
    var branch = formData.branche || 'contact_generique';
    var brancheLabel = formData.brancheLabel || branch;

    // Sauvegarder returning user
    if (formData.tel && branch !== 'offhours') {
      saveReturningUser(formData.tel, branch, brancheLabel);
    }

    trackEvent('flow_completed');

    // ── Payload Formspree (filet de sécurité)
    var formspreePayload = {
      _subject:       '[BOT BEN V2] ' + brancheLabel + (formData.urgence ? ' 🔴 URGENT' : ''),
      branche:        brancheLabel,
      urgence:        formData.urgence ? 'OUI — fuite active' : 'non',
      sousType:       formData.sousType      || '—',
      typeBien:       formData.typeBien      || '—',
      statut:         formData.statut        || '—',
      profil:         formData.profil        || '—',
      nbImmeubles:    formData.nbImmeubles   || '—',
      typeDiag:       formData.typeDiag      || '—',
      nom:            formData.nom           || '—',
      telephone:      formData.tel           || '—',
      email:          formData.email         || 'nomail@sf.com',
      codepostal:     formData.codepostal    || '—',
      situation:      formData.situation     || '—',
      canal:          formData.canal         || '—',
      page:           window.location.href,
      timestamp:      new Date().toLocaleString('fr-FR'),
    };

    fetch(CFG.formspree, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(formspreePayload),
    })
      .then(r => r.json())
      .then(r => { if (r.ok) console.log('[BenBot] Formspree ✓'); else throw r; })
      .catch(err => {
        try {
          var leads = JSON.parse(localStorage.getItem('ben_leads') || '[]');
          leads.push(formspreePayload);
          localStorage.setItem('ben_leads', JSON.stringify(leads));
        } catch(e) {}
        console.warn('[BenBot] Fallback localStorage', err);
      });

    // ── Payload Supabase (source de vérité)
    if (!CFG.ingestUrl) return;

    var supabasePayload = {
      action:          'lead',
      branche:         brancheLabel,
      nom:             formData.nom          || null,
      telephone:       formData.tel          || null,
      email:           formData.email        || null,
      codepostal:      formData.codepostal   || null,
      message:         formData.situation    || null,
      cabinet:         formData.cabinet      || null,
      profil:          formData.profil       || null,
      nb_immeubles:    formData.nbImmeubles  || null,
      typeDiag:        formData.typeDiag     || formData.sousType || null,
      typePartenaire:  formData.profil       || null,
      is_urgence:      formData.urgence      === true,
      canal_contact:   formData.canal        || null,
      session_id:      botSessionId,
      page:            window.location.href,
    };

    fetch(CFG.ingestUrl, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': 'Bearer ' + CFG.anonKey,
      },
      body: JSON.stringify(supabasePayload),
    })
      .then(r => r.json())
      .then(r => {
        if (r.ok) {
          console.log('[BenBot] Supabase ✓ lead_id=' + r.lead_id + (r.is_duplicate ? ' (doublon)' : ''));
          window.__BEN = window.__BEN || {};
          window.__BEN.leadId = r.lead_id;
        } else {
          console.warn('[BenBot] Supabase response non-ok', r);
        }
      })
      .catch(err => console.warn('[BenBot] Supabase ingest error', err));
  }

  /* ══════════════════════════════════════════════════════════
     TRACK EVENT
  ══════════════════════════════════════════════════════════ */
  function trackEvent(eventType) {
    if (!CFG.ingestUrl) return;
    var payload = {
      action:     'event',
      event_type: eventType,
      session_id: botSessionId,
      lead_id:    (window.__BEN && window.__BEN.leadId) || null,
      page_url:   window.location.href,
    };
    fetch(CFG.ingestUrl, {
      method:    'POST',
      headers:   { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + CFG.anonKey },
      body:      JSON.stringify(payload),
      keepalive: true,
    }).catch(function() {});
  }

  /* ── INIT ─────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildWidget);
  } else {
    buildWidget();
  }

})();
