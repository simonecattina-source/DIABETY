# DIABETY Clean — rapporto di pulizia

**Base:** `DIABETY_progetto_popup_personalizzati.zip` (contiene il popup backup e le notifiche personalizzate).

## Risultato
- **28 file rimossi** (moduli GlicoTrack inutilizzati, immagini demo Expo, backend FastAPI dimostrativo, report e documentazione superati).
- **40 file originali mantenuti byte per byte**.
- **2 file modificati**: `README.md` (istruzioni aggiornate) e `frontend/package.json` (rimossa soltanto la voce `scripts.reset-project`).
- **1 rapporto aggiunto**: `DIABETY_CLEAN_REPORT.md`.
- Database alimentare attivo **665 voci**, invariato.
- Nessuna modifica al codice delle schermate, ai popup personalizzati, alle chiavi AsyncStorage, alle diciture 90/91 giorni, ai filtri, ai backup e ai calcoli.

## File rimossi
- `frontend/src/components/Toast.tsx`
- `frontend/src/csv.ts`
- `frontend/src/editStore.ts`
- `frontend/src/measurements.ts`
- `frontend/src/types.ts`
- `frontend/src/utils/storage/index.ts`
- `frontend/src/utils/storage/index.web.ts`
- `frontend/src/utils/storage/storage-base.ts`
- `frontend/constants/testIds/auth.js`
- `frontend/constants/testIds/index.js`
- `frontend/assets/images/partial-react-logo.png`
- `frontend/assets/images/react-logo.png`
- `frontend/assets/images/react-logo@2x.png`
- `frontend/assets/images/react-logo@3x.png`
- `frontend/scripts/reset-project.js`
- `backend/server.py`
- `backend/pytest.ini`
- `backend/requirements.txt`
- `design_guidelines.json`
- `memory/PRD.md`
- `test_result.md`
- `test_reports/iteration_1.json`
- `test_reports/iteration_2.json`
- `test_reports/iteration_3.json`
- `test_reports/iteration_4.json`
- `test_reports/iteration_5.json`
- `tests/__init__.py`
- `frontend/README.md`

## File mantenuti intenzionalmente
- `frontend/src/theme.ts`: importato dal componente `error-boundary.tsx`.
- `frontend/src/navigation.ts`: importato dalla navigazione a schede.
- `frontend/src/query-client.ts`: importato da `app/_layout.tsx`.
- `frontend/src/components/error-boundary.tsx`: protezione degli errori dell'app.
- `frontend/src/components/diabety-alert.tsx`: nuovo sistema popup condiviso.
- `frontend/scripts/cmd-guard*`, `install-guard.sh`, `sync-shims.sh`: strumenti dell'ambiente; non rimossi per prudenza.
- `frontend/package.json`: tutte le dipendenze e versioni conservate.
- Tutte le icone di app, splash, PWA e tutti i font originali.

## Caveat sull'API di esempio
Il backend FastAPI di esempio espone soltanto un endpoint Hello World e due endpoint di test dello stato con MongoDB. Non risulta richiamato dal frontend e Vercel è impostato con `Root Directory: frontend`. È stato escluso **solo dal pacchetto Clean**. Se nel frattempo fosse utilizzato separatamente, mantieni la cartella `backend` della copia originale.

## Procedura GitHub senza terminale
1. Prima di qualsiasi modifica, conserva lo ZIP completo originale come copia di sicurezza.
2. Sul branch `main`, elimina i file elencati in **File rimossi** (GitHub non li elimina automaticamente quando carichi uno ZIP).
3. Sostituisci `README.md` e `frontend/package.json` con i file della versione Clean.
4. Le restanti schede e il database sono IDENTICI all'archivio con i popup personalizzati e non vanno riscritti.
5. Verifica il deploy Vercel e poi prova l'app: apertura 6 schede, import/export backup, avvisi, salvataggio e grafici. Fai prima un backup dei tuoi dati reali.

**Nota:** non è stato possibile effettuare una build Expo/Vercel completa in questo ambiente senza le dipendenze installate. Eseguire un deploy su Vercel prima di considerare definitiva la pulizia.
