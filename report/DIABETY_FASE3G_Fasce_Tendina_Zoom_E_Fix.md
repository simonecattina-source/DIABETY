# DIABETY — REPORT DI CONTINUITÀ COMPLETO
## Aggiornamento al 20 ottobre 2026 · Bolo, IOB, Inserisci, Storico, parametri terapeutici

**Documento di continuità del progetto.** Questa è una nuova revisione del report FASE3E del 19/10/2026, qui riprodotto integralmente nella **Parte II**. La **Parte I (20/10/2026) prevale** sulle indicazioni precedenti dove le decisioni sono cambiate. Il testo storico non è stato riscritto retroattivamente.

> **Importante:** «approvato», «codificato in pacchetto» e «verificato nell'app pubblicata» sono tre stati diversi. I pacchetti di modifica sono disponibili, ma **non abbiamo conferma, dal solo materiale esaminato, che l'insieme dei file sia attualmente installato su GitHub o deployato con successo su Vercel**. I test aritmetici non rappresentano validazione clinica. DIABETY non deve presentare la stima come istruzione a somministrare insulina.

---

# PARTE I — AGGIORNAMENTI E STATO AL 20/10/2026

## 1. Stato del progetto e obiettivo

- App: **DIABETY**, Expo / React Native Web, destinazione Web, iOS e Android.
- Repository di riferimento dichiarato: `simonecattina-source/creazio-app`, branch `main`, Root Directory Vercel `frontend`; workflow dell'utente: caricamento/modifica file GitHub e controllo build Vercel, senza terminale locale.
- Archivio utente di partenza per il pacchetto IOB del 20/10: `salva data 18-10 creazio-app-main(20261019-221509).zip`.
- Archivio inviato successivamente per analizzare il problema di visualizzazione del bolo: `PROVA PER IBOin.zip`.
- Sono stati creati **pacchetti di proposta** distinti per integrazione IOB, stima matematica e interfaccia fasce/zoom. **Non trattarli come una sequenza installata e verificata**, né come uno ZIP unico già testato in produzione.

## 2. Decisioni definitive recuperate, aggiornate al 20/10

### 2.1 Inserisci — insulina effettivamente somministrata

- Le UI della scheda Inserisci corrispondono a somministrazioni realmente effettuate contestualmente alla registrazione; **un solo timestamp** per glicemia e dose, senza secondo orario.
- Modalità **Penne**: selezione iniziale **Rapida (R)**; possibilità di selezionare **Basale (B)**. Non richiedere conferma del tipo a ogni nuova dose: la selezione iniziale Rapida rende l'uso più pratico.
- Il selettore accanto al titolo «Insulina» è un **piccolo rettangolo arrotondato contenente soltanto una freccetta**. Non mostra la parola Rapida/Basale al suo interno. L'indicatore discreto `R` o `B` rimane accanto alle UI.
- Modalità **Microinfusore**: le UI inserite rappresentano il **bolo effettivamente erogato**, non l'infusione basale automatica/continua.
- Insulina vuota o `00`: non crea una nuova dose, non richiede classificazione, non annulla le dosi rapide precedenti e non genera un messaggio inutile.
- **Nessun** messaggio informativo aggiuntivo sotto le card Inserisci («Nuova dose registrata», «Dose aggiunta all'IOB» ecc.): erano messaggi delle simulazioni, non elementi da implementare.
- La grafica originale delle card, il layout smartphone e la griglia originale 3×3 dei nove momenti della giornata sono da preservare secondo la specifica FASE3E.

### 2.2 Storico — fonte unica delle somministrazioni

- **Nessuna modifica all'aspetto delle righe**: rimangono glicemia, UI, CHO, note, data, ora, momento della giornata, filtri, pulsanti e comportamenti già esistenti.
- Nessun badge `R/B`, trattino, punto interrogativo o testo «Non specificata» aggiuntivo nelle righe dello Storico.
- La classificazione `rapida`, `basale`, `non specificata` è un **metadato**. Soltanto la finestra «Modifica misurazione» permette di correggere la categoria e di classificare le vecchie dosi.
- I record storici non classificati non vengono convertiti automaticamente in dosi rapide. Se possono influire sull'IOB, la stima deve diventare indisponibile invece di simulare una certezza.
- Modifiche a quantità, tipo, data/ora aggiornano **la stessa registrazione**. Eliminazione: rimuove la dose dal contributo IOB. Eventi distinti con lo stesso orario non sono duplicati.

### 2.3 IOB — riquadro interno alla card Calcolo del bolo

- Rimangono **due card principali**: «Calcolo del bolo» e «Parametri terapeutici». L'IOB è **un riquadro interno compatto**, non una terza card.
- Vista di base: ultima dose rapida registrata + orario, e stato IOB.
- Tre stati concordati:
  1. **IOB stimata**: numero in UI, ottenuto matematicamente soltanto quando configurazione e cronologia consentono il calcolo; presentazione informativa e non validata clinicamente.
  2. **`0 UI`**: il modello non calcola residuo dalle dosi rapide **registrate**; non significa certezza che nell'organismo non sia presente insulina attiva.
  3. **`— UI`**: stima non disponibile; breve spiegazione se dati non classificati/ambigui, timestamp incoerenti, parametri assenti o esposizione incompleta delle somministrazioni.
- Aggiornamento automatico **ogni minuto**, oltre che all'apertura della schermata e al cambiamento dei dati/parametri, senza pulsante dedicato.
- Elenco dosi **chiuso di default**, comando Mostra/Nascondi; al suo interno tab «Rapida» e «Basale» con ordine dalla somministrazione più recente. La basale non entra nel totale IOB rapida.
- **Modalità Microinfusore:** dato che DIABETY non dispone necessariamente di tutte le erogazioni automatiche, non rappresentare un totale IOB completo come verificato; nel pacchetto IOB la stima complessiva è indisponibile (`— UI`).
- Nessuna sottrazione automatica dell'IOB dalla stima del bolo e nessuna dose terapeutica «consigliata».
- Modello tecnico candidato e testato: **curva esponenziale documentata OpenAPS**. Durata e picco usati nelle prove sono **esclusivamente didattici**, non impostazioni terapeutiche precaricate o prescritte. Vedere Parte II, sezioni 13–14.

### 2.4 Calcolo del bolo — il problema emerso e la soluzione di sviluppo

**Problema segnalato:** pur avendo compilato i parametri, la schermata mostrava «Stima terapeutica non abilitata» e il totale del bolo restava `— UI`.

**Distinzione confermata:**
- **Stima matematica non terapeutica**: può visualizzare, quando gli input sono validi, il risultato puramente aritmetico della quota CHO e della correzione, con dettaglio in «Rivedi dati».
- **IOB stimata**: risultato matematico separato che considera le dosi rapide registrate ma **non viene sottratto** dal primo risultato.
- **Bolo consigliato/terapeutico**: **non abilitato** e non presentato come dose da praticare fino a idonea valutazione matematica, clinica e dell'uso previsto.

È stato creato un modulo `src/utils/calcolo-bolo.ts` per mostrare la **simulazione aritmetica**, evitando il precedente blocco che nascondeva ogni valore. Le protezioni previste per input errati e per «Bolo massimo superato» restano distinte dalla validazione clinica. I calcoli **non devono** costituire istruzioni di dosaggio.

### 2.5 Correzione della glicemia iniziale `00` (decisione successiva al report FASE3E)

**Decisione definitiva — prevale sulla vecchia descrizione «00 reale» della Parte II:**

- All'apertura della scheda Bolo il campo Glicemia visualizza **`00` soltanto come valore visivo iniziale**: non è una misurazione immessa dall'utente.
- **Non** deve comparire automaticamente «Glicemia non valida» finché l'utente non interviene oppure non chiede esplicitamente di effettuare/visualizzare il calcolo.
- Un valore `00` effettivamente confermato al calcolo rimane **non valido** come glicemia.
- CHO `00` invece può essere un input **valido** per una simulazione della sola quota di correzione.
- Correzione logica; l'estetica originale dei campi deve rimanere invariata.

### 2.6 Parametri terapeutici — «Fasce orarie» a tendina, approvato

**La nuova soluzione a due livelli sostituisce l'anteprima con tutte le fasce permanentemente aperte.**

- Sezione **«Fasce orarie» chiusa di default** all'ingresso nella scheda Bolo.
- Primo tocco: apre l'elenco compatto delle fasce già configurate, con nomi e intervalli reali.
- Tocco su una singola fascia: espande **soltanto quella fascia**, mostrando I:CHO, ISF, Target, Soglia e relativi aiuti `?`; un secondo tocco la richiude.
- **Massimo una fascia espansa** contemporaneamente; richiudere la sezione azzera la fascia espansa.
- Mantenere: dati salvati, copertura temporale, lucchetto, «Modifica», «Salva e blocca», «Annulla modifiche», modifica/aggiunta/eliminazione, nomi, orari e help disponibili.
- Su smartphone, l'intestazione di ogni parametro comprende un'**area di tocco ampliata** per rendere più accessibile il piccolo pulsante `?`.
- Il menu non introduce valori terapeutici fittizi: gli esempi delle anteprime (Notte/Mattina/Pomeriggio/Sera) erano illustrativi.

### 2.7 Zoom involontario su Safari iPhone — mitigazione

**Problema segnalato:** al tocco dei campi modificabili la pagina ingrandisce automaticamente e rimane zoomata, rendendo il layout illeggibile.

**Correzione predisposta nel file `bolo.tsx`:** elevare a **16 px o più** il carattere dei `TextInput` della scheda Bolo, in particolare orario/nome fascia e campi numerici, evitando di ingrandire l'intera interfaccia. Non disabilitare lo zoom manuale/accessibile dell'utente.

**Stato:** cambiamento effettuato nel pacchetto di sviluppo; **non verificato su Safari iPhone reale**. Se persiste lo zoom, servirà ispezionare la pagina Web effettivamente pubblicata e gli stili globali, senza modifiche generiche non motivate.

## 3. Pacchetti sorgente prodotti e dipendenze — ordine di priorità

| Pacchetto | Base dichiarata | File sorgente | Ruolo | Stato |
|---|---|---|---|---|
| `DIABETY_IOB_modifiche_da_GitHub_20_ottobre_2026.zip` | ZIP utente `20261019-221509` | 4 da sostituire (`index.tsx`, `storico.tsx`, `bolo.tsx`, `impostazioni.tsx`) + 2 nuovi (`terapia-iob.ts`, `iob-storico.ts`) | Integrazione IOB con Storico / terapia / backup | Pacchetto sviluppato, build reale non verificata |
| `DIABETY_FIX_STIMA_MATEMATICA_20_10_2026.zip` | ZIP utente `PROVA PER IBOin.zip` | `bolo.tsx` + nuovo `calcolo-bolo.ts` | Mostrare il risultato aritmetico teorico separato dall'IOB | 20 test puri segnalati superati; nessuna build reale |
| `DIABETY_FASCE_TENDINA_ZOOM_E_FIX_IOS.zip` | ZIP `PROVA PER IBOin.zip` più fix matematico | `bolo.tsx` + `calcolo-bolo.ts` (identico al fix matematico) | Menu a due livelli, glicemia `00`, mitigazione zoom iOS | Controllo sintattico dichiarato; test su iPhone/Vercel non eseguiti |

**Attenzione alle sovrascritture**

1. I tre ZIP contengono versioni **diverse** di `frontend/app/(tabs)/bolo.tsx`. Non installarli in ordine casuale. L'ultima versione `bolo.tsx` da prendere in esame è quella di **`DIABETY_FASCE_TENDINA_ZOOM_E_FIX_IOS.zip`**, perché incorpora le evoluzioni successive per stima e menu. Va verificata su una copia aggiornata del progetto.
2. L'ultimo ZIP **non è autonomo**: la sua `bolo.tsx` importa `@/src/utils/terapia-iob` e `@/src/utils/iob-storico`, che devono già essere presenti da una integrazione IOB coerente; importa anche `@/src/utils/calcolo-bolo` che è incluso.
3. Per una futura installazione verificata partire dalla **versione GitHub più recente** o da un nuovo ZIP del repository realmente pubblicato, confrontare tutte le sorgenti e creare **un pacchetto unico consolidato**, invece di mescolare arbitrariamente versioni intermedie.
4. La combinazione candidata comprenderebbe, previa verifica dei diff, i seguenti **sette** file: `index.tsx`, `storico.tsx`, `impostazioni.tsx`, `bolo.tsx`, `terapia-iob.ts`, `iob-storico.ts`, `calcolo-bolo.ts`. Gli ultimi tre sono in `frontend/src/utils/`; i primi quattro in `frontend/app/(tabs)/`. **Non è attestato che questa combinazione sia già stata compilata e provata end-to-end.**
5. Non sovrascrivere PDF, grafici, database alimenti, chiavi/dati di backup, impostazioni Vercel né altri elementi non pertinenti.

### Percorsi precisi delle sorgenti

```text
frontend/app/(tabs)/index.tsx
frontend/app/(tabs)/storico.tsx
frontend/app/(tabs)/impostazioni.tsx
frontend/app/(tabs)/bolo.tsx
frontend/src/utils/terapia-iob.ts
frontend/src/utils/iob-storico.ts
frontend/src/utils/calcolo-bolo.ts
```

## 4. Verifiche effettuate e non effettuate

### Verifiche documentate sui pacchetti distinti

- **19/10, report FASE3E:** 32 controlli matematici dello studio OpenAPS esponenziale con dati inventati, eseguiti in Python separato dall'app.
- **20/10, pacchetto IOB:** compilazione `--strict` dei due moduli di logica pura, parsing dei sei file del pacchetto, **28 test tecnici non terapeutici** del motore IOB (dosi duplicate, storiche, future, date/ore, fusi e casi non disponibili). I file del generatore PDF e `grafici.tsx` erano riportati invariati rispetto alla base di quel pacchetto.
- **20/10, pacchetto stima matematica:** `--strict` dei moduli matematici pertinenti, **20 test aritmetici** e di gestione blocchi con dati inventati, parsing della `bolo.tsx`.
- **20/10, pacchetto fasce/zoom:** controllo sintattico e presenza delle nuove strutture nel sorgente; campi `TextInput` con carattere adeguato come mitigazione iOS. Questi controlli statici **non sono una prova** del risultato di interazione sullo smartphone.

**Numeri di test distinti**: 32, 28 e 20 si riferiscono a **suite e versioni differenti**. Non sommarli presentandoli come 80 test end-to-end dell'app finale.

### Verifiche ancora necessarie

- Compilazione completa TypeScript dell'insieme consolidato, build Expo/Web e deploy Vercel.
- Interfaccia su Safari iPhone, Android e browser desktop: apertura/chiusura tastiera e ritorno alla scala normale, fasce a tendina, focus e pulsanti `?`.
- Comportamento glicemia `00` subito dopo l'apertura, dopo modifica, dopo chiusura e nuova apertura, dopo richiesta esplicita di riepilogo; CHO `00` valido dove previsto.
- Registro Inserisci → Storico → Bolo: rapida/basale, 0 UI, record vecchi senza classificazione, orari coincidenti, dosi correggibili, cancellazioni, mezzanotte e fuso legale.
- Backup JSON: esportazione, importazione di backup nuovo/vecchio, rollback in caso di errore, conservazione delle classificazioni e delle impostazioni IOB.
- Regressione visiva: **Storico originale identico**, PDF con cella «Insulina/CHO» e popup originali, CSV/Excel, Grafici, Alimenti, Impostazioni.
- Revisione clinica, tecnica e — se applicabile — regolatoria prima di qualsiasi uso di risultati come dose da somministrare.

## 5. Vincoli invariabili da non perdere nel prossimo sviluppo

1. **Storico:** nessun cambiamento visivo delle righe, dei filtri, delle UI/CHO/note, di data/ora, delle esportazioni e dei controlli attuali.
2. **PDF:** nessun cambio a intestazioni, colori, disposizione, righe, separatori o formato «10 UI – 50 CHO». Non aggiungere `(R)/(B)` nel PDF.
3. **Bolo:** due card principali e lucchetto coerente; lista insuline chiusa di default; elenco somministrazioni chiuso di default; fasce orarie a tendina in due livelli chiuse di default.
4. **Parametri:** nessun valore personalizzato precompilato ricavato da fotografie di confezioni, vecchie prescrizioni o esempi di curva.
5. **Sicurezza:** nessun «bolo consigliato», nessuna sottrazione automatica IOB e nessuna affermazione che il modello impedisca sovradosaggi. Il valore matematico è **non terapeutico**.
6. **Dati:** non duplicare somministrazioni, non auto-classificare registrazioni pregresse; salvaguardare backup, dati precedenti e logica di conservazione 90/91 giorni concordata senza modificarla implicitamente.
7. **Piattaforme:** mantenere compatibilità Web/iOS/Android; evitare zoom automatico dei campi piccoli su Safari senza disabilitare zoom volontario.
8. **Installazione:** non cambiare `package.json`, root `frontend` o comandi Vercel senza un motivo verificato.

## 6. Checkpoint operativo per la prossima conversazione

**Messaggio sintetico di ripartenza:**

> Stiamo sviluppando DIABETY. Il documento di riferimento aggiornato è `DIABETY_REPORT_CONTINUITA_AGGIORNATO_20_10_2026.md` (Parte I + report FASE3E integrale del 19/10). L'ultima modifica progettata riguarda Bolo: Glicemia `00` puramente visiva, Fasce orarie a due livelli chiuse di default e mitigazione autozoom iOS con TextInput ≥16 px. L'IOB esponenziale resta informativa e distinta dalla stima matematica teorica del bolo; nessun suggerimento di dose. L'ultimo ZIP consegnato per Bolo/fasce è `DIABETY_FASCE_TENDINA_ZOOM_E_FIX_IOS.zip`, che **dipende** dai moduli IOB precedenti. Prima di ulteriori interventi richiedere il repository ZIP attuale, verificare i diff e consolidare le sette sorgenti, testare build Expo/Vercel, Web, iPhone e Android. Non alterare Storico/PDF.

**Stato delle decisioni:** accordate sul piano progettuale. **Stato installazione:** non verificato. **Prossima attività:** test e consolidamento basati sul codice GitHub più recente, non ripristino di uno ZIP prototipo.

---

# PARTE II — REPORT ORIGINALE DEL 19/10/2026, CONSERVATO INTEGRALMENTE

*Le formulazioni storiche «non modificare ancora codice», «glicemia 00 reale» e le altre indicazioni poi superate descrivono il momento in cui furono scritte. Per lo stato aggiornato vale la Parte I.*

# DIABETY — calcolo matematico del bolo + registro IOB (19/10/2026)

## Cosa è stato aggiunto

La versione parte da `DIABETY_Bolo_Calcolo_Matematico_Progetto_Completo.zip`, che include già i nomi delle fasce e il calcolo matematico della quota CHO + correzione.

- **Calcolo del bolo:** riquadro interno «Insulina attiva (IOB)», senza aggiungere una terza card principale.
- **Registra dose:** registra solamente dosi **effettivamente somministrate**, indicando UI, nome insulina, data, ora e tipo (pasto, correzione, altro). Sono consentite somministrazioni delle ultime 24 ore. Il risultato del bolo NON viene registrato automaticamente.
- **Elimina registrazione:** eliminazione con conferma esplicita.
- **Parametri terapeutici:** nuovi campi protetti dal lucchetto per nome insulina e durata d'azione in ore, senza valori precompilati e senza modificare i parametri delle fasce.
- **IOB matematica:** residuo illustrativo basato su decadimento lineare delle dosi registrate, visibile solamente quando è stato configurato un profilo coerente, esistono dosi recenti e non sono presenti insuline differenti. Il valore cambia al passare del tempo; viene mostrato con 2 decimali.
- **Rivedi dati:** mostra il valore IOB matematico (oppure «Non disponibile»), senza alterare la quota CHO, la correzione o il totale del bolo.
- **Backup:** esporta e ripristina il registro dosi come campo `somministrazioniBolo` nei backup JSON v2. Backup precedenti senza questo campo rimangono compatibili e non cancellano automaticamente il registro locale. Salvataggio con rollback in caso di errore.

## Limiti di sicurezza — leggere prima dell'uso

**NON è un calcolatore terapeutico validato.** La IOB mostrata è solo una **simulazione matematica**. DIABETY non è connesso a microinfusori, CGM, penne smart o altre fonti di dosi reali, non importa automaticamente l'insulina della scheda Inserisci/Storico e non conosce la basale. Una registrazione mancante o errata può rendere la cifra molto lontana da quella reale.

La decrescita lineare adottata per la sola dimostrazione NON equivale al funzionamento del sistema Omnipod 5: il dispositivo reale include considerazioni su insulina da basale e altre logiche proprietarie. Fonte: guida ufficiale Omnipod 5, capitolo 18 «Understanding SmartBolus Calculator Calculations».

**Il valore IOB non viene sottratto automaticamente dalla stima del bolo.** Non usare il totale del calcolatore né il valore IOB per decidere una somministrazione. Prima di un impiego terapeutico occorrono nome attuale dell'insulina, durata d'azione prescritta, un registro esaustivo delle dosi realmente erogate, regole cliniche per la sottrazione/gestione di IOB, e validazione del sistema da parte del curante.

L'assenza di eventi registrati non significa IOB zero: la schermata mostra `— UI` in tale circostanza. In presenza di insuline diverse nelle ultime 24 ore, configurazione incompleta, timestamp futuri o dati malformati, la stima resta indisponibile.

## File interessati

1. `frontend/app/(tabs)/bolo.tsx`
2. `frontend/app/(tabs)/impostazioni.tsx`
3. `frontend/src/utils/bolo-orario.ts`
4. `frontend/src/utils/insulina-attiva.ts` (nuovo)

I file di calcolo matematico `frontend/src/utils/calcolo-bolo.ts`, le altre schede e la configurazione Vercel non sono stati modificati.

## Verifiche locali

- Compilazione TypeScript **strict dei tre moduli di logica pura** (`insulina-attiva.ts`, `bolo-orario.ts`, `calcolo-bolo.ts`): superata.
- Parsing/transpilazione TypeScript/TSX di `bolo.tsx` e `impostazioni.tsx`: nessuna diagnostica sintattica.
- 22 verifiche automatizzate su parsing input, timestamp, configurazione preesistente, somma delle dosi, decrescita lineare e rifiuto di insuline incoerenti: superate.
- **Non effettuata** build reale Expo/Vercel né prova interattiva su telefono/browser.

## Come installare

Sostituire i tre file esistenti nei rispettivi percorsi GitHub e aggiungere `frontend/src/utils/insulina-attiva.ts`. Non eliminare altre cartelle, non modificare le impostazioni Vercel. Root Directory resta `frontend`.


---

# AGGIORNAMENTO PROGETTUALE E PASSAGGIO DI CONSEGNE — 19/10/2026

> **Questo capitolo aggiorna le decisioni di progetto successive al prototipo IOB descritto sopra. Ha precedenza sulle precedenti indicazioni di interfaccia/architettura dove differiscono.**  
> **Stato: progettazione approvata; integrazione finale nel codice NON ancora eseguita.**  
> Non modificare l'app né considerare i comportamenti descritti qui già pubblicati su GitHub/Vercel.

## 0. Stato delle versioni: non confondere i prototipi con l'app reale

- Ultimo ZIP dell'utente ispezionato in questa sessione: `salva data 18-10 creazio-app-main(20261019-150547).zip`. Include schermata Bolo per fasce orarie e relativo report, ma non contiene ancora `src/utils/calcolo-bolo.ts` né `src/utils/insulina-attiva.ts`.
- Sono disponibili **pacchetti di proposta** separati: `DIABETY_Bolo_Calcolo_e_IOB_Progetto_Completo.zip` contiene la precedente simulazione IOB con registro manuale e decrescita lineare; NON equivale al progetto integrato Inserisci/Storico/Bolo deciso successivamente.
- Nuovo piano: applicare **un solo aggiornamento finale** partendo dallo ZIP più recente che l'utente fornirà all'avvio dell'implementazione, verificando lo stato dei file reali. Non sovrascrivere il repository con un prototipo più vecchio.
- Non sono stati ancora svolti test della futura soluzione integrata: nessun claim di build, verifica clinica o corretto calcolo IOB per la nuova architettura.

## 1. Obiettivo e decisioni già approvate

- Un'unica fonte delle somministrazioni: **Inserisci → Storico → Bolo**. Le UI inserite in Inserisci rappresentano dosi **effettivamente somministrate** (non dosi pianificate); l'utente ha chiarito che la somministrazione avviene contestualmente alla misurazione, se necessaria.
- **Un solo orario** per test e somministrazione. Non aggiungere un campo per un secondo orario né checkbox correlate. L'ultima dose va individuata ordinando per **data/ora del record**, non per data di inserimento nel database.
- Se le UI sono zero, si registra la misurazione ma **non si crea una somministrazione** e il tipo non è obbligatorio.
- Non duplicare dosi in un archivio IOB separato. Se esiste un registro manuale nel prototipo, progettare migrazione/deduplicazione prima di eliminarlo; non importarlo automaticamente senza verifiche.
- Dopo modifica/eliminazione nello Storico, Bolo deve aggiornarsi. Dose rapida/prandiale e basale restano distinte.
- Modalità **Penne** e **Microinfusore**: solo la modalità attiva richiede configurazione; dati dell'altra modalità preservati e non usati per blocchi non pertinenti. La modalità microinfusore non fornisce automaticamente a DIABETY tutte le erogazioni basali/automatiche. Possibile basale aggiuntiva per penna.

## 2. Interfaccia Inserisci — conservativa, smartphone-first

- Grafica originale, con card Glicemia / Insulina / CHO affiancate **senza aumento significativo di altezza**.
- Piccolo comando toccando il **titolo «Insulina ⌄»**, che apre Rapida/Basale; nessuna card separata «Tipo di insulina somministrata». Piccolo indicatore `R`/`B` per modalità Penne; in modalità Microinfusore indicare Bolo per la registrazione di un bolo erogato.
- Data e Ora con card più basse; Note più compatte.
- «Momento della Giornata» resta esattamente la griglia **originale 3×3 con 9 pulsanti**, stessa dimensione del testo, colori, bordi e comportamento. Ridurre solo padding verticale interno a circa **2 px**, altezza indicativa **38 px** e gap tra pulsanti **5 px**. Non sostituire la griglia con un select o con pill generiche.
- L'orario test originale è anche quello della dose; non aggiungere un secondo orario.

## 3. Storico originale e registrazioni pregresse

- **Grafica e informazioni attuali completamente invariate**: glicemia, UI insulina, CHO, note, data, ora, momento, filtri 7/14/30/90/Tutti, modifica, cancellazione, pulsanti, esportazioni. Non nascondere UI/CHO/note e non aggiungere badge R/B visibili nelle righe.
- Salvare nei metadati del record `rapida`, `basale` oppure, per i record storici, `non specificata` senza fare attribuzioni arbitrarie.
- **Solo nella finestra «Modifica misurazione»** esiste la scelta «Non specificata» per le vecchie dosi non classificate; lì è possibile classificarle o correggere Rapida/Basale. In Inserisci per dose >0 sono disponibili solo Rapida e Basale.
- Per UI pari a zero il tipo non è necessario. Preservare retrocompatibilità con record storici.
- Non usare dosi non classificate nella stima IOB come se fossero certamente rapide; segnalare dati potenzialmente incompleti.

## 4. PDF, CSV/Excel, backup e conservazione

- **PDF NON SI MODIFICA**: nomenclatura «Insulina» invariata, formato cella «10 UI – 50 CHO», UI in grassetto, CHO non in grassetto. Nessuna sigla `(R)`/`(B)`, nessuna colonna, nessuna variazione di righe, separatori, colore o impaginazione.
- Mantenere filtri di esportazione esistenti, popup «Visualizza HTML» / «Scarica PDF» e funzionamento su PC/iPhone; effettuare test di regressione. Excel/CSV mantengono struttura attuale.
- Il nuovo tipo di insulina e la modalità di terapia devono entrare nel salvataggio e backup/ripristino senza perdita dati. Non cambiare unilateralmente i testi/regole **90/91 giorni**.

## 5. Bolo — struttura, nomi, lucchetto e configurazione

- Sempre **2 card principali**: «Calcolo del bolo» e «Parametri terapeutici».
- Fasce orarie modificabili in mini-card: prima alle **00:00**, copertura 24 ore senza sovrapposizioni, fine determinata automaticamente dall'inizio della successiva, etichetta/nome fascia facoltativo in riquadro piccolo affiancato al range, possibilità di inserimento/modifica.
- Pulsanti `?` per I:CHO, ISF, target, soglia di correzione e bolo massimo; consultabili anche a lucchetto chiuso.
- Lucchetto con diciture esatte **«Modifica» / «Salva e blocca»**, più **«Annulla modifiche»**; calcolo disabilitato durante modifiche in corso. Lucchetto chiuso significa dati protetti da edit accidentali, **non validazione clinica**.
- Glicemia e CHO nel calcolatore partono entrambi da valore **`00` reale**, selezionabile al focus; glicemia 00 non valida, CHO 00 possibile. «Rivedi dati» si apre e si chiude allo stesso clic e con X; se cambiano input/fascia, invalidare il riepilogo.
- Bolo massimo globale (non per fascia), titolo allarme esatto **«Bolo massimo superato»** e testo approvato: «La dose calcolata supera il bolo massimo personale impostato. Per sicurezza, DIABETY blocca il risultato e non suggerisce una dose alternativa. Verifica i dati inseriti e segui le indicazioni del diabetologo.» Nessun troncamento automatico al massimo.
- «Insuline utilizzate» nella card Parametri terapeutici **CHIUSA di default**. Titolo del selettore esatto **«Seleziona la Modalità di Terapia»**; Penne / Microinfusore. Penne: nome + durata d'azione di rapida e basale; Microinfusore: nome + durata insulina della pompa, opzione basale aggiuntiva con penna. Campi protetti dal lucchetto; modalità indipendenti e non distruttive.
- Presupposto esplicito richiesto dall'utente: **i parametri terapeutici inseriti derivano dal medico**; non chiedere ripetute conferme prescrittive. Ciò NON dimostra validazione clinica o tecnica dell'algoritmo IOB.

## 6. IOB — visualizzazione definitiva già approvata

- Riquadro **compatto all'interno della card «Calcolo del bolo»**, non terza card principale.
- Vista di default: **ultima dose rapida + ora** e **IOB stimata** (se affidabilmente calcolabile); quando non calcolabile, mostrare **`— UI`**, non `0 UI`.
- Elenco somministrazioni **chiuso di default**, pulsante Mostra/Nascondi. All'apertura compaiono due pulsanti/tabs **«Rapida» / «Basale»** che cambiano il contenuto dell'elenco, ordinato dalla dose più recente. Basale separata, mai sommata automaticamente all'IOB dei boli.
- Modalità microinfusore: tab Rapida mostra i **boli realmente registrati**, tab Basale eventuali iniezioni basali aggiuntive. La basale automatica/continua del dispositivo non è disponibile a DIABETY salvo integrazione certificata futura.
- Dosi vecchie senza classificazione restano «non specificate» nel dato e possono rendere incompleta la stima.
- Il sistema **non deve rappresentare una stima IOB come misura verificata** solo perché possiede nome/durata d'azione. Non sottrarre automaticamente il dato IOB dalla quota pasto/correzione finché tale logica non è valutata per la terapia.

## 7. Calcolo del bolo — distinzione approvata

- **«Stima matematica»**: quota CHO e quota di correzione trasparenti, risultato teorico non indicato come dose da somministrare.
- **«Bolo consigliato»**: risultato destinato a uso terapeutico, **non disponibile** fino a valutazione clinica e tecnica adeguata (oltre al percorso regolatorio applicabile se rilasciato come sistema di suggerimento dose).
- Controlli: glicemia `00`/non valida o bassa, parametri mancanti/incoerenti, modifica aperta, bolo massimo superato, somministrazioni rapide recenti, dati IOB incompleti, tipo insulina sconosciuto, incompletezza dei dati del microinfusore. Avvisi compatti, non popup ripetitivi.
- La sola provenienza medica di I:CHO/ISF/target/durata/limiti **non convalida il software**: servono verifica matematica, analisi rischi, regole IOB validate e valutazione dell'uso clinico. Non presumere validati i numeri della vecchia prescrizione (sono cambiati).

## 8. «IOB verificata»: tre livelli distinti e percorso

### Livello A — Dati verificati
- Sappiamo dose reale, data/ora, tipo di insulina; le registrazioni rilevanti sono complete, senza duplicati e aggiornate dopo modifica/cancellazione.
- Dati incompleti o retrospettivi non classificati sono riconosciuti. La cronologia può mancare di dosi non registrate, soprattutto nel caso microinfusore.

### Livello B — Software / modello verificati
- Scegliere un modello pubblicamente documentato coerente con **insulina e modalità**; registrare ipotesi, durata, parametro di picco/ritardo se previsti e campo di applicabilità.
- Confrontare output con riferimenti del modello; testare dosi multiple, eventi simultanei, confini temporali, orario legale/fuso, date future, dati mancanti, cancellazioni, backup, cambio modalità e riconciliazione del registro.
- Differenziare verifica implementazione matematica da accuratezza clinica individuale.

### Livello C — Valutazione clinica / uso terapeutico
- Far esaminare al diabetologo il modello, la selezione del farmaco, gli scenari di mancata visualizzazione, la relazione tra IOB pasto/correzione e il dosaggio. La durata d'azione dichiarata non basta.
- Per un algoritmo che propone dosi da somministrare servono analisi dei rischi, prove adeguate, validazione dell'uso previsto ed eventuale conformità come software dispositivo medico. Una spunta «approvato dal medico» non è sufficiente.
- Durante lo sviluppo, l'IOB è **informativa**: può comparire come indicatore/modello dimostrativo chiaramente qualificato, ma **NON è sottratta automaticamente** dal bolo e non rende disponibile un «Bolo consigliato».

## 9. Modelli IOB candidati: esponenziale selezionato per i test (non validato clinicamente)

1. **Decadimento lineare** del prototipo: molto semplice, utile per test di regressione e interfaccia, **non un modello clinicamente validato** per il calcolo terapeutico.
2. **Curve bilineari di attività** (documentazione storica OpenAPS): descrivono attività con crescita sino al picco e successiva decrescita, e richiedono un'appropriata conversione dall'attività al residuo IOB. Non confondere «attività istantanea» e «quantità ancora attiva».
3. **Curve esponenziali/parametriche** (esempi documentati in Loop/LoopKit e OpenAPS): prendono in esame durata e picco, con differenze per tipi di insulina. Sono candidati tecnici di confronto, **non autorizzazione a copiare impostazioni o approvare l'uso clinico**.
4. **IOB fornita dal microinfusore**: quando disponibile in futuro attraverso integrazioni appropriate, può essere un riferimento più completo per quella modalità, ma non è automaticamente intercambiabile con l'IOB dei soli boli immessi a mano.

Fonti tecniche consultate (non sono fonti di prescrizione né certificazione):
- https://loopkit.github.io/loopdocs/operation/algorithm/prediction/
- https://loopkit.github.io/loopdocs/version/code-custom-edits/
- https://loopkit.github.io/loopdocs/faqs/algorithm-faqs/
- https://openaps.readthedocs.io/en/latest/docs/While%20You%20Wait%20For%20Gear/understanding-insulin-on-board-calculations.html

## 10. CHECKPOINT PER RIPRENDERE LA PROSSIMA VOLTA

**Dove eravamo:** completati e approvati layout / salvataggio previsto / visualizzazione IOB; abbiamo chiarito i tre livelli di verifica IOB e deciso di **non modificare ancora il codice**, ma di finire la valutazione tecnica.

**Prossima attività immediata (aggiornata):** predisporre una batteria di test **non terapeutici** per un modello IOB **esponenziale** documentato, scelto come candidato principale dall’utente; usare la curva **bilineare** come confronto e la **lineare** soltanto come regressione del vecchio prototipo. Prima dei test, fissare la formulazione matematica e le condizioni ai limiti; scegliere durata/picco solo per esempi etichettati come dimostrativi, mai come parametri clinici dell’utente. Esaminare separatamente penne e microinfusore e sottoporre successivamente la documentazione a revisione clinica.

**Poi:** chiudere checklist finale; richiedere il progetto ZIP aggiornato; confrontare il codice realmente presente con i pacchetti di prototipo; implementare Inserisci/Storico/Bolo/backup in **un unico aggiornamento**, non alterando PDF o Storico; eseguire test (unitari, regressione, Web, iPhone/Android), build Vercel e prove di import/export. Riconciliare/migrare l'eventuale archivio IOB manuale senza doppio conteggio. Verificare root Vercel `frontend`. L'utente lavora tramite GitHub, senza terminale locale.

**Cosa NON fare senza richiesta:** attivare un bolo terapeutico consigliato; assumere che IOB matematica equivalga a insulina residua clinicamente verificata; sottrarre IOB a tutte le quote insuliniche; modificare PDF, storico grafico, testi 90/91, database alimenti o altre schede non pertinenti.

**L'utente può rivedere in futuro qualsiasi scelta approvata**, preservando dati/migrazioni.


## 11. AGGIORNAMENTO 19/10/2026 — Insulina rapida attualmente indicata dall'utente

**Dato fornito dall'utente (fotografia della confezione):**
- **NovoRapid FlexPen**, principio attivo **insulina aspart**, soluzione **100 U/ml**, penna preriempita, impiegata come **insulina rapida/prandiale**.
- Questo dato identifica l'insulina rapida attuale per lo **studio del modello IOB**; la basale è stata successivamente identificata nella sezione 12. Il dato non sostituisce né aggiorna da solo i rapporti I:CHO, ISF, target, dose massima o altri parametri.
- La prescrizione precedente fotografata riportava **Actrapid**; NON va riutilizzato come identità del farmaco attualmente somministrato né per scegliere la curva di azione.

**Informazioni generali verificate su documentazione ufficiale (NON parametri IOB individuali):**
- Secondo la documentazione europea NovoRapid, dopo iniezione sottocutanea l'inizio d'azione è tipicamente **10–20 minuti**, l'effetto massimo **1–3 ore** e la durata dell'effetto **3–5 ore**. Questi intervalli variano e **NON determinano automaticamente** il valore di durata d'azione da inserire nell'algoritmo IOB, né definiscono il parametro di picco/forma della curva.
- Fonte: EMA, informazioni del prodotto NovoRapid: https://www.ema.europa.eu/en/documents/product-information/novorapid-epar-product-information_en.pdf ; pagina prodotto https://www.ema.europa.eu/en/medicines/human/EPAR/novorapid

**Decisioni tecniche per il seguito:**
1. Confrontare almeno due modelli IOB documentati applicabili all'insulina aspart somministrata con penna (per esempio uno con attività parametrica esponenziale e un secondo come riferimento), senza adottare per default orari/picco/durata terapeutici non indicati.
2. Mantenere distinta l'insulina registrata come **rapida** da quella **basale**; la basale attuale è stata successivamente identificata come Tresiba (insulina degludec), come descritto nella sezione 12.
3. Esaminare separatamente il caso **microinfusore**, che può avere erogazione basale e boli non presenti nello storico manuale DIABETY; mai considerare equivalente IOB di soli boli registrati e IOB del dispositivo.
4. Continuare con test e simulazioni non terapeutiche; **non applicare automaticamente l'IOB alla dose matematica**, non presentare un bolo consigliato e non presumere validazione clinica dal solo nome del medicinale.
5. Nessuna modifica al codice durante questa fase di progettazione; un unico aggiornamento finale già concordato.


## 12. AGGIORNAMENTO 19/10/2026 — Insulina basale identificata

**Dato confermato dall'utente con fotografia della confezione:**
- **Tresiba FlexTouch 100 U/ml**; principio attivo **insulina degludec**, penna preriempita **300 U/3 ml**, usata come **insulina basale a durata ultralunga**.
- Terapia dichiarata in modalità **Penne**: **NovoRapid FlexPen (insulina aspart) come rapida/prandiale**, **Tresiba FlexTouch (insulina degludec) come basale**. Non sono stati forniti dosaggi individuali, orari di terapia o parametri attuali I:CHO/ISF/target. Non dedurli dalla fotografia.

**Farmacologia generale, da fonti ufficiali — NON parametri IOB da precaricare:**
- La durata d'azione di Tresiba nelle condizioni descritte nell'RCP è **superiore a 42 ore** e lo **stato stazionario** viene raggiunto dopo circa **2–3 giorni** di somministrazioni. Questi dati non equivalgono né a una durata personalizzata di correzione né a una stima dell'insulina basale residua da sottrarre nel calcolo di un bolo.
- Fonte EMA: https://www.ema.europa.eu/en/documents/product-information/tresiba-epar-product-information_en.pdf
- Panoramica EMA: https://www.ema.europa.eu/en/medicines/human/EPAR/tresiba

**Conseguenze per la progettazione:**
1. Nella sezione «Insuline utilizzate» della modalità Penne, prevedere campi nome e durata distinti per NovoRapid (rapida) e Tresiba (basale), senza imporre precompilazioni terapeutiche. Le scelte del farmaco restano modificabili, perché DIABETY deve funzionare per più persone.
2. Nello Storico il tipo viene registrato come `rapida` / `basale`; nessuna modifica di impaginazione, note, CHO, UI o PDF. La modalità «Non specificata» resta solo nella modifica delle vecchie registrazioni.
3. Nella sezione «Somministrazioni» del Bolo, i tab Rapida/Basale mostrano separatamente i dati dello Storico. Le dosi di Tresiba **non sono IOB dei boli rapidi** e non vanno sommate o sottratte automaticamente alla quota di correzione o pasto.
4. Per il confronto dei modelli IOB, il candidato prioritario di studio riguarda **NovoRapid/aspart con penna**; Tresiba è gestita separatamente come trattamento basale con azione sovrapposta tra giornate. Il fatto che una basale agisca a lungo non determina da sé una correzione della dose prandiale.
5. La modalità Microinfusore resta un ramo di configurazione indipendente, senza dati di erogazione inventati.
6. **Prossimo checkpoint:** specificare e confrontare modelli IOB documentati di NovoRapid, caratteristiche di picco/durata e requisiti dei dati; test tecnici e revisione clinica prima di qualsiasi uso terapeutico. Nessuna modifica del codice prima della conclusione della progettazione, come concordato.


## 13. DECISIONE APPROVATA — Modello IOB esponenziale come candidato principale

**Decisione esplicita dell’utente:** «modello esponenziale sì». L’utente approva **la scelta del modello da studiare e testare**, non l’adozione terapeutica né alcun valore numerico di durata d’azione o picco.

- **Candidato principale:** una formulazione esponenziale **documentata** della curva di azione insulinica, con calcolo coerente dell’**insulina residua** (IOB), da esaminare per la rapida NovoRapid/aspart somministrata tramite penna.
- **Confronto tecnico:** curva bilineare documentata; decadimento lineare del prototipo limitato a test/regressione dimostrativa.
- **Prima di implementare:** individuare versione e fonte della formula; precisare unità, durata totale, picco, condizioni ai limiti, differenza fra attività insulinica e IOB residua, gestione delle dosi multiple e del tempo trascorso.
- **Test da preparare:** dose singola, due o più somministrazioni sovrapposte, dose zero, orario identico, prima/dopo il periodo d’azione, dati non classificati, cambio ora/fuso orario, registrazioni editate o eliminate, dati mancanti, coerenza dei backup. Usare **solo dati inventati e chiaramente didattici** per la verifica matematica; non produrre indicazioni individuali di dosaggio.
- **Distinzioni essenziali:** Tresiba/degludec resta basale separata; in modalità microinfusore DIABETY non conosce necessariamente la basale continua e le erogazioni automatiche; il registro manuale non equivale all’IOB del dispositivo.
- **Guardrail confermati:** l’IOB è informativa; non sottrarla automaticamente dal bolo matematico e non attivare «Bolo consigliato» fino a verifica clinica, tecnica e dei requisiti applicabili. Parametri inseriti assunti prescritti dal medico, ma ciò non valida l’algoritmo software.
- **Stato progetto:** scelta progettuale approvata, **nessuna modifica al codice ora**; tutte le implementazioni saranno raggruppate nell’unico aggiornamento finale, preservando grafica dello Storico, insulina/CHO/note, esportazione PDF e backup.

**Da dove ripartire:** specificare la formulazione esponenziale documentata da sottoporre a test e confrontarla con la bilineare attraverso una tabella di risultati attesi **non terapeutici**. Registrare versioni, fonti e limiti, poi discutere con il diabetologo la sua eventuale idoneità per l’uso previsto.


## 14. VERIFICA MATEMATICA DI STUDIO — MODELLO ESPONENZIALE (19/10/2026)

**Stato:** verifica tecnica indipendente dell'implementazione dimostrativa della formula, **non** validazione clinica; nessuna modifica ai file applicativi DIABETY. Parametri e dosi usati sotto **non sono prescrizioni**.

### Formulazione e provenienza

Formula esponenziale riprodotta, per verifica matematica, da OpenAPS `oref0/lib/iob/calculate.js`, funzione `iobCalcExponential` (codice fonte):
https://github.com/openaps/oref0/blob/master/lib/iob/calculate.js
La documentazione generale è https://openaps.readthedocs.io/en/latest/docs/While%20You%20Wait%20For%20Gear/understanding-insulin-on-board-calculations.html .

Per i soli test usiamo **D=300 minuti** e **P=75 minuti**, un esempio pubblicato per il profilo `rapid-acting` di OpenAPS che include NovoRapid. Non sono valori personalizzati del paziente, non sono parametri clinicamente confermati per DIABETY.

Con **t** minuti trascorsi, **D** durata del modello, **P** minuto del picco:

- `tau = P * (1 - P/D) / (1 - 2*P/D)`
- `a = 2*tau/D`
- `S = 1 / (1 - a + (1 + a)*exp(-D/tau))`
- `R(t) = 1 - S*(1-a)*(((t*t)/(tau*D*(1-a)) - t/tau - 1)*exp(-t/tau) + 1)` per `0 < t < D`.
- Condizioni ai limiti esplicitamente imposte dai test DIABETY: `R(0)=1`, `R(t >= D)=0`; `t < 0` è una registrazione futura e provoca errore (non un IOB=0).
- Configurazioni con `D<=0`, `P<=0`, `P>=D/2` o valori non finiti vengono rifiutate: non si producono né dose né IOB falsamente pari a zero. Questo è un controllo prudenziale della formulazione adottata, non un insieme di soglie terapeutiche per i pazienti.

**Confronto bilineare:** implementazione ideale della curva triangolare documentata per il bilineare storico OpenAPS; durata D=300 min, picco derivato dal rapporto storico 75/180, cioè **125 minuti** (e non 75 minuti). Quindi il confronto NON isola la sola forma della curva; evidenzia la differenza fra due modelli configurati secondo le loro convenzioni storiche.

La grandezza R(t) è una **frazione teorica di effetto rimanente**, non una misura diretta delle molecole di insulina presenti nel corpo. L'IOB teorica da più dosi rapide è `somma(dose_i * R(minuti_trascorsi_i))`, subordinata alla completezza e qualità del registro.

### Tabella dei risultati — percentuali dimostrative, non dosi consigliate

| Tempo trascorso | Esponenziale | Bilineare storico |
|---:|---:|---:|
| 0 | 100.0% | 100.0% |
| 30 | 92.5% | 97.6% |
| 60 | 76.4% | 90.4% |
| 90 | 58.1% | 78.4% |
| 120 | 41.1% | 61.6% |
| 180 | 15.9% | 27.4% |
| 240 | 3.3% | 6.9% |
| 300 | 0.0% | 0.0% |

La discrepanza a 60 e 120 minuti è rilevante. Perciò modello, durata, picco e gestione dei dati **devono essere documentati insieme**. Non scegliere i parametri dal solo foglietto NovoRapid.

### Esiti automatici della verifica di studio

- **32 controlli superati**, tra cui: estremi t=0 e t>=D; valori limitati [0,1]; andamento non crescente; additività delle dosi; dose zero; orari coincidenti; dose vecchia; esclusione della basale dalla somma rapida; modifica e cancellazione; errore se tipo non specificato; data futura; dose negativa; durata/picco invalidi; valori NaN/infinito; integrale dell'attività come variazione cumulativa pari a 1.
- Due dosi **puramente fittizie** (2 unità somministrate 120 minuti prima e 1 unità 30 minuti prima) sono usate per verificare l'additività; i valori di uscita sono solo un controllo interno e **non vanno interpretati come insulina reale attiva in una persona**.
- Test Python separati dal progetto Expo/TypeScript: **non sono stati eseguiti né test di integrazione app, né confronto automatico con l'esecuzione originale JS riga per riga, né verifica clinica**.

### Limiti e prossimo passo

1. Consolidare una specifica di test TypeScript indipendente, con valori di riferimento e casi di input, mantenendo il calcolo isolato dal risultato terapeutico.
2. Verificare comportamento vicino ai limiti matematici, precisione/arrotondamenti, data-ora in UTC e cambio ora legale; impedire che registrazioni parziali producano falsi `0 UI`.
3. Stabilire la politica per somministrazioni mancanti, classificazioni storiche non specificate e dati del microinfusore incompleti.
4. Coinvolgere il diabetologo nella revisione di idoneità del modello all'uso previsto; non confondere revisione medica dei parametri con convalida clinica del software.
5. **Non sottrarre l'IOB automaticamente dal bolo e non attivare «Bolo consigliato».** Le somministrazioni Tresiba restano consultabili separatamente e non vengono trattate come IOB dei boli rapidi.
6. **Nessuna modifica al codice app prima della fine della progettazione.** PDF e Storico originale invariati.


---

# APPENDICE 15 — Regole proposte per data e ora delle somministrazioni (19/10/2026)

**Stato:** specifica progettuale proposta per confronto con l’utente; non ancora implementata o validata. Restano ferme tutte le decisioni precedenti, inclusi PDF e Storico senza modifiche visive.

## Decisioni già confermate

- La somministrazione viene registrata in occasione della misurazione: **una sola data e ora** per glicemia e insulina, senza un secondo campo per l’iniezione.
- **Insulina vuota o 00 = nessuna dose effettuata**: la misurazione resta valida, non crea dose IOB, non richiede Rapida/Basale e non scatena un avviso di dose mancante. L’IOB derivata dalle dosi rapide precedenti non viene azzerata.
- Per le **nuove dosi > 0**, la scelta Rapida/Basale è richiesta in modalità Penne; per il Microinfusore le UI registrate sono boli realmente effettuati.
- L’utente classificherà retrospettivamente nello Storico le **vecchie dosi > 0** non specificate; non convertire mai automaticamente le vecchie dosi in Rapida.

## Proposta per la logica temporale

1. **Fonte unica:** ogni evento IOB si ricava dal record di Storico (dose >0, tipo Rapida/Bolo in base alla modalità, identità del record, data e ora dell’evento). Non mantenere un registro manuale parallelo, per evitare duplicazioni.
2. **Orario effettivo:** ordinare le dosi per data+ora effettive della misurazione/somministrazione, non per data di creazione, salvataggio o modifica del record. Se due dosi diverse hanno la medesima data/ora, entrambe sono valide e si sommano; non deduplicare in base al timestamp.
3. **Correzioni:** quando l’utente modifica UI, Rapida/Basale oppure data/ora nel modal «Modifica misurazione», ricalcolare l’IOB a partire dal record corretto; la dose originale va sostituita, non duplicata. La cancellazione rimuove l’evento dai calcoli successivi.
4. **Tempo trascorso:** usare istanti effettivi e differenza in minuti (`ora_corrente - istante_somministrazione`), mai soltanto l’ora del giorno. Una dose delle 23:50 e il calcolo delle 00:20 del giorno successivo distano 30 minuti. Le medie e i periodi giornalieri dello Storico restano indipendenti.
5. **Orari futuri o impossibili:** non considerarli dosi già avvenute e **non convertirli in IOB 0**. In presenza di una dose rapida potenzialmente rilevante con timestamp futuro/non valido, mostrare `— UI` e un avviso conciso nel solo riquadro IOB; lo Storico conserva le sue attuali funzioni di correzione. Non introdurre nuove restrizioni globali di Inserisci senza analizzare il codice reale.
6. **Dati storici ambigui:** se mancano data/ora, il tipo è «Non specificata» oppure la conversione dell’orario è ambigua e la dose potrebbe influire sul periodo analizzato, non mostrare una IOB numerica affidabile. Invitare a correggere il record nello Storico; non supporre Rapida/Basale.
7. **Fusi orari e ora legale:** per nuove registrazioni, usare un istante coerente per il calcolo (UTC/epoch) mantenendo data e ora locali per l’interfaccia e, quando disponibile, offset/fuso originario. Non alterare date e orari visualizzati. Per registrazioni vecchie senza offset, definire una migrazione prudente dopo ispezione del formato già presente; non riassegnare silenziosamente timestamp ambigui durante i cambi di ora. Nei passaggi all’ora legale/solare, la differenza in minuti deve essere quella reale.
8. **Nessuna nuova dose:** una misurazione con 0 UI non azzera né invalida l’IOB precedente. La mancanza di dosi rapide registrate nel periodo, da sola, **non dimostra** che non siano state effettuate: evitare di interpretarla come completezza certificata o come dose sicura.
9. **Aggiornamenti temporali:** la stima si riferisce sempre all’ora corrente e alla configurazione valida; ricalcolarla all’apertura della scheda e quando Storico/parametri cambiano. Stabilire la frequenza degli aggiornamenti durante una schermata aperta prima di implementare; non considerare la stima statica.
10. **Modalità terapia:** Basale Tresiba non entra nell’IOB dei boli rapidi. In modalità Microinfusore le erogazioni non registrate non sono deducibili; non chiamare completa una IOB derivata soltanto dai boli scritti manualmente.

## Esempi di test puramente didattici

| Scenario | Comportamento atteso |
|---|---|
| 13:00: dose rapida; 15:30: misurazione con 0 UI | La dose delle 13:00 rimane nel calcolo IOB; quella delle 15:30 non aggiunge insulina. |
| 23:50: dose rapida; 00:20 del giorno dopo: consultazione | Tempo trascorso di 30 minuti, non un valore negativo e non 23 ore e 30 minuti. |
| Una dose delle 13:00 viene corretta alle 12:30 | Ricalcolo secondo le 12:30 senza duplicare l’evento. |
| Una dose rapida diventa Basale in Modifica | È esclusa dalla IOB rapida; resta consultabile in Storico e nel filtro Basale. |
| Due dosi reali coincidono alle 13:00 | Sono due eventi distinti identificati dal record ID; nessuna deduplica per l’ora uguale. |
| Vecchia dose > 0 «Non specificata» nel periodo utile | IOB indisponibile finché il tipo non viene chiarito; non assumere che sia rapida. |
| Dose rapida con data futura o ambigua | `— UI` e richiesta di verifica nella sezione IOB, non `0 UI`. |
| Passaggio ora legale/solare | Durata calcolata sugli istanti effettivi; test espliciti con timestamp e offset. |

## Da verificare prima dell’implementazione

- Ispezionare lo ZIP **più recente**: formato reale dei timestamp, ID dei record, comportamento di modifica/cancellazione, modalità di backup/import e compatibilità Web/Android/iPhone.
- Definire politica precisa per le vecchie date senza offset e per il timer di ricalcolo mentre la card Bolo resta aperta.
- Test automatizzati su dati dimostrativi in TypeScript con fuso/ora legale, confini di mezzanotte, classi Rapida/Basale e correlazione col record Storico; successivi test di integrazione e build reali.
- **IOB soltanto informativa, nessuna sottrazione automatica, nessun «Bolo consigliato» terapeutico.** Nessun cambio al codice prima di aver completato la progettazione.

