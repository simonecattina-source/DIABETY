# DIABETY — Nomi personalizzati delle fasce orarie

Fonte: `salva data 18-10 creazio-app-main(20261019-150547).zip`.

## Modifiche apportate

- `frontend/app/(tabs)/bolo.tsx`: piccolo campo indipendente «Nome» a fianco dell’intervallo orario di ogni mini-card. Modificabile direttamente con lucchetto aperto. Identico campo nel popup, accanto all'intervallo `inizio – fine`. Il nome compare nella fascia attiva e nel riepilogo del calcolo.
- `frontend/src/utils/bolo-orario.ts`: nuovo campo facoltativo `nome`, massimo 22 caratteri, compatibile con configurazioni precedenti. NESSUN cambio della chiave storage o della versione dati.
- Il campo usa AsyncStorage esistente e viene già compreso nell'export/import JSON tramite `configurazioneBoloOraria` gestita da `impostazioni.tsx`, senza modifiche a quest'ultimo.
- Il lucchetto continua a proteggere la modifica; «Salva e blocca» persiste la bozza, «Annulla modifiche» la ripristina.

## Calcolo insulinico — ATTENZIONE

Il Bolo dell'archivio ricevuto **non contiene un motore di dosaggio attivo**. Anche con tutti i parametri compilati mostra sempre `— UI` e un avviso. NON è un problema dei valori inseriti: era una limitazione introdotta consapevolmente nella versione precedente. Questa patch non riattiva la stima insulinica, poiché il codice precedente non prevedeva gestione dell'insulina attiva e non è disponibile una validazione clinica aggiornata. L'interfaccia resta non terapeutica. Il parametro «Bolo massimo personale» è memorizzato ma non costituisce un algoritmo di protezione clinicamente validato.

## Verifiche locali

- Parsing TypeScript/TSX dei due file: nessun errore sintattico.
- Type-check isolato del modulo `bolo-orario.ts`: superato.
- 9 controlli logici: lettura delle vecchie fasce senza nome, etichette, selezione per orario, limiti orari, nome facoltativo, validazione lunghezza/caratteri, serializzazione JSON, duplicazione orari: superati.
- Non è stata eseguita una build Expo/Vercel o una prova su Web/iPhone/Android: `node_modules` non è presente nello ZIP.

## GitHub

Sostituisci soltanto i due file nei rispettivi percorsi sotto `frontend`. Nessuna modifica a `package.json`, Vercel Root Directory resta `frontend`.
