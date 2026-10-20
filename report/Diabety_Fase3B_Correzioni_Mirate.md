# DIABETY — Correzioni mirate per GitHub

Base: `salva data 18-10 creazio-app-main(8).zip`.

## Cosa corregge

1. **Piatto virtuale** — impostare a zero (o svuotare completamente) i grammi in un elemento del piatto lo rimuove immediatamente, utilizzando la stessa procedura del pulsante di eliminazione. Così il piatto visualizzato coincide con quello memorizzato in AsyncStorage.
2. **Excel e CSV** — il momento con identificativo `Notte` è visualizzato come `Notte` e non più `Prima di Dormire`. Nessun'altra etichetta viene modificata.
3. **Importa backup Android/iPhone** — la scheda Impostazioni apre il selettore nativo JSON attraverso la funzione `File.pickFileAsync` già disponibile in `expo-file-system`. Il testo selezionato viene passato alla stessa validazione già usata sul Web. La finestra di conferma DIABETY e la logica di sovrascrittura/rollback sono le stesse; annullando il selettore non vengono modificati i dati. Si mantiene l'esclusione del piatto virtuale dal backup.
4. **Alimento ID 418** — `Farfalline Barilla I Classici (crude)`: soltanto `approssimato` viene impostato a `true`, perché `stato_verifica` e la descrizione già indicano un dato non verificato. CHO per 100 g e tutte le altre proprietà restano identici.
5. **Schermata di errore** — tradotta in italiano e allineata alla palette nera/ciano di DIABETY. Ora usa il tema `src/theme/diabety.ts`, senza dipendere dal vecchio tema GlicoTrack.
6. **Backend legacy** — `backend/requirements.txt` può essere eliminato: FastAPI/MongoDB non sono richiesti per pubblicare DIABETY come app Expo Android/iPhone. Un eventuale servizio cloud futuro richiederebbe un backend progettato e configurato appositamente.

## File da SOSTITUIRE nel repository

- `frontend/app/(tabs)/alimenti.tsx`
- `frontend/app/(tabs)/impostazioni.tsx`
- `frontend/constants/alimenti_database.json`
- `frontend/src/components/error-boundary.tsx`
- `frontend/src/theme/diabety.ts`

## File da ELIMINARE nel repository

- `frontend/src/theme.ts`
- `backend/requirements.txt`

## Installazione

1. Conserva una copia di sicurezza del repository e un backup dei dati reali.
2. Carica/sostituisci esattamente i cinque file elencati, mantenendo i percorsi interni.
3. Elimina i due file obsoleti elencati. NON eliminare `frontend/src/theme/diabety.ts` né `frontend/src/services/backup-events.ts`.
4. Esegui il commit. Controlla la build `Ready` su Vercel.
5. Prova le funzioni: piatto a 0 g, Excel/CSV con record `Notte`, e backup sul Web.
6. Quando avrai una build nativa, prova su **Android e iPhone reali** l'apertura del selettore, l'annullamento, un file errato e un backup di prova valido (non sovrascrivere dati reali).

## Verifiche eseguite

- 34 file JS/TS/TSX trasformati senza errori sintattici; 66 import locali risolti.
- 665 prodotti nel database con ID univoci; differenza rispetto all'originale: **soltanto il booleano `approssimato` dell'ID 418**.
- 7 scenari simulati sulla scelta dei backup Web/nativa: formato valido, precedente formato array, annullamento, estensione errata, JSON malformato e formato non riconosciuto.
- Test della modifica del piatto da 100 g a 80 g e della rimozione automatica a zero grammi.
- `package.json`, configurazioni Expo/Vercel, calcoli, chiavi AsyncStorage e diciture o soglie 90/91 giorni **non modificati**.

**Limite**: non è stata effettuata una build Vercel o una prova su dispositivo Android/iPhone. Il supporto alla scelta nativa è verificato rispetto alla documentazione/API di Expo SDK 57 e tramite simulazioni; va provato su dispositivi prima della distribuzione.
