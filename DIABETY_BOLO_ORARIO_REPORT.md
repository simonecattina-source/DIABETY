# DIABETY — Nuova schermata Bolo per fasce orarie (19 ottobre 2026)

## Origine
Modifiche preparate sullo ZIP `salva data 18-10 creazio-app-main(10).zip`.

## File interessati

- `frontend/app/(tabs)/bolo.tsx` — schermata Bolo riprogettata nelle due card approvate.
- `frontend/src/utils/bolo-orario.ts` — **nuovo** modello dati e validazione delle fasce.
- `frontend/app/(tabs)/impostazioni.tsx` — esportazione/importazione delle fasce nel backup JSON esistente.

## Funzionalità della schermata

- Card **Calcolo del bolo** distinta dalla card **Parametri terapeutici**.
- Glicemia e CHO inizializzati entrambi a `00`; glicemia zero non è valida, CHO zero è consentito. `selectTextOnFocus` rende semplice sostituire il valore.
- **Rivedi dati** apre e richiude il riepilogo (anche mediante X); cambio input o fascia invalida il riepilogo precedente.
- Fascia corrente selezionata in base all'orario del dispositivo; aggiornamento periodico e al ritorno dell'app in primo piano.
- Lucchetto con **Modifica**, **Salva e blocca** e **Annulla modifiche**. Solo Salva e blocca persiste i nuovi parametri.
- Fasce in mini-card, modificabili tramite finestra dedicata, con pulsanti informativi `?` per I:CHO, ISF, target, soglia di correzione e bolo massimo globale.
- Prima fascia obbligatoria alle 00:00, orari HH:MM distinti, fine calcolata automaticamente, massimo tecnico 48 fasce.
- Salvataggio atomico della nuova configurazione in AsyncStorage, chiave `diabety_bolo_fasce_v1`.
- I tre vecchi parametri in `glicotrack_parametri_bolo` sono **conservati**, ma NON sono importati automaticamente nelle fasce orarie.
- Backup `DIABETY_BACKUP` versione 2 esteso con campo opzionale `configurazioneBoloOraria`; vecchi backup v2 rimangono compatibili. Il ripristino include la nuova chiave e il rollback.

## IMPORTANTE — Stato terapeutico

**La nuova schermata NON visualizza né calcola dosi insuliniche.** La vecchia formula, che non prendeva in considerazione insulina attiva e limite di bolo massimo, è sospesa in questa fase di progetto. La protezione tramite lucchetto NON equivale alla validazione clinica. I dati inseriti/salvati non sono prescrizioni attuali né costituiscono approvazione clinica. Il controllo di effettivo superamento del bolo massimo richiederà un futuro motore di dosaggio validato; per ora è presente il parametro globale e il testo di errore approvato, senza rendere operativa la stima.

## Verifiche effettuate

- Parsing TypeScript/TSX dei tre file: nessun errore sintattico segnalato.
- Type-check isolato del modulo `bolo-orario.ts`: superato.
- 15 assert verificano: orari validi/invalidi, copertura dal mezzanotte, limiti finali automatici, fascia attiva, duplicati, numeri decimali e parametri mancanti.
- **Non eseguita build completa Expo/Vercel**, perché l'archivio non include `node_modules` e le dipendenze non sono installate in questa sessione.

## Installazione GitHub

Copia ogni file nel percorso omonimo nella repository, creando il nuovo `frontend/src/utils/bolo-orario.ts`; lascia Root Directory Vercel = `frontend`. Non occorre aggiungere dipendenze a `package.json`.

### Verifiche consigliate su Web/iPhone/Android dopo Vercel Ready

1. Bolo: visualizzazione delle due card, campi `00`, aiuti `?`, riepilogo apribile/chiudibile.
2. Parametri: Modifica, finestra fascia, Annulla modifiche, Salva e blocca, ricarica pagina.
3. Fasce: cambiare ora e verificarne ordine/fine, bloccare orari duplicati o errati.
4. Impostazioni: esportare backup, importarlo e verificare il ripristino delle fasce e dei vecchi dati.
5. Verificare che il risultato rimanga `— UI` e non appaiano dosi terapeutiche.
