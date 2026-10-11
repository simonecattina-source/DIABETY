import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

// 📂 IMPORTAZIONE ASINCRONA DEL TUO DATABASE DI ALIMENTI ESTERNO JSON CATEGORIZZATO
import DATABASE_ALIMENTI_ESTERNO from '../../constants/alimenti_database.json';

const COLORS = {
  background: "#0A0A0C",        
  surfaceSecondary: "#13131A",  
  brandPrimary: "#00E5FF",      // Cyan neon active
  brandSecondary: "#7D52FF",    // Viola tech
  onSurface: "#FFFFFF",         
  muted: "#7E7E86",             
  success: "#00E676",           // Verde smeraldo Oled
  borderGlass: "rgba(255, 255, 255, 0.08)"
};

// Ordiniamo alfabeticamente l'array importato per una navigazione utente ottimale
const DATABASE_ALIMENTI = DATABASE_ALIMENTI_ESTERNO.sort((a, b) => a.nome.localeCompare(b.nome));
export default function AlimentiScreen() {
  const [ricerca, setCerca] = useState('');
  const [categoriaSelezionata, setCategoriaSelezionata] = useState('Tutti');
  const [grammature, setGrammature] = useState<Record<string, number>>({});

  // 🏷️ Elenco delle categorie uniche gestite simmetricamente nel database JSON
  const CATEGORIE = ['Tutti', 'Primi', 'Pane e Forno', 'Frutta', 'Colazione', 'Pizze e Fast Food', 'Bevande', 'Verdure e Piatti Unici'];

  const gestisciCambioGrammi = (id: string, valore: number) => {
    setGrammature(prev => ({ ...prev, [id]: Math.round(valore) }));
  };

  // 🧠 ALGORITMO DI FILTRAGGIO COMBINATO: Incrocia la digitazione del testo con la chip della categoria attiva
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
        <Text style={styles.subtitle}>Calcola i carboidrati complessivi pesando gli alimenti</Text>
        
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
              <TouchableOpacity
                key={cat}
                style={[styles.chipCategoria, attiva && styles.chipCategoriaAttiva]}
                onPress={() => setCategoriaSelezionata(cat)}
              >
                <Text style={[styles.textChipCategoria, attiva && styles.textChipCategoriaAttivo]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
      {/* 📦 LISTA FLUIDA ALIMENTI CON SLIDER INTEGRATO (VIRTUALIZZAZIONE NATIVA AD ALTE PRESTAZIONI) */}
      <FlatList
        data={alimentiFiltrati}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        
        // ⚡ MOTORE DI VIRTUALIZZAZIONE PROTETTO: Ottimizzato per reggere oltre 1000 elementi senza scatti o lag memory
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={4}
        removeClippedSubviews={true} 
        
        renderItem={({ item }) => {
          const grammiAttuali = grammature[item.id] || 0;
          const choCalcolati = ((grammiAttuali * item.cho100g) / 100).toFixed(1);

          return (
            <View style={styles.cardAlimentoPremium}>
              <View style={styles.rigaInfoSuperiore}>
                <Text style={styles.nomeAlimento} numberOfLines={1}>{item.nome}</Text>
                <View style={styles.badgeGrammi}>
                  <Text style={styles.testoBadgeGrammi}>{grammiAttuali} g</Text>
                </View>
              </View>

              {/* ───🔘─── LINEA SLIDER DA 0 A 300 GRAMMI */}
              <View style={styles.containerSliderLinea}>
                <Slider
                  style={{ width: '100%', height: 40 }}
                  minimumValue={0}
                  maximumValue={300}
                  minimumTrackTintColor={COLORS.brandPrimary}
                  maximumTrackTintColor="#2C2C2E"
                  thumbTintColor={COLORS.brandPrimary}
                  value={grammiAttuali}
                  onValueChange={(v) => gestisciCambioGrammi(item.id, v)}
                />
              </View>

              <View style={styles.rigaDettaglioValore}>
                <Text style={styles.etichettaValoreBase}>Valore base: {item.cho100g}g CHO / 100g</Text>
                <Text style={styles.valoreCalcolatoCho}>
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
              Nessun alimento trovato corrispondente alla ricerca in questa categoria.
            </Text>
          </View>
        }
      />
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
  
  // 🎨 CHIPS CATEGORIE CSS AD ALTO CONTRASTO OLED EFFECT
  containerFiltroCategorie: { backgroundColor: COLORS.background, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.borderGlass, width: '100%' },
  scrollCategorieContent: { paddingHorizontal: 16, gap: 8 },
  chipCategoria: { backgroundColor: COLORS.surfaceSecondary, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: COLORS.borderGlass },
  chipCategoriaAttiva: { backgroundColor: "rgba(0, 229, 255, 0.08)", borderColor: COLORS.brandPrimary },
  textChipCategoria: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, fontWeight: '600', color: COLORS.muted },
  textChipCategoriaAttivo: { color: COLORS.brandPrimary, fontWeight: '700' },

  listContent: { padding: 16, paddingBottom: 40 },
  cardAlimentoPremium: { backgroundColor: COLORS.surfaceSecondary, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.borderGlass, marginBottom: 12, width: '100%' },
  rigaInfoSuperiore: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  nomeAlimento: { fontFamily: 'Plus Jakarta Sans', fontSize: 15, fontWeight: '700', color: COLORS.onSurface, flex: 1, marginRight: 10 },
  badgeGrammi: { backgroundColor: '#1A1A24', borderWidth: 1, borderColor: COLORS.borderGlass, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8 },
  testoBadgeGrammi: { fontFamily: 'Space Grotesk', fontSize: 12, fontWeight: '700', color: COLORS.brandPrimary },
  
  containerSliderLinea: { width: '100%', marginVertical: 2 },
  rigaDettaglioValore: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: 2 },
  etichettaValoreBase: { fontFamily: 'Plus Jakarta Sans', fontSize: 11, color: COLORS.muted },
  valoreCalcolatoCho: { fontFamily: 'Space Grotesk', fontSize: 18, fontWeight: '800', color: COLORS.success },
  unitaChoSub: { fontSize: 11, color: COLORS.muted, fontWeight: '500' }
});
