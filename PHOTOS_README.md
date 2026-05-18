# Structure des photos — SOS FONTE Réalisations

## Comment ajouter un chantier

1. Crée un dossier dans `photos/` avec ce format :
   `ville-type-annee` → ex: `paris17-colonne-2024`

2. Ajoute un fichier `info.json` dans le dossier :
```json
{
  "type": "Remplacement colonne",
  "titre": "Colonne EU complète — immeuble 1910",
  "lieu": "Paris 17e",
  "detail": "6 niveaux · 4 jours · Rapport assurance fourni",
  "annee": "2024"
}
```

3. Ajoute tes photos dans le dossier :
   - `cover.jpg` → photo principale (obligatoire)
   - `photo1.jpg`, `photo2.jpg`... → photos supplémentaires

4. Commit sur GitHub → le site se met à jour automatiquement

## Dossiers exemples créés
- `photos/paris17-colonne-2024/`
- `photos/neuilly-urgence-2024/`
- `photos/paris16-diagnostic-2024/`
- `photos/vincennes-reparation-2024/`
- `photos/paris8-colonne-2024/`
