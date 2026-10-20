# DIABETY — FASE 2 · Test della comunicazione Wi-Fi in scheda isolata

## Quali file sono nuovi o modificati

1. **MODIFICATO** `frontend/app/(tabs)/sincronizzazione.tsx` — aggiunge la sezione Fase 2 sotto le funzioni Fase 1.
2. **NUOVO** `frontend/src/components/diabety-wifi-lab.tsx` — UI/test WebRTC e scanner QR indipendenti.
3. **NUOVO** `frontend/src/services/qr-lan-test.ts` — serializzazione, compressione e lettura QR multi-parte, attesa ICE.
4. **NUOVO** `REPORT_SINCRONIZZAZIONE.md` — report progressivo 0.2.
5. **NUOVO** `README_WIFI_FASE2.md` — questa procedura.

Le altre schede, i file dati e `frontend/package.json` **non sono stati modificati**.

## Requisiti della prova

- Tablet MAIN e PC Windows/Chrome **già associati**, come verificato in fase 1.
- Aprire DIABETY **via HTTPS** su entrambi, sulla stessa rete Wi-Fi / LAN **senza isolamento tra client**.
- La nuova sezione Fase 2 funziona **in Safari/Chrome Web**, non ancora nella versione nativa Expo.
- Per una prova esclusivamente QR, il PC deve poter leggere i QR mostrati sul tablet (fotocamera/webcam). Senza fotocamera, l'alternativa è trasferire manualmente il codice completo usando un mezzo già disponibile; il browser NON trasferisce automaticamente gli appunti fra dispositivi.
- Non effettuare il test con dati reali. Il modulo non li legge comunque.

## TEST WIFI-001 — Da eseguire dopo il deploy Vercel

1. Apri DIABETY sul **tablet MAIN** e sul **PC associato** e vai su **QR Test / Sincronizzazione**.
2. Sul MAIN, nella nuova scheda «Test comunicazione Wi-Fi · Fase 2», scegli il PC e premi **1 · Genera offerta dal MAIN**. Attendi la preparazione. Se compare un errore ICE, annotalo.
3. Sul PC associato premi **2 · Leggi offerta del MAIN**. Leggi i QR mostrati sul tablet, uno dopo l'altro (se sono più QR, usa «Successivo» sul MAIN). La schermata sul PC mostra il conteggio delle parti ricevute.
4. Terminata la lettura, il PC genera una **risposta** con uno o più QR.
5. Sul tablet MAIN premi **3 · Leggi risposta dell'associato**. Leggi i QR del PC, uno dopo l'altro, fino al completamento.
6. Attendi che il WebRTC DataChannel si apra. Il MAIN manda automaticamente un messaggio **ping**; il PC risponde **pong**.
7. **Risultato positivo:** sul MAIN si legge **«TEST SUPERATO. Risposta ricevuta…»**. Sul PC appare **«MESSAGGIO RICEVUTO E RISPOSTA INVIATA»**.
8. Sul MAIN premi **Invia un nuovo messaggio di prova** per ripetere il test.
9. Chiudi e riapri DIABETY: verifica che le associazioni QR restino salvate, ma considera normale che il canale WebRTC non si ristabilisca automaticamente (funzione NON ancora implementata).

## Esiti e diagnosi

| Messaggio visto | Significato |
|---|---|
| «Offerta pronta» | Solo negoziazione locale pronta; NON connessione riuscita |
| «Risposta pronta» | Peer ha interpretato offerta; NON connessione riuscita |
| «Canale diretto aperto» | I due browser hanno aperto un DataChannel; test ping ancora da concludere |
| «TEST SUPERATO» sul MAIN | Ping/pong ricevuto; scambio messaggio reale riuscito |
| «Nessun indirizzo ICE locale» | Possibile blocco browser/ambiente; annotare il dettaglio |
| «Connessione non riuscita» | Possibili restrizioni rete/browser/firewall, mDNS o accesso Wi-Fi agli altri client |

## Cosa questa versione NON fa

- NON sincronizza glicemie, dosi, CHO, parametri personali, IOB o altre informazioni sanitarie.
- NON esegue scoperta dei dispositivi sulla LAN e NON si riconnette automaticamente alla riapertura.
- NON usa cloud, STUN/TURN, web socket, server locali o applicazioni PC ausiliarie.
- NON sostituisce il sistema di backup.
- NON garantisce compatibilità con la versione nativa iOS/Android.

## Verifiche effettuate prima della consegna

- Validità della sintassi TypeScript/TSX e dei file JSON verificata localmente.
- Test Node.js su codifica/compressione/decodifica, QR in più parti e input non validi superati.
- **Non** è stato eseguito un build Expo completo: manca la cartella delle dipendenze nel pacchetto e non abbiamo eseguito il build su Vercel.
- **Non** è stata eseguita una vera connessione WebRTC fra i tuoi dispositivi: l'esito del test WIFI-001 va registrato dopo la tua prova.
