import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 📂 IMPORTAZIONE ASINCRONA DEL TUO DATABASE DI ALIMENTI ESTERNO JSON
import DATABASE_ALIMENTI_ESTERNO from '../../constants/alimenti_database.json';

const COLORS = {
  background: "#0A0A0C",        
  surfaceSecondary: "#13131A",  
  brandPrimary: "#00E5FF",      // Cyan neon attivo
  brandSecondary: "#7D52FF",    // Viola tech
  onSurface: "#FFFFFF",         
  muted: "#7E7E86",             
  success: "#00E676",           // Verde smeraldo Oled per il totale CHO cumulativo
  error: "#FF5252",             // Rosso per eliminare i cibi dal piatto
  borderGlass: "rgba(255, 255, 255, 0.08)"
};

// Ordiniamo alfabeticamente l'array importato per garantire una ricerca utente ottimale
const DATABASE_ALIMENTI = [...DATABASE_ALIMENTI_ESTERNO].sort((a, b) => a.nome.localeCompare(b.nome));
// Solo i valori che coincidono con le verifiche documentate sono mostrati senza ≈.
// Tutti gli altri sono indicativi: il JSON conserva esclusivamente i valori numerici.
const ID_CHO_VERIFICATI = new Set(['37', '40', '50', '54']);
const valoreIndicativo = (id: string) => !ID_CHO_VERIFICATI.has(id);
const STORAGE_PREFERITI = 'diabety_alimenti_preferiti_v1';
const STORAGE_PIATTO = 'diabety_alimenti_piatto_v1';
const normalizzaRicerca = (testo: string) => testo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('it').trim();
export default function AlimentiScreen() {
  const [ricerca, setCerca] = useState('');
  const [categoriaAperta, setCategoriaAperta] = useState<string | null>('Preferiti');
  const [preferiti, setPreferiti] = useState<string[]>([]);
  const [datiCaricati, setDatiCaricati] = useState(false);
  const prossimoId = useRef(0);
  
  // Memorizziamo le grammature degli alimenti salvandole come stringhe per permettere la digitazione fluida
  const [grammature, setGrammature] = useState<Record<string, string>>({});
  
  // 🍽️ STATO DEL PIATTO VIRTUALE: Array di elementi selezionati accumulati
  const [piattoSelezionato, setPiattoSelezionato] = useState<any[]>([]);

  // Preferiti e piatto sono locali al dispositivo, senza condivisione esterna.
  useEffect(() => {
    let attivo = true;
    const carica = async () => {
      try {
        const [salvatiPreferiti, salvatoPiatto] = await Promise.all([
          AsyncStorage.getItem(STORAGE_PREFERITI),
          AsyncStorage.getItem(STORAGE_PIATTO)
        ]);
        if (!attivo) return;
        if (salvatiPreferiti) {
          const elenco = JSON.parse(salvatiPreferiti);
          if (Array.isArray(elenco)) setPreferiti(elenco.filter((id): id is string => typeof id === 'string'));
        }
        if (salvatoPiatto) {
          const elenco = JSON.parse(salvatoPiatto);
          if (Array.isArray(elenco)) {
            setPiattoSelezionato(elenco.filter((item: any) =>
              item && typeof item.idUnico === 'string' && typeof item.alimentoId === 'string' &&
              typeof item.nome === 'string' && Number.isFinite(item.grammi) && item.grammi > 0 &&
              item.grammi <= 500 && Number.isFinite(item.choTotali)
            ));
          }
        }
      } catch (errore) {
        console.warn('DIABETY: impossibile ripristinare preferiti o piatto', errore);
      } finally {
        if (attivo) setDatiCaricati(true);
      }
    };
    carica();
    return () => { attivo = false; };
  }, []);

  useEffect(() => {
    if (datiCaricati) AsyncStorage.setItem(STORAGE_PREFERITI, JSON.stringify(preferiti))
      .catch(errore => console.warn('DIABETY: errore salvataggio preferiti', errore));
  }, [preferiti, datiCaricati]);

  useEffect(() => {
    if (datiCaricati) AsyncStorage.setItem(STORAGE_PIATTO, JSON.stringify(piattoSelezionato))
      .catch(errore => console.warn('DIABETY: errore salvataggio piatto', errore));
  }, [piattoSelezionato, datiCaricati]);

  const cambiaPreferito = (id: string) => {
    setPreferiti(prev => prev.includes(id) ? prev.filter(preferito => preferito !== id) : [...prev, id]);
  };

  const modificaGrammiNelPiatto = (idUnico: string, testo: string) => {
    const cifre = testo.replace(/[^0-9]/g, '');
    const grammi = Math.min(500, parseInt(cifre, 10) || 0);
    setPiattoSelezionato(prev => prev.map(item => {
      if (item.idUnico !== idUnico) return item;
      const alimento = DATABASE_ALIMENTI.find(a => a.id === item.alimentoId);
      const cho100g = alimento ? alimento.cho100g : (item.grammi > 0 ? item.choTotali * 100 / item.grammi : 0);
      return { ...item, grammi, choTotali: Number(((grammi * cho100g) / 100).toFixed(1)) };
    }));
  };

  const CATEGORIE = ['Primi', 'Pane e Forno', 'Frutta', 'Colazione', 'Pizze e Fast Food', 'Bevande', 'Verdure e Piatti Unici'];

  const gestisciCambioTestoGrammi = (id: string, testo: string) => {
    const testoPulito = testo.replace(/[^0-9]/g, '');
    if (testoPulito === '') {
      setGrammature(prev => ({ ...prev, [id]: '' }));
      return;
    }
    const valoreNumerico = parseInt(testoPulito, 10);
    if (valoreNumerico > 500) {
      setGrammature(prev => ({ ...prev, [id]: '500' }));
    } else {
      setGrammature(prev => ({ ...prev, [id]: valoreNumerico.toString() }));
    }
  };

  // ➕ FUNZIONE PER AGGIUNGERE UN ALIMENTO E I SUOI CHO AL PIATTO COMPLESSIVO
  const aggiungiAlPiatto = (alimento: any) => {
    const stringaGrammi = grammature[alimento.id] || '';
    const grammi = parseInt(stringaGrammi, 10) || 0;
    if (grammi <= 0) return;

    const choCalcolati = parseFloat(((grammi * alimento.cho100g) / 100).toFixed(1));
    
    const nuovoElementoPiatto = {
      idUnico: `${Date.now()}_${++prossimoId.current}_${alimento.id}`, 
      alimentoId: alimento.id,
      nome: alimento.nome,
      grammi: grammi,
      choTotali: choCalcolati
    };

    setPiattoSelezionato(prev => [...prev, nuovoElementoPiatto]);
  };

  // ✕ FUNZIONE AGGIORNATA: Rimuove un singolo cibo e resetta istantaneamente il suo riquadro su 00
  const rimuoviDalPiatto = (idUnico: string, alimentoId: string) => {
    setPiattoSelezionato(prev => prev.filter(item => item.idUnico !== idUnico));
    
    setGrammature(prev => {
      const nuoveGrammature = { ...prev };
      delete nuoveGrammature[alimentoId];
      return nuoveGrammature;
    });
  };

  // 🧼 FUNZIONE AGGIORNATA: Svuota l'intero piatto e azzera TUTTI i riquadri numerici dell'app in un colpo solo
  const svuotaPiattoCompleto = () => {
    setPiattoSelezionato([]);
    setGrammature({}); // 🔄 Ripristina istantaneamente tutti gli input a default (vuoti / 00)
  };

  // 🧮 CALCOLO MATEMATICO DEL TOTALE DEI CARBOIDRATI CUMULATIVI DEL PIATTO LIVE
  const totaleChoPiatto = piattoSelezionato.reduce((acc, item) => acc + item.choTotali, 0).toFixed(1);
  const piattoIndicativo = piattoSelezionato.some(item => valoreIndicativo(item.alimentoId));

  // Una sola categoria espansa per volta; la ricerca ignora le categorie.
  const ricercaAttiva = normalizzaRicerca(ricerca).length > 0;
  const risultatiRicerca = ricercaAttiva
    ? DATABASE_ALIMENTI.filter(alimento => normalizzaRicerca(alimento.nome).includes(normalizzaRicerca(ricerca)))
    : [];
  type RigaElenco =
    | { tipo: 'categoria'; id: string; titolo: string; aperta: boolean; conteggio?: number }
    | { tipo: 'alimento'; id: string; alimento: typeof DATABASE_ALIMENTI[number] }
    | { tipo: 'messaggio'; id: string; testo: string }
    | { tipo: 'titoloRicerca'; id: string; testo: string };

  const righe: RigaElenco[] = [];
  if (ricercaAttiva) {
    righe.push({ tipo: 'titoloRicerca', id: 'ricerca-intestazione', testo: `${risultatiRicerca.length} ${risultatiRicerca.length === 1 ? 'risultato' : 'risultati'}` });
    risultatiRicerca.forEach(alimento => righe.push({ tipo: 'alimento', id: `alimento-${alimento.id}`, alimento }));
    if (!risultatiRicerca.length) righe.push({ tipo: 'messaggio', id: 'nessun-risultato', testo: 'Nessun alimento trovato. Prova un altro nome o una marca.' });
  } else {
    const preferitiAlimenti = DATABASE_ALIMENTI.filter(alimento => preferiti.includes(alimento.id));
    righe.push({ tipo: 'categoria', id: 'categoria-Preferiti', titolo: 'Preferiti', aperta: categoriaAperta === 'Preferiti', conteggio: preferitiAlimenti.length });
    if (categoriaAperta === 'Preferiti') {
      if (!preferitiAlimenti.length) righe.push({ tipo: 'messaggio', id: 'preferiti-vuoti', testo: 'Non hai ancora alimenti preferiti. Apri una categoria e tocca la stella per aggiungerli.' });
      preferitiAlimenti.forEach(alimento => righe.push({ tipo: 'alimento', id: `alimento-${alimento.id}`, alimento }));
    }
    righe.push({ tipo: 'titoloRicerca', id: 'altre-categorie', testo: 'ALTRE CATEGORIE' });
    CATEGORIE.forEach(categoria => {
      const aperta = categoriaAperta === categoria;
      righe.push({ tipo: 'categoria', id: `categoria-${categoria}`, titolo: categoria, aperta });
      if (aperta) DATABASE_ALIMENTI.filter(alimento => alimento.categoria === categoria)
        .forEach(alimento => righe.push({ tipo: 'alimento', id: `alimento-${alimento.id}`, alimento }));
    });
  }

  return (
    <View style={styles.container}>
      
      {/* 🔍 BARRA DI RICERCA FISSA IN ALTO */}
      <View style={styles.containerRicercaFissa}>
        <Text style={styles.title}>Dizionario Carboidrati</Text>
        <Text style={styles.subtitle}>Componi il tuo piatto e calcola il totale dei carboidrati</Text>
        
        <View style={styles.boxInputRicerca}>
          <Ionicons name="search-outline" size={18} color={COLORS.muted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.inputRicercaTesto}
            placeholder="Cerca alimento o marca..."
            placeholderTextColor="#636366"
            value={ricerca}
            onChangeText={setCerca}
            autoCorrect={false}
          />
          {ricerca.length > 0 && (
            <TouchableOpacity onPress={() => setCerca('')}>
              <Ionicons name="close-circle" size={16} color={COLORS.muted} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.notaValoriIndicativi}>≈ valore CHO indicativo, non verificato per questo alimento</Text>
      </View>

      {/* Elenco a fisarmonica: Preferiti aperti all'avvio; ricerca globale immediata. */}
      <FlatList
        data={righe}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={5}
        renderItem={({ item: riga }) => {
          if (riga.tipo === 'categoria') {
            return (
              <TouchableOpacity
                style={[styles.rigaCategoriaEspandibile, riga.aperta && styles.rigaCategoriaAperta]}
                onPress={() => setCategoriaAperta(prev => prev === riga.titolo ? null : riga.titolo)}
                accessibilityRole="button"
                accessibilityState={{ expanded: riga.aperta }}
                accessibilityLabel={`${riga.titolo}, ${riga.aperta ? 'aperta' : 'chiusa'}`}
              >
                <View style={styles.rigaCategoriaTitolo}>
                  {riga.titolo === 'Preferiti' && <Ionicons name="star" size={18} color="#FFD54F" />}
                  <Text style={[styles.testoCategoriaEspandibile, riga.aperta && styles.testoCategoriaAperta]}>{riga.titolo}</Text>
                  {riga.conteggio !== undefined && <Text style={styles.conteggioPreferiti}>{riga.conteggio}</Text>}
                </View>
                <Ionicons name={riga.aperta ? 'chevron-up' : 'chevron-down'} size={19} color={riga.aperta ? COLORS.brandPrimary : COLORS.muted} />
              </TouchableOpacity>
            );
          }
          if (riga.tipo === 'messaggio') return (
            <View style={styles.messaggioElenco}><Text style={styles.testoMessaggioElenco}>{riga.testo}</Text></View>
          );
          if (riga.tipo === 'titoloRicerca') return <Text style={styles.intestazioneElenco}>{riga.testo}</Text>;
          const item = riga.alimento;
          const stringaGrammi = grammature[item.id] !== undefined ? grammature[item.id] : '';
          const grammiValore = parseInt(stringaGrammi, 10) || 0;
          const choCalcolati = ((grammiValore * item.cho100g) / 100).toFixed(1);

          return (
            <View style={styles.cardAlimentoPremium}>
              <View style={styles.rigaInfoSuperiore}>
                <View style={styles.boxTestiSinistra}>
                  <View style={styles.rigaNomePreferito}>
                    <Text style={[styles.nomeAlimento, { flex: 1 }]} numberOfLines={2}>{item.nome}</Text>
                    <TouchableOpacity onPress={() => cambiaPreferito(item.id)} style={styles.pulsanteStella} accessibilityLabel={preferiti.includes(item.id) ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}>
                      <Ionicons name={preferiti.includes(item.id) ? 'star' : 'star-outline'} size={21} color={preferiti.includes(item.id) ? '#FFD54F' : COLORS.muted} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.etichettaValoreBase}>Valore base: {valoreIndicativo(item.id) ? '≈ ' : ''}{item.cho100g} g CHO / 100 g</Text>
                </View>

                <View style={styles.boxRiquadroInputDestra}>
                  <TextInput
                    style={[styles.inputGrammiRiquadro, stringaGrammi !== '' && styles.inputGrammiRiquadroAttivo]}
                    placeholder="00"
                    placeholderTextColor="#636366"
                    keyboardType="numeric"
                    value={stringaGrammi}
                    onChangeText={(t) => gestisciCambioTestoGrammi(item.id, t)}
                    maxLength={3}
                    selectTextOnFocus={true}
                  />
                  <Text style={styles.etichettaUnitaGg}>g</Text>
                  
                  <TouchableOpacity 
                    style={[styles.btnAggiungiPiattoClick, grammiValore <= 0 && { opacity: 0.3 }]} 
                    onPress={() => aggiungiAlPiatto(item)}
                    disabled={grammiValore <= 0}
                  >
                    <Ionicons name="add" size={18} color="#0A0A0C" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.rigaDettaglioValore}>
                <Text style={styles.etichettaRisultatoCHO}>CHO parziali per questo peso:</Text>
                <Text style={[styles.valoreCalcolatoCho, grammiValore > 0 && { color: COLORS.brandPrimary }]}>
                  {valoreIndicativo(item.id) ? '≈ ' : ''}{choCalcolati} <Text style={styles.unitaChoSub}>g CHO</Text>
                </Text>
              </View>
            </View>
          );
        }}
      />
      {/* 🍽️ PANNELLO VISIVAMENTE ISOLATO DALLO SFONDO GRAZIE ALLA TONALITÀ ZINCO TECH ED ELEVAZIONE BORDO CYAN */}
      {piattoSelezionato.length > 0 && (
        <View style={styles.footerPiattoCumulativo}>
          <View style={styles.headerPiattoRiepilogo}>
            <Text style={styles.titoloPiattoSezione}>Il tuo Piatto ({piattoSelezionato.length})</Text>
            <TouchableOpacity onPress={svuotaPiattoCompleto}>
              <Text style={styles.testoSvuotaPiatto}>Svuota</Text>
            </TouchableOpacity>
          </View>

          {/* Modifica direttamente le grammature degli alimenti del piatto. */}
          <ScrollView style={styles.listaPiattoModificabile} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {piattoSelezionato.map((item) => (
              <View key={item.idUnico} style={styles.rigaCiboPiatto}>
                <Text style={styles.nomeCiboPiatto} numberOfLines={2}>{item.nome}</Text>
                <TextInput
                  style={styles.inputGrammiPiatto}
                  keyboardType="numeric"
                  value={item.grammi === 0 ? '' : String(item.grammi)}
                  onChangeText={testo => modificaGrammiNelPiatto(item.idUnico, testo)}
                  maxLength={3}
                  selectTextOnFocus
                  accessibilityLabel={`Grammi di ${item.nome}`}
                />
                <Text style={styles.unitaGrammiPiatto}>g</Text>
                <Text style={styles.choCiboPiatto}>{valoreIndicativo(item.alimentoId) ? '≈ ' : ''}{item.choTotali.toFixed(1)} CHO</Text>
                <TouchableOpacity
                  style={styles.btnRimuoviCiboSingolo}
                  onPress={() => rimuoviDalPiatto(item.idUnico, item.alimentoId)}
                  accessibilityLabel={`Rimuovi ${item.nome} dal piatto`}
                >
                  <Ionicons name="close-circle-outline" size={21} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          {/* 🧮 BLOCCO TOTALE MATEMATICO DEL PASTO COMPLESSIVO */}
          <View style={styles.rigaTotaleCumulativoFinale}>
            <Text style={styles.etichettaTotalePiatto}>Totale Carboidrati Piatto:</Text>
            <Text style={styles.valoreTotalePiatto}>{piattoIndicativo ? '≈ ' : ''}{totaleChoPiatto} <Text style={styles.unitaTotalePiatto}>g CHO</Text></Text>
          </View>
        </View>
      )}

    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  containerRicercaFissa: { padding: 16, paddingTop: 20, backgroundColor: COLORS.background, borderBottomWidth: 1, borderBottomColor: COLORS.borderGlass, width: '100%' },
  title: { fontFamily: 'Space Grotesk', fontSize: 26, fontWeight: '700', color: COLORS.onSurface },
  subtitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 13, color: COLORS.muted, marginTop: 4 },
  
  notaValoriIndicativi: { fontFamily: 'Plus Jakarta Sans', fontSize: 10, color: COLORS.muted, marginTop: 8 },
  boxInputRicerca: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceSecondary, borderRadius: 12, paddingHorizontal: 12, height: 44, marginTop: 14, borderWidth: 1, borderColor: COLORS.borderGlass },
  inputRicercaTesto: { flex: 1, color: COLORS.onSurface, fontFamily: 'Plus Jakarta Sans', fontSize: 14, paddingVertical: 4 },
  
  containerFiltroCategorie: { backgroundColor: COLORS.background, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.borderGlass, width: '100%' },
  scrollCategorieContent: { paddingHorizontal: 16, gap: 8 },
  chipPreferiti: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rigaNomePreferito: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  pulsanteStella: { padding: 5, marginLeft: 4 },
  chipCategoria: { backgroundColor: COLORS.surfaceSecondary, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: COLORS.borderGlass },
  chipCategoriaAttiva: { backgroundColor: "rgba(0, 229, 255, 0.08)", borderColor: COLORS.brandPrimary },
  textChipCategoria: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, fontWeight: '600', color: COLORS.muted },
  textChipCategoriaAttivo: { color: COLORS.brandPrimary, fontWeight: '700' },

  listContent: { padding: 16, paddingBottom: 180 },
  rigaCategoriaEspandibile: { backgroundColor: COLORS.surfaceSecondary, borderRadius: 12, borderWidth: 1, borderColor: COLORS.borderGlass, paddingHorizontal: 16, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 },
  rigaCategoriaAperta: { backgroundColor: 'rgba(0, 229, 255, 0.07)', borderColor: COLORS.brandPrimary },
  rigaCategoriaTitolo: { flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1 },
  testoCategoriaEspandibile: { color: COLORS.onSurface, fontFamily: 'Plus Jakarta Sans', fontWeight: '600', fontSize: 14 },
  testoCategoriaAperta: { color: COLORS.brandPrimary },
  conteggioPreferiti: { color: COLORS.muted, fontSize: 12 },
  intestazioneElenco: { color: COLORS.muted, fontFamily: 'Plus Jakarta Sans', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 12, marginBottom: 12 },
  messaggioElenco: { paddingVertical: 24, paddingHorizontal: 18, marginBottom: 10 },
  testoMessaggioElenco: { color: COLORS.muted, fontFamily: 'Plus Jakarta Sans', fontSize: 13, textAlign: 'center', lineHeight: 20 }, 
  cardAlimentoPremium: { backgroundColor: COLORS.surfaceSecondary, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.borderGlass, marginBottom: 12, width: '100%' },
  rigaInfoSuperiore: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderBottomWidth: 1, borderBottomColor: "rgba(255, 255, 255, 0.04)", paddingBottom: 10 },
  boxTestiSinistra: { flex: 1, marginRight: 10, alignItems: 'flex-start' },
  nomeAlimento: { fontFamily: 'Plus Jakarta Sans', fontSize: 15, fontWeight: '700', color: COLORS.onSurface, marginBottom: 4 },
  etichettaValoreBase: { fontFamily: 'Plus Jakarta Sans', fontSize: 11, color: COLORS.muted },
  
  boxRiquadroInputDestra: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  inputGrammiRiquadro: { backgroundColor: '#1A1A24', borderHorizontalWidth: 1, borderColor: COLORS.borderGlass, borderWidth: 1, borderRadius: 10, width: 60, height: 38, textAlign: 'center', color: COLORS.muted, fontFamily: 'Space Grotesk', fontSize: 15, fontWeight: '700' },
  inputGrammiRiquadroAttivo: { borderColor: COLORS.brandPrimary, color: COLORS.brandPrimary, backgroundColor: 'rgba(0, 229, 255, 0.02)' },
  etichettaUnitaGg: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '600', color: COLORS.muted, marginRight: 2 },
  
  btnAggiungiPiattoClick: { backgroundColor: COLORS.brandPrimary, width: 28, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },

  rigaDettaglioValore: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: 10 },
  etichettaRisultatoCHO: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, color: COLORS.muted, fontWeight: '500' },
  valoreCalcolatoCho: { fontFamily: 'Space Grotesk', fontSize: 18, fontWeight: '800', color: COLORS.muted },
  unitaChoSub: { fontSize: 11, color: COLORS.muted, fontWeight: '500' },

  // 📐 CSS PANNELLO "IL TUO PIATTO" IN TONALITÀ ZINCO TECH SCHIARITA AD HIGH CONTRAST TRIDIMENSIONAL FLOATING
  footerPiattoCumulativo: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    backgroundColor: "#22222C", // Schiarito significativamente per un distacco immediato dallo sfondo #0A0A0C
    borderTopWidth: 1.5, 
    borderTopColor: "#00E5FF",  // Filo Ciano Neon brillante per marcare visivamente l'elevazione
    borderLeftWidth: 1,
    borderLeftColor: "rgba(0, 229, 255, 0.20)",
    borderRightWidth: 1,
    borderRightColor: "rgba(0, 229, 255, 0.20)",
    padding: 16, 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    shadowColor: "#000000", 
    shadowOffset: { width: 0, height: -12 }, 
    shadowOpacity: 0.75, 
    shadowRadius: 18, 
    elevation: 25 
  },
  headerPiattoRiepilogo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, width: '100%' },
  titoloPiattoSezione: { fontFamily: 'Space Grotesk', fontSize: 16, fontWeight: '700', color: COLORS.onSurface },
  testoSvuotaPiatto: { fontFamily: 'Plus Jakarta Sans', fontSize: 13, color: COLORS.error, fontWeight: '600' },
  scrollCibiPiatto: { width: '100%', maxHeight: 36, marginBottom: 4 },
  listaPiattoModificabile: { maxHeight: 180, width: '100%' },
  rigaCiboPiatto: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: COLORS.borderGlass },
  nomeCiboPiatto: { color: COLORS.onSurface, fontSize: 12, flex: 1, fontFamily: 'Plus Jakarta Sans' },
  inputGrammiPiatto: { backgroundColor: COLORS.surfaceSecondary, borderWidth: 1, borderColor: COLORS.brandPrimary, borderRadius: 8, color: COLORS.brandPrimary, textAlign: 'center', width: 45, height: 34, fontSize: 13 },
  unitaGrammiPiatto: { color: COLORS.muted, fontSize: 11 },
  choCiboPiatto: { color: COLORS.success, width: 67, textAlign: 'right', fontSize: 11, fontWeight: '700' },
  chipCiboInserito: { flexDirection: 'row', alignItems: 'center', backgroundColor: "#13131A", borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.08)", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, gap: 6 },
  testoChipCiboInserito: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, color: COLORS.onSurface, fontWeight: '500' },
  btnRimuoviCiboSingolo: { justifyContent: 'center', alignItems: 'center', paddingLeft: 2 },
  rigaTotaleCumulativoFinale: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderTopWidth: 1, borderTopColor: "rgba(255, 255, 255, 0.06)", paddingTop: 12, marginTop: 8 },
  etichettaTotalePiatto: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: COLORS.onSurface },
  valoreTotalePiatto: { fontFamily: 'Space Grotesk', fontSize: 24, fontWeight: '900', color: COLORS.success },
  unitaTotalePiatto: { fontSize: 13, color: COLORS.muted, fontWeight: '600' }
});
