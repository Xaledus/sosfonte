/**
 * _apply_highlights.js v2
 * Lit SF Params/Highlighted_words.csv et applique les mots mis en couleur
 * sur TOUS les éléments HTML contenant le texte du titre (h1-h3, p, div...).
 *
 * Orange    → <em>
 * Turquoise → <span class="hl-teal">
 */

const fs   = require('fs');
const path = require('path');

const BASE     = __dirname;
const CSV_PATH = path.join(BASE, 'SF Params', 'Highlighted_words.csv');

const PAGE_MAP = {
  'index':        'index.html',
  'urgence':      'urgence.html',
  'services':     'services.html',
  'syndics':      'syndics.html',
  'réalisations': 'realisations.html',
  'realisations': 'realisations.html',
  'contact':      'contact.html',
  'la fonte':     'la-fonte.html',
  'partenaires':  'partenaires.html',
};

/* ── Normalisation accent+casse insensible ── */
function norm(s) {
  return (s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ── Parse CSV (gère les guillemets) ── */
function parseCSV(raw) {
  const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const rows  = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const fields = [];
    let cur = '', inQ = false;
    for (const c of line + ',') {
      if (c === '"')          { inQ = !inQ; continue; }
      if (c === ',' && !inQ) { fields.push(cur.trim()); cur = ''; continue; }
      cur += c;
    }
    if (!fields[0] || !fields[1]) continue;
    rows.push({
      ref:         fields[0],
      page:        fields[1].toLowerCase().trim(),
      title:       fields[2].trim(),
      highlighted: fields[3].trim(),
      color:       (fields[4] || '').trim().toLowerCase(),
      status:      (fields[5] || '').trim().toLowerCase(),
    });
  }
  return rows;
}

/* ── Supprime nos balises highlight ── */
function stripHL(html) {
  return html
    .replace(/<em>([\s\S]*?)<\/em>/g, '$1')
    .replace(/<span class="hl-teal">([\s\S]*?)<\/span>/g, '$1');
}

/* ── Applique les highlights dans un innerHTML ── */
function applyHL(innerHTML, wordsStr, color) {
  const open  = color === 'turquoise' ? '<span class="hl-teal">' : '<em>';
  const close = color === 'turquoise' ? '</span>'               : '</em>';

  // Nettoyage des tokens — on garde TOUS les tokens non-vides (y compris chiffres isolés "9","4","1")
  const tokens = wordsStr.replace(/\s+/g, ' ').trim()
    .split(' ').filter(t => t.length >= 1);

  let result  = innerHTML;
  const ok    = [];
  const miss  = [];

  // 1. Essai phrase entière — uniquement si les tokens sont séparés par des espaces
  //    (pas de [\s\S]{0,15} qui enroulait "&" et autres séparateurs)
  if (tokens.length > 1) {
    const phraseNorm = tokens.map(t => norm(t)).join(' ');
    const textOnly   = norm(result.replace(/<[^>]+>/g, ' '));
    if (textOnly.includes(phraseNorm)) {
      const rxParts = tokens.map(t =>
        norm(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      );
      // \s+ entre tokens : seul l'espace blanc est toléré — "Syndics & gestionnaires"
      // ne matche pas car "&" n'est pas un espace → tombe en token par token
      const phraseRxHtml = new RegExp(rxParts.join('\\s+'), 'i');
      const m = result.match(phraseRxHtml);
      if (m) {
        result = result.replace(phraseRxHtml, `${open}${m[0]}${close}`);
        ok.push(tokens.join(' '));
        return { html: result, ok, miss };
      }
    }
  }

  // 2. Token par token
  for (const token of tokens) {
    const tokenNorm = norm(token);
    if (!tokenNorm) continue;
    const textOnly = norm(result.replace(/<[^>]+>/g, ''));
    if (!textOnly.includes(tokenNorm)) { miss.push(token); continue; }

    // Cherche le token (cas + accent insensible) dans le HTML
    // Lookbehind/lookahead: pas de lettre/chiffre adjacent (accent compris)
    // NB: on exclut PAS < ou > pour permettre les mots après <br>
    const esc = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx  = new RegExp(`(?<![a-zA-ZÀ-ɏ0-9])${esc}(?![a-zA-ZÀ-ɏ0-9])`, 'i');
    const m   = result.match(rx);
    if (m) {
      result = result.replace(rx, `${open}${m[0]}${close}`);
      ok.push(token);
    } else {
      miss.push(`${token}(?)`);
    }
  }

  return { html: result, ok, miss };
}

/* ══════════════════════════════════════════════════════
   Traite un fichier HTML : cherche TOUS les éléments
   dont le texte brut correspond au titre CSV,
   puis applique le highlight.
══════════════════════════════════════════════════════ */
function processFile(fileHtml, rows) {
  const results = [];

  for (const row of rows) {
    const titleNorm = norm(row.title);
    let   matched   = false;
    let   log       = null;

    /* Deux passes dans l'ordre de priorité :
       1. Titres h1-h6 → toujours préférés aux paragraphes
       2. Éléments bloc p/li/td → seulement si aucun titre n'a matché
       Évite qu'un <p> de corps contenant "santé" prenne la place d'un <h3>Santé</h3>. */
    const PASSES = [
      /<(h[1-6])(\s[^>]*)?>([^]*?)<\/\1>/g,
      /<(p|li|td)(\s[^>]*)?>([^]*?)<\/\1>/g,
    ];

    for (const EL_RX of PASSES) {
      if (matched) break;

      const tryHtml = fileHtml.replace(EL_RX, (full, tag, attrs, inner) => {
        if (matched) return full;

        // Texte brut (tags → espace pour éviter que <br> colle deux mots)
        const rawText = inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        const rawNorm = norm(rawText);

        // Matching souple : égalité ou inclusion dans les deux sens
        const isMatch =
          rawNorm === titleNorm ||
          rawNorm.includes(titleNorm) ||
          (titleNorm.length >= 15 && rawNorm.includes(titleNorm.substring(0, titleNorm.length - 5))) ||
          (rawNorm.length  >= 15 && titleNorm.includes(rawNorm.substring(0, rawNorm.length  - 5)));

        if (!isMatch) return full;

        // Ne pas toucher les éléments trop longs (corps de texte)
        if (rawText.length > 160) return full;

        const stripped  = stripHL(inner);
        const { html: newInner, ok, miss } = applyHL(stripped, row.highlighted, row.color);

        if (newInner === stripped) return full; // rien appliqué

        matched = true;
        log = { ok, miss };
        return full.replace(inner, newInner);
      });

      if (matched) fileHtml = tryHtml;
    }

    if (matched) {
      results.push({ ref: row.ref, title: row.title, matched: true, log });
    } else {
      results.push({ ref: row.ref, title: row.title, matched: false });
    }
  }

  return { html: fileHtml, results };
}

/* ═══════════════════════ MAIN ═══════════════════════ */
console.log('\n');
const csvRaw = fs.readFileSync(CSV_PATH, 'utf8');
const rows   = parseCSV(csvRaw).filter(r => r.status === 'active');
console.log(`📋 ${rows.length} lignes actives\n`);

// Groupe par fichier
const byFile = {};
for (const row of rows) {
  const file = PAGE_MAP[row.page];
  if (!file) { console.log(`  ✗ REF${row.ref}: page inconnue "${row.page}"`); continue; }
  if (!byFile[file]) byFile[file] = [];
  byFile[file].push(row);
}

let totalOk = 0, totalKo = 0, totalMiss = 0;

for (const [file, fileRows] of Object.entries(byFile)) {
  const fp = path.join(BASE, file);
  if (!fs.existsSync(fp)) { console.log(`✗ Fichier manquant: ${file}`); continue; }

  const rawHtml = fs.readFileSync(fp, 'utf8');
  const { html: newHtml, results } = processFile(rawHtml, fileRows);

  let ok = 0, ko = 0;
  for (const r of results) {
    if (r.matched) {
      const missStr = r.log.miss.length ? `  ⚠ manqués: ${r.log.miss.join(', ')}` : '';
      console.log(`  ✓ REF${r.ref}: "${r.title}"${missStr}`);
      totalMiss += r.log.miss.length;
      ok++;
    } else {
      console.log(`  ✗ REF${r.ref}: NON TROUVÉ → "${r.title}"`);
      ko++;
    }
  }

  fs.writeFileSync(fp, newHtml, 'utf8');
  console.log(`\n✅ ${file}: ${ok} appliqués · ${ko} non trouvés\n`);
  totalOk += ok; totalKo += ko;
}

console.log('═'.repeat(52));
console.log(`TOTAL : ${totalOk} ✓ · ${totalKo} ✗ non trouvés · ${totalMiss} tokens partiels\n`);
