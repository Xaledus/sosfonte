/* ═══════════════════════════════════════════════════════════════════════════
   SOS FONTE — Migration 003 : Correction contrainte leads_score_range
   Date    : 2026-05-25

   Problème :
     Migration 001 définissait score BETWEEN 0 AND 10 (ancienne échelle).
     Migration 002 introduit un scoring business jusqu'à 200
     (syndic +45, profil +45, portefeuille +35, etc.).
     → INSERT échoue avec "violates check constraint leads_score_range".

   Correction :
     Relâcher la borne supérieure à 200.
   ═══════════════════════════════════════════════════════════════════════════ */

BEGIN;

ALTER TABLE leads
  DROP CONSTRAINT IF EXISTS leads_score_range;

ALTER TABLE leads
  ADD CONSTRAINT leads_score_range CHECK (score BETWEEN 0 AND 200);

COMMIT;
