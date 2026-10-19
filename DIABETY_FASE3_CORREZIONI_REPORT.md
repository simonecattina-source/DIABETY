# DIABETY Clean — Correzioni finali Fase 3 (pacchetto unico)

**Base:** `salva data 18-10 creazio-app-main(7).zip`, verificato dall'utente su Vercel.  
**Scopo:** applicare insieme le correzioni A1–A5 del rapporto di verifica finale, mantenendo l'app attuale.

## File da applicare su GitHub

**Crea** `frontend/src/services/backup-events.ts` (non esisteva prima).  
**Sostituisci** i seguenti quattro file:
- `frontend/app/(tabs)/storico.tsx`
- `frontend/app/(tabs)/impostazioni.tsx`
- `frontend/app/(tabs)/bolo.tsx`
- `frontend/app/(tabs)/alimenti.tsx`

Non devi spostare le schede da `app/(tabs)`, cambiare Vercel né modificare `package.json`.

## Modifiche

**A1 — Modifica Storico:** la glicemia deve essere un intero da 1 a 999 mg/dL: `-12`, `15e`, `1.5`, `0` e `1000` sono rifiutati. Insulina vuota oppure intero da 0 a 99 UI; CHO vuoti o da 0 a 9999, con punto o virgola; verifiche effettive su data reale non futura, orario HH:MM e momento selezionato. Non è stato toccato il filtro che conserva i dati nel tempo.

**A2 — Bolo:** *nessuna variazione delle formule, degli arrotondamenti o delle soglie glicemiche*. Dopo «Calcola» si apre un riepilogo in stile DIABETY che chiede di verificare glicemia, CHO, rapporto, ISF e target, ricordando l'assenza del calcolo automatico dell'insulina attiva. Soltanto «Mostra stima» rivela il risultato; «Annulla» lo scarta. **Questa conferma non costituisce una verifica clinica della dose e non impedisce necessariamente tutte le dosi irragionevoli**; i parametri vanno concordati con il curante.

**A3 — Ripristino:** dopo l'importazione riuscita di un backup v2, Bolo e Alimenti ricaricano al successivo ingresso rispettivamente parametri e preferiti. È stata aggiunta una notifica *solo in memoria*; nessuna chiave AsyncStorage nuova. La rilettura dei preferiti non li riscrive accidentalmente sovrapponendoli al backup. Il piatto resta escluso e non viene toccato.

**A4 — Backup storici:** CHO salvati come numeri o stringhe `12,5` e `12.5` sono accettati e normalizzati nella copia esportata e nei record importati. I valori negativi, ambigui o fuori intervallo restano vietati. L'esportazione non riscrive lo storico del dispositivo e il controllo del formato/rollback rimane in vigore.

**A5 — Backup JSON nativo:** su Android/iPhone viene scritto un file JSON reale nella cache di Expo tramite `expo-file-system`, già presente nelle dipendenze, poi passato a `expo-sharing`. Il download web conserva il proprio comportamento, con una revoca differita dell'URL per Safari. La condivisione nativa deve essere provata su dispositivi reali.

## Elementi lasciati invariati

- Ogni dicitura e condizione esistente sui **90/91 giorni**.
- Chiavi di archiviazione, cancellazione automatica e filtri temporali.
- Database alimentare (665 record), calcolo CHO e PDF (contenuto, filtri, impaginazione).
- Formula originale del bolo e sue soglie glicemiche; design delle altre schermate.
- Struttura `frontend`, build e configurazione di Vercel.

## Verifiche eseguite

- Sintassi: **35** file JS/TS/TSX, nessun errore rilevato.
- Import locali: **66** controllati, nessuno mancante.
- **60** asserzioni automatizzate su CHO, backup storico, input della modifica, calcolo del bolo, segnalazione di ripristino e percorso file nativo.
- Confronto dello ZIP: modificati **soltanto i quattro file elencati** e aggiunto un solo nuovo servizio.
- Nessuna build Expo/Vercel o prova Android/iPhone eseguita in questo ambiente.

## Installazione e collaudo

1. Prima di applicare la modifica, conserva una copia del repository GitHub e un backup aggiornato dei dati DIABETY.
2. Carica i cinque file nelle posizioni indicate, poi esegui un commit unico.
3. Controlla che Vercel mostri `Ready`.
4. Prova un'operazione di modifica su un **record di test**, prima con input non validi, poi con CHO `12,5`, `12.5` e `0`.
5. Prova il nuovo passaggio «Verifica prima del calcolo» del Bolo con parametri di prova, **senza somministrare insulina in base ai test**.
6. Verifica backup esportati e importati **soltanto in un ambiente di prova** con dati sintetici, controllando il ritorno a Bolo e Alimenti. Non sovrascrivere i dati reali per testare.
7. Se utilizzi un'app nativa, prova la condivisione JSON su Android/iPhone: richiede runtime nativo con il modulo già disponibile.

**Nota:** il pacchetto include tutte le correzioni di questa fase in un solo ZIP; non applicare separatamente patch vecchie di questa fase.
