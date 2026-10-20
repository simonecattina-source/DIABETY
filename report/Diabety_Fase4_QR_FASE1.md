# DIABETY · Sincronizzazione QR · Fase 1 (laboratorio isolato)

## Scopo
Prima verifica del flusso QR, senza leggere/scrivere dati sanitari né usare la rete.

**Regola MAIN:** il MAIN è il dispositivo che GENERA e MOSTRA il codice QR. I dispositivi associati SCANSIONANO quel codice.

## Modifiche
- `frontend/app/(tabs)/sincronizzazione.tsx`: nuova scheda indipendente, registrazione locale della relazione MAIN/associati mediante QR in due passaggi.
- `frontend/app/(tabs)/_layout.tsx`: aggiunge un collegamento `QR Test` alla barra, su Web e iOS. Il contenuto delle sei schede precedenti non viene toccato.
- `frontend/package.json`: aggiunge `expo-camera` e `react-native-qrcode-svg`; `react-native-svg` era già presente.
- `frontend/app.json`: aggiunge il permesso fotocamera per lettura QR.

## Prova
1. Eseguire il deploy di questa copia e aprire `QR Test` sui due dispositivi.
2. Dal dispositivo scelto come MAIN scegliere `Questo dispositivo sarà MAIN`. Apparirà un QR.
3. Sul secondo dispositivo scegliere `Scansiona il QR del MAIN`, inquadrare il codice e permettere la fotocamera.
4. Sul secondo dispositivo apparirà il QR di risposta.
5. Sul MAIN scegliere `Scansiona il QR di risposta` e confermare il dispositivo proposto.
6. La voce `Dispositivi registrati` del MAIN mostrerà il dispositivo associato.
7. Ricaricare entrambe le pagine e verificare che l'associazione locale rimanga.
8. Se il PC non ha webcam, espandere `Mostra codice testuale` sul dispositivo che mostra il QR e incollarlo nell'altra scheda attraverso `Incolla il codice invece` (è un fallback di test).

## Limitazioni importanti
- Non è implementata alcuna sincronizzazione via Wi-Fi o WebRTC, né scoperta o riconnessione automatica fra browser.
- Non è trasferito alcun dato clinico; `glicotrack_data`, parametri di bolo, IOB, backup e alimenti restano intatti.
- Il record di laboratorio utilizza SOLO `AsyncStorage` con chiave `diabety_qr_lab_v1`.
- Questi QR NON sono un sistema di autenticazione sicuro: non usarli per trasferire dati sanitari.
- La conferma di associazione è salvata sul MAIN, ma non è notificata automaticamente al dispositivo associato (non essendoci ancora una connessione di rete).
- Non promettere sincronizzazione alla riapertura: Safari/Chrome non offrono da soli la scoperta affidabile di altri browser sulla LAN; occorre verificare un canale di segnalazione/riscoperta compatibile coi vincoli del progetto.

## Convalida svolta
Controllata la sintassi TSX (TypeScript transpileModule) e la validità dei JSON. Non è stato eseguito un build Expo con dipendenze né un test fisico tra iPhone, iPad e PC Windows; verificare i log Vercel e le prove reali prima di considerare funzionante il modulo.
