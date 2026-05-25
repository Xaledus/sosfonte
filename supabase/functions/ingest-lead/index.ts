/* ═══════════════════════════════════════════════════════════════
   SOS FONTE V2 — Edge Function : ingest-lead
   Rôle : point d'entrée unique pour leads, events et messages bot.
   Runtime : Deno (Supabase Edge Functions)
   Auth : CORS origin strict — pas de clé exposée côté client.

   Actions acceptées (POST JSON) :
     { action: 'lead',    ... }  → création/déduplication lead
     { action: 'event',   ... }  → log événement (wa_click, tel_click…)
     { action: 'message', ... }  → log échange bot ↔ visiteur
   ═══════════════════════════════════════════════════════════════ */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── Origines autorisées ────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://sosfonte.com',
  'https://www.sosfonte.com',
  'https://xaledus.github.io',  // GitHub Pages preview
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
];

function buildCorsHeaders(origin: string): Record<string, string> {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin':  allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age':       '86400',
  };
}

// ── Client Supabase service_role (bypass RLS) ──────────────────
// Les variables SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont
// injectées automatiquement par Supabase dans chaque Edge Function.
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// ── Hash SHA-256 de l'IP (RGPD — jamais l'IP en clair) ────────
async function hashIp(ip: string | null): Promise<string | null> {
  if (!ip) return null;
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(ip),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── Mapping branche bot → source + branch DB ──────────────────
// Les valeurs de branche viennent de sendLead() dans bot-ben.js.
interface BrancheMap {
  source: string;
  branch: string;
  diag_sous_type?: string;
}

function mapBranche(branche: string): BrancheMap {
  // ── Labels V2 (brancheLabel envoyé par bot-ben.js V2) ─────────────────────
  if (branche === 'Fuite / urgence' || branche === 'urgence')
    return { source: 'bot_urgence', branch: 'urgence' };
  if (branche === 'Canalisation bouchée' || branche === 'bouchon')
    return { source: 'bot_bouchon', branch: 'bouchon' };
  if (branche === 'Odeur / humidité' || branche === 'Humidité / trace' || branche === 'odeur')
    return { source: 'bot_odeur', branch: 'odeur' };
  if (branche === 'Colonne fonte / copropriété' || branche === 'colonne')
    return { source: 'bot_colonne', branch: 'colonne' };
  if (branche === 'Diagnostic / caméra' || branche === 'diagnostic')
    return { source: 'bot_diagnostic', branch: 'diagnostic' };
  if (branche === 'Syndic / professionnel' || branche === 'Syndic' || branche === 'syndic')
    return { source: 'bot_syndic', branch: 'syndic' };

  // ── Labels V1 (rétrocompatibilité) ────────────────────────────────────────
  if (branche === 'Intervention fonte' || branche === 'intervention')
    return { source: 'bot_intervention', branch: 'intervention' };
  if (branche === 'Rappel hors-horaires' || branche === 'offhours')
    return { source: 'bot_offhours', branch: 'offhours' };
  if (branche.startsWith('Partenaire') || branche === 'partenaire')
    return { source: 'bot_partenaire', branch: 'partenaire' };
  if (branche === 'faq' || branche === 'Question / FAQ')
    return { source: 'contact_form', branch: 'contact_generique' };

  // Branches diagnostic — sous-types V1 (le branche string = le type de diag)
  const diagMap: Record<string, string> = {
    'Recherche de fuite':    'fuite',
    'Inspection caméra':     'camera',
    'Curage haute pression': 'curage',
    'Diagnostic achat':      'achat',
  };
  if (diagMap[branche])
    return { source: 'bot_diagnostic', branch: 'diagnostic', diag_sous_type: diagMap[branche] };

  // Formulaires HTML hors bot
  return { source: 'contact_form', branch: 'contact_generique' };
}

function mapSyndicProfil(profil: string): string | null {
  const map: Record<string, string> = {
    'Syndic professionnel':    'syndic_professionnel',
    'Conseil Syndical':        'conseil_syndical',
    'Administrateur de biens': 'administrateur_de_biens',
  };
  return map[profil] ?? null;
}

function mapPartenaireType(raw: string): string {
  if (!raw) return 'autre';
  if (raw.includes('Plombier'))                              return 'plombier_artisan';
  if (raw.includes("Bureau") || raw.includes('Architecte')) return 'bureau_etudes';
  if (raw.includes('Gestionnaire'))                          return 'gestionnaire_immo';
  return 'autre';
}

// Sanitise une valeur string : retourne null si vide ou "—" (bot placeholder)
function clean(v: unknown): string | null {
  const s = String(v ?? '').trim();
  return (s === '' || s === '—') ? null : s;
}

// ═══════════════════════════════════════════════════════════════
// HANDLER PRINCIPAL
// ═══════════════════════════════════════════════════════════════

Deno.serve(async (req: Request) => {
  const origin  = req.headers.get('origin') ?? '';
  const cors    = buildCorsHeaders(origin);
  const headers = { ...cors, 'Content-Type': 'application/json' };

  // Preflight CORS
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST')
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });

  // Parse body
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers });
  }

  // IP hash (RGPD — calculé côté serveur uniquement)
  const rawIp  = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? null;
  const ipHash = await hashIp(rawIp);

  const action = String(body.action ?? 'lead');

  try {
    if (action === 'lead')    return await handleLead(body, ipHash, headers);
    if (action === 'event')   return await handleEvent(body, ipHash, headers);
    if (action === 'message') return await handleMessage(body, headers);
    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('[ingest-lead] Unhandled error:', detail, err);
    return new Response(
      JSON.stringify({ error: 'Internal error', detail }),
      { status: 500, headers },
    );
  }
});

// ═══════════════════════════════════════════════════════════════
// ACTION : lead
// Crée un lead ou détecte un doublon, puis log un événement.
// ═══════════════════════════════════════════════════════════════

async function handleLead(
  body: Record<string, unknown>,
  ipHash: string | null,
  headers: Record<string, string>,
): Promise<Response> {
  const branche    = clean(body.branche ?? body.source) ?? '';
  const mapped     = mapBranche(branche);
  const sessionId  = clean(body.session_id ?? body.sessionId);
  const telephoneRaw = clean(body.telephone ?? body.telephone_raw);
  const email      = clean(body.email);
  const pageUrl    = clean(body.page) ?? '';

  // ── 1. Déduplication via fonction SQL ─────────────────────────
  const { data: dupeId, error: rpcError } = await supabase.rpc('find_duplicate_lead', {
    p_telephone_raw: telephoneRaw,
    p_email:         email,
    p_session_id:    sessionId,
  });

  if (rpcError) {
    console.error('[ingest-lead] find_duplicate_lead error:', JSON.stringify(rpcError));
    return new Response(
      JSON.stringify({ error: 'RPC error', detail: rpcError.message, code: rpcError.code, hint: rpcError.hint }),
      { status: 500, headers },
    );
  }

  // ── 2a. Doublon détecté ────────────────────────────────────────
  if (dupeId) {
    await supabase.from('lead_events').insert({
      lead_id:    dupeId,
      session_id: sessionId,
      event_type: 'lead_deduplique',
      metadata: {
        method:       'auto',
        new_source:   mapped.source,
        branche_raw:  branche,
      },
      page_url: pageUrl,
      ip_hash:  ipHash,
    });

    return new Response(
      JSON.stringify({ ok: true, lead_id: dupeId, is_duplicate: true }),
      { status: 200, headers },
    );
  }

  // ── 2b. Nouveau lead ───────────────────────────────────────────
  // Validation minimale : au moins un moyen de contact
  if (!telephoneRaw && !email && !sessionId) {
    return new Response(
      JSON.stringify({ error: 'Requires telephone, email or session_id' }),
      { status: 400, headers },
    );
  }

  // Champs communs
  const leadPayload: Record<string, unknown> = {
    source:        mapped.source,
    branch:        mapped.branch,
    nom:           clean(body.nom),
    telephone_raw: telephoneRaw,
    email,
    code_postal:   clean(body.codepostal ?? body.code_postal),
    message:       clean(body.message),
    session_id:    sessionId,
    page_url:      pageUrl,
    // Dual priority V2
    is_urgence:    body.is_urgence === true,
    canal_contact: clean(body.canal_contact ?? body.canal) ?? null,
  };

  // Champs branche Syndic
  if (mapped.branch === 'syndic') {
    leadPayload.cabinet       = clean(body.cabinet);
    leadPayload.syndic_profil = mapSyndicProfil(clean(body.profil) ?? '');
    const nb = clean(body.nb_immeubles);
    leadPayload.nb_immeubles  = ['1', '2-5', '5+'].includes(nb ?? '') ? nb : null;
  }

  // Champs branche Diagnostic
  // mapped.diag_sous_type vient des labels V1 ; body.typeDiag vient du bot V2
  if (mapped.branch === 'diagnostic') {
    leadPayload.diag_sous_type = mapped.diag_sous_type
      ?? clean(body.typeDiag ?? body.sousType)
      ?? null;
  }

  // Champs branche Partenaire
  if (mapped.branch === 'partenaire') {
    const rawType = branche.replace('Partenaire — ', '');
    leadPayload.partenaire_type = mapPartenaireType(
      clean(body.typePartenaire) ?? rawType,
    );
  }

  // Form HTML hors-bot
  if (mapped.source === 'contact_form') {
    const formId = clean(body.form_id);
    if (formId) leadPayload.form_id = formId;
  }

  // INSERT lead (le trigger calcule score + updated_at automatiquement)
  const { data: lead, error: insertError } = await supabase
    .from('leads')
    .insert(leadPayload)
    .select('id')
    .single();

  if (insertError) {
    console.error('[ingest-lead] leads INSERT error:', JSON.stringify(insertError));
    return new Response(
      JSON.stringify({ error: 'Insert error', detail: insertError.message, code: insertError.code, hint: insertError.hint }),
      { status: 500, headers },
    );
  }

  // Événement lead_cree
  await supabase.from('lead_events').insert({
    lead_id:    lead.id,
    session_id: sessionId,
    event_type: 'lead_cree',
    metadata: { source: mapped.source, branche_raw: branche },
    page_url: pageUrl,
    ip_hash:  ipHash,
  });

  return new Response(
    JSON.stringify({ ok: true, lead_id: lead.id, is_duplicate: false }),
    { status: 201, headers },
  );
}

// ═══════════════════════════════════════════════════════════════
// ACTION : event
// Log un événement (wa_click, tel_click, bot_ouvert, faq_hit…)
// Accepte : lead_id ou session_id (au moins l'un des deux).
// ═══════════════════════════════════════════════════════════════

async function handleEvent(
  body: Record<string, unknown>,
  ipHash: string | null,
  headers: Record<string, string>,
): Promise<Response> {
  const eventType = clean(body.event_type);
  const sessionId = clean(body.session_id ?? body.sessionId);
  const leadId    = body.lead_id ? Number(body.lead_id) : null;

  if (!eventType)
    return new Response(JSON.stringify({ error: 'event_type required' }), { status: 400, headers });
  if (!leadId && !sessionId)
    return new Response(JSON.stringify({ error: 'lead_id or session_id required' }), { status: 400, headers });

  const { error } = await supabase.from('lead_events').insert({
    lead_id:    leadId,
    session_id: sessionId,
    event_type: eventType,
    metadata:   body.metadata ?? null,
    page_url:   clean(body.page_url) ?? '',
    user_agent: clean(body.user_agent),
    ip_hash:    ipHash,
  });

  if (error) {
    console.error('[ingest-lead] lead_events INSERT error:', error);
    throw error;
  }

  return new Response(JSON.stringify({ ok: true }), { status: 201, headers });
}

// ═══════════════════════════════════════════════════════════════
// ACTION : message
// Log un échange textuel bot ↔ visiteur dans lead_messages.
// ═══════════════════════════════════════════════════════════════

async function handleMessage(
  body: Record<string, unknown>,
  headers: Record<string, string>,
): Promise<Response> {
  const sessionId = clean(body.session_id ?? body.sessionId);
  const leadId    = body.lead_id ? Number(body.lead_id) : null;

  if (!leadId && !sessionId)
    return new Response(JSON.stringify({ error: 'lead_id or session_id required' }), { status: 400, headers });

  const isFaqHit = body.is_faq_hit === true;
  const faqKey   = isFaqHit ? (clean(body.faq_key) ?? null) : null;

  const { error } = await supabase.from('lead_messages').insert({
    lead_id:      leadId,
    session_id:   sessionId,
    branch:       clean(body.branch) ?? null,
    step_key:     clean(body.step_key) ?? null,
    user_input:   clean(body.user_input) ?? null,
    bot_response: clean(body.bot_response) ?? null,
    is_faq_hit:   isFaqHit,
    faq_key:      faqKey,
  });

  if (error) {
    console.error('[ingest-lead] lead_messages INSERT error:', error);
    throw error;
  }

  return new Response(JSON.stringify({ ok: true }), { status: 201, headers });
}
