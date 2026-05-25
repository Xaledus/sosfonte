/* ═══════════════════════════════════════════════════════════════════════════
   SOS FONTE — Migration 002 : Dual Priority System
   Date    : 2026-05-25
   Auteur  : SOS FONTE Front Desk / IA Engineering

   Objectif :
     Séparer la priorité opérationnelle (urgence terrain) de la priorité
     business (valeur commerciale / portefeuille syndic).

   Règle d'or :
     P_OP1 (fuite active) passe toujours avant P_BIZ1 (syndic portefeuille).
     À priorité opérationnelle égale, la priorité business brise l'égalité.

   Priorité opérationnelle :
     P_OP1 : Fuite active (eau coule maintenant)
     P_OP2 : Urgence forte (bouchon complet, odeur, dégât apparent)
     P_OP3 : Standard
     P_OP4 : Conseil / information / FAQ

   Priorité business :
     P_BIZ1 : Syndic multi-immeubles, portefeuille (score ≥ 80)
     P_BIZ2 : Syndic simple, copro, pro (score 45–79)
     P_BIZ3 : Particulier IDF (score 15–44)
     P_BIZ4 : Hors zone, hors scope (score < 15)
   ═══════════════════════════════════════════════════════════════════════════ */

BEGIN;

-- ── 1. Nouveaux ENUMs ────────────────────────────────────────────────────────

CREATE TYPE priorite_operationnelle AS ENUM ('P_OP1', 'P_OP2', 'P_OP3', 'P_OP4');
CREATE TYPE priorite_business       AS ENUM ('P_BIZ1', 'P_BIZ2', 'P_BIZ3', 'P_BIZ4');

-- ── 2. Nouvelles colonnes dans leads ────────────────────────────────────────

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS priorite_op  priorite_operationnelle NOT NULL DEFAULT 'P_OP3',
  ADD COLUMN IF NOT EXISTS priorite_biz priorite_business       NOT NULL DEFAULT 'P_BIZ3',
  ADD COLUMN IF NOT EXISTS is_urgence   BOOLEAN NOT NULL DEFAULT false,  -- fuite active détectée
  ADD COLUMN IF NOT EXISTS canal_contact VARCHAR(20);                     -- 'whatsapp' | 'email' | 'tel'

COMMENT ON COLUMN leads.priorite_op  IS 'Priorité opérationnelle : urgence terrain (P_OP1 = fuite active)';
COMMENT ON COLUMN leads.priorite_biz IS 'Priorité business : valeur commerciale (P_BIZ1 = syndic portefeuille)';
COMMENT ON COLUMN leads.is_urgence   IS 'TRUE si fuite active déclarée par le visiteur';
COMMENT ON COLUMN leads.canal_contact IS 'Canal choisi par le visiteur : whatsapp | email | tel';

-- ── 3. Nouveaux ENUMs branches V2 ───────────────────────────────────────────
-- Ajout des branches manquantes identifiées lors de l'analyse V2

ALTER TYPE lead_source ADD VALUE IF NOT EXISTS 'bot_bouchon'  AFTER 'bot_urgence';
ALTER TYPE lead_source ADD VALUE IF NOT EXISTS 'bot_odeur'    AFTER 'bot_bouchon';
ALTER TYPE lead_source ADD VALUE IF NOT EXISTS 'bot_colonne'  AFTER 'bot_odeur';

ALTER TYPE lead_branch ADD VALUE IF NOT EXISTS 'bouchon' AFTER 'urgence';
ALTER TYPE lead_branch ADD VALUE IF NOT EXISTS 'odeur'   AFTER 'bouchon';
ALTER TYPE lead_branch ADD VALUE IF NOT EXISTS 'colonne' AFTER 'odeur';

-- ── 4. Nouveaux event_types V2 ──────────────────────────────────────────────

ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'bot_opened';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'returning_user_detected';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'returning_same_subject';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'returning_new_subject';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'option_clicked';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'zipcode_submitted';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'whatsapp_clicked';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'email_clicked';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'call_clicked';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'callback_submitted';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'faq_question_submitted';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'faq_match';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'faq_miss_1';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'faq_miss_2';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'handoff_requested';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'flow_completed';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'flow_abandoned';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'priority_computed';

-- ── 5. Trigger de scoring dual-priorité ─────────────────────────────────────
-- Remplace le trigger V1 (calculate_lead_score).
-- Score business (0–200) reste calculé pour le ranking interne.
-- Priorité opérationnelle est indépendante du score business.

CREATE OR REPLACE FUNCTION calculate_lead_priority()
RETURNS TRIGGER AS $$
DECLARE
  biz_score  INTEGER := 0;
  p_op       priorite_operationnelle;
  p_biz      priorite_business;
BEGIN

  -- ── Priorité opérationnelle (urgence terrain) ─────────────────────────────
  -- Indépendante du score business. Basée sur is_urgence + branch.
  IF NEW.is_urgence = true THEN
    p_op := 'P_OP1';   -- fuite active → toujours en tête
  ELSIF NEW.branch IN ('urgence', 'bouchon', 'odeur') THEN
    p_op := 'P_OP2';   -- urgence forte non confirmée
  ELSIF NEW.branch IN ('intervention', 'diagnostic', 'syndic', 'colonne',
                        'partenaire', 'offhours', 'contact_generique') THEN
    p_op := 'P_OP3';   -- standard
  ELSE
    p_op := 'P_OP4';   -- conseil / info / FAQ
  END IF;

  -- ── Score business (valeur commerciale) ───────────────────────────────────

  -- Branche
  CASE NEW.branch
    WHEN 'syndic'        THEN biz_score := biz_score + 45;
    WHEN 'colonne'       THEN biz_score := biz_score + 30;
    WHEN 'partenaire'    THEN biz_score := biz_score + 25;
    WHEN 'diagnostic'    THEN biz_score := biz_score + 15;
    WHEN 'intervention'  THEN biz_score := biz_score + 20;
    WHEN 'urgence'       THEN biz_score := biz_score + 20;
    WHEN 'bouchon'       THEN biz_score := biz_score + 15;
    WHEN 'odeur'         THEN biz_score := biz_score + 10;
    ELSE biz_score := biz_score + 5;
  END CASE;

  -- Profil B2B
  IF NEW.syndic_profil IS NOT NULL THEN
    CASE NEW.syndic_profil
      WHEN 'syndic_professionnel'    THEN biz_score := biz_score + 45;
      WHEN 'conseil_syndical'        THEN biz_score := biz_score + 30;
      WHEN 'administrateur_de_biens' THEN biz_score := biz_score + 25;
      ELSE biz_score := biz_score + 15;
    END CASE;
  END IF;

  -- Nombre d'immeubles (portefeuille)
  IF NEW.nb_immeubles = '5+' THEN
    biz_score := biz_score + 35;
  ELSIF NEW.nb_immeubles = '2-5' THEN
    biz_score := biz_score + 20;
  END IF;

  -- Canal contact (signal d'intention)
  IF NEW.canal_contact = 'whatsapp' THEN biz_score := biz_score + 15; END IF;

  -- Géographie (code_postal)
  IF NEW.code_postal LIKE '75%' THEN
    biz_score := biz_score + 15;   -- Paris intra-muros
  ELSIF NEW.code_postal ~ '^(77|78|91|92|93|94|95)' THEN
    biz_score := biz_score + 10;   -- Grande couronne IDF
  END IF;

  -- Diag sous-type
  IF NEW.diag_sous_type IN ('camera', 'fuite') THEN biz_score := biz_score + 5; END IF;

  -- ── Priorité business depuis le score ─────────────────────────────────────
  IF    biz_score >= 80 THEN p_biz := 'P_BIZ1';
  ELSIF biz_score >= 45 THEN p_biz := 'P_BIZ2';
  ELSIF biz_score >= 15 THEN p_biz := 'P_BIZ3';
  ELSE                       p_biz := 'P_BIZ4';
  END IF;

  -- ── Écriture ──────────────────────────────────────────────────────────────
  NEW.score        := biz_score;   -- score business brut conservé pour tri interne
  NEW.priorite_op  := p_op;
  NEW.priorite_biz := p_biz;
  NEW.updated_at   := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remplace l'ancien trigger de scoring
DROP TRIGGER IF EXISTS leads_calculate_score ON leads;

CREATE TRIGGER leads_calculate_priority
  BEFORE INSERT OR UPDATE OF
    branch, is_urgence, syndic_profil, nb_immeubles,
    canal_contact, code_postal, diag_sous_type, telephone_raw, email
  ON leads
  FOR EACH ROW
  EXECUTE FUNCTION calculate_lead_priority();

-- ── 6. Index pour le dispatch Front Desk ────────────────────────────────────
-- Permet de requêter rapidement : "tous les P_OP1 non traités, puis P_BIZ1"

CREATE INDEX IF NOT EXISTS idx_leads_dispatch
  ON leads (priorite_op, priorite_biz, created_at DESC)
  WHERE deleted_at IS NULL AND status = 'nouveau';

-- ── 7. Vue de dispatch Front Desk ───────────────────────────────────────────
-- Ordre : P_OP1 en tête → P_BIZ brise l'égalité → puis date

CREATE OR REPLACE VIEW v_leads_dispatch
  WITH (security_invoker = on)
AS
SELECT
  id,
  created_at,
  nom,
  telephone_raw,
  telephone,
  email,
  code_postal,
  branch,
  is_urgence,
  priorite_op,
  priorite_biz,
  score          AS score_business,
  status,
  canal_contact,
  message,
  page_url
FROM leads
WHERE
  deleted_at IS NULL
  AND status   = 'nouveau'
ORDER BY
  -- Règle d'or : opérationnel d'abord
  CASE priorite_op
    WHEN 'P_OP1' THEN 1
    WHEN 'P_OP2' THEN 2
    WHEN 'P_OP3' THEN 3
    WHEN 'P_OP4' THEN 4
  END,
  -- À égalité opérationnelle : business brise l'égalité
  CASE priorite_biz
    WHEN 'P_BIZ1' THEN 1
    WHEN 'P_BIZ2' THEN 2
    WHEN 'P_BIZ3' THEN 3
    WHEN 'P_BIZ4' THEN 4
  END,
  -- À égalité totale : le plus ancien d'abord (FIFO)
  created_at ASC;

COMMENT ON VIEW v_leads_dispatch IS
  'File de dispatch SOS FONTE Front Desk — ordre : P_OP → P_BIZ → date. '
  'Règle d''or : fuite active (P_OP1) toujours en tête.';

-- ── 8. RLS sur la nouvelle vue ───────────────────────────────────────────────

REVOKE ALL ON v_leads_dispatch FROM anon;
GRANT  SELECT ON v_leads_dispatch TO authenticated;
GRANT  SELECT ON v_leads_dispatch TO service_role;

COMMIT;
