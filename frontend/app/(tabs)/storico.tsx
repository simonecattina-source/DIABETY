import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SectionList, Platform, Modal, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';

// 🎨 PALETTE AD ALTO CONTRASTO CON AZZURRO CYAN NEON PER IL PULSANTE PDF COORDINATO
const COLORS = {
  background: "#0A0A0C",        
  surfaceSecondary: "#13131A",  // Nero profondo tech per i contenitori
  brandPrimary: "#00E5FF",      // Azzurro Cyan elettrico neon coordinato
  onSurface: "#FFFFFF",         // Bianco purissimo ultra-nitido
  muted: "#7E7E86",             
  success: "#00E676",           // Verde smeraldo Oled
  warning: "#FF9100",           // Arancione vivo
  error: "#FF5252",             // Rosso corallo neon
  borderGlass: "rgba(255, 255, 255, 0.08)",
  borderGlassBright: "rgba(255, 255, 255, 0.15)"
};

const MOMENTI_COLONNE = [
  "Prima Colazione", "Dopo Colazione", "Spuntino", 
  "Prima Pranzo", "Dopo Pranzo", "Merenda", 
  "Prima Cena", "Dopo Cena", "Notte"
];
export default function StoricoScreen() {
  const [filtroAttivo, setFiltroAttivo] = useState<'7' | '14' | '30' | '90' | 'all'>('all');
  const [datiReali, setDatiReali] = useState<any[]>([]);

  const [itemSelezionato, setItemSelezionato] = useState<any | null>(null);
  const [modGlicemia, setModGlicemia] = useState('');
  const [modInsulina, setModInsulina] = useState('');
  const [modNote, setModNote] = useState('');
  const [modMomento, setModMomento] = useState('');
  
  const [modDataISO, setModDataISO] = useState('');
  const [modOraText, setModOraText] = useState('');

  const [mostraHelpPDF, setMostraHelpPDF] = useState(false);
  const [mostraModalModifica, setMostraModalModifica] = useState(false);
  const [mostraNotificaModifica, setMostraNotificaModifica] = useState(false);
  const [testoNotifica, setTestoNotifica] = useState('✓ Modifica salvata nel registro');

  const [mostraConfermaSvuota, setMostraConfermaSvuota] = useState(false);
  const [mostraNotificaSvuotato, setMostraNotificaSvuotato] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      caricaDatiLocali();
    }, [])
  );

  const caricaDatiLocali = async () => {
    try {
      const datiSalvati = await AsyncStorage.getItem('glicotrack_data');
      if (datiSalvati) {
        setDatiReali(JSON.parse(datiSalvati));
      }
    } catch (e) {
      console.log("Errore nel caricamento dei dati.");
    }
  };
  const cancellaTuttoStorico = async () => {
    try {
      await AsyncStorage.removeItem('glicotrack_data');
      setDatiReali([]);
      setMostraNotificaSvuotato(true);
      setTimeout(() => { setMostraNotificaSvuotato(false); }, 3000);
    } catch (e) {
      alert("Impossibile cancellare i dati.");
    }
  };

  const confermaCancellaTutto = async () => {
    setMostraConfermaSvuota(false);
    await cancellaTuttoStorico();
  };

  const ottieniTimestampCompleto = (stringaData: string, stringaOra: string) => {
    let giorno = 0, mese = 0, annoCompleto = 0;
    if (stringaData === "Oggi") {
      const d = new Date();
      giorno = d.getDate(); mese = d.getMonth(); annoCompleto = d.getFullYear();
    } else if (stringaData && stringaData.includes('/')) {
      const [g, m, a] = stringaData.split('/');
      giorno = parseInt(g); mese = parseInt(m) - 1;
      annoCompleto = parseInt(a) < 50 ? 2000 + parseInt(a) : 1900 + parseInt(a);
    } else {
      return 0;
    }
    let ore = 0, minuti = 0;
    if (stringaOra && stringaOra.includes(':')) {
      const [h, min] = stringaOra.split(':');
      ore = parseInt(h); minuti = parseInt(min);
    }
    return new Date(annoCompleto, mese, giorno, ore, minuti).getTime();
  };

  const rientraNelFiltro = (stringaData: string) => {
    if (filtroAttivo === 'all') return true;
    const oggi = new Date();
    const dataInizioOggi = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate()).getTime();
    const timestampMisurazione = ottieniTimestampCompleto(stringaData, "00:00");
    const differenzaGiorni = (dataInizioOggi - timestampMisurazione) / (1000 * 60 * 60 * 24);
    return differenzaGiorni <= parseInt(filtroAttivo) &&眼神differenzaGiorni >= -1;
  };
  const eliminaSingoloItem = async () => {
    if (!itemSelezionato) return;
    try {
      const datiRimanenti = datiReali.filter(item => item.id !== itemSelezionato.id);
      await AsyncStorage.setItem('glicotrack_data', JSON.stringify(datiRimanenti));
      setDatiReali(datiRimanenti);
      setTestoNotifica('✕ Misurazione eliminata dal registro');
      setMostraNotificaModifica(true);
      setTimeout(() => {
        setMostraNotificaModifica(false); setMostraModalModifica(false); setItemSelezionato(null);
      }, 1300);
    } catch (e) {
      alert("Errore durante l'eliminazione.");
    }
  };

  const apriModificaItem = (item: any) => {
    setItemSelezionato(item);
    setModGlicemia(item.glicemia.toString());
    setModInsulina(item.insulina ? item.insulina.replace(' UI', '').replace('-', '') : '');
    setModMomento(item.tipo || 'Prima Colazione');
    setModOraText(item.ora || '12:00');
    const testoNotePulito = item.note ? item.note.replace(/^\[\d{2}:\d{2}\]\s*/, '') : '';
    setModNote(testoNotePulito);
    if (item.dataTesto && item.dataTesto.includes('/')) {
      const [g, m, a] = item.dataTesto.split('/'); setModDataISO(`20${a}-${m}-${g}`);
    } else {
      const d = new Date();
      setModDataISO(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
    }
    setTestoNotifica('✓ Modifica salvata nel registro');
    setMostraNotificaModifica(false); setMostraModalModifica(true);
  };

  const salvaModificaItem = async () => {
    const valoreGlicemia = parseInt(modGlicemia);
    if (!valoreGlicemia || isNaN(valoreGlicemia)) {
      alert("Inserisci un valore di glicemia valido."); return;
    }
    const [aaaa, mm, gg] = modDataISO.split('-');
    const dataRiconvertita = `${gg}/${mm}/${aaaa.slice(-2)}`;
    const noteConOrarioFuso = modNote.trim() ? `[${modOraText}] ${modNote.trim()}` : `[${modOraText}]`;
    try {
      let datiAggiornati = datiReali.map(item => {
        if (item.id === itemSelezionato.id) {
          return { ...item, glicemia: valoreGlicemia, insulina: modInsulina ? `${modInsulina} UI` : '-', tipo: modMomento, note: noteConOrarioFuso, ora: modOraText, dataTesto: dataRiconvertita };
        }
        return item;
      });
      if (datiAggiornati.length > 0) {
        let timestampPiuRecente = 0;
        datiAggiornati.forEach((item: any) => {
          const ts = ottieniTimestampCompleto(item.dataTesto, "00:00");
          if (ts > timestampPiuRecente) timestampPiuRecente = ts;
        });
        const limite90GiorniMs = 90 * 24 * 60 * 60 * 1000;
        const timestampSogliaMinima = timestampPiuRecente - limite90GiorniMs;
        datiAggiornati = datiAggiornati.filter((item: any) => ottieniTimestampCompleto(item.dataTesto, "00:00") >= timestampSogliaMinima);
      }
      await AsyncStorage.setItem('glicotrack_data', JSON.stringify(datiAggiornati));
      setDatiReali(datiAggiornati); setTestoNotifica('✓ Modifica salvata nel registro'); setMostraNotificaModifica(true);
      setTimeout(() => { setMostraNotificaModifica(false); setMostraModalModifica(false); setItemSelezionato(null); }, 1500);
    } catch (e) { alert("Errore durante il salvataggio."); }
  };

  const ottieniDatiSezionati = () => {
    const sezioni: Record<string, any[]> = {};
    const datiFiltratiTemporali = datiReali.filter(item => rientraNelFiltro(item.dataTesto || "Oggi"));
    datiFiltratiTemporali.forEach(item => {
      const dataChiave = item.dataTesto || "Oggi"; if (!sezioni[dataChiave]) sezioni[dataChiave] = []; sezioni[dataChiave].push(item);
    });
    return Object.keys(sezioni)
      .sort((a, b) => ottieniTimestampCompleto(b, "00:00") - ottieniTimestampCompleto(a, "00:00")) 
      .map(chiave => {
        const elementiGiornoOrdinati = sezioni[chiave].sort((itemA, itemB) => ottieniTimestampCompleto(chiave, itemB.ora || "00:00") - ottieniTimestampCompleto(chiave, itemA.ora || "00:00"));
        return { title: chiave, data: elementiGiornoOrdinati };
      }).filter(s => s.data.length > 0);
  };
  const generaEDesportaPDF = () => {
    let corpoHtmlCompleto = ""; const sezioniDati = ottieniDatiSezionati();
    for (let i = 0; i < sezioniDati.length; i += 4) {
      const bloccoQuattroGiorni = sezioniDati.slice(i, i + 4); let righeTabellaBlocco = "";
      bloccoQuattroGiorni.forEach(sezione => {
        const rigaGlicemie: Record<string, string> = {}; const rigaInsuline: Record<string, string> = {}; const rigaNote: Record<string, string> = {};
        MOMENTI_COLONNE.forEach(m => { rigaGlicemie[m] = "-"; rigaInsuline[m] = "-"; rigaNote[m] = "-"; });
        sezione.data.forEach(item => {
          if (MOMENTI_COLONNE.includes(item.tipo)) {
            let colore = '#34C759'; if (item.glicemia > 180) colore = '#FF3B30'; if (item.glicemia < 70) colore = '#FF9F0A';
            rigaGlicemie[item.tipo] = `<span style="color: ${colore}; font-weight: bold;">${item.glicemia} mg/dL</span>`;
            rigaInsuline[item.tipo] = item.insulina !== '-' ? `<span style="font-weight: 600;">${item.insulina}</span>` : "-";
            rigaNote[item.tipo] = item.note ? `<span style="font-style: italic; color: #555;">${item.note}</span>` : "-";
          }
        });
        let trGlicemieHtml = ""; let trInsulineHtml = ""; let trNoteHtml = "";
        MOMENTI_COLONNE.forEach(m => { trGlicemieHtml += `<td>${rigaGlicemie[m]}</td>`; trInsulineHtml += `<td>${rigaInsuline[m]}</td>`; trNoteHtml += `<td>${rigaNote[m]}</td>`; });
        righeTabellaBlocco += `<tr><td class="cell-data" rowspan="3">${sezione.title}</td><td class="cell-label">Glicemia</td>${trGlicemieHtml}</tr><tr><td class="cell-label">Insulina</td>${trInsulineHtml}</tr><tr class="row-separator"><td class="cell-label">Note</td>${trNoteHtml}</tr>`;
      });
      const rigaInterruzionePagina = (i + 4 < sezioniDati.length) ? 'style="page-break-after: always;"' : '';
      const htmlTitoloIntestazione = (i === 0) ? `<h1>Diabety - Registro Storico Giornaliero</h1>` : `<div style="height: 10px;"></div>`;
      corpoHtmlCompleto += `<div class="pagina-pdf" ${rigaInterruzionePagina}>${htmlTitoloIntestazione}<table><thead><tr><th>Data</th><th>Parametro</th><th>Prima Colazione</th><th>Dopo Colazione</th><th>Spuntino</th><th>Prima Pranzo</th><th>Dopo Pranzo</th><th>Merenda</th><th>Prima Cena</th><th>Dopo Cena</th><th>Notte</th></tr></thead><tbody>${righeTabellaBlocco}</tbody></table></div>`;
    }

    const htmlTemplate = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Registro_Glicemico_Diabety</title><style>@page { size: landscape; margin: 10mm; } body { font-family: sans-serif; color: #1c1c1e; padding: 0; margin: 0; background: #ffffff; } .pagina-pdf { box-sizing: border-box; width: 100%; } h1 { font-size: 20px; color: #0A66C2; margin: 0 0 12px 0; font-weight: bold; border-bottom: 2px solid #0A66C2; padding-bottom: 5px; } table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 5px; } th, td { border: 1px solid #c7c7cc; padding: 7px 5px; font-size: 10.5px; text-align: center; vertical-align: middle; word-wrap: break-word; } th { background-color: #f2f2f7; font-weight: bold; font-size: 9.5px; text-transform: uppercase; } .cell-data { font-weight: bold; background-color: #f0f5fa; color: #0A66C2; font-size: 11px; width: 75px; } .cell-label { font-weight: 600; background-color: #f2f2f7; text-align: left; padding-left: 6px; width: 85px; } .row-separator td { background-color: #ffffff; }</style></head><body>${corpoHtmlCompleto || '<div class="pagina-pdf"><h1>Diabety - Registro Storico Giornaliero</h1><table><tbody><tr><td>Nessun dato registrato nel periodo selezionato.</td></tr></tbody></table></div>'}</body></html>`;

    if (Platform.OS === 'web' && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      try {
        const blobFile = new Blob([htmlTemplate], { type: 'text/html;charset=utf-8;' }); const urlBlob = URL.createObjectURL(blobFile); const linkDownloadVirtuale = document.createElement('a'); linkDownloadVirtuale.href = urlBlob; linkDownloadVirtuale.setAttribute('download', 'Registro_Glicemico_Diabety.html'); document.body.appendChild(linkDownloadVirtuale); linkDownloadVirtuale.click(); document.body.removeChild(linkDownloadVirtuale); URL.revokeObjectURL(urlBlob);
      } catch (errore) {
        const finestraFallback = window.open('', '_blank'); if (finestraFallback) { finestraFallback.document.write(htmlTemplate); finestraFallback.document.close(); }
      }
    } else {
      const finestraStampa = window.open('', '_blank'); if (finestraStampa) { finestraStampa.document.write(htmlTemplate); finestraStampa.document.close(); finestraStampa.onload = () => { finestraStampa.focus(); finestraStampa.print(); }; }
    }
  };
  return (
    <View style={styles.container}>
      
      {/* 🏷️ HEADER OPERATIVO AGGIORNATO CON ICONA ED ETICHETTA CIANO NEON */}
      <View style={styles.header}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
          <Text style={styles.title}>Storico</Text>
          <TouchableOpacity style={styles.infoHelpButton} onPress={() => setMostraHelpPDF(true)}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.brandPrimary} />
          </TouchableOpacity>
        </View>

        <View style={{flexDirection:'row', gap: 8}}>
          {datiReali.length > 0 && (
            <TouchableOpacity style={styles.exportButtonSvuotaMinimal} onPress={() => setMostraConfermaSvuota(true)}>
              <Text style={styles.exportTextSvuotaRed}>Svuota</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.exportButtonPDFAcrobatNeon} onPress={generaEDesportaPDF}>
            <Ionicons name="document-text-outline" size={16} color={COLORS.brandPrimary} />
            <Text style={styles.exportTextPDFAcrobatNeon}>Esporta PDF</Text>
          </TouchableOpacity>
        </View>
      </View>

      {mostraNotificaSvuotato && (
        <View style={[styles.notificaTendinaGenerale, { backgroundColor: '#092414', borderColor: COLORS.success }]}>
          <Text style={[styles.notificaTesto, { color: COLORS.success }]}>✓ Intero diario glicemico svuotato</Text>
        </View>
      )}

      <View style={styles.filterBar}>
        {[
          { id: '7', etichetta: '7 GG' }, { id: '14', etichetta: '14 GG' }, { id: '30', etichetta: '30 GG' }, { id: '90', etichetta: '90 GG' }, { id: 'all', etichetta: 'Tutti' }
        ].map((f) => (
          <TouchableOpacity key={f.id} style={[styles.filterButton, filtroAttivo === f.id && styles.filterButtonActiveNeon]} onPress={() => setFiltroAttivo(f.id as any)}>
            <Text style={[styles.filterButtonText, filtroAttivo === f.id && styles.filterButtonTextActiveNeon]}>{f.etichetta}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <SectionList
        sections={ottieniDatiSezionati()}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section: { title } }) => <Text style={styles.sectionHeader}>{title}</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => apriModificaItem(item)} activeOpacity={0.7}>
            <View style={styles.timelineContainer}>
              <View style={[styles.timelineDot, { backgroundColor: item.glicemia > 180 ? COLORS.error : item.glicemia < 70 ? COLORS.warning : COLORS.success }]} />
              <View style={styles.timelineLine} />
            </View>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.valoreGlicemia}>{item.glicemia} <Text style={styles.unitaMisura}>mg/dL</Text></Text>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                  <Text style={styles.oraTest}>{item.ora}</Text>
                  <Ionicons name="pencil-sharp" size={12} color={COLORS.muted} />
                </View>
              </View>
              <Text style={styles.tipoPasto}>{item.tipo} {item.insulina !== '-' ? `• Insulina: ${item.insulina}` : ''}</Text>
              {item.note ? <Text style={styles.noteTest}>{item.note}</Text> : null}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={{padding: 40, alignItems: 'center'}}>
            <Text style={{color: COLORS.muted, fontFamily: 'Plus Jakarta Sans'}}>Nessuna misurazione salvata in questo intervallo di tempo.</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
      {/* ℹ️ POPUP MODAL INFORMATIVO HELP ACCORDATO PERFETTAMENTE NELLA GRAFICA ALLA HOME */}
      <Modal visible={mostraHelpPDF} animationType="fade" transparent={true}>
        <View style={styles.modalOverlayCentrato}>
          <View style={styles.modalContentHelp}>
            <Text style={styles.modalTitleHelp}>Guida e Funzionalità</Text>
            
            <View style={styles.helpSectionRow}>
              <View style={[styles.helpIconBox, { backgroundColor: 'rgba(0, 229, 255, 0.08)' }]}>
                <Ionicons name="document-text" size={18} color={COLORS.brandPrimary} />
              </View>
              <View style={styles.helpTextContainer}>
                <Text style={styles.helpSectionHeader}>Esportazione Report PDF</Text>
                <Text style={styles.helpSectionBody}>
                  Cliccando sul pulsante <Text style={{fontWeight: '700', color: COLORS.brandPrimary}}>"Esporta PDF"</Text> potrai scaricare il documento clinico temporale.{"\n"}
                  Il sistema esporterà in modo intelligente solo l'intervallo di tempo che hai selezionato nella barra dei filtri (7, 14, 30, 90 giorni o Tutti).
                </Text>
              </View>
            </View>

            <View style={styles.helpSectionRow}>
              <View style={[styles.helpIconBox, { backgroundColor: '#0C232B' }]}>
                <Ionicons name="pencil-sharp" size={18} color={COLORS.brandPrimary} />
              </View>
              <View style={styles.helpTextContainer}>
                <Text style={styles.helpSectionHeader}>Modifica e Cancellazione</Text>
                <Text style={styles.helpSectionBody}>
                  Puoi correggere, variare o eliminare definitivamente qualsiasi misurazione salvata nel diario.{"\n"}
                  Ti basta toccare l'icona della <Text style={{fontWeight: '700', color: COLORS.brandPrimary}}>matita</Text> posizionata a destra di ogni singolo record cronologico nella lista.
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.btnChiudiHelp} onPress={() => setMostraHelpPDF(false)}>
              <Text style={styles.btnChiudiHelpText}>Ho capito</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* POPUP MODAL DI MODIFICA */}
      <Modal visible={mostraModalModifica} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Gestisci Misurazione</Text>
            <ScrollView style={{maxHeight: 280}} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Data del Test</Text>
              {Platform.OS === 'web' ? (
                <input type="date" value={modDataISO} onChange={(e) => setModDataISO(e.target.value)} style={{ fontFamily: 'sans-serif', fontSize: '14px', fontWeight: '600', color: '#00E5FF', backgroundColor: '#13131A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '6px 10px', marginBottom: '8px', width: '100%', boxSizing: 'border-box', outline: 'none', cursor: 'pointer' }} />
              ) : ( <TextInput style={styles.textInput} value={modDataISO} onChangeText={setModDataISO} /> )}

              <Text style={styles.inputLabel}>Orario del Test (Verrà scritto nelle note)</Text>
              {Platform.OS === 'web' ? (
                <input type="time" value={modOraText} onChange={(e) => setModOraText(e.target.value)} style={{ fontFamily: 'sans-serif', fontSize: '14px', fontWeight: '600', color: '#00E5FF', backgroundColor: '#13131A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '6px 10px', marginBottom: '8px', width: '100%', boxSizing: 'border-box', outline: 'none', cursor: 'pointer' }} />
              ) : ( <TextInput style={styles.textInput} value={modOraText} onChangeText={setModOraText} /> )}

              <Text style={styles.inputLabel}>Glicemia (mg/dL)</Text>
              <TextInput style={styles.textInput} keyboardType="numeric" value={modGlicemia} onChangeText={setModGlicemia} maxLength={3} />
              <Text style={styles.inputLabel}>Insulina (Unità UI)</Text>
              <TextInput style={styles.textInput} keyboardType="numeric" value={modInsulina} onChangeText={setModInsulina} placeholder="Nessuna" maxLength={2} />
              <Text style={styles.inputLabel}>Note / Pasti</Text>
              <TextInput style={styles.textInput} value={modNote} onChangeText={setModNote} />

              <Text style={styles.inputLabel}>Momento della Giornata</Text>
              <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4}}>
                {MOMENTI_COLONNE.map(m => (
                  <TouchableOpacity key={m} style={[styles.chipMomento, modMomento === m && styles.chipMomentoAttiva]} onPress={() => setModMomento(m)}>
                    <Text style={[styles.chipMomentoText, modMomento === m && styles.chipMomentoTextAttiva]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {mostraNotificaModifica && (
              <View style={[styles.notificaTendina, testoNotifica.includes('eliminata') && {backgroundColor: '#1C1314', borderColor: COLORS.error}]}>
                <Text style={[styles.notificaTesto, testoNotifica.includes('eliminata') && {color: COLORS.error}]}>{testoNotifica}</Text>
              </View>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnAnnulla} onPress={() => setMostraModalModifica(false)}><Text style={styles.btnAnnullaText}>Chiudi</Text></TouchableOpacity>
              <TouchableOpacity style={styles.btnElimina} onPress={eliminaSingoloItem}><Ionicons name="trash-outline" size={14} color="#FFF" style={{marginRight: 4}} /><Text style={styles.btnEliminaText}>Elimina</Text></TouchableOpacity>
              <TouchableOpacity style={styles.btnSalva} onPress={salvaModificaItem}><Text style={styles.btnSalvaText}>Salva</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CONFIRMA CANCELLAZIONE */}
      <Modal visible={mostraConfermaSvuota} animationType="fade" transparent={true}>
        <View style={styles.modalOverlayCentrato}>
          <View style={styles.modalContentSvuota}>
            <View style={styles.iconaAvvisoContainer}><Ionicons name="alert-circle" size={40} color={COLORS.error} /></View>
            <Text style={styles.modalTitleSvuota}>Svuotare il Diario?</Text>
            <Text style={styles.modalSubtitleSvuota}>Sei sicuro di voler cancellare l'intero storico delle misurazioni? Questa azione è irreversibile.</Text>
            <View style={styles.modalActionsSvuota}>
              <TouchableOpacity style={styles.btnAnnullaSvuota} onPress={() => setMostraConfermaSvuota(false)}><Text style={styles.btnAnnullaTextSvuota}>Annulla</Text></TouchableOpacity>
              <TouchableOpacity style={styles.btnConfermaSvuota} onPress={confermaCancellaTutto}><Text style={styles.btnConfermaTextSvuota}>Svuota Tutto</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingTop: 15 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 16 },
  title: { fontFamily: 'Space Grotesk', fontSize: 26, fontWeight: '700', color: COLORS.onSurface },
  infoHelpButton: { padding: 4, justifyContent: 'center', alignItems: 'center' },
  exportButtonSvuotaMinimal: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#13131A', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 82, 82, 0.15)' },
  exportTextSvuotaRed: { fontFamily: 'Plus Jakarta Sans', color: COLORS.error, fontWeight: '600', fontSize: 14 },

  // STYLE AGGIORNATO AL LOOK PREMIUM NEON AZZURRO CYAN COERENTE AL TARGET BRAND
  exportButtonPDFAcrobatNeon: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: "rgba(0, 229, 255, 0.05)", 
    paddingVertical: 8, 
    paddingHorizontal: 12, 
    borderRadius: 12, 
    gap: 6, 
    borderWidth: 1, 
    borderColor: "#00E5FF" 
  },
  exportTextPDFAcrobatNeon: { fontFamily: 'Plus Jakarta Sans', color: "#00E5FF", fontWeight: '700', fontSize: 14 },

  filterBar: { flexDirection: 'row', paddingHorizontal: 16, gap: 5, marginBottom: 16 },
  filterButton: { flex: 1, backgroundColor: COLORS.surfaceSecondary, paddingVertical: 10, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.borderGlass },
  filterButtonActiveNeon: { backgroundColor: "#0C232B", borderColor: COLORS.brandPrimary, borderWidth: 1 },
  filterButtonText: { fontFamily: 'Plus Jakarta Sans', fontSize: 11, fontWeight: '600', color: COLORS.muted },
  filterButtonTextActiveNeon: { color: COLORS.brandPrimary, fontWeight: '700' },
  listContent: { paddingHorizontal: 16, paddingBottom: 110 }, 
  sectionHeader: { fontFamily: 'Plus Jakarta Sans', fontSize: 16, fontWeight: '700', color: COLORS.onSurface, backgroundColor: COLORS.background, paddingVertical: 8 },
  row: { flexDirection: 'row', minHeight: 90 },
  timelineContainer: { width: 24, alignItems: 'center' },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 18, zIndex: 2 },
  timelineLine: { position: 'absolute', top: 30, bottom: 0, width: 2, backgroundColor: COLORS.surfaceSecondary, zIndex: 1 },
  card: { flex: 1, backgroundColor: COLORS.surfaceSecondary, borderRadius: 12, padding: 12, marginBottom: 12, marginLeft: 8, borderWidth: 1, borderColor: COLORS.borderGlass },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  valoreGlicemia: { fontFamily: 'Space Grotesk', fontSize: 22, fontWeight: '700', color: COLORS.onSurface },
  unitaMisura: { fontSize: 12, color: COLORS.muted, fontWeight: '400' },
  oraTest: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, color: COLORS.muted },
  tipoPasto: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, color: COLORS.onSurface, marginTop: 4, fontWeight: '500' },
  noteTest: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, color: COLORS.muted, marginTop: 4, fontStyle: 'italic' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 16 },
  modalContent: { backgroundColor: '#111116', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: COLORS.borderGlass },
  modalTitle: { fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: '700', color: COLORS.onSurface, marginBottom: 8 },
  inputLabel: { fontFamily: 'Plus Jakarta Sans', fontSize: 13, fontWeight: '600', color: COLORS.muted, marginTop: 10, marginBottom: 4, textAlign: 'left', alignSelf: 'flex-start' },
  textInput: { backgroundColor: '#1C1C24', borderRadius: 10, padding: 10, fontSize: 14, color: COLORS.onSurface, marginBottom: 4, textAlign: 'left', width: '100%', borderWidth: 1, borderColor: COLORS.borderGlass },
  chipMomento: { backgroundColor: '#1C1C24', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1, borderColor: 'transparent' },
  chipMomentoAttiva: { backgroundColor: '#0C232B', borderWidth: 1, borderColor: COLORS.brandPrimary },
  chipMomentoText: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, color: COLORS.muted },
  chipMomentoTextAttiva: { color: COLORS.brandPrimary, fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 24 },
  btnAnnulla: { flex: 1, backgroundColor: '#1C1C24', padding: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.borderGlass },
  btnAnnullaText: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '600', color: COLORS.onSurface },
  btnElimina: { flex: 1.2, backgroundColor: '#FF5252', padding: 12, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  btnEliminaText: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '600', color: '#FFF' },
  btnSalva: { flex: 1.2, backgroundColor: COLORS.brandPrimary, padding: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnSalvaText: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '600', color: '#0A0A0C' },
  notificaTendina: { backgroundColor: '#092414', borderColor: COLORS.success, borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 15, alignItems: 'center' },
  notificaTesto: { fontFamily: 'Plus Jakarta Sans', color: COLORS.success, fontWeight: '600', fontSize: 14 },
  modalOverlayCentrato: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContentSvuota: { backgroundColor: '#111116', borderRadius: 24, padding: 24, width: '100%', maxWidth: 340, alignItems: 'center', borderWidth: 1, borderColor: COLORS.borderGlass },
  iconaAvvisoContainer: { marginBottom: 12, backgroundColor: '#240F10', padding: 10, borderRadius: 999 },
  modalTitleSvuota: { fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: '700', color: COLORS.onSurface, marginBottom: 8 },
  modalSubtitleSvuota: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, color: COLORS.muted, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  modalActionsSvuota: { flexDirection: 'row', gap: 12, width: '100%' },
  btnAnnullaSvuota: { flex: 1, backgroundColor: '#1C1C24', paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.borderGlass },
  btnAnnullaTextSvuota: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '600', color: COLORS.onSurface },
  btnConfermaSvuota: { flex: 1, backgroundColor: '#FF5252', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  btnConfermaTextSvuota: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '600', color: '#FFF' },
  notificaTendinaGenerale: { padding: 12, borderRadius: 12, borderWidth: 1, marginHorizontal: 16, marginBottom: 12, alignItems: 'center' },

  modalContentHelp: { backgroundColor: '#111116', borderRadius: 24, padding: 24, width: '100%', maxWidth: 360, alignItems: 'center', borderWidth: 1, borderColor: COLORS.borderGlass },
  modalTitleHelp: { fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: '800', color: COLORS.onSurface, marginBottom: 24, alignSelf: 'flex-start', letterSpacing: -0.3 },
  helpSectionRow: { flexDirection: 'row', width: '100%', gap: 14, marginBottom: 20, alignItems: 'flex-start' },
  helpIconBox: { padding: 8, borderRadius: 10, justifyContent: 'center', alignItems: 'center', width: 34, height: 34 },
  helpTextContainer: { flex: 1, alignItems: 'flex-start' },
  helpSectionHeader: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: COLORS.onSurface, marginBottom: 4 },
  helpSectionBody: { fontFamily: 'Plus Jakarta Sans', fontSize: 14.5, color: COLORS.muted, lineHeight: 22, textAlign: 'left' },
  btnChiudiHelp: { marginTop: 10, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: COLORS.borderGlass, paddingVertical: 12, borderRadius: 12, width: '100%', alignItems: 'center' },
  btnChiudiHelpText: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: COLORS.onSurface }
});
