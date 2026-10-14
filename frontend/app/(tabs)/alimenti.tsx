import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, ScrollView, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';

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
  const [categoriaAperta, setCategoriaAperta] = useState<string | null>(null);
  const [grigliaAperta, setGrigliaAperta] = useState(false);
  const [altezzaPiatto, setAltezzaPiatto] = useState(0);
  useFocusEffect(useCallback(() => {
    // A ogni ingresso nella scheda il selettore parte chiuso.
    setGrigliaAperta(false);
    return () => setGrigliaAperta(false);
  }, []));
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

  const ricercaAttiva = normalizzaRicerca(ricerca).length > 0;
  const risultati = ricercaAttiva
    ? DATABASE_ALIMENTI.filter(a => normalizzaRicerca(a.nome).includes(normalizzaRicerca(ricerca)))
    : categoriaAperta === 'Preferiti'
      ? DATABASE_ALIMENTI.filter(a => preferiti.includes(a.id))
      : categoriaAperta
        ? DATABASE_ALIMENTI.filter(a => a.categoria === categoriaAperta)
        : [];
  const categorieGriglia = ['Preferiti', ...CATEGORIE];
  const cambiaRicerca = (testo: string) => {
    setCerca(testo);
    if (normalizzaRicerca(testo)) setGrigliaAperta(false);
  };
  const scegliCategoria = (categoria: string) => {
    setCategoriaAperta(categoria);
    setGrigliaAperta(false);
    Keyboard.dismiss();
  };
  const formatCho = (valore: number) => valore.toFixed(1).replace('.', ',');

  const renderAlimento = ({ item }: { item: typeof DATABASE_ALIMENTI[number] }) => {
    const grammiTesto = grammature[item.id] ?? '';
    const grammi = parseInt(grammiTesto, 10) || 0;
    const cho = (grammi * item.cho100g) / 100;
    const indicativo = valoreIndicativo(item.id);
    const preferito = preferiti.includes(item.id);
    return (
      <View style={styles.cardAlimento}>
        <View style={styles.rigaNome}>
          <Text style={styles.nomeAlimento} numberOfLines={2}>{item.nome}</Text>
          <TouchableOpacity onPress={() => cambiaPreferito(item.id)} accessibilityRole="button" accessibilityLabel={preferito ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'} style={styles.stella}>
            <Ionicons name={preferito ? 'star' : 'star-outline'} size={23} color={preferito ? '#FFD54F' : '#94A9BA'} />
          </TouchableOpacity>
        </View>
        <Text style={styles.choBase}>{indicativo ? '≈ ' : ''}{String(item.cho100g).replace('.', ',')} g CHO per 100 g</Text>
        <View style={styles.rigaQuantita}>
          <View style={styles.inputGrammiContenitore}>
            <TextInput
              style={styles.inputGrammi}
              keyboardType="number-pad"
              value={grammiTesto}
              onChangeText={t => gestisciCambioTestoGrammi(item.id, t)}
              placeholder="0"
              placeholderTextColor="#7890A3"
              maxLength={3}
              selectTextOnFocus
              accessibilityLabel={`Grammi di ${item.nome}`}
            />
            <Text style={styles.unitaGrammi}>g</Text>
          </View>
          <Text style={styles.choCalcolati} numberOfLines={1}>{indicativo ? '≈ ' : ''}{formatCho(cho)} g CHO</Text>
          <TouchableOpacity
            onPress={() => aggiungiAlPiatto(item)}
            disabled={grammi <= 0}
            accessibilityRole="button"
            accessibilityLabel={`Aggiungi ${item.nome} al piatto`}
            style={[styles.aggiungi, grammi <= 0 && styles.aggiungiDisabilitato]}
          >
            <Ionicons name="add" size={26} color="#06141B" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.areaSuperiore}>
        <View style={styles.headerPremium}>
          <View style={styles.accentoHeader} />
          <View style={styles.testoHeader}>
            <Text style={styles.titoloHeader} numberOfLines={2}>Alimenti e Carboidrati</Text>
          </View>
        </View>
        <View style={styles.ricercaBox}>
          <Ionicons name="search-outline" size={22} color={COLORS.brandPrimary} />
          <TextInput
            style={styles.ricercaInput}
            placeholder="Cerca qualsiasi alimento..."
            placeholderTextColor="#91A7B9"
            value={ricerca}
            onChangeText={cambiaRicerca}
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Cerca tra tutti gli alimenti"
          />
          {!!ricerca && <TouchableOpacity onPress={() => cambiaRicerca('')} accessibilityLabel="Cancella ricerca"><Ionicons name="close-circle" size={20} color="#A0B3C1" /></TouchableOpacity>}
        </View>
        {!ricercaAttiva && (
          <>
            <TouchableOpacity
              style={[styles.bottoneCategorie, grigliaAperta && styles.bottoneCategorieAttivo]}
              onPress={() => setGrigliaAperta(v => !v)}
              accessibilityRole="button"
              accessibilityState={{ expanded: grigliaAperta }}
              accessibilityLabel="Sfoglia categorie"
            >
              <Ionicons name="grid-outline" size={22} color={COLORS.brandPrimary} />
              <Text style={styles.testoBottoneCategorie}>Sfoglia categorie</Text>
              <Ionicons name={grigliaAperta ? 'chevron-up' : 'chevron-down'} size={22} color={COLORS.brandPrimary} />
            </TouchableOpacity>
            {grigliaAperta && (
              <View style={styles.grigliaCategorie}>
                {categorieGriglia.map((categoria, indice) => (
                  <TouchableOpacity
                    key={categoria}
                    style={[styles.cellaCategoria, categoriaAperta === categoria && styles.cellaCategoriaSelezionata]}
                    onPress={() => scegliCategoria(categoria)}
                    accessibilityRole="button"
                    accessibilityLabel={`Apri categoria ${categoria}`}
                  >
                    <Ionicons name={indice === 0 ? 'star-outline' : 'grid-outline'} size={18} color={categoriaAperta === categoria ? COLORS.brandPrimary : '#A8BDCC'} />
                    <Text style={[styles.testoCella, categoriaAperta === categoria && styles.testoCellaAttiva]} numberOfLines={2}>{categoria}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
        {(ricercaAttiva || categoriaAperta) && <View style={styles.intestazioneRisultati}>
          <View style={styles.titoloRisultatiArea}>
            <Text style={styles.etichettaRisultati}>{ricercaAttiva ? 'RICERCA GLOBALE' : categoriaAperta ? 'CATEGORIA SELEZIONATA' : 'ESPLORA GLI ALIMENTI'}</Text>
            <Text style={styles.titoloRisultati} numberOfLines={1}>{ricercaAttiva ? 'Risultati della ricerca' : categoriaAperta ?? 'Scegli una categoria'}</Text>
          </View>
          {(ricercaAttiva || categoriaAperta) && <Text style={styles.conteggioRisultati}>{risultati.length} {risultati.length === 1 ? 'alimento' : 'alimenti'}</Text>}
        </View>}
      </View>

      <FlatList
        data={risultati}
        keyExtractor={item => String(item.id)}
        renderItem={renderAlimento}
        contentContainerStyle={[styles.listaContenuto, { paddingBottom: piattoSelezionato.length ? altezzaPiatto + 22 : 26 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={5}
        ListEmptyComponent={!(ricercaAttiva || categoriaAperta) ? null : (
          <View style={styles.vuoto}>
            <Ionicons name={ricercaAttiva ? 'search-outline' : categoriaAperta === 'Preferiti' ? 'star-outline' : 'grid-outline'} size={29} color={COLORS.brandPrimary} />
            <Text style={styles.vuotoTitolo}>{ricercaAttiva ? 'Nessun alimento trovato' : categoriaAperta === 'Preferiti' ? 'Nessun preferito' : categoriaAperta ? 'Nessun alimento in questa categoria' : 'Cosa vuoi mangiare?'}</Text>
            <Text style={styles.vuotoTesto}>{ricercaAttiva ? 'Prova un altro nome o una marca.' : categoriaAperta === 'Preferiti' ? 'Tocca la stella su un alimento per aggiungerlo ai preferiti.' : categoriaAperta ? 'Puoi comunque cercare in tutto il database.' : 'Cerca liberamente nel database oppure apri Sfoglia categorie.'}</Text>
          </View>
        )}
      />

      {piattoSelezionato.length > 0 && (
        <View style={styles.piattoFisso} onLayout={e => setAltezzaPiatto(e.nativeEvent.layout.height)}>
          <View style={styles.piattoHeader}>
            <View style={styles.piattoHeaderSinistra}>
              <Ionicons name="layers-outline" size={23} color={COLORS.brandPrimary} />
              <Text style={styles.piattoTitolo}>Il tuo piatto ({piattoSelezionato.length})</Text>
            </View>
            <TouchableOpacity onPress={svuotaPiattoCompleto} accessibilityRole="button" accessibilityLabel="Svuota tutto il piatto">
              <Text style={styles.svuota}>Svuota</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.piattoScroll}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={piattoSelezionato.length > 3}
          >
            {piattoSelezionato.map(item => (
              <View key={item.idUnico} style={styles.rigaPiatto}>
                <Text style={styles.nomePiatto} numberOfLines={1}>{item.nome}</Text>
                <TextInput
                  style={styles.grammiPiatto}
                  keyboardType="number-pad"
                  value={item.grammi === 0 ? '' : String(item.grammi)}
                  onChangeText={t => modificaGrammiNelPiatto(item.idUnico, t)}
                  maxLength={3}
                  selectTextOnFocus
                  accessibilityLabel={`Grammi di ${item.nome} nel piatto`}
                />
                <Text style={styles.unitaPiatto}>g</Text>
                <Text style={styles.choPiatto} numberOfLines={1}>{valoreIndicativo(item.alimentoId) ? '≈ ' : ''}{formatCho(item.choTotali)} CHO</Text>
                <TouchableOpacity onPress={() => rimuoviDalPiatto(item.idUnico, item.alimentoId)} style={styles.eliminaPiatto} accessibilityLabel={`Rimuovi ${item.nome}`}>
                  <Ionicons name="close-circle" size={21} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
          <View style={styles.totalePiatto}>
            <Text style={styles.totaleEtichetta}>Totale CHO</Text>
            <Text style={styles.totaleValore} numberOfLines={1}>{piattoIndicativo ? '≈ ' : ''}{totaleChoPiatto.replace('.', ',')} g CHO</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  areaSuperiore: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 7, backgroundColor: COLORS.background },
  headerPremium: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#101B28', borderWidth: 1, borderColor: '#26536A', borderRadius: 16, padding: 12, marginBottom: 13 },
  accentoHeader: { width: 3, height: 43, borderRadius: 3, backgroundColor: COLORS.brandPrimary },
  testoHeader: { flex: 1 },
  titoloHeader: { fontFamily: 'Space Grotesk', fontSize: 21, fontWeight: '700', color: '#FFFFFF' },
  ricercaBox: { height: 53, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 15, borderWidth: 1, borderColor: '#34566E', borderRadius: 15, backgroundColor: '#111B27', marginBottom: 11 },
  ricercaInput: { flex: 1, color: '#FFFFFF', fontSize: 16, fontFamily: 'Plus Jakarta Sans', paddingVertical: 6 },
  bottoneCategorie: { height: 53, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 15, borderWidth: 1, borderColor: '#34566E', borderRadius: 15, backgroundColor: '#111B27' },
  bottoneCategorieAttivo: { borderColor: COLORS.brandPrimary },
  testoBottoneCategorie: { flex: 1, color: '#FFFFFF', fontSize: 15, fontFamily: 'Plus Jakarta Sans', fontWeight: '700' },
  grigliaCategorie: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8, marginTop: 9 },
  cellaCategoria: { width: '48.7%', minHeight: 65, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#111B27', borderWidth: 1, borderColor: '#29465B', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 10 },
  cellaCategoriaSelezionata: { backgroundColor: '#16313E', borderColor: COLORS.brandPrimary },
  testoCella: { color: '#E8F0F5', fontSize: 12, fontWeight: '600', flex: 1, fontFamily: 'Plus Jakarta Sans' },
  testoCellaAttiva: { color: COLORS.brandPrimary },
  intestazioneRisultati: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 15, marginBottom: 7, gap: 8 },
  titoloRisultatiArea: { flex: 1 },
  etichettaRisultati: { fontSize: 10, color: '#A2B4C3', letterSpacing: 0.8, fontWeight: '700', marginBottom: 3 },
  titoloRisultati: { color: COLORS.brandPrimary, fontSize: 19, fontFamily: 'Space Grotesk', fontWeight: '700' },
  conteggioRisultati: { color: '#A8B8C5', fontSize: 11, marginBottom: 2 },
  listaContenuto: { paddingHorizontal: 14, paddingTop: 4 },
  cardAlimento: { backgroundColor: '#111B27', borderWidth: 1, borderColor: '#29465B', borderRadius: 15, padding: 13, marginBottom: 10 },
  rigaNome: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  nomeAlimento: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', fontFamily: 'Plus Jakarta Sans', flex: 1 },
  stella: { padding: 4 },
  choBase: { color: '#ADC0CE', fontSize: 13, marginTop: 2, marginBottom: 11, fontFamily: 'Plus Jakarta Sans' },
  rigaQuantita: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  inputGrammiContenitore: { width: 105, height: 43, borderRadius: 10, borderWidth: 1, borderColor: '#3A6079', backgroundColor: '#172738', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10 },
  inputGrammi: { flex: 1, color: '#FFFFFF', fontSize: 18, fontWeight: '700', paddingVertical: 2, minWidth: 32 },
  unitaGrammi: { color: '#A9C0CF', fontSize: 14 },
  choCalcolati: { color: COLORS.brandPrimary, fontSize: 15, fontWeight: '700', flex: 1 },
  aggiungi: { backgroundColor: COLORS.brandPrimary, width: 43, height: 43, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  aggiungiDisabilitato: { opacity: 0.38 },
  vuoto: { alignItems: 'center', paddingVertical: 35, paddingHorizontal: 22, gap: 10 },
  vuotoTitolo: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', textAlign: 'center' },
  vuotoTesto: { color: '#A9BBC9', fontSize: 13, textAlign: 'center', lineHeight: 19 },
  piattoFisso: { position: 'absolute', bottom: 0, left: 7, right: 7, backgroundColor: '#0D2530', borderWidth: 1.5, borderColor: COLORS.brandPrimary, borderTopLeftRadius: 19, borderTopRightRadius: 19, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, paddingHorizontal: 11, paddingTop: 11, paddingBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.6, shadowRadius: 16, elevation: 18 },
  piattoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8 },
  piattoHeaderSinistra: { flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1 },
  piattoTitolo: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', fontFamily: 'Space Grotesk' },
  svuota: { color: COLORS.error, fontSize: 13, fontWeight: '700', padding: 4 },
  piattoScroll: { maxHeight: 138, flexGrow: 0 },
  rigaPiatto: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 44, paddingHorizontal: 6, borderRadius: 9, backgroundColor: '#142838', borderWidth: 1, borderColor: '#315267', marginBottom: 2 },
  nomePiatto: { color: '#FFFFFF', fontSize: 12, flex: 1, fontWeight: '600' },
  grammiPiatto: { color: '#FFFFFF', borderWidth: 1, borderColor: '#44667B', backgroundColor: '#0B1B28', borderRadius: 7, width: 39, height: 31, fontSize: 13, textAlign: 'center', padding: 0 },
  unitaPiatto: { color: '#A6B7C5', fontSize: 11 },
  choPiatto: { color: '#C9DCE7', width: 64, textAlign: 'right', fontSize: 11, fontWeight: '600' },
  eliminaPiatto: { padding: 2 },
  totalePiatto: { borderTopWidth: 1, borderTopColor: '#376078', marginTop: 9, paddingTop: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  totaleEtichetta: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  totaleValore: { color: COLORS.success, fontSize: 21, fontFamily: 'Space Grotesk', fontWeight: '800', flexShrink: 1 },
});
