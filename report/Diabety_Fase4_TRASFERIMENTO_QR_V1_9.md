# DIABETY — Report di sviluppo: Trasferimento backup QR

**Versione:** 1.9  
**Data:** 20 ottobre 2026  
**Stato attuale:** **funzione operativa e mantenuta invariata su decisione dell’utente**; Vercel READY (conferma dell’utente), trasferimenti e importazioni **tablet → PC Windows/Chrome** e **iPhone → iPad** riusciti, con riscontro visivo di misurazioni, note e impostazioni nei dispositivi destinatari. **Nessun nuovo intervento sul codice richiesto.**  
**Lavori residui:** annotati come **rinviati / da valutare in futuro**; non costituiscono test obbligatori o interventi già autorizzati.

**NOTA DI LETTURA:** questo documento conserva integralmente, per tracciabilità, le sezioni storiche della precedente sperimentazione di sincronizzazione automatica e delle versioni QR. Alcuni obiettivi, stati «da fare» e proposte nelle sezioni precedenti sono **storici e superati**. Per le decisioni vigenti fare riferimento alla **Versione 1.9**, in fondo al documento.

## 1. Obiettivo e vincoli approvati

- Il **MAIN è il dispositivo che genera e mostra il QR**; gli altri dispositivi lo scansionano per associarsi.
- Il MAIN è selezionabile liberamente: non coincide necessariamente con il PC.
- Dispositivi utilizzati: iPhone, iPad e PC Windows con Chrome. Nei test finora effettuati: **tablet MAIN (DIABETY aperta dalla schermata Home, come Web App) e PC Windows/Chrome associato**.
- L'associazione QR deve rimanere memorizzata dopo la riapertura.
- L'obiettivo è sincronizzare i dati **quando DIABETY viene aperta** e i dispositivi associati sono disponibili sulla stessa rete locale. Non è richiesta comunicazione in background né sincronizzazione fuori casa.
- Nessun abbonamento, cloud aggiuntivo o programma ausiliario da installare su Windows; codice ed esperienza d'uso interamente integrati in DIABETY.
- I dati devono essere disponibili offline. La futura sincronizzazione non deve cancellare o sovrascrivere indiscriminatamente archivi locali: occorrono riconciliazione, gestione dei conflitti, protezione dalle duplicazioni, autenticazione e backup prima delle operazioni critiche.
- La sperimentazione resta **separata dal diario e dai dati sanitari**.

## 2. Tabella dei test

| Codice | Verifica | Esito | Evidenza |
|---|---|---|---|
| QR-001 | Associazione tablet MAIN → PC Windows | **SUPERATO** | Conferma dell'utente |
| QR-002 | Associazione persistente dopo chiusura e riapertura | **SUPERATO** | Conferma dell'utente |
| WIFI-001 | Scambio QR WebRTC e messaggi ping/pong | **SUPERATO** | MAIN: «TEST SUPERATO. Risposta ricevuta dal dispositivo associato (19 ms)» |
| WIFI-002A.1 | Controlli automatici durante sessione attiva | **SUPERATO** | L'utente vede arrivare le risposte di prova |
| WIFI-002A.2 | Navigazione verso un'altra scheda interna di DIABETY | **SUPERATO** | Le risposte continuano ad arrivare |
| WIFI-002A.3 | Mettere DIABETY in secondo piano, aprire un'altra app, poi tornare | **NON SUPERATO** | Stato «WebRTC: failed» sul tablet MAIN e sul PC |
| WIFI-002B | Riconnessione automatica senza nuovo QR dopo `failed` o riapertura | **NON IMPLEMENTATA / FATTIBILITÀ APERTA** | L'attuale sistema non dispone di un canale di segnalazione persistente |
| WIFI-003 | Diagnosi passaggio in background e chiusura MAIN | **ESEGUITO / RECUPERO TEMPORANEO OSSERVATO, RIAPERTURA NON SUPERATA** | PC: `failed` 17:00:44 → `connected` 17:00:55, poi `failed` 17:01:38; MAIN: nuova apertura 17:01:45 senza sessione WebRTC |
| WIFI-004 | Nuovo PONG dopo il ritorno, distinto dallo stato connected | **ESEGUITO: 2 RIENTRI SUPERATI / 1 FALLITO** | MAIN: PONG nuovi alle 17:33:35 e 17:34:21; terzo rientro senza PONG, PC `failed` prima del rientro |
| SYNC-001 | Trasferimento e sincronizzazione sicura di registrazioni | **NON IMPLEMENTATA** | Nessun dato sanitario scambiato |

## 3. Interpretazione tecnica del test WIFI-002A

Il canale WebRTC resta operativo mentre DIABETY è attiva, anche durante la navigazione fra le sue schede. Quando l'app/browser viene portata in secondo piano e l'utente passa ad un'altra app, il collegamento entra nello stato `failed` su entrambi i dispositivi. Il risultato è **coerente** con le limitazioni di esecuzione e rete in background di iOS/iPadOS, ma il solo stato `failed` non permette di dimostrare con certezza se il fattore primario sia stata la sospensione della pagina, un cambio nella rete o un'altra condizione ICE.

Il sistema attuale:

- usa `RTCPeerConnection` e un DataChannel WebRTC con `iceServers: []`, senza STUN/TURN;
- scambia inizialmente offer/answer e dati ICE per mezzo di QR;
- trasmette ping automatici ogni 15 secondi quando la pagina è visibile e il canale è aperto;
- rileva gli stati `connected`, `disconnected`, `failed` e l'eventuale ripresa spontanea;
- **non** dispone di un canale automatico per inviare nuove offerte/risposte dopo il fallimento o la chiusura del browser.

Quindi aumentare la frequenza dei ping non è una soluzione affidabile. `restartIce()` può avviare una nuova negoziazione, ma questa richiede lo scambio di nuove informazioni fra i peer tramite un canale di segnalazione. Non sono stati trasferiti dati sanitari.

## 4. Impatto sui requisiti

Il requisito dell'utente è **sincronizzare alla riapertura**, non mantenere i browser in background. Il fallimento registrato non smentisce la possibilità di sincronizzare dati quando esiste una connessione; evidenzia però che **la connessione non può essere presunta ancora attiva quando DIABETY torna in primo piano**.

Nell'architettura Web attuale (Safari/Chrome, senza server o altro mezzo di segnalazione), i dispositivi non dispongono di un meccanismo affidabile di ritrovamento e di scambio delle nuove credenziali WebRTC necessario per un collegamento completamente automatico alla riapertura. Il QR usato per l'associazione salva l'identità logica, non un canale di rete permanente.

**Non considerare risolta la riconnessione automatica** e non collegare ancora dati sanitari a questo laboratorio.


## 5. Aggiornamento tecnico — modalità di utilizzo sul tablet

**Informazione confermata il 20/10/2026:** l’utente ha aggiunto DIABETY alla schermata Home del tablet e la avvia da lì, in modalità Web App; il test con `WebRTC: failed` è avvenuto in questa modalità, non in una normale scheda Safari.

La modalità Web App fornisce un’esperienza simile a un’app autonoma, **ma non garantisce l’esecuzione continuativa delle attività WebRTC in secondo piano**. L’interruzione osservata è compatibile con la gestione delle pagine non visibili da parte di WebKit/iPadOS. Non è dimostrato quale singolo evento abbia provocato il fallimento ICE.

**Distinzione architetturale:**
- Reagire a `visibilitychange` o `pageshow` alla riapertura è possibile nel codice Web.
- Recuperare spontaneamente una sessione ancora valida è possibile solo se il canale e lo stato ICE lo consentono; va verificato.
- Se WebRTC arriva a `failed` in modo irreversibile, una nuova negoziazione (ad esempio `restartIce`) richiede che i dispositivi si scambino offer/answer e dati ICE aggiornati tramite un canale di segnalazione. Le informazioni salvate durante l'associazione QR **non** sostituiscono tale canale.
- Con i vincoli correnti — nessun servizio cloud aggiuntivo, nessun programma ausiliario, sole Web App in Chrome/iPadOS — **la riscoperta e riconnessione automatica locale dopo chiusura/sospensione non è ancora dimostrata**. Non dichiararla funzionante.

**Fonti tecniche consultate:** WebKit, *How Web Content Can Affect Power Usage* (`https://webkit.org/blog/8970/how-web-content-can-affect-power-usage/`); MDN, *Page Visibility API* (`https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API`); MDN, *RTCPeerConnection.restartIce()* (`https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/restartIce`).

## 6. Prossimo collaudo — WIFI-003 (diagnostico)

Prima di modificare la sincronizzazione sanitaria, effettuare un test ripetibile di ciclo di vita della Web App: connessione WebRTC aperta, passaggio a un'altra app, ritorno; registrare tempo in secondo piano, `document.visibilityState`, `iceConnectionState`, `connectionState`, `dataChannel.readyState` e presenza/assenza di ping ricevuti. Ripetere su tempi brevi e più lunghi, mantenendo il PC aperto e sulla stessa Wi-Fi.

**Opzionale, a scopo diagnostico:** ripetere il medesimo test con DIABETY aperta direttamente in Safari per capire se l'esito cambia rispetto alla Web App della schermata Home. Non interpretare un eventuale successo occasionale come garanzia di funzionamento in background.

**Criterio di successo futuro:** al rientro nella Web App i due dispositivi si trovano e si scambiano un messaggio senza scansione di QR. **Non superato / non implementato allo stato attuale.**

**Impatto sul codice in v0.7:** nessuna modifica software, solo documentazione. Le schede cliniche, i backup e i dati rimangono invariati.

## 7. Piano di lavoro precedente — WIFI-003

1. Conservare gli esiti attuali come base di riferimento; non cambiare altre schede.
2. Aggiungere, eventualmente, soltanto diagnostica sperimentale in scheda: tempo trascorso in background; `visibilityState`; `connectionState`; `iceConnectionState`; stato del DataChannel; segnalazione di ritorno in foreground.
3. Verificare se un'interruzione breve rientra spontaneamente da `disconnected` a `connected`, distinguendola dai casi `failed` (quest'ultimo richiede normalmente una rinegoziazione).
4. Valutare **prima di scrivere codice di sincronizzazione** se è possibile un canale di segnalazione locale automatico compatibile con le piattaforme e tutti i vincoli dichiarati. Se non è possibile, documentare con chiarezza le alternative e non presentare un recupero via QR come automatico.
5. Solo dopo la soluzione della connessione progettare la riconciliazione bidirezionale dei dati e le procedure di sicurezza.

## 8. Registro versioni

| Versione | Data | Contenuto |
|---|---|---|
| 0.1 | 20/10/2026 | Requisiti; associazione e persistenza QR testate |
| 0.2 | 20/10/2026 | Laboratorio WebRTC via QR |
| 0.3 | 20/10/2026 | QR meno densi e diagnostica webcam |
| 0.4 | 20/10/2026 | WIFI-001 superato: ping/pong 19 ms |
| 0.5 | 20/10/2026 | Monitoraggio periodico WebRTC e stato della sessione |
| 0.6 | 20/10/2026 | WIFI-002A: sessione attiva e cambio scheda interna OK; dopo passaggio a un'altra app WebRTC `failed` su entrambi |
| 0.7 | 20/10/2026 | Confermato utilizzo tablet MAIN come Web App dalla schermata Home; definito WIFI-003 |
| 0.8 | 20/10/2026 | Diagnostica del ciclo di vita Web App aggiunta alla scheda sperimentale |
| 0.9 | 20/10/2026 | WIFI-003 eseguito: recupero temporaneo stato PC, fallimento dopo chiusura MAIN |
| **1.0** | **20/10/2026** | **WIFI-004: implementati ultimo PONG, verifica immediata post-rientro, timeout e criterio di recupero validato da messaggi; collaudo ancora da svolgere** |

## 9. Stato e modifiche al codice

**Nota storica v0.7:** il precedente aggiornamento riguardava soltanto il report. **In v0.8** è stato modificato esclusivamente `frontend/src/components/diabety-wifi-lab.tsx`, aggiungendo la diagnostica e la copia del registro: non sono state cambiate le dipendenze, le altre schede, la gestione clinica o i backup. La riconnessione automatica rimane irrisolta.


## 10. Novità versione 0.8 — STEP 3B: diagnostica Web App

È stata aggiornata **solo** la componente sperimentale `frontend/src/components/diabety-wifi-lab.tsx`, aggiungendo la sezione **STEP 3B · Diagnostica del ritorno in app**.

### Eventi registrati

- `visibilitychange` con passaggio a `hidden` / `visible` e durata stimata dell'intervallo in secondo piano;
- eventi `window` di `blur`, `focus`, `pagehide`, `pageshow` e montaggio/smontaggio del laboratorio;
- cambiamenti WebRTC `connectionState`, ICE `iceConnectionState` e apertura/chiusura/errori del DataChannel;
- eventuale prima risposta PONG dopo il ritorno, **solo se la connessione è ancora valida**;
- istantanea manuale dello stato di collegamento.

Il registro contiene **solo dati tecnici**, senza valori glicemici, nomi, identificativi dei dispositivi, IP, SDP, QR o dati sanitari. Sono conservati al massimo 45 eventi nella `sessionStorage` del browser, quando disponibile. L'utente può copiarli, visualizzarli come testo o cancellarli. Su iPadOS, una chiusura forzata o una nuova sessione può far perdere anche il registro: **non è una persistenza garantita**.

### TEST WIFI-003 — Procedura proposta

1. Aggiornare il solo file TSX nel repository e attendere il build Vercel. Aprire DIABETY dalla schermata Home su iPad MAIN e su Chrome Windows.
2. Su entrambi: sezione STEP 3B, cancellare il registro tecnico (per distinguere il nuovo tentativo).
3. Completare normalmente il collegamento tramite offerta QR sul MAIN e risposta QR sul PC. Confermare una risposta PONG.
4. Lasciare il PC acceso e DIABETY aperta. Su iPad aprire un'altra app per circa 10 secondi, poi rientrare in DIABETY senza ricaricare manualmente la pagina.
5. Su entrambi verificare `visibilitychange`, `connectionState`, `iceConnectionState`, `DataChannel.readyState` e l'eventuale PONG successivo.
6. Se appropriato, ripetere con 60 secondi in secondo piano. Copiare la diagnostica di **entrambe** le parti e confrontare l'ordine degli eventi.

**Esito della prova:** da compilare dopo il riscontro dell'utente. I precedenti `WebRTC: failed` restano documentati, ma non devono essere anticipati come esito certo della nuova verifica.

### Interpretazione e limiti

- `failed` segnala un fallimento del trasporto WebRTC, non una cancellazione dell'associazione QR.
- L'assenza di `visibilitychange` o `pagehide` in alcuni casi non prova che la pagina sia rimasta attiva: il sistema operativo può interromperla senza fornire tutti gli eventi.
- Un `connected` momentaneo dopo il ritorno non equivale a recupero stabile; serve un ping/pong successivo.
- **Nessuna ricreazione automatica** della sessione viene introdotta in v0.8: nuovi offer/answer e ICE richiedono un percorso di segnalazione che resta da progettare o riconsiderare alla luce dei limiti della versione Web.

### Modifiche e controlli

- Un solo file TSX aggiornato. Nessuna nuova dipendenza, servizio PC, chiamata cloud o lettura/scrittura del diario.
- Verifica locale della sintassi/traspilazione TypeScript JSX: superata.
- Build Vercel e collaudo su dispositivi reali: **non ancora eseguiti in questa versione**.


---

## 11. Novità versione 0.9 — Risultati del TEST WIFI-003 (20/10/2026)

**Origine dei dati:** trascrizione dei registri diagnostici DIABETY forniti dall'utente, tablet MAIN (Web App iPad aggiunta alla schermata Home) e PC Windows/Chrome associato. I due dispositivi erano stati collegati tramite i QR di offerta e risposta. La lettura e la registrazione dei messaggi automatici era stata confermata nel test precedente.

### 11.1 Cronologia significativa — PC associato

| Ora locale | Evento | Evidenza |
|---|---|---|
| 16:58:39 | Laboratorio aperto | RTC / ICE / DataChannel assenti |
| 16:59:26 | ICE `checking`, WebRTC `connecting` | Negoziazione in corso |
| 16:59:52 | WebRTC `connected`, DataChannel `open` | Collegamento iniziale stabilito |
| 17:00:34 | ICE e WebRTC `disconnected` | Prima interruzione rilevata |
| 17:00:44 | WebRTC `failed` | Prima condizione di fallimento |
| **17:00:55** | **ICE `connected`, WebRTC `connected`** | **Recupero temporaneo dello stato del trasporto senza nuova scansione QR segnalata** |
| 17:01:28 | ICE e WebRTC `disconnected` | Seconda interruzione |
| 17:01:38 | WebRTC `failed` | Nuovo fallimento |
| 17:02:45 | Stato richiesto manualmente | RTC `failed`; ICE `disconnected`; DataChannel `open` |

**Nota:** il passaggio `failed` → `connected` riguarda lo stato riportato dal browser. Non è ancora comprovato un nuovo scambio *applicativo* di messaggi ping/pong dopo le 17:00:55: per confermarlo occorrono orario e numero della risposta PONG successiva. Il DataChannel mostrato come `open` mentre RTC è `failed` NON prova che i messaggi possano essere consegnati; è necessario verificare un ritorno PONG effettivo.

### 11.2 Cronologia significativa — Tablet MAIN

| Ora locale | Evento | Evidenza |
|---|---|---|
| 17:01:45 | `Laboratorio montato / nuova apertura` | Pagina/laboratorio appena avviato; `vis: visible`, RTC / ICE / DataChannel `assente` |
| 17:02:18 | Stato richiesto manualmente | RTC / ICE / DataChannel ancora `assente` |

Il MAIN ha iniziato una nuova istanza del laboratorio senza conservare la connessione WebRTC precedente. Questo è coerente con la chiusura completa e la successiva riapertura riferite dall'utente. Nel registro MAIN fornito non sono presenti gli eventi precedenti alla nuova apertura: pertanto **non è possibile datare con certezza** il passaggio in background dal lato iPad o accoppiare con precisione ciascuna interruzione del PC a un evento di visibilità specifico del MAIN.

### 11.3 Esito corretto

- **PASSATO:** scambio QR e WebRTC reale (già WIFI-001), sessione monitorata (WIFI-002A), mantenimento in navigazione interna.
- **OSSERVATO MA NON ANCORA CONFERMATO A LIVELLO MESSAGGI:** PC passato spontaneamente da `failed` a `connected` alle 17:00:55 senza nuovo scambio QR riferito. Potrebbe essere un recupero transitorio della stessa sessione, **non** una nuova connessione dopo chiusura completa.
- **NON SUPERATO:** riapertura del MAIN dopo chiusura completa senza QR e ritorno a un canale utilizzabile. Alle 17:01:45 il MAIN risultava senza `RTCPeerConnection`.
- **NON ANCORA TESTATO:** sincronizzazione di dati, permanenza della connessione tra due riaperture complete, individuazione automatica dei dispositivi e segnalazione senza QR.

### 11.4 Ipotesi e limiti

La sospensione della Web App iPadOS è una spiegazione plausibile delle interruzioni, ma questi log non dimostrano una causa unica. Il PC è rimasto in `vis: visible` nei registri consegnati. Lo stato WebRTC `disconnected` può rientrare spontaneamente. La chiusura completa di una Web App può distruggere il suo oggetto `RTCPeerConnection`; l'associazione QR persistente non contiene il canale di segnalazione necessario per aprirne automaticamente uno nuovo.

**Riferimenti tecnici:** MDN, [WebRTC connectivity](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Connectivity); [RTCPeerConnection.connectionState](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/connectionState); [WebRTC signaling](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling).

### 11.5 Prossima verifica consigliata — WIFI-004 (senza modificare ancora lo storico)

1. Avviare una nuova sessione QR MAIN ↔ PC sulla stessa Wi-Fi; verificare risposta PONG e annotare il numero/ora dei ping di controllo.
2. Senza forzare la chiusura, mettere DIABETY in secondo piano sul tablet per circa 10 secondi e tornare; lasciare il PC aperto. Verificare **non solo `connected`**, ma l'aumento del contatore delle risposte PONG sul MAIN e sul PC, e l'eventuale timestamp della prima risposta dopo il ritorno.
3. Eseguire separatamente la prova di *chiusura completa* e riapertura del MAIN. Annotare se compare `Laboratorio montato / nuova apertura` e se RTC è `assente`; **non interpretarlo come connessione mantenuta**.
4. Non cambiare i parametri clinici né trasferire dati sanitari; nessuna modifica alla logica del diario, agli archivi o ai backup.

### 11.6 Decisione architetturale ancora aperta

Una connessione già attiva può temporaneamente riprendersi, ma non fornisce un meccanismo automatico affidabile per ritrovare un altro browser dopo chiusura completa. Se il vincolo «nessun cloud, nessun server locale o programma aggiuntivo, nessun nuovo QR» resta assoluto, **non è attualmente dimostrata una soluzione affidabile e interamente Web** per il ripristino automatico di sessioni perse tra iPad Web App e Chrome. La futura sincronizzazione bidirezionale dei dati non deve essere annunciata come operativa prima di risolvere tale prerequisito.

**Modifiche in versione 0.9:** solo aggiornamento del report; nessun file sorgente, dipendenza o dato sanitario modificato.


## 12. Aggiornamento versione 1.0 — WIFI-004 (codice preparato; prova reale ancora da svolgere)

**Scopo:** distinguere un ripristino del *solo stato* `RTCPeerConnection.connectionState === 'connected'` da una ripresa effettiva della comunicazione applicativa.

### Modifiche software

È stato aggiornato **soltanto** `frontend/src/components/diabety-wifi-lab.tsx`. All'interno della scheda sperimentale Sincronizzazione è stato aggiunto **«STEP 4 · PONG dopo il ritorno (WIFI-004)»**. La connessione WebRTC continua a utilizzare gli stessi QR di segnalazione iniziale; nessuna dipendenza aggiunta.

Il nuovo pannello mostra:

- ora dell'ultimo PONG realmente ricevuto dal MAIN, validato tramite sessione, dispositivo e nonce;
- ora dell'ultimo PING ricevuto e confermato dal dispositivo associato;
- stato della verifica al ritorno in primo piano (`attesa`, `PONG VERIFICATO`, `NON verificata`, `nuova sessione da inizializzare`);
- ora e tempo di risposta del nuovo PONG valido successivo al rientro;
- stato dell'ultimo recupero WebRTC: dopo una disconnessione, il successivo `connected` resta **da verificare** finché non viene ricevuto un PONG;
- comando manuale «WIFI-004 · Verifica PONG adesso»;
- stato della sessione corrente (presenza/assenza dell'istanza WebRTC).

La verifica post-rientro parte quando la pagina ritorna visibile dopo un evento `hidden`; sul MAIN tenta un nuovo ping **creato dopo il rientro**, senza scambiare nuovamente QR quando il vecchio canale è recuperabile. Se manca un PONG valido entro 12 secondi, **il test è non verificato**. Il timeout non prova da solo che una futura riconnessione sia impossibile. La stessa finestra di 12 secondi viene usata per confermare un recupero dopo disconnessione. Un PONG tardivo viene registrato, ma non costituisce un successo entro timeout.

Se dopo una chiusura completa la nuova istanza non dispone più di un peer WebRTC, l'interfaccia segnala la necessità di inizializzare una nuova sessione. **Non viene ricreata automaticamente**: il canale di segnalazione locale senza QR rimane il problema architetturale aperto.

### Test previsti

**WIFI-004A — Rientro in primo piano:** ristabilire prima la connessione con i QR; osservare un PONG iniziale, mandare il MAIN in secondo piano per circa 10 secondi, rientrare e verificare che appaia un PONG *nuovo* (non il solo stato `connected`); salvare i registri di entrambi i dispositivi.

**WIFI-004B — Chiusura completa:** chiudere DIABETY sul MAIN, riaprirla e controllare che non venga erroneamente indicata una connessione ripristinata. Il comando di prova deve esplicitare l'assenza di una sessione viva.

**Stato entrambi i test:** NON ANCORA ESEGUITI sul tablet e sul PC. I test QR-001, QR-002, WIFI-001, WIFI-002A e WIFI-003 precedenti restano registrati ai rispettivi esiti.

### Sicurezza e integrità

- Nessuna misura, CHO, insulina, nota, impostazione di terapia, backup o dato dello storico è letto, trasmesso o modificato.
- Nessuna modifica a AsyncStorage o all'interfaccia delle altre schede.
- Nessun servizio cloud o programma ausiliario su PC.
- L'esito del laboratorio **non autorizza ancora una sincronizzazione del diario reale**.

### Controlli interni eseguiti

- Validazione sintattica TSX mediante parser/transpiler TypeScript: superata.
- Build Expo/Vercel e test WebRTC reali: da eseguire.

**Decisione successiva:** sulla base dei nuovi registri WIFI-004 verificare se le sessioni sopravvissute a una breve sospensione scambiano effettivamente PONG; per il requisito fondamentale della riconnessione alla nuova apertura resta indispensabile progettare un canale di segnalazione o rivedere i vincoli tecnici delle Web App.


---

## 13. Aggiornamento versione 1.1 — WIFI-004: riscontro MAIN e PC (20/10/2026)

**Provenienza:** registri tecnici trascritti dall'utente per il tablet MAIN (Web App da schermata Home) e il PC Windows/Chrome ASSOCIATO, entrambi nell'ambiente reale dell'utente. Il registro su PC è rimasto `vis: visible` durante le disconnessioni rilevanti. Non sono stati eseguiti nuovi build o modifiche al codice per questo aggiornamento.

### 13.1 Prove effettuate sul MAIN

| Prova | Intervallo MAIN in secondo piano | Durata riportata | Risultato al ritorno |
|---|---|---:|---|
| 1 | 17:33:07–17:33:34 | 27,0 s | **SUPERATA:** PONG nuovo valido; WIFI-004 conferma 16 ms alle 17:33:35 |
| 2 | 17:34:14–17:34:20 | 5,8 s | **SUPERATA:** PONG nuovo valido; WIFI-004 conferma 22 ms alle 17:34:21 |
| 3 | 17:34:41–17:35:08 | 26,8 s | **NON SUPERATA:** nessun PONG entro 12 s; ICE/WebRTC poi `failed`; anche il controllo manuale non ha ricevuto PONG |

Prima dei passaggi in secondo piano erano stati registrati PONG iniziali corretti (prima connessione alle 17:32:38). I primi due risultati dimostrano ripresa **effettiva del traffico applicativo** nella medesima sessione, senza nuovo QR riportato. Il terzo evidenzia che un `RTC: connected` immediatamente al ritorno può essere obsoleto: il MAIN segnala `connected` alle 17:35:08 ma riceve zero PONG; alle 17:35:13 passa a `disconnected` e alle 17:35:23 a `failed`.

### 13.2 Correlazione con il PC associato

| Ora | Evento PC | Relazione con il MAIN |
|---|---|---|
| 17:32:40 | WebRTC `connected`, DataChannel `open`, PING ricevuti e PONG inviati | Collegamento iniziale confermato anche dal MAIN |
| 17:33:35 | ICE e RTC `disconnected` | Subito dopo il primo ritorno MAIN (17:33:34) |
| 17:33:36 | ICE e RTC tornano `connected`; PING/PONG di nuovo | **Recupero reale**, riscontrato in entrambi i registri |
| 17:34:22–17:34:25 | Il PC continua a ricevere PING e inviare PONG | Conferma della riuscita del secondo ritorno MAIN |
| **17:34:40** | **Ultimo PING ricevuto sul PC** | Un secondo prima del terzo passaggio in background MAIN |
| **17:34:54** | **PC: ICE e WebRTC `disconnected`** | Il MAIN è ancora in secondo piano |
| **17:35:04** | **PC: WebRTC `failed`** | Quattro secondi **prima** del ritorno MAIN (17:35:08) |
| 17:35:08 | PC già in `failed` | MAIN torna in primo piano con stato locale inizialmente ancora `connected` |
| 17:35:20–23 | Il MAIN non riceve PONG e poi entra in `failed` | Conferma successiva del collegamento non funzionante |
| 17:37:59–17:38:25 | Eventi focus/visibilità del PC, che resta `failed` | Nessun recupero successivo riportato |

**Sequenza decisiva:** nella terza prova il PC rileva `disconnected` alle **17:34:54** e `failed` alle **17:35:04**, prima che il MAIN torni visibile alle **17:35:08**. Pertanto i problemi non nascono semplicemente dalla grafica dello stato MAIN al momento del ritorno: il trasporto PC era già fallito.

### 13.3 Conclusioni comprovate e limiti

1. **WIFI-004 complessivo: 2/3 rientri con PONG verificato e 1/3 fallito.** Questo non è un tasso di affidabilità statistico; il campione è limitato.
2. Una sessione WebRTC può riprendere dopo background e mantenere il traffico reale senza nuova scansione QR, **a condizione che la sessione esistente sia recuperabile**.
3. Il fallimento della terza prova non dipende **esclusivamente dalla durata** del background: una prova da 27,0 s è riuscita mentre una da 26,8 s è fallita.
4. Il PC è rimasto visibile durante la perdita, perciò la sospensione della Web App MAIN è una spiegazione **compatibile**, ma **non dimostrata come causa unica**. Non abbiamo log di rete, delle candidate ICE né di eventuali cambi Wi-Fi.
5. Lo stato `DataChannel: open` anche quando `RTC: failed` **non garantisce un canale utilizzabile**: il criterio di successo resta l'arrivo di un PONG nuovo.
6. **NON è stata realizzata la ricreazione automatica della sessione dopo `failed`, né la riconnessione dopo chiusura completa.** Nell'architettura attuale un nuovo ICE restart richiede scambio di segnalazione (offer/answer) che il QR conserva solo come associazione e non automatizza.
7. Nessuna misurazione, CHO, dose, IOB, annotazione o impostazione è stata trasmessa o modificata nei test.

### 13.4 Conseguenze pratiche e prossima decisione (STEP 5)

**Subito, solo nella scheda sperimentale:** mostrare chiaramente `Verificato da PONG`, `In attesa di verifica` e `Connessione persa` senza attribuire valore sufficiente a `RTC: connected` o `DataChannel: open`; disabilitare l'eventuale futuro trasferimento dei dati clinici quando manchi un PONG recente. Migliorare i log ICE per capire se ci sono candidate/percorsi di rete che cambiano; non incrementare i ping nel tentativo di impedire la sospensione.

**Architettura (bloccante prima della sincronizzazione):** valutare un vero canale di segnalazione automatico **compatibile con i vincoli dell'utente** (solo codice DIABETY, no cloud aggiuntivo, no app esterne, no servizio PC e MAIN scelto liberamente). Non promettere la riconnessione automatica in Web App Safari/Chrome finché non esista e venga testato un tale meccanismo. Se non è tecnicamente ottenibile con questi vincoli, esplicitarlo e chiedere quale requisito l'utente desideri eventualmente riconsiderare **prima** di integrare lo storico.

**Fonti tecniche**: MDN, `RTCIceTransport.state` https://developer.mozilla.org/en-US/docs/Web/API/RTCIceTransport/state ; `RTCPeerConnection.restartIce()` https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/restartIce ; `Signaling and video calling` https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling .

### 13.5 Registro aggiornamenti

- **v1.0:** introdotta diagnostica PONG post-rientro (WIFI-004); in quel momento ancora da collaudare.
- **v1.1:** analizzati e accoppiati i registri MAIN/PC del WIFI-004; registrati due successi effettivi dopo background e una perdita del collegamento prima del rientro. **Solo documentazione**, nessuna modifica al codice DIABETY.


---

## 14. Aggiornamento versione 1.2 — STEP 5: studio della riconnessione senza QR (20/10/2026)

**Stato:** STUDIO ESEGUITO. Nessun codice applicativo modificato. Nessun nuovo test sul dispositivo è stato eseguito in questo step; gli esiti WIFI-001–004 rimangono invariati.

### 14.1 Domanda investigata

È tecnicamente possibile, con DIABETY distribuita su Vercel come Web App (iPad/iPhone dalla schermata Home e Windows Chrome), senza cloud aggiuntivo, senza programmi o servizi da installare su Windows e senza ripetere i QR, ricreare automaticamente una nuova sessione dopo la chiusura completa o dopo `RTC: failed`, semplicemente aprendo DIABETY sulla medesima rete Wi-Fi?

### 14.2 Risposta per l'architettura attuale

**No, non in maniera affidabile con le sole API Web oggi utilizzabili da quelle Web App e senza alcun canale di segnalazione.** Per riaprire WebRTC occorre trasmettere informazioni di sessione nuove (SDP offer/answer e dati ICE). La coppia di QR originaria conserva un'associazione logica, non un indirizzo e un ascoltatore sempre raggiungibili né informazioni SDP valide per tutte le sessioni future.

- Il passaggio `RTC: disconnected` → `connected` con nuova conferma PONG osservato in WIFI-004 dimostra **recupero della sessione esistente**, non creazione di una nuova connessione tra browser autonomi.
- Dopo chiusura completa, l'istanza `RTCPeerConnection` viene persa. `restartIce()` di per sé non recapita informazioni nuove all'altro dispositivo; serve ancora un meccanismo di segnalazione.
- L'API WebSocket del browser apre una connessione **verso** un server: non offre a una Web App Chrome/Safari un listener di rete TCP/WebSocket che altri browser possano scoprire e raggiungere automaticamente.
- Condividere lo stesso router non rende condiviso `localStorage`, `AsyncStorage`, `BroadcastChannel` o il contesto JavaScript dei browser su dispositivi differenti.
- Riutilizzare gli stessi QR/SDP in seguito o aumentare i PING non è una soluzione corretta. Il QR può restare utile per la prima autorizzazione, ma non sostituisce un canale di rete per ogni nuova negoziazione.

**Conclusione vincolante:** non aggiungere un pulsante «riconnessione automatica» che prometta un esito non raggiungibile; non attivare la sincronizzazione dei dati sanitari su questo laboratorio prima di risolvere il problema.

### 14.3 Architetture possibili

| Approccio | App MAIN | QR a ogni nuova sessione | Rete/servizi | Osservazioni |
|---|---|---|---|---|
| A — Continuare con WebRTC via QR | Web App attuale | Sì, dopo chiusura / fallimento irreversibile | Solo locale, nessun servizio esterno | Già provato; non soddisfa la riconnessione autonoma |
| B — Segnalazione via servizio online | Web App attuale | No | Connessione verso un servizio di coordinamento; può essere distinta dal trasporto P2P locale | Viola la preferenza di non utilizzare servizi online per l'associazione; da non implementare senza approvazione esplicita |
| C — MAIN **nativo** con listener integrato in DIABETY | App nativa iOS/Android da realizzare | Potenzialmente no dopo prima associazione | Può funzionare solo sulla rete locale; nessun programma ausiliario Windows | Opzione tecnicamente plausibile, **ancora da verificare** con Chrome e iOS; richiede build e distribuzione nativa, permessi LAN, autenticazione, riconnessione e gestione lifecycle |
| D — Dispositivo MAIN PC tramite un servizio integrato in app desktop | App desktop da realizzare | Potenzialmente no | Locale | Sarebbe necessario un componente installato su Windows, in contrasto con i vincoli attuali: NON APPROVATO |

Per l'opzione C, il MAIN che **mostra** il QR per l'associazione sarebbe una vera app DIABETY nativa e conterrebbe codice per accettare richieste di segnalazione locali. L'eventuale PC Windows resterebbe un **associato** che apre DIABETY da Chrome, senza software aggiuntivo. Il MAIN dovrebbe essere attivo quando si vuole sincronizzare; non si promette disponibilità a schermo spento o app sospesa.

**Limiti da non sottovalutare:** un listener locale integrato nell'app è tecnicamente un piccolo endpoint/server locale, anche se non è un programma esterno. La compatibilità tra un MAIN iPad nativo e associati Chrome/Safari richiede test su richieste da origine HTTPS verso endpoint di rete privata (autorizzazioni, mixed content, CORS / WebSocket, autenticazione). La possibilità di impostare il **PC Chrome come MAIN** resta esclusa da questa soluzione senza ulteriori modifiche al vincolo «nessun componente Windows installato».

### 14.4 Impatto sulla distribuzione iOS e sui costi

DIABETY attualmente è avviata dall'iPad come Web App dalla schermata Home, pur usando Expo/React Native Web. Aggiungere moduli iOS nativi **non** si ottiene con un semplice aggiornamento Vercel: occorre compilare, firmare e installare un'app nativa.

Expo supporta moduli nativi e development build, ma Expo Go e una semplice PWA non possono caricare arbitrariamente moduli Swift personalizzati. Per il tipico percorso di build e installazione su iPhone/iPad fisici tramite EAS serve un account Apple Developer con credenziali adeguate; il Programma Apple Developer a pagamento comporta una quota annuale (attualmente indicata da Apple come 99 USD/anno, con prezzi locali variabili). La sperimentazione gratuita con Xcode/Personal Team comporta altre restrizioni e richiede un Mac; non è una sostituzione equivalente del flusso GitHub → Vercel usato dall'utente.

**Non definire l'opzione nativa «gratuita al 100%» finché non è stato stabilito concretamente il metodo di firma/distribuzione del dispositivo fisico.** La logica di comunicazione locale potrebbe non richiedere abbonamenti cloud, ma lo sviluppo e la distribuzione nativa possono introdurre costi e complessità.

### 14.5 Piano sperimentale se verrà autorizzato un MAIN nativo

1. Prototipo isolato: MAIN iPad nativo avviato in primo piano con endpoint locale **senza dati sanitari**. Assicurarsi che il porting non alteri lo storico.
2. Collegamento PC Chrome tramite rete Wi-Fi. Registrare permessi e verificare una richiesta tecnica firmata/autenticata; in seguito provare anche iPhone associato.
3. Chiudere la connessione, lasciare DIABETY aperta su entrambi, recuperare in automatico senza QR. Poi chiudere e riaprire il client per provare il recupero della sessione.
4. Validare che il MAIN non sia raggiungibile da dispositivi non associati, con segreti di associazione custoditi localmente, e cifrare il trasferimento.
5. Solo a comunicazione e sicurezza confermate, progettare la riconciliazione dei dati: ID stabili, log modifiche, tombstone per cancellazioni, gestione conflitti e backup prima delle operazioni critiche.

**WIFI-005 (eventuale) — Connessione LAN automatica via MAIN nativo:** NON IMPLEMENTATO, NON TESTATO, IN ATTESA DI UNA SCELTA DI ARCHITETTURA.

### 14.6 Decisioni non modificate

- MAIN = dispositivo che mostra/genera il QR, non quello che lo scansiona.
- Nessuna modifica allo storico, alle glicemie, insulina, CHO, IOB, grafici, bolo o backup.
- DIABETY continua a funzionare offline con salvataggio locale.
- QR di prima associazione conservato, nessuna nuova autorizzazione implicita a trasferire dati clinici.
- Nessun costo o servizio introdotto dallo STEP 5.

### 14.7 Fonti tecniche

- MDN, *WebRTC Connectivity / Signaling*: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Connectivity
- MDN, *Signaling and video calling*: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling
- MDN, *WebSocket constructor*: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/WebSocket
- Apple, *NWListener*: https://developer.apple.com/documentation/network/nwlistener
- Apple, *Local network privacy*: https://developer.apple.com/documentation/technotes/tn3179-understanding-local-network-privacy
- Expo, *Add custom native code*: https://docs.expo.dev/workflow/customizing/
- Expo, *Cloud build for iOS device*: https://docs.expo.dev/tutorial/eas/ios-development-build-for-devices/
- Apple, *Developer Program*: https://developer.apple.com/programs
- Chrome, *Local Network Access*: https://github.com/GoogleChrome/modern-web-guidance/blob/main/skills/modern-web-guidance/guides/security/local-network-access.md

**Registro:** v1.2 — studio di fattibilità STEP 5 con verifica documentale, architetture e limitazioni; **solo report**. Nessun nuovo artefatto di codice, build o test reale.


---

## 15. Aggiornamento versione 1.3 — Proposta di cambio obiettivo: backup diretto via QR (20/10/2026)

**Stato:** PROPOSTA DI ARCHITETTURA, NON ANCORA IMPLEMENTATA O APPROVATA COME FUNZIONE COMPLETA. I requisiti storici relativi alla sincronizzazione continua sono mantenuti nel report come cronologia ma la nuova soluzione viene valutata come sostituzione di tale obiettivo nel breve periodo.

### 15.1 Nuovo caso d'uso richiesto

L'utente usa normalmente DIABETY su iPhone e vuole poter portare tutti i suoi dati sull'iPad **al momento desiderato**: sull'iPhone apre «Invia backup tramite QR»; sull'iPad apre «Ricevi backup tramite QR» e legge il QR visualizzato sull'iPhone. Non è necessaria una sincronizzazione permanente né il recupero automatico dopo chiusura. Non si desiderano programmi Windows ausiliari, account, servizi cloud aggiuntivi o trasferimenti manuali del file di backup attraverso il sistema operativo.

### 15.2 Architettura proposta, riusando WIFI-001

- Il dispositivo **origine** (es. iPhone) crea uno snapshot completo e coerente dei dati esportabili da DIABETY, produce una **offerta WebRTC** e visualizza il relativo QR (eventualmente più di uno, come nei test già eseguiti).
- Il dispositivo **destinazione** (es. iPad) scansiona l'offerta, crea una **risposta WebRTC** e ne visualizza il QR; il dispositivo origine legge la risposta. Questa seconda lettura è necessaria perché l'attuale progetto non dispone di un canale di segnalazione automatico. Il solo QR iniziale non trasporta l'intero backup.
- Una volta aperto il `RTCDataChannel`, DIABETY invia il backup in **blocchi con numerazione, controllo di flusso, lunghezza, hash del contenuto e conferma finale**. Il destinatario ricostruisce il payload e verifica integrità/versione/schema prima di proporre l'importazione.
- **Non scrivere né eliminare dati del destinatario durante una ricezione incompleta.** Prima di qualsiasi importazione, il destinatario deve poter generare una copia di sicurezza locale ed esaminare dimensione e contenuto per categorie, con una conferma esplicita.
- La scelta di comportamento del backup va definita in maniera trasparente: **sostituzione completa controllata** oppure **unione** solo se può essere realizzata con un algoritmo che gestisca ID, doppioni, cancellazioni e conflitti. Non riutilizzare ciecamente l'attuale importazione se sovrascrive l'archivio locale.
- Dopo conferma dell'importazione e validazione di lettura, entrambi chiudono volontariamente il canale WebRTC. Non è richiesta riconnessione automatica.

**Compatibilità:** la connessione WebRTC locale tablet MAIN ↔ PC associato con QR e ping/pong è stata dimostrata in WIFI-001/004, **ma non è ancora stato dimostrato il trasferimento di un file backup né un collegamento iPhone ↔ iPad**. Occorre testare entrambe le Web App su rete locale e tenerle attive in primo piano fino al completamento.

### 15.3 Complicazioni, compromessi e sicurezza

1. **Un solo QR fisico non basta per tutto il backup**: i QR hanno capacità limitata; per archivi di dimensione normale, il dato sanitario non deve essere messo in chiaro nel QR. Il QR veicola solo le informazioni temporanee di connessione. Una procedura senza server richiede offerta e risposta mediante QR nei due sensi, talvolta multipart.
2. **Trasferimento interrotto**: se iOS sospende la Web App o WebRTC entra in `failed`, il trasferimento va annullato senza alterare il dispositivo destinazione; si ripete la procedura, salvo futuro supporto ripresa verificata.
3. **File completo**: riusare/verificare il formato di backup esistente, inclusi gli archivi glicemici, somministrazioni, CHO, impostazioni, note, IOB/terapia e preferiti, secondo ciò che effettivamente è persistito e incluso dall'esportazione. Non presumere che i dati temporanei esclusi dal backup vengano magicamente trasferiti.
4. **Integrità e autenticazione**: WebRTC protegge il traffico, ma occorre anche identificare i dispositivi autorizzati e verificare l'hash del backup e la versione dello schema. Nessuna importazione automatica senza consenso espresso.
5. **Retention**: la logica di pulizia automatica dello storico (91 giorni secondo requisiti di storage DIABETY) non deve applicarsi a sorpresa durante l'importazione; documentare l'esito dell'importazione e preservare il backup di sicurezza.
6. **Costo**: trasferimento locale senza nuovi abbonamenti o server di appoggio, con le Web App esistenti ospitate su Vercel; nessun nuovo programma PC o build nativa richiesti per il prototipo.

### 15.4 Fasi proposte e criteri di accettazione

- **TRANSFER-001** — iPhone ↔ iPad: trasferimento senza dati sanitari di un payload di prova comparabile per dimensione a un backup, con QR offer/answer e WebRTC. Validare ricezione integrale mediante hash. **DA IMPLEMENTARE / TESTARE**.
- **TRANSFER-002** — trasferimento snapshot reale solo dopo funzionamento della prova; destinazione in modalità *anteprima* senza scrittura. Controllare che il formato contenga ogni categoria attesa. **DA IMPLEMENTARE / TESTARE**.
- **TRANSFER-003** — backup preventivo sul destinatario, importazione con consenso, verifica di integrità e confronto del numero di registrazioni/categorie. **DA IMPLEMENTARE / TESTARE**.
- **TRANSFER-004** — test di interruzione a metà trasferimento e di duplicazione/conflitto: il destinatario deve conservare l'archivio originale finché l'importazione non termina correttamente. **DA IMPLEMENTARE / TESTARE**.

### 15.5 Impatto sulle funzioni attuali

Preservare la scheda sperimentale «Sincronizzazione» e il laboratorio WebRTC esistenti fino alla conferma dei nuovi test. La nuova funzione può avere due azioni «Invia dati via QR» / «Ricevi dati via QR»; la nomenclatura definitiva e l'eventuale integrazione nel Pannello di controllo restano da decidere. **Non eliminare le funzionalità di esportazione/importazione backup attuali, non modificare lo storico né impostazioni cliniche in questa fase.**

### 15.6 Fonti tecniche

- MDN, *WebRTC connectivity*: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Connectivity
- WebRTC sample, *Transfer a file*: https://webrtc.github.io/samples/src/content/datachannel/filetransfer/
- MDN, `RTCDataChannel.send()`: https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel/send
- QRCode.com / DENSO WAVE, *Information capacity and versions*: https://www.qrcode.com/en/about/version.html

**Registro:** v1.3 — nuova proposta di trasferimento **manuale e temporaneo**, senza sincronizzazione permanente. Solo report, codice applicativo invariato.


---

## VERSIONE 1.4 — NUOVA DIREZIONE APPROVATA: TRASFERIMENTO BACKUP VIA QR (20 ottobre 2026)

### Requisiti attuali (sostituiscono quelli di sincronizzazione automatica)
- Trasferimento occasionale, a comando, con due dispositivi sulla stessa rete locale; niente cloud, programmi aggiuntivi o account.
- Origine mostra il QR di connessione, destinazione lo scansiona; origine legge il QR di risposta. Non c'è associazione persistente e non esiste un MAIN fisso.
- Il backup sanitario NON entra nei QR: viaggia via WebRTC DataChannel temporaneo con cifratura DTLS.
- Dati non importati in automatico. La ricezione in RAM precede la validazione e la finestra di conferma già presente in Impostazioni.
- **Non è una sincronizzazione o una fusione**: il backup v2 importato sostituisce lo storico e altre chiavi locali. Prima dell'importazione, preservare il contenuto del destinatario con esportazione JSON separata.
- Limite tecnico in questa versione: 8 MiB, dispositivi con Web App aperte in primo piano. App native iOS/Android non ancora supportate dal trasporto WebRTC browser.

### Pulizia del vecchio progetto
ELIMINATI dal pacchetto: `frontend/src/components/diabety-wifi-lab.tsx`, `frontend/src/services/qr-lan-test.ts`; documentazione di esperimento `README_WIFI_FASE*.md`, `README_QR_FASE1.md` e vecchio `REPORT_SINCRONIZZAZIONE.md` (storico preservato in questo report incrementale).

AGGIUNTI: `frontend/src/services/backup-transfer.ts`, `frontend/src/services/qr-backup-transport.ts`, `frontend/src/services/qr-backup-datachannel.ts`, `README_TRASFERIMENTO_BACKUP_QR.md`.

MODIFICATI: `frontend/app/(tabs)/sincronizzazione.tsx`, `frontend/app/(tabs)/_layout.tsx`, `frontend/app/(tabs)/impostazioni.tsx` (solo il passaggio volatile del backup QR al flusso già esistente), `frontend/app.json` (testo fotocamera).

Nessuna modifica ai calcoli IOB, ai grafici, all'archivio, al bolo, alla scheda Inserisci o alle chiavi di conservazione dei dati.

### Test e verifica
| Test | Stato |
|---|---|
| QR-BKP-001 — Codifica e ricostruzione del segnale QR di connessione | Superato in ambiente JavaScript simulato |
| QR-BKP-002 — Invio/ricezione di backup fittizio Unicode a blocchi e ACK SHA-256 | Superato in ambiente JavaScript simulato |
| QR-BKP-003 — Controlli statici di sintassi TS/TSX | Superato |
| QR-BKP-004 — Build Vercel | Non eseguito |
| QR-BKP-005 — Trasferimento diretto tra iPhone e iPad sulla rete reale | Non eseguito |
| QR-BKP-006 — Importazione sicura dopo conferma e preservazione backup precedente | Non eseguito |

**Blocco operativo:** usare backup JSON di sicurezza e dati di prova prima di abilitare un ripristino con i dati clinici reali. Il successo del ping/pong storico non equivale ancora a validazione del trasferimento completo.


---

## VERSIONE 1.5 — PRIMO TRASFERIMENTO REALE E IMPORTAZIONE RIUSCITI (20 ottobre 2026)

### Conferma fornita dall’utente

Dopo aver caricato su GitHub la nuova versione e aver verificato lo stato **READY** su Vercel, l’utente ha effettuato un trasferimento dal **tablet (origine, mostra l’offerta QR)** al **PC Windows con Chrome (destinazione, legge l’offerta QR)**. La procedura descritta è:

1. Il PC ha letto i QR generati sul tablet.
2. Il tablet ha letto i QR di risposta mostrati dal PC.
3. L’utente ha confermato l’esportazione / invio del backup sul tablet.
4. L’utente ha confermato l’importazione del backup sul PC.
5. L’utente ha riferito che l’intera procedura **ha funzionato**.

Questo è il primo riscontro dichiarato di un trasferimento **backup reale con conferma di importazione**, oltre al precedente semplice scambio di PING/PONG WebRTC. Non c’è associazione permanente né sincronizzazione automatica.

### Stato dei test aggiornato

| Test | Esito | Evidenza / riserva |
|---|---|---|
| QR-BKP-001 — Codifica/ricostruzione QR | Superato in simulazione; utilizzo QR confermato nella prova reale | L’utente ha scansionato offerta e risposta |
| QR-BKP-002 — Invio a blocchi/ACK SHA-256 | Superato in simulazione; percorso operativo risultato funzionante nella prova reale | Nessun log tecnico/hash specifico riportato dall’utente |
| QR-BKP-003 — Verifica sintattica | Superato nella preparazione v1.4 | Nessuna nuova modifica codice in v1.5 |
| QR-BKP-004 — Build Vercel | **SUPERATO (conferma utente)** | Stato READY |
| QR-BKP-005 — iPhone → iPad | DA ESEGUIRE | Non dedurre compatibilità completa dal test tablet → PC |
| QR-BKP-006 — Importazione dopo conferma | **FLUSSO SUPERATO (conferma utente)** | La completezza campo-per-campo e l'eventuale conservazione dei dati locali precedenti non sono ancora state verificate |
| QR-BKP-007 — Tablet → PC, trasferimento reale | **SUPERATO (conferma utente)** | QR reciproci, invio, ricezione e importazione confermati |
| QR-BKP-008 — Verifica integrità funzionale post-importazione | DA ESEGUIRE | Controllare conteggi, categorie, campioni di record, impostazioni |

### Controlli finali consigliati (senza condividere valori sanitari personali)

- Confrontare sul tablet e sul PC il **numero di registrazioni** dello storico e gli intervalli di date presenti.
- Verificare alcune voci già note (inclusi **glicemia, insulina, CHO, data/ora e note**, ove presenti) senza modificarle.
- Verificare la presenza delle **impostazioni personali, della terapia/IOB e dei preferiti** che sono effettivamente inclusi nel formato di backup.
- Verificare che i file tradizionali **Esporta backup / Importa backup** continuino a funzionare.
- Ricordare che il ripristino attuale è una **sostituzione** e non un’unione: se il dispositivo destinatario aveva informazioni proprie, occorre un backup di sicurezza precedente per conservarle.

### Decisioni e limiti

Il test pratico tablet → PC è una conferma di fattibilità della nuova funzione; il passaggio iPhone → iPad è ancora da provare. Non aggiungere sincronizzazione continua, non modificare le schede cliniche, non presumere importazione non distruttiva né corrispondenza completa dei dati senza controllo.

**Registro v1.5:** documentazione aggiornata sulla base della conferma dell’utente. **Nessuna modifica a codice, dati o build** in questa versione del report.


---

## VERSIONE 1.6 — VERIFICA FUNZIONALE POST-IMPORTAZIONE CONFERMATA (20 ottobre 2026)

### Riscontro utente

Dopo il trasferimento **tablet → PC Windows/Chrome** via QR e l'importazione del backup, l'utente ha confermato esplicitamente: **«sì ritrovo tutto»**, in risposta alla verifica della presenza sul PC delle misurazioni e delle impostazioni del tablet.

### Esiti aggiornati

| Test | Stato | Evidenza |
|---|---|---|
| QR-BKP-004 — Build Vercel | **SUPERATO** | READY confermato dall'utente |
| QR-BKP-007 — Trasferimento e importazione tablet → PC | **SUPERATO** | Procedura QR bidirezionale, invio e importazione completati secondo l'utente |
| QR-BKP-008 — Riscontro funzionale dei dati importati | **SUPERATO (verifica visiva dell'utente)** | Misurazioni e impostazioni ritrovate sul PC |
| QR-BKP-005 — Trasferimento iPhone → iPad | **DA TESTARE** | Non ancora confermato |
| QR-BKP-009 — Trasferimento interrotto e assenza di importazioni parziali | **DA TESTARE** | Da eseguire su dati di prova |
| QR-BKP-010 — Conservazione del backup preesistente sul destinatario | **DA TESTARE** | L'attuale importazione sostituisce dati; esportare prima backup JSON separato |

### Limiti della conferma

La verifica dell'utente dimostra che il contenuto atteso è visibile dopo l'importazione, **non** una comparazione automatica campo per campo o dell'hash del database locale post-ripristino. Non dedurre da questo solo test l'assenza di errori su tutte le versioni browser o la sicurezza in caso di interruzioni.

### Prossimo passo consigliato

Eseguire **iPhone → iPad** come origine/destinazione, esportando prima un backup JSON tradizionale da entrambi i dispositivi e verificando la ricezione prima dell'importazione. Per la prima prova, evitare di sovrascrivere dati unici del destinatario. Dopo il ripristino, confrontare misurazioni, note, CHO, terapia/IOB e impostazioni presenti nel backup.

**Registro v1.6:** aggiornamento esclusivamente documentale sulla base del riscontro reale dell'utente. Nessuna modifica al codice, alle dipendenze o ai dati DIABETY.


---

## VERSIONE 1.7 — TRASFERIMENTO IPHONE → IPAD RIUSCITO (20 ottobre 2026)

### Conferma dell’utente

L’utente ha dichiarato: **«trasferimento tra iphone e ipad avvenuto con successo»**. Questo documenta il primo riscontro pratico positivo nel percorso **iPhone → iPad** dopo il precedente collaudo **tablet → PC Windows/Chrome**. Non sono stati riportati messaggi di errore.

### Esito dei test (stato corrente)

| Codice | Prova | Esito e grado di conferma |
|---|---|---|
| QR-BKP-004 | Pubblicazione Vercel | **SUPERATO**, READY confermato in precedenza |
| QR-BKP-007 | Tablet → PC: trasferimento e importazione | **SUPERATO**, conferma precedente dell’utente |
| QR-BKP-008 | Tablet → PC: dati e impostazioni presenti dopo importazione | **SUPERATO**, riscontro visivo precedente dell’utente |
| QR-BKP-005 | iPhone → iPad: trasferimento tramite QR | **SUPERATO**, conferma esplicita dell’utente |
| QR-BKP-011 | iPhone → iPad: conferma dell’importazione e corrispondenza di storico/impostazioni | **DA CONFERMARE**; non deducibile dalla sola frase sul trasferimento |
| QR-BKP-009 | Trasferimento interrotto senza importazione parziale | **DA TESTARE**, preferibilmente con dati fittizi |
| QR-BKP-010 | Conservazione/ripristino del backup del destinatario | **DA TESTARE**; importazione attuale sostitutiva |

### Verifiche e precauzioni

1. Verificare se sull’iPad è stata effettivamente completata **l’importazione**, oltre alla ricezione del backup.
2. Dopo l’importazione, confrontare visivamente sull’iPad storico, numero di registrazioni, date, CHO/insulina quando presenti, note e impostazioni incluse nell’esportazione, senza condividere i valori sanitari.
3. Conservare un backup JSON tradizionale dell’iPad **prima** di qualsiasi nuovo ripristino, poiché l’importazione non unisce automaticamente gli archivi.
4. Per i test di interruzione, impiegare **dati fittizi o un archivio di prova**, evitando esperimenti distruttivi sul diario reale.

### Conclusione e prossimo passo

Il trasferimento manuale QR è stato verificato con esito positivo in **due percorsi pratici distinti: tablet → PC e iPhone → iPad**. Rimane da registrare l’esito specifico del ripristino e controllo del contenuto sull’iPad. Dopo tale conferma, dare priorità alle prove di integrità e gestione delle interruzioni; **nessuna necessità di riattivare il progetto di sincronizzazione automatica**.

**Registro v1.7:** aggiornamento solo documentale, senza modifiche al codice, ai dati dell’app o alla configurazione Vercel.


---

## VERSIONE 1.8 — COLLAUDO FUNZIONALE IPHONE → IPAD CONFERMATO (20 ottobre 2026)

### Riscontro dell’utente

A seguito del trasferimento manuale tramite QR **iPhone → iPad**, l’utente ha risposto **«sì»** alla domanda se sull’iPad avesse completato l’importazione e ritrovato **tutte le misurazioni, le note e le impostazioni** presenti sull’iPhone.

Questo completa il riscontro funzionale del percorso iPhone → iPad, oltre al percorso tablet → PC già verificato. La conferma riguarda il controllo effettuato dall’utente nell’app; **non costituisce una comparazione automatica campo per campo** o la prova dell’assenza assoluta di difetti.

### Stato aggiornato dei test

| Codice | Prova | Stato |
|---|---|---|
| QR-BKP-004 | Pubblicazione dell’aggiornamento su Vercel | **SUPERATO** — READY confermato dall’utente |
| QR-BKP-007 | Tablet → PC: trasferimento QR e importazione | **SUPERATO** — conferma utente |
| QR-BKP-008 | Tablet → PC: verifica visiva dati e impostazioni | **SUPERATO** — conferma utente |
| QR-BKP-005 | iPhone → iPad: trasferimento QR | **SUPERATO** — conferma utente |
| QR-BKP-011 | iPhone → iPad: importazione e riscontro visivo di misurazioni, note e impostazioni | **SUPERATO** — conferma esplicita utente |
| QR-BKP-009 | Interruzione del trasferimento, nessuna importazione parziale | **DA TESTARE** con dati fittizi |
| QR-BKP-010 | Protezione e ripristino dei dati preesistenti sul destinatario | **DA TESTARE** con backup preventivo e dati fittizi |

### Esito della fase di collaudo funzionale

**Due percorsi reali completati e confermati:**

1. **Tablet → PC Windows/Chrome:** trasferimento, importazione, presenza delle misurazioni e delle impostazioni confermati.
2. **iPhone → iPad:** trasferimento, importazione, presenza delle misurazioni, delle note e delle impostazioni confermati.

La funzione **Trasferimento backup QR** è quindi operativa nei percorsi provati. È un trasferimento manuale su richiesta, **non una sincronizzazione automatica** tra i dispositivi.

### Prossima fase — Test di sicurezza

Prima di definire la funzione completamente collaudata, testare **solo su archivi di prova**:

- **QR-BKP-009:** interrompere la connessione prima del completamento dell’invio e verificare che nessuna importazione parziale venga applicata al destinatario.
- **QR-BKP-010:** predisporre dati fittizi distinti sul destinatario, esportarne preventivamente il backup JSON, simulare l’importazione sostitutiva solo in ambiente sicuro e verificarne il ripristino.
- In entrambi i casi, controllare gli avvisi per l’utente e che i backup tradizionali restino funzionanti.

**Avvertenza permanente:** l’importazione attuale **sostituisce** i dati esistenti sul dispositivo destinatario e **non fonde** automaticamente archivi differenti. Conservare un backup JSON del destinatario prima di qualsiasi importazione.

**Registro v1.8:** aggiornamento esclusivamente documentale. Nessuna modifica al codice, alle dipendenze, alle misurazioni o alla configurazione Vercel.


---

## VERSIONE 1.9 — CONGELAMENTO DELLA VERSIONE FUNZIONANTE E ATTIVITÀ RINVIATE (20 ottobre 2026)

### Decisione approvata dall’utente

L’utente considera **soddisfacente la versione attuale** della funzione «Trasferimento backup QR» e ha richiesto esplicitamente di **lasciare DIABETY così com’è**. La fase di sviluppo e collaudo funzionale viene quindi **chiusa per il momento**, senza introdurre nuove modifiche né condurre test potenzialmente distruttivi. Le attività ancora aperte sono **registrate per un’eventuale ripresa futura, esclusivamente su nuova richiesta**.

### Funzioni verificate nella versione corrente

| Ambito | Esito confermato | Livello di verifica |
|---|---|---|
| Pubblicazione Vercel | **READY** | Segnalazione dell’utente |
| Tablet → PC Windows/Chrome | **SUPERATO**: QR reciproci, trasferimento e importazione | Collaudo dell’utente |
| Tablet → PC: dati presenti | **SUPERATO**: misurazioni e impostazioni ritrovate | Controllo visivo dell’utente |
| iPhone → iPad | **SUPERATO**: trasferimento e importazione | Collaudo dell’utente |
| iPhone → iPad: dati presenti | **SUPERATO**: misurazioni, note e impostazioni ritrovate | Controllo visivo dell’utente |
| Confronto automatico di ogni campo del backup | **NON ESEGUITO** | Non dedurre dai riscontri visivi |

### Attività residue da tenere in lista per il futuro (non programmate)

| Codice | Attività futura | Scopo | Stato |
|---|---|---|---|
| **QR-BKP-009** | Test di interruzione durante invio/ricezione | Verificare che un trasferimento incompleto non possa causare un’importazione parziale né alterare lo storico locale | **RINVIATO**; da eseguire solo con dati fittizi |
| **QR-BKP-010** | Test di protezione dei dati già presenti sul destinatario | Verificare backup preventivo, avvisi di sostituzione, eventuale ripristino dei dati originali dopo importazione | **RINVIATO**; da eseguire solo con archivi isolati |
| **QR-BKP-012** | Verifica automatizzata della completezza post-importazione | Confrontare conteggi, struttura e campi effettivamente inclusi nel backup, oltre al controllo visivo già riuscito | **DA VALUTARE IN FUTURO** |
| **QR-BKP-013** | Prove con backup più voluminosi e rete instabile | Controllare limiti pratici, timeout, ripetizione dei tentativi e messaggi di errore | **DA VALUTARE IN FUTURO** |
| **QR-BKP-014** | Riesame delle protezioni del trasferimento | Verificare autorizzazione del destinatario, validità del QR temporaneo, integrità del payload e protezione dei dati in transito | **DA VALUTARE IN FUTURO** |
| **QR-BKP-015** | Miglioramento facoltativo dell’interfaccia | Valutare riepilogo prima dell’importazione, avanzamento, diagnosi di errore e conferma finale più esplicita, solo se necessario | **OPZIONALE / NON APPROVATO** |
| **QR-BKP-016** | Eventuale importazione con unione anziché sostituzione | Valutare separatamente conflitti, duplicati e cancellazioni; non fa parte della funzione corrente | **IDEA FUTURA / NON APPROVATA** |

**Precauzione costante:** l’importazione attuale è **sostitutiva, non cumulativa**. Prima di importare su un dispositivo che contiene dati propri, esportare e conservare un backup JSON tradizionale di quel dispositivo. Non utilizzare mai i dati sanitari reali per test di interruzione o ripristino sperimentale.

### Attività esplicitamente escluse dallo sviluppo corrente

- **Sincronizzazione automatica permanente fra dispositivi:** progetto precedente sospeso; non integrare nuovamente il vecchio laboratorio Wi-Fi/WebRTC di riconnessione.
- **Installazione di programmi o servizi ausiliari su Windows:** non desiderata.
- **Cloud, account o abbonamenti aggiuntivi:** non previsti per la funzione corrente.
- **Modifiche a Storico, Inserisci, Bolo, Grafici, Alimenti, IOB e backup JSON tradizionale:** non autorizzate in questa fase.

### Condizioni per un’eventuale ripresa futura

1. Attendere una richiesta esplicita prima di programmare nuove funzioni o iniziare nuovi test.
2. Ripartire dalla **versione funzionante** già pubblicata su Vercel; conservare preventivamente una copia del progetto e backup dei dati.
3. Per qualunque prova di sicurezza usare esclusivamente **ambienti separati e dati fittizi**, verificando che non contengano dati reali.
4. Eseguire i miglioramenti in modo incrementale, senza compromettere i due percorsi tablet → PC e iPhone → iPad già collaudati.
5. Aggiornare questo stesso report dopo ogni modifica o test effettivamente svolto, distinguendo sempre **approvato**, **realizzato**, **verificato** e **solo proposto**.

### Chiusura dello stato corrente

**Trasferimento manuale backup tramite QR: FUNZIONANTE NEI DUE PERCORSI COLLAUDATI; SVILUPPO SOSPESO SU DECISIONE DELL’UTENTE.**  
**Test di sicurezza residui: RINVIATI, non eseguiti e non necessari per dichiarare superato il collaudo funzionale già confermato.**  
**Registro v1.9:** aggiornamento **esclusivamente documentale**; nessuna modifica al codice DIABETY, alle dipendenze, ai dati, al repository GitHub o alla distribuzione Vercel.
