-- ============================================================
-- SOS FONTE V2 — Migration initiale
-- Fichier  : 001_initial_schema.sql
-- Cible    : PostgreSQL 15+ / Supabase (région EU Frankfurt)
-- Auteur   : SOS FONTE Engineering
-- Date     : 2026-05-25
-- Statut   : VALIDÉ — ne pas exécuter avant go opérationnel
-- ============================================================
--
-- Contenu :
--   §0  Extensions
--   §1  Enum types
--   §2  Fonctions utilitaires (normalize_phone, phone_dedup_key, updated_at)
--   §3  Table leads (centrale)
--   §4  Table lead_events (historique immuable)
--   §5  Table lead_messages (log conversation bot)
--   §6  Index
--   §7  Triggers (updated_at + scoring automatique)
--   §8  Fonction find_duplicate_lead
--   §9  Vues (dashboard, FAQ analytics, conversions, doublons)
--   §10 Row Level Security
-- ============================================================


BEGIN;

-- ============================================================
-- §0 — EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- gen_random_uuid() pour les UUID v4 des leads

-- Note : "unaccent" optionnel si recherche full-text future sur message/situation
-- CREATE EXTENSION IF NOT EXISTS "unaccent";


-- ============================================================
-- §1 — ENUM TYPES
-- ============================================================

-- Source du lead : canal d'acquisition
CREATE TYPE lead_source AS ENUM (
    'bot_urgence',         -- Bot Ben → branche urgence (affiche CTA tel/WA, pas de form)
    'bot_intervention',    -- Bot Ben → branche intervention fonte (form rappel 2h)
    'bot_diagnostic',      -- Bot Ben → branche diagnostic / curage (form devis)
    'bot_syndic',          -- Bot Ben → branche syndic (form + profil + nb_immeubles)
    'bot_partenaire',      -- Bot Ben → branche partenariat pro (form message + coords)
    'bot_offhours',        -- Bot Ben → hors horaires (form tel uniquement, rappel dès 7h)
    'contact_form',        -- Formulaire HTML statique hors bot (form_id précise lequel)
    'wa_click',            -- Clic WhatsApp sans soumission de formulaire
    'tel_click'            -- Clic téléphone sans soumission de formulaire
);

-- Statut commercial du lead dans le pipeline
CREATE TYPE lead_status AS ENUM (
    'nouveau',             -- Entrant, pas encore traité
    'contacté',            -- Équipe a pris contact
    'devis_envoyé',        -- Devis transmis au client
    'converti',            -- Intervention réalisée / contrat signé
    'perdu'                -- Sans suite (pas de réponse, hors zone, budget…)
);

-- Branche métier du lead
CREATE TYPE lead_branch AS ENUM (
    'urgence',
    'intervention',
    'diagnostic',
    'syndic',
    'partenaire',
    'offhours',
    'contact_generique'    -- Formulaires HTML hors bot sans branche spécifique
);

-- Profil du contact syndic (branche syndic uniquement)
CREATE TYPE syndic_profil AS ENUM (
    'syndic_professionnel',
    'conseil_syndical',
    'administrateur_de_biens'
);

-- Taille de portefeuille syndic
CREATE TYPE nb_immeubles AS ENUM (
    '1',
    '2-5',
    '5+'
);

-- Sous-type de diagnostic demandé
CREATE TYPE diag_sous_type AS ENUM (
    'fuite',       -- Recherche de fuite colorant / gaz traceur
    'camera',      -- Inspection caméra + rapport assurance
    'curage',      -- Curage haute pression
    'achat'        -- Diagnostic avant achat immobilier (lead chaud)
);

-- Type de partenariat professionnel
CREATE TYPE partenaire_type AS ENUM (
    'plombier_artisan',
    'bureau_etudes',
    'gestionnaire_immo',
    'autre'
);

-- Types d'événements loggés dans lead_events
CREATE TYPE event_type AS ENUM (
    'lead_cree',           -- Création initiale du lead
    'wa_click',            -- Clic sur lien WhatsApp
    'tel_click',           -- Clic sur lien téléphone
    'bot_ouvert',          -- Visiteur a ouvert le widget bot Ben
    'faq_hit',             -- Question matchée dans matchFAQ()
    'faq_miss',            -- Question sans réponse FAQ (1re tentative)
    'faq_miss_retry',      -- Question sans réponse FAQ (2e tentative)
    'form_submit',         -- Soumission d'un formulaire (bot ou HTML)
    'rappel_planifie',     -- Rappel planifié confirmé
    'statut_change',       -- Changement de statut commercial
    'lead_deduplique',     -- Ce lead a été identifié comme doublon
    'note_ajoutee'         -- Note interne ajoutée par l'équipe
);


-- ============================================================
-- §2 — FONCTIONS UTILITAIRES
-- ============================================================

-- ------------------------------------------------------------
-- 2A. normalize_phone
--     Normalise un numéro français vers +33XXXXXXXXX
--     Retourne NULL si le format ne correspond à aucun pattern FR connu
--     IMMUTABLE + STRICT : retourne NULL si input NULL
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION normalize_phone(raw_phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
STRICT
AS $$
DECLARE
    cleaned TEXT;
BEGIN
    -- Strip tout ce qui n'est pas chiffre ou +
    cleaned := REGEXP_REPLACE(TRIM(raw_phone), '[^0-9+]', '', 'g');

    -- Déjà au format +33 suivi de 9 chiffres (indicatif 1-9)
    IF cleaned ~ '^\+33[1-9][0-9]{8}$' THEN
        RETURN cleaned;
    END IF;

    -- Format 0033XXXXXXXXX (international sans +)
    IF cleaned ~ '^0033[1-9][0-9]{8}$' THEN
        RETURN '+33' || SUBSTRING(cleaned FROM 5);
    END IF;

    -- Format 0XXXXXXXXX (10 chiffres, France métropole)
    IF cleaned ~ '^0[1-9][0-9]{8}$' THEN
        RETURN '+33' || SUBSTRING(cleaned FROM 2);
    END IF;

    -- Format XXXXXXXXX (9 chiffres sans préfixe ni 0)
    IF cleaned ~ '^[1-9][0-9]{8}$' THEN
        RETURN '+33' || cleaned;
    END IF;

    -- Format non reconnu → NULL (loggable via lead_events)
    RETURN NULL;
END;
$$;

COMMENT ON FUNCTION normalize_phone(TEXT) IS
'Normalise un numéro de téléphone français vers +33XXXXXXXXX.
Supporte : 06..., 0033..., +33..., 6... (9 chiffres sans 0).
Retourne NULL si le format ne correspond pas — à logger dans lead_events.metadata.';


-- ------------------------------------------------------------
-- 2B. phone_dedup_key
--     Extrait les 8 derniers chiffres du numéro normalisé.
--     Utilisé comme fallback de déduplication quand le format
--     d'origine diffère entre deux saisies du même numéro.
--     Ex : +33612345678 → "12345678"
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION phone_dedup_key(phone_normalized TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF phone_normalized IS NULL THEN RETURN NULL; END IF;
    RETURN RIGHT(REGEXP_REPLACE(phone_normalized, '[^0-9]', '', 'g'), 8);
END;
$$;

COMMENT ON FUNCTION phone_dedup_key(TEXT) IS
'Retourne les 8 derniers chiffres du numéro normalisé pour déduplication souple.
Ex : +33612345678 → "12345678". Tolère les variantes de saisie.';


-- ------------------------------------------------------------
-- 2C. trigger_set_updated_at
--     Mise à jour automatique de updated_at à chaque UPDATE.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION trigger_set_updated_at() IS
'Trigger function : met automatiquement à jour updated_at lors de chaque UPDATE.';


-- ============================================================
-- §3 — TABLE PRINCIPALE : leads
-- ============================================================

CREATE TABLE leads (

    -- ── Identité ──────────────────────────────────────────────
    id                  BIGSERIAL           PRIMARY KEY,
    -- UUID exposé à l'extérieur (API, emails, URLs) — jamais l'id interne
    uuid                UUID                NOT NULL DEFAULT gen_random_uuid(),

    -- ── Qualification commerciale ──────────────────────────────
    source              lead_source         NOT NULL,
    branch              lead_branch         NOT NULL,
    status              lead_status         NOT NULL DEFAULT 'nouveau',

    -- form_id : renseigné uniquement si source = 'contact_form'
    -- Valeurs attendues : 'contact' | 'urgence' | 'syndics' | 'partenaires'
    form_id             VARCHAR(50),

    -- ── Coordonnées ───────────────────────────────────────────
    nom                 VARCHAR(255),

    -- Saisie originale conservée telle quelle (auditabilité)
    telephone_raw       VARCHAR(50),

    -- Téléphone normalisé : COLONNE GÉNÉRÉE — écrire dans telephone_raw uniquement
    telephone           VARCHAR(20)
                            GENERATED ALWAYS AS (
                                normalize_phone(telephone_raw)
                            ) STORED,

    -- Clé de déduplication souple : 8 derniers chiffres — COLONNE GÉNÉRÉE
    phone_dedup_key     VARCHAR(8)
                            GENERATED ALWAYS AS (
                                phone_dedup_key(normalize_phone(telephone_raw))
                            ) STORED,

    email               VARCHAR(255),
    code_postal         VARCHAR(10),

    -- ── Données spécifiques branche Syndic ────────────────────
    cabinet             VARCHAR(255),       -- Nom du cabinet ou société
    syndic_profil       syndic_profil,      -- Type de contact syndic
    nb_immeubles        nb_immeubles,       -- Taille du portefeuille

    -- ── Données spécifiques branche Diagnostic ────────────────
    diag_sous_type      diag_sous_type,

    -- ── Données spécifiques branche Partenaire ────────────────
    partenaire_type     partenaire_type,

    -- ── Message / situation décrite librement ─────────────────
    message             TEXT,

    -- ── Score de priorité ─────────────────────────────────────
    -- Calculé automatiquement par le trigger calculate_lead_score.
    -- Échelle 0-10. Revoir les pondérations après le 1er mois de données réelles.
    score               SMALLINT            NOT NULL DEFAULT 0,

    -- ── Session temporaire (RGPD safe) ────────────────────────
    -- UUID v4 généré à l'ouverture du bot, stocké uniquement en mémoire JS.
    -- Jamais persisté côté client après fermeture de page ou rechargement.
    -- Permet de rattacher les events (wa_click, faq_hit) au lead de la même session.
    session_id          VARCHAR(128),

    -- ── Tracking contextuel ───────────────────────────────────
    page_url            VARCHAR(2048),
    utm_source          VARCHAR(255),
    utm_medium          VARCHAR(255),
    utm_campaign        VARCHAR(255),

    -- ── Déduplication ─────────────────────────────────────────
    -- Si ce lead est un doublon détecté, pointe vers le lead maître.
    -- Le doublon est conservé avec toutes ses données pour auditabilité.
    -- Jamais supprimé physiquement — utiliser deleted_at pour le soft delete.
    duplicate_of        BIGINT              REFERENCES leads(id) ON DELETE SET NULL,

    -- ── RGPD ──────────────────────────────────────────────────
    -- Timestamp de consentement explicite si recueilli (mention pré-formulaire)
    rgpd_consent_at     TIMESTAMPTZ,
    -- Soft delete : renseigner plutôt que de faire un DELETE physique
    deleted_at          TIMESTAMPTZ,

    -- ── Timestamps UTC ────────────────────────────────────────
    created_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),

    -- ── Contraintes d'intégrité ───────────────────────────────

    -- UUID unique global
    CONSTRAINT leads_uuid_unique
        UNIQUE (uuid),

    -- Nécessite au moins un moyen d'identification (tel, email ou session).
    -- IMPORTANT pour l'Edge Function ingest-lead :
    --   Les leads source=wa_click/tel_click sans telephone_raw ni email
    --   DOIVENT fournir un session_id (généré côté serveur si le bot n'est pas ouvert).
    --   Un INSERT avec les 3 champs NULL sera rejeté par cette contrainte.
    CONSTRAINT leads_has_contact CHECK (
        telephone_raw IS NOT NULL
        OR email       IS NOT NULL
        OR session_id  IS NOT NULL
    ),

    -- form_id obligatoire si et seulement si source = 'contact_form'
    CONSTRAINT leads_form_id_coherence CHECK (
        (source = 'contact_form' AND form_id IS NOT NULL)
        OR source <> 'contact_form'
    ),

    -- Score borné entre 0 et 10
    CONSTRAINT leads_score_range CHECK (score BETWEEN 0 AND 10)
);

COMMENT ON TABLE leads IS
'Table centrale des leads SOS FONTE. Toutes branches (bot + formulaires HTML + clics WA/tel).
Un enregistrement = un contact réel. Les doublons détectés pointent via duplicate_of.
RLS actif : anon = INSERT only | authenticated = SELECT + UPDATE | service_role = ALL.';

COMMENT ON COLUMN leads.telephone IS
'Téléphone normalisé +33XXXXXXXXX. Colonne générée depuis telephone_raw — ne pas écrire directement.';
COMMENT ON COLUMN leads.phone_dedup_key IS
'8 derniers chiffres du téléphone normalisé. Colonne générée — clé de déduplication souple.';
COMMENT ON COLUMN leads.score IS
'Score de priorité 0-10 calculé automatiquement à l''insertion et sur modification des champs métier.
Pondérations initiales estimées — à revoir après 4-8 semaines de données réelles.';
COMMENT ON COLUMN leads.session_id IS
'UUID temporaire généré côté JS à l''ouverture du bot. Vie = onglet navigateur uniquement.
RGPD safe : jamais persisté dans localStorage ou cookie.';
COMMENT ON COLUMN leads.form_id IS
'Identifiant du formulaire HTML source. Valeurs : contact | urgence | syndics | partenaires.
Renseigné uniquement si source = contact_form.';
COMMENT ON COLUMN leads.duplicate_of IS
'Référence vers le lead maître si doublon détecté par find_duplicate_lead().
Le doublon reste visible pour audit — ne jamais supprimer physiquement.';
COMMENT ON COLUMN leads.telephone_raw IS
'Saisie téléphone originale conservée intacte pour audit et débug normalisation.';
COMMENT ON COLUMN leads.deleted_at IS
'Soft delete RGPD. Renseigner plutôt que de faire un DELETE physique.
Le lead reste dans la table mais est exclu de toutes les vues actives.';


-- ============================================================
-- §4 — TABLE : lead_events
-- Log immuable de tous les événements liés à un lead ou une session
-- ============================================================

CREATE TABLE lead_events (

    id              BIGSERIAL       PRIMARY KEY,

    -- Référence au lead — peut être NULL si l'event précède la soumission du formulaire
    lead_id         BIGINT          REFERENCES leads(id) ON DELETE RESTRICT,

    -- session_id : permet de rattacher un event au lead quand il précède la soumission
    -- Ex : wa_click → event avec session_id seul → formulaire soumis → lead créé →
    --      rattachement lead_id a posteriori via Edge Function
    session_id      VARCHAR(128),

    event_type      event_type      NOT NULL,

    -- Métadonnées libres selon le type d'événement. Exemples :
    -- faq_hit       : {"question": "délai intervention", "faq_key": "delai", "score": 3}
    -- faq_miss      : {"question": "votre texte ici", "attempt": 1}
    -- statut_change : {"from": "nouveau", "to": "contacté", "by": "equipe"}
    -- lead_deduplique : {"duplicate_id": 42, "method": "phone_exact"}
    -- note_ajoutee  : {"note": "Client rappelé, RDV le 27/05 à 14h"}
    metadata        JSONB,

    page_url        VARCHAR(2048),
    user_agent      TEXT,

    -- Hash SHA-256 de l'IP — jamais l'IP en clair (obligation RGPD art.4 §1)
    -- Calculé exclusivement côté Edge Function (serveur) — jamais côté client
    ip_hash         VARCHAR(64),

    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    -- Au minimum un anchor : lead_id ou session_id
    CONSTRAINT lead_events_has_anchor CHECK (
        lead_id IS NOT NULL OR session_id IS NOT NULL
    )
);

COMMENT ON TABLE lead_events IS
'Log immuable de tous les événements (clics WA/tel, ouverture bot, hits/miss FAQ, changements de statut).
Les enregistrements ne sont jamais modifiés après insertion.
Peut exister sans lead_id (events pré-soumission rattachés par session_id).';

COMMENT ON COLUMN lead_events.session_id IS
'ID de session temporaire pour rattacher les events pré-soumission au lead.
Jointure possible avec leads.session_id pour reconstruction du parcours complet.';
COMMENT ON COLUMN lead_events.metadata IS
'Données libres selon event_type. Voir exemples dans le commentaire de table.';
COMMENT ON COLUMN lead_events.ip_hash IS
'SHA-256 de l''IP cliente. Jamais l''IP en clair (RGPD). Calculé côté serveur uniquement.';


-- ============================================================
-- §5 — TABLE : lead_messages
-- Log des échanges textuels bot Ben ↔ visiteur
-- ============================================================

CREATE TABLE lead_messages (

    id              BIGSERIAL       PRIMARY KEY,
    lead_id         BIGINT          REFERENCES leads(id) ON DELETE RESTRICT,
    session_id      VARCHAR(128),

    -- Branche bot active au moment du message
    branch          lead_branch,

    -- Identifiant de l'étape bot dans le flow conversationnel
    -- Ex : 'ask_situation' | 'ask_codepostal' | 'faq_answer' | 'form_submit'
    --      'retry_faq' | 'bot_accueil' | 'bot_farewell'
    step_key        VARCHAR(100),

    -- Saisie brute du visiteur (texte libre ou label du bouton cliqué)
    user_input      TEXT,

    -- Réponse affichée par le bot (peut contenir du HTML — échapper à l'affichage)
    bot_response    TEXT,

    -- True si la réponse provient du moteur matchFAQ(), false si flow bot standard
    is_faq_hit      BOOLEAN         NOT NULL DEFAULT FALSE,

    -- Clé de l'entrée FAQ matchée (ex : 'delai', 'tarif', 'zone', 'chemisage')
    -- NULL si is_faq_hit = false
    faq_key         VARCHAR(100),

    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT lead_messages_has_anchor CHECK (
        lead_id IS NOT NULL OR session_id IS NOT NULL
    ),

    -- faq_key doit être NULL si is_faq_hit = false, et non-NULL si is_faq_hit = true
    CONSTRAINT lead_messages_faq_coherence CHECK (
        (is_faq_hit = TRUE  AND faq_key IS NOT NULL)
        OR (is_faq_hit = FALSE AND faq_key IS NULL)
    )
);

COMMENT ON TABLE lead_messages IS
'Log des échanges textuels bot Ben ↔ visiteur.
Permet : audit qualité du bot, amélioration des FAQ_ENTRIES, reprise UX future.
Peut exister sans lead_id (messages pré-soumission rattachés par session_id).';

COMMENT ON COLUMN lead_messages.step_key IS
'Identifiant de l''étape bot. Ex: "ask_situation", "faq_answer", "form_submit", "retry_faq".
Correspond aux noms de fonctions step* dans bot-ben.js.';
COMMENT ON COLUMN lead_messages.is_faq_hit IS
'True si la réponse est issue du moteur matchFAQ(). Permet d''analyser la couverture FAQ.';
COMMENT ON COLUMN lead_messages.faq_key IS
'Clé de l''entrée FAQ_ENTRIES matchée. NULL si is_faq_hit = false.';


-- ============================================================
-- §6 — INDEX
-- ============================================================

-- ── leads ─────────────────────────────────────────────────────

-- Déduplication niveau 1 : téléphone normalisé exact
-- Index partiel : exclut soft-deleted et doublons déjà identifiés
-- UNIQUE : empêche deux leads actifs avec le même téléphone normalisé
CREATE UNIQUE INDEX idx_leads_telephone_active
    ON leads(telephone)
    WHERE deleted_at IS NULL
      AND duplicate_of IS NULL
      AND telephone IS NOT NULL;

-- Déduplication niveau 2 : fallback 8 derniers chiffres
CREATE INDEX idx_leads_phone_dedup
    ON leads(phone_dedup_key)
    WHERE deleted_at IS NULL
      AND duplicate_of IS NULL
      AND phone_dedup_key IS NOT NULL;

-- Déduplication niveau 3 : email (insensible à la casse via LOWER)
CREATE INDEX idx_leads_email
    ON leads(LOWER(email))
    WHERE deleted_at IS NULL
      AND email IS NOT NULL;

-- Dashboard principal : tri par statut puis score décroissant
CREATE INDEX idx_leads_status_score
    ON leads(status, score DESC)
    WHERE deleted_at IS NULL;

-- Dashboard : tri chronologique (derniers leads en premier)
CREATE INDEX idx_leads_created_at
    ON leads(created_at DESC)
    WHERE deleted_at IS NULL;

-- Filtrage par canal d'acquisition
CREATE INDEX idx_leads_source
    ON leads(source);

-- Rattachement events/messages pré-soumission via session
CREATE INDEX idx_leads_session_id
    ON leads(session_id)
    WHERE session_id IS NOT NULL;

-- Filtrage formulaires HTML par form_id
CREATE INDEX idx_leads_form_id
    ON leads(form_id)
    WHERE form_id IS NOT NULL;

-- Retrouver tous les doublons d'un lead maître donné
CREATE INDEX idx_leads_duplicate_of
    ON leads(duplicate_of)
    WHERE duplicate_of IS NOT NULL;

-- Index composite : reporting source × période
CREATE INDEX idx_leads_source_created
    ON leads(source, created_at DESC);


-- ── lead_events ───────────────────────────────────────────────

CREATE INDEX idx_events_lead_id
    ON lead_events(lead_id);

CREATE INDEX idx_events_session_id
    ON lead_events(session_id)
    WHERE session_id IS NOT NULL;

CREATE INDEX idx_events_type
    ON lead_events(event_type);

CREATE INDEX idx_events_created_at
    ON lead_events(created_at DESC);

-- Analytics clics WA/tel par page (tracking micro-conversions)
CREATE INDEX idx_events_click_by_page
    ON lead_events(event_type, page_url)
    WHERE event_type IN ('wa_click', 'tel_click');


-- ── lead_messages ─────────────────────────────────────────────

CREATE INDEX idx_messages_lead_id
    ON lead_messages(lead_id);

CREATE INDEX idx_messages_session_id
    ON lead_messages(session_id)
    WHERE session_id IS NOT NULL;

-- Analyse couverture FAQ : toutes les réponses matchées par clé
CREATE INDEX idx_messages_faq_hit
    ON lead_messages(faq_key, created_at DESC)
    WHERE is_faq_hit = TRUE;

-- Analyse lacunes FAQ : questions sans réponse (alimente v_faq_misses)
CREATE INDEX idx_messages_faq_miss
    ON lead_messages(created_at DESC)
    WHERE is_faq_hit = FALSE
      AND user_input IS NOT NULL;


-- ============================================================
-- §7 — TRIGGERS
-- ============================================================

-- ── 7A. updated_at automatique ────────────────────────────────

CREATE TRIGGER leads_set_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();


-- ── 7B. Calcul automatique du score ───────────────────────────
--
-- Déclenché à l'INSERT et sur UPDATE des colonnes métier uniquement.
-- Pondérations initiales — à revoir après données réelles.
--
-- Grille de scoring (plafonné à 10) :
--   +10  urgence (source = bot_urgence)
--   +8   syndic 5+ immeubles
--   +7   diagnostic avant achat immobilier (transaction en cours)
--   +6   syndic 2-5 immeubles | intervention directe (bot_intervention)
--   +5   diagnostic fuite
--   +4   syndic 1 immeuble | clic WA ou tel direct
--   +3   diagnostic caméra / curage | partenaire
--   +2   bonus données complètes (tel + email + cp)
--   +1   bonus données partielles (tel + cp)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION calculate_lead_score()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_score SMALLINT := 0;
BEGIN
    -- Urgence : priorité maximale toutes branches confondues
    IF NEW.source = 'bot_urgence' THEN
        v_score := v_score + 10;
    END IF;

    -- Syndic : valeur commerciale selon taille du portefeuille
    IF NEW.branch = 'syndic' THEN
        CASE NEW.nb_immeubles
            WHEN '5+'  THEN v_score := v_score + 8;
            WHEN '2-5' THEN v_score := v_score + 6;
            ELSE             v_score := v_score + 4;
        END CASE;
    END IF;

    -- Intervention directe (hors urgence)
    IF NEW.source = 'bot_intervention' THEN
        v_score := v_score + 6;
    END IF;

    -- Diagnostic : sous-types différenciés par degré d'urgence
    IF NEW.branch = 'diagnostic' THEN
        CASE NEW.diag_sous_type
            WHEN 'achat'  THEN v_score := v_score + 7;  -- Transaction immobilière en cours
            WHEN 'fuite'  THEN v_score := v_score + 5;
            WHEN 'camera' THEN v_score := v_score + 3;
            WHEN 'curage' THEN v_score := v_score + 3;
            ELSE               v_score := v_score + 3;
        END CASE;
    END IF;

    -- Clics WA / tel directs : intention commerciale forte
    IF NEW.source IN ('wa_click', 'tel_click') THEN
        v_score := v_score + 4;
    END IF;

    -- Partenaire : valeur long terme (réseau sous-traitance)
    IF NEW.branch = 'partenaire' THEN
        v_score := v_score + 3;
    END IF;

    -- Bonus qualité données (complétude du lead)
    IF NEW.telephone IS NOT NULL
       AND NEW.email      IS NOT NULL
       AND NEW.code_postal IS NOT NULL THEN
        v_score := v_score + 2;
    ELSIF NEW.telephone IS NOT NULL
          AND NEW.code_postal IS NOT NULL THEN
        v_score := v_score + 1;
    END IF;

    -- Plafond à 10
    NEW.score := LEAST(v_score, 10);
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION calculate_lead_score() IS
'Calcule automatiquement le score de priorité du lead (0-10).
Déclenché sur INSERT et UPDATE des colonnes métier.
Revoir les pondérations après 4-8 semaines de données réelles.';

CREATE TRIGGER leads_calculate_score
    BEFORE INSERT OR UPDATE OF
        source, branch, nb_immeubles, diag_sous_type,
        telephone_raw, email, code_postal   -- telephone_raw (pas telephone : colonne générée, interdite dans UPDATE OF)
    ON leads
    FOR EACH ROW
    EXECUTE FUNCTION calculate_lead_score();


-- ============================================================
-- §8 — FONCTION : find_duplicate_lead
-- Recherche un lead existant en 3 niveaux de correspondance
-- ============================================================

CREATE OR REPLACE FUNCTION find_duplicate_lead(
    p_telephone_raw TEXT,
    p_email         TEXT,
    p_session_id    TEXT DEFAULT NULL      -- réservé pour usage futur, non utilisé dans la dédup
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    v_normalized    TEXT;
    v_dedup_key     TEXT;
    v_existing_id   BIGINT;
BEGIN
    v_normalized := normalize_phone(p_telephone_raw);
    v_dedup_key  := phone_dedup_key(v_normalized);

    -- ── Niveau 1 : correspondance exacte téléphone normalisé ──
    -- Priorité maximale — un même +33XXXXXXXXX ne peut appartenir qu'à un seul lead actif
    IF v_normalized IS NOT NULL THEN
        SELECT id INTO v_existing_id
        FROM leads
        WHERE telephone     = v_normalized
          AND deleted_at    IS NULL
          AND duplicate_of  IS NULL
        ORDER BY created_at DESC
        LIMIT 1;

        IF FOUND THEN RETURN v_existing_id; END IF;
    END IF;

    -- ── Niveau 2 : fallback 8 derniers chiffres ────────────────
    -- Tolère les variantes de saisie (06 12... vs 0612... vs +3312...)
    IF v_dedup_key IS NOT NULL THEN
        SELECT id INTO v_existing_id
        FROM leads
        WHERE phone_dedup_key = v_dedup_key
          AND deleted_at      IS NULL
          AND duplicate_of    IS NULL
        ORDER BY created_at DESC
        LIMIT 1;

        IF FOUND THEN RETURN v_existing_id; END IF;
    END IF;

    -- ── Niveau 3 : correspondance email (insensible à la casse) ─
    -- Utilisé quand aucun téléphone valide n'est fourni.
    -- Fenêtre de 90 jours : évite les faux positifs B2B (email de cabinet partagé
    -- entre plusieurs gestionnaires distincts au fil du temps).
    IF p_email IS NOT NULL AND TRIM(p_email) <> '' THEN
        SELECT id INTO v_existing_id
        FROM leads
        WHERE LOWER(email)  = LOWER(TRIM(p_email))
          AND deleted_at    IS NULL
          AND duplicate_of  IS NULL
          AND created_at    > NOW() - INTERVAL '90 days'
        ORDER BY created_at DESC
        LIMIT 1;

        IF FOUND THEN RETURN v_existing_id; END IF;
    END IF;

    -- Aucun doublon trouvé → créer un nouveau lead
    RETURN NULL;
END;
$$;

COMMENT ON FUNCTION find_duplicate_lead(TEXT, TEXT, TEXT) IS
'Recherche un lead existant en 3 niveaux :
  1. Téléphone normalisé exact (+33XXXXXXXXX)
  2. Fallback 8 derniers chiffres (tolérance format)
  3. Email exact insensible à la casse
Retourne l''id du lead maître ou NULL si nouveau contact.
RGPD safe : pas de fingerprint navigateur, dédup par données déclarées uniquement.
À appeler depuis l''Edge Function ingest-lead avant tout INSERT.';


-- ============================================================
-- §9 — VUES
-- ============================================================

-- ── 9A. v_leads_scored — dashboard opérationnel principal ─────
--
-- Leads actifs (non supprimés, non doublons) triés par score composite.
-- Score composite = score métier + bonus de fraîcheur temporelle.
-- Colonne temperature : 'chaud' (<2h) | 'tiède' (<24h) | 'froid' (≥24h)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_leads_scored
WITH (security_invoker = on) AS
WITH event_stats AS (
    SELECT
        lead_id,
        COUNT(*)                                                    AS nb_events,
        COUNT(*) FILTER (WHERE event_type = 'wa_click')             AS wa_clicks,
        COUNT(*) FILTER (WHERE event_type = 'tel_click')            AS tel_clicks
    FROM lead_events
    GROUP BY lead_id
),
message_stats AS (
    SELECT
        lead_id,
        COUNT(*)                                                    AS nb_messages,
        COUNT(*) FILTER (WHERE is_faq_hit = TRUE)                   AS faq_hits
    FROM lead_messages
    GROUP BY lead_id
)
SELECT
    -- Identification
    l.id,
    l.uuid,
    l.source,
    l.branch,
    l.form_id,
    l.status,
    l.score,

    -- Coordonnées
    l.nom,
    l.telephone,
    l.telephone_raw,
    l.email,
    l.code_postal,

    -- Données métier
    l.cabinet,
    l.syndic_profil,
    l.nb_immeubles,
    l.diag_sous_type,
    l.partenaire_type,
    l.message,

    -- Enrichissement : statistiques événements
    COALESCE(ev.nb_events,   0)                         AS nb_events,
    COALESCE(ev.wa_clicks,   0)                         AS wa_clicks,
    COALESCE(ev.tel_clicks,  0)                         AS tel_clicks,

    -- Enrichissement : statistiques messages bot
    COALESCE(ms.nb_messages, 0)                         AS nb_messages_bot,
    COALESCE(ms.faq_hits,    0)                         AS nb_faq_hits,

    -- Délai depuis création (heures, 1 décimale)
    ROUND(
        EXTRACT(EPOCH FROM (NOW() - l.created_at)) / 3600.0,
        1
    )                                                   AS heures_depuis_creation,

    -- Température : fraîcheur commerciale du lead
    CASE
        WHEN NOW() - l.created_at < INTERVAL '2 hours'  THEN 'chaud'
        WHEN NOW() - l.created_at < INTERVAL '24 hours' THEN 'tiède'
        ELSE 'froid'
    END                                                 AS temperature,

    -- Score composite = score métier + bonus fraîcheur (plafonné à 10)
    LEAST(
        l.score + CASE
            WHEN NOW() - l.created_at < INTERVAL '2 hours'  THEN 3
            WHEN NOW() - l.created_at < INTERVAL '24 hours' THEN 1
            ELSE 0
        END,
        10
    )                                                   AS score_composite,

    -- Contexte d'acquisition
    l.utm_source,
    l.utm_medium,
    l.utm_campaign,
    l.page_url,

    -- Métadonnées
    l.duplicate_of,
    l.rgpd_consent_at,
    l.created_at,
    l.updated_at

FROM leads l
LEFT JOIN event_stats   ev ON ev.lead_id = l.id
LEFT JOIN message_stats ms ON ms.lead_id = l.id

WHERE l.deleted_at    IS NULL
  AND l.duplicate_of  IS NULL

ORDER BY score_composite DESC, l.created_at DESC;

COMMENT ON VIEW v_leads_scored IS
'Vue principale dashboard : leads actifs triés par score composite (métier + fraîcheur).
Exclut les soft-deleted et les doublons. Inclut stats événements et messages bot.';


-- ── 9B. v_faq_analytics — couverture et fréquence FAQ ─────────

CREATE OR REPLACE VIEW v_faq_analytics
WITH (security_invoker = on) AS
SELECT
    faq_key,
    COUNT(*)                                                        AS nb_hits,
    MIN(created_at)                                                 AS premiere_utilisation,
    MAX(created_at)                                                 AS derniere_utilisation,

    -- Poids relatif parmi toutes les réponses FAQ matchées
    ROUND(
        COUNT(*) * 100.0 / NULLIF(SUM(COUNT(*)) OVER (), 0),
        1
    )                                                               AS pct_hits_total

FROM lead_messages
WHERE is_faq_hit = TRUE
  AND faq_key    IS NOT NULL
GROUP BY faq_key
ORDER BY nb_hits DESC;

COMMENT ON VIEW v_faq_analytics IS
'Fréquence par clé FAQ matchée, poids relatif, date première/dernière utilisation.
Permet de prioriser l''enrichissement de FAQ_ENTRIES.';


-- ── 9C. v_faq_misses — questions sans réponse ─────────────────

CREATE OR REPLACE VIEW v_faq_misses
WITH (security_invoker = on) AS
SELECT
    user_input,
    COUNT(*)                                                        AS nb_occurrences,
    MIN(created_at)                                                 AS premiere_occurrence,
    MAX(created_at)                                                 AS derniere_occurrence,
    ARRAY_AGG(DISTINCT branch::TEXT ORDER BY branch::TEXT)          AS branches_concernees
FROM lead_messages
WHERE is_faq_hit   = FALSE
  AND user_input   IS NOT NULL
  AND TRIM(user_input) <> ''
GROUP BY user_input
ORDER BY nb_occurrences DESC;

COMMENT ON VIEW v_faq_misses IS
'Questions posées au bot sans réponse FAQ (is_faq_hit = false).
Triées par fréquence décroissante — alimente directement la roadmap d''amélioration de FAQ_ENTRIES.';


-- ── 9D. v_conversions_par_source — entonnoir par canal ────────

CREATE OR REPLACE VIEW v_conversions_par_source
WITH (security_invoker = on) AS
SELECT
    source,
    COUNT(*)                                                            AS total_leads,
    COUNT(*) FILTER (WHERE status = 'nouveau')                          AS nouveaux,
    COUNT(*) FILTER (WHERE status = 'contacté')                         AS contactes,
    COUNT(*) FILTER (WHERE status = 'devis_envoyé')                     AS devis,
    COUNT(*) FILTER (WHERE status = 'converti')                         AS convertis,
    COUNT(*) FILTER (WHERE status = 'perdu')                            AS perdus,

    -- Taux de conversion : convertis / total (en %)
    ROUND(
        COUNT(*) FILTER (WHERE status = 'converti') * 100.0
        / NULLIF(COUNT(*), 0),
        1
    )                                                                   AS taux_conversion_pct,

    ROUND(AVG(score), 1)                                                AS score_moyen

FROM leads
WHERE deleted_at IS NULL
GROUP BY source
ORDER BY total_leads DESC;

COMMENT ON VIEW v_conversions_par_source IS
'Entonnoir de conversion par canal d''acquisition.
Compare bot (toutes branches) vs formulaires HTML vs clics directs WA/tel.';


-- ── 9E. v_leads_doublons — audit déduplication ────────────────

CREATE OR REPLACE VIEW v_leads_doublons
WITH (security_invoker = on) AS
SELECT
    m.id                            AS lead_maitre_id,
    m.nom                           AS lead_maitre_nom,
    m.telephone                     AS lead_maitre_tel,
    m.email                         AS lead_maitre_email,
    m.created_at                    AS lead_maitre_date,
    d.id                            AS doublon_id,
    d.source                        AS doublon_source,
    d.created_at                    AS doublon_date,
    e.metadata->>'method'           AS methode_dedup    -- 'phone_exact' | '8_digits' | 'email'
FROM leads m
JOIN leads d
    ON d.duplicate_of = m.id
LEFT JOIN lead_events e
    ON  e.lead_id     = d.id
    AND e.event_type  = 'lead_deduplique'
WHERE m.deleted_at IS NULL   -- exclut les leads maîtres soft-deleted (doublons orphelins)
ORDER BY m.id, d.created_at;

COMMENT ON VIEW v_leads_doublons IS
'Audit des doublons détectés : lead maître, doublons rattachés, méthode de déduplication.
Permet de valider la qualité de find_duplicate_lead() en production.';


-- ── 9F. v_activite_journaliere — volume quotidien ─────────────

CREATE OR REPLACE VIEW v_activite_journaliere
WITH (security_invoker = on) AS
SELECT
    DATE_TRUNC('day', created_at)   AS jour,
    COUNT(*)                        AS nb_leads,
    COUNT(*) FILTER (WHERE source::TEXT LIKE 'bot_%') AS leads_bot,
    COUNT(*) FILTER (WHERE source = 'contact_form') AS leads_form,
    COUNT(*) FILTER (WHERE source IN ('wa_click', 'tel_click')) AS leads_clics,
    ROUND(AVG(score), 1)            AS score_moyen
FROM leads
WHERE deleted_at IS NULL
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY jour DESC;

COMMENT ON VIEW v_activite_journaliere IS
'Volume de leads par jour, ventilé par canal. Permet de corréler avec les actions marketing.';


-- ============================================================
-- §10 — ROW LEVEL SECURITY
-- ============================================================

-- Activer RLS sur les 3 tables opérationnelles
ALTER TABLE leads          ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_messages  ENABLE ROW LEVEL SECURITY;

-- ── service_role : accès total ────────────────────────────────
-- Utilisé par les Edge Functions, les migrations, le back-office admin

CREATE POLICY "service_role_leads_all"
    ON leads FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service_role_events_all"
    ON lead_events FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service_role_messages_all"
    ON lead_messages FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);


-- ── anon : INSERT uniquement ───────────────────────────────────
-- La clé anon est publique dans le JS frontend.
-- RLS garantit qu'un visiteur peut créer des données mais jamais les lire.
-- Toute la logique de déduplication et normalisation est côté Edge Function (service_role).

CREATE POLICY "anon_leads_insert"
    ON leads FOR INSERT
    TO anon
    WITH CHECK (true);

CREATE POLICY "anon_events_insert"
    ON lead_events FOR INSERT
    TO anon
    WITH CHECK (true);

CREATE POLICY "anon_messages_insert"
    ON lead_messages FOR INSERT
    TO anon
    WITH CHECK (true);


-- ── authenticated : lecture + mise à jour statut ──────────────
-- Pour le futur back-office admin (tableau de bord des leads).
-- À activer avec Supabase Auth quand le back-office sera développé.

CREATE POLICY "authenticated_leads_read"
    ON leads FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "authenticated_leads_update_status"
    ON leads FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "authenticated_events_read"
    ON lead_events FOR SELECT
    TO authenticated
    USING (true);

-- Les authenticated peuvent INSERT des events (ex : statut_change, note_ajoutee)
CREATE POLICY "authenticated_events_insert"
    ON lead_events FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "authenticated_messages_read"
    ON lead_messages FOR SELECT
    TO authenticated
    USING (true);


COMMIT;

-- ============================================================
-- FIN DE MIGRATION
-- ============================================================
--
-- Vérifications post-exécution recommandées :
--
--   SELECT normalize_phone('06 12 34 56 78');   -- doit retourner +33612345678
--   SELECT normalize_phone('+33612345678');      -- doit retourner +33612345678
--   SELECT normalize_phone('0612345678');        -- doit retourner +33612345678
--   SELECT normalize_phone('garbage');           -- doit retourner NULL
--   SELECT phone_dedup_key('+33612345678');      -- doit retourner '12345678'
--
--   SELECT find_duplicate_lead('0612345678', NULL, NULL);   -- NULL (table vide)
--
--   INSERT INTO leads (source, branch, nom, telephone_raw, email, code_postal)
--   VALUES ('bot_intervention', 'intervention', 'Test User', '06 12 34 56 78',
--           'test@example.com', '75017');
--   SELECT id, telephone, phone_dedup_key, score FROM leads;
--   -- telephone       = +33612345678
--   -- phone_dedup_key = '12345678'
--   -- score           = 8  (bot_intervention=+6, bonus tel+email+cp=+2, total=8)
--
-- ============================================================
