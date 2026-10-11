import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
const DATABASE_ALIMENTI = DATABASE_ALIMENTI_ESTERNO.sort((a, b) => a.nome.localeCompare(b.nome));
export default function AlimentiScreen() {
  const [ricerca, setCerca] = useState('');
  const [categoriaSelezionata, setCategoriaSelezionata] = useState('Tutti');
  
  // Memorizziamo le grammature degli alimenti salvandole come stringhe per permettere la digitazione fluida
  const [grammature, setGrammature] = useState<Record<string, string>>({});
  
  // 🍽️ STATO DEL PIATTO VIRTUALE: Array di elementi selezionati accumulati
  const [piattoSelezionato, setPiattoSelezionato] = useState<any[]>([]);

  const CATEGORIE = ['Tutti', 'Primi', 'Pane e Forno', 'Frutta', 'Colazione', 'Pizze e Fast Food', 'Bevande', 'Verdure e Piatti Unici'];

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
      idUnico: Date.now().toString() + alimento.id,
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

  const alimentiFiltrati = DATABASE_ALIMENTI.filter(alimento => {
    const corrispondeRicerca = alimento.nome.toLowerCase().includes(ricerca.toLowerCase());
    const corrispondeCategoria = categoriaSelezionata === 'Tutti' || alimento.categoria === categoriaSelezionata;
    return corrispondeRicerca && corrispondeCategoria;
  });
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
      </View>

      {/* 🏷️ BARRA DELLE CATEGORIE ORIZZONTALE IN STILE CHIPS NEON */}
      <View style={styles.containerFiltroCategorie}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollCategorieContent}>
          {CATEGORIE.map((cat) => {
            const attiva = categoriaSelezionata === cat;
            return (
              <TouchableOpacity key={cat} style={[styles.chipCategoria, attiva && styles.chipCategoriaAttiva]} onPress={() => setCategoriaSelezionata(cat)}>
                <Text style={[styles.textChipCategoria, attiva && styles.textChipCategoriaAttivo]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 📦 LISTA FLUIDA ALIMENTI (VIRTUALIZZAZIONE NATIVA AD ALTE PRESTAZIONI) */}
      <FlatList
        data={alimentiFiltrati}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={4}
        removeClippedSubviews={true} 
        renderItem={({ item }) => {
          const stringaGrammi = grammature[item.id] !== undefined ? grammature[item.id] : '';
          const grammiValore = parseInt(stringaGrammi, 10) || 0;
          const choCalcolati = ((grammiValore * item.cho100g) / 100).toFixed(1);

          return (
            <View style={styles.cardAlimentoPremium}>
              <View style={styles.rigaInfoSuperiore}>
                <View style={styles.boxTestiSinistra}>
                  <Text style={styles.nomeAlimento} numberOfLines={1}>{item.nome}</Text>
                  <Text style={styles.etichettaValoreBase}>Valore base: {item.cho100g}g CHO / 100g</Text>
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
                  {choCalcolati} <Text style={styles.unitaChoSub}>g CHO</Text>
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Ionicons name="fast-food-outline" size={32} color={COLORS.muted} style={{ marginBottom: 8 }} />
            <Text style={{ color: COLORS.muted, fontFamily: 'Plus Jakarta Sans', textAlign: 'center' }}>
              Nessun alimento trovato corrispondente alla ricerca.
            </Text>
          </View>
        }
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

          {/* Orizzontale Mini Chips dei cibi bloccati nel piatto */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollCibiPiatto} contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
            {piattoSelezionato.map((item) => (
              <View key={item.idUnico} style={styles.chipCiboInserito}>
                <Text style={styles.testoChipCiboInserito}>{item.nome} ({item.grammi}g)</Text>
                <TouchableOpacity 
                  style={styles.btnRimuoviCiboSingolo} 
                  onPress={() => rimuoviDalPiatto(item.idUnico, item.alimentoId)} // 🔄 Svuotamento combinato di riga
                >
                  <Ionicons name="close" size={12} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          {/* 🧮 BLOCCO TOTALE MATEMATICO DEL PASTO COMPLESSIVO */}
          <View style={styles.rigaTotaleCumulativoFinale}>
            <Text style={styles.etichettaTotalePiatto}>Totale Carboidrati Piatto:</Text>
            <Text style={styles.valoreTotalePiatto}>{totaleChoPiatto} <Text style={styles.unitaTotalePiatto}>g CHO</Text></Text>
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
  
  boxInputRicerca: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceSecondary, borderRadius: 12, paddingHorizontal: 12, height: 44, marginTop: 14, borderWidth: 1, borderColor: COLORS.borderGlass },
  inputRicercaTesto: { flex: 1, color: COLORS.onSurface, fontFamily: 'Plus Jakarta Sans', fontSize: 14, paddingVertical: 4 },
  
  containerFiltroCategorie: { backgroundColor: COLORS.background, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.borderGlass, width: '100%' },
  scrollCategorieContent: { paddingHorizontal: 16, gap: 8 },
  chipCategoria: { backgroundColor: COLORS.surfaceSecondary, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: COLORS.borderGlass },
  chipCategoriaAttiva: { backgroundColor: "rgba(0, 229, 255, 0.08)", borderColor: COLORS.brandPrimary },
  textChipCategoria: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, fontWeight: '600', color: COLORS.muted },
  textChipCategoriaAttivo: { color: COLORS.brandPrimary, fontWeight: '700' },

  listContent: { padding: 16, paddingBottom: 180 }, 
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
  chipCiboInserito: { flexDirection: 'row', alignItems: 'center', backgroundColor: "#13131A", borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.08)", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, gap: 6 },
  testoChipCiboInserito: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, color: COLORS.onSurface, fontWeight: '500' },
  btnRimuoviCiboSingolo: { justifyContent: 'center', alignItems: 'center', paddingLeft: 2 },
  rigaTotaleCumulativoFinale: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderTopWidth: 1, borderTopColor: "rgba(255, 255, 255, 0.06)", paddingTop: 12, marginTop: 8 },
  etichettaTotalePiatto: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: COLORS.onSurface },
  valoreTotalePiatto: { fontFamily: 'Space Grotesk', fontSize: 24, fontWeight: '900', color: COLORS.success },
  unitaTotalePiatto: { fontSize: 13, color: COLORS.muted, fontWeight: '600' }
});
