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
  success: "#00E676",           // Verde smeraldo Oled per il totale CHO
  borderGlass: "rgba(255, 255, 255, 0.08)"
};

// Ordiniamo alfabeticamente l'array importato per garantire una ricerca utente ottimale
const DATABASE_ALIMENTI = DATABASE_ALIMENTI_ESTERNO.sort((a, b) => a.nome.localeCompare(b.nome));
export default function AlimentiScreen() {
  const [ricerca, setCerca] = useState('');
  const [categoriaSelezionata, setCategoriaSelezionata] = useState('Tutti');
  
  // Memorizziamo le grammature degli alimenti salvandole come stringhe per permettere la digitazione fluida
  const [grammature, setGrammature] = useState<Record<string, string>>({});

  const CATEGORIE = ['Tutti', 'Primi', 'Pane e Forno', 'Frutta', 'Colazione', 'Pizze e Fast Food', 'Bevande', 'Verdure e Piatti Unici'];

  // 🔒 ALGORITMO DI CONTROLLO RIGIDO: Blocca l'input se supera i 500g o se non è un numero
  const gestisciCambioTestoGrammi = (id: string, testo: string) => {
    // Rimuove caratteri non numerici o spazi involontari
    const testoPulito = testo.replace(/[^0-9]/g, '');
    
    if (testoPulito === '') {
      setGrammature(prev => ({ ...prev, [id]: '' }));
      return;
    }

    const valoreNumerico = parseInt(testoPulito, 10);
    
    if (valoreNumerico > 500) {
      // Forza il blocco stringente al limite massimo strutturale impostato a 500g
      setGrammature(prev => ({ ...prev, [id]: '500' }));
    } else {
      setGrammature(prev => ({ ...prev, [id]: valoreNumerico.toString() }));
    }
  };

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

      {/* 📦 LISTA FLUIDA ALIMENTI CON INTERFACCIA NUMERICA LATERALE COMPACT UX */}
      <FlatList
        data={alimentiFiltrati}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={12}
        windowSize={5}
        removeClippedSubviews={true} 
        renderItem={({ item }) => {
          const stringaGrammi = grammature[item.id] !== undefined ? grammature[item.id] : '';
          const grammiValore = parseInt(stringaGrammi, 10) || 0;
          
          // Formula di calcolo clinico CHO istantaneo basata sulla grammatura digitata
          const choCalcolati = ((grammiValore * item.cho100g) / 100).toFixed(1);

          return (
            <View style={styles.cardAlimentoPremium}>
              <View style={styles.rigaInfoSuperiore}>
                
                {/* Dettagli Alimento a Sinistra */}
                <View style={styles.boxTestiSinistra}>
                  <Text style={styles.nomeAlimento} numberOfLines={1}>{item.nome}</Text>
                  <Text style={styles.etichettaValoreBase}>Valore base: {item.cho100g}g CHO / 100g</Text>
                </View>

                {/* 🔢 Riquadro Input Numerico sulla Destra con segnaposto di default "00" */}
                <View style={styles.boxRiquadroInputDestra}>
                  <TextInput
                    style={[styles.inputGrammiRiquadro, stringaGrammi !== '' && styles.inputGrammiRiquadroAttivo]}
                    placeholder="00"
                    placeholderTextColor="#636366"
                    keyboardType="numeric"
                    value={stringaGrammi}
                    onChangeText={(t) => gestisciCambioTestoGrammi(item.id, t)}
                    maxLength={3}
                    selectTextOnFocus={true} // Seleziona tutto il testo al clic per una correzione istantanea
                  />
                  <Text style={styles.etichettaUnitaGg}>g</Text>
                </View>

              </View>

              {/* Riga Inferiore Risultato Carboidrati Complessivi */}
              <View style={styles.rigaDettaglioValore}>
                <Text style={styles.etichettaRisultatoCHO}>Totale stimato pasto:</Text>
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
  
  containerFiltroCategorie: { backgroundColor: COLORS.background, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.borderGlass, width: '100%' },
  scrollCategorieContent: { paddingHorizontal: 16, gap: 8 },
  chipCategoria: { backgroundColor: COLORS.surfaceSecondary, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: COLORS.borderGlass },
  chipCategoriaAttiva: { backgroundColor: "rgba(0, 229, 255, 0.08)", borderColor: COLORS.brandPrimary },
  textChipCategoria: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, fontWeight: '600', color: COLORS.muted },
  textChipCategoriaAttivo: { color: COLORS.brandPrimary, fontWeight: '700' },

  listContent: { padding: 16, paddingBottom: 40 },
  cardAlimentoPremium: { backgroundColor: COLORS.surfaceSecondary, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.borderGlass, marginBottom: 12, width: '100%', flexDirection: 'column' },
  rigaInfoSuperiore: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderBottomWidth: 1, borderBottomColor: "rgba(255, 255, 255, 0.04)", paddingBottom: 10 },
  boxTestiSinistra: { flex: 1, marginRight: 16, alignItems: 'flex-start' },
  nomeAlimento: { fontFamily: 'Plus Jakarta Sans', fontSize: 15, fontWeight: '700', color: COLORS.onSurface, marginBottom: 4 },
  etichettaValoreBase: { fontFamily: 'Plus Jakarta Sans', fontSize: 11, color: COLORS.muted },
  
  // 📐 CSS DEL NUOVO RIQUADRO INPUT INTERATTIVO DEI GRAMMI FIANCHEGGIATO SULLA DESTRA
  boxRiquadroInputDestra: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  inputGrammiRiquadro: { backgroundColor: '#1A1A24', borderHorizontalWidth: 1, borderColor: COLORS.borderGlass, borderWidth: 1, borderRadius: 10, width: 68, height: 42, textAlign: 'center', color: COLORS.muted, fontFamily: 'Space Grotesk', fontSize: 16, fontWeight: '700' },
  inputGrammiRiquadroAttivo: { borderColor: COLORS.brandPrimary, color: COLORS.brandPrimary, backgroundColor: 'rgba(0, 229, 255, 0.02)' },
  etichettaUnitaGg: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '600', color: COLORS.muted, width: 12 },

  rigaDettaglioValore: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: 10 },
  etichettaRisultatoCHO: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, color: COLORS.muted, fontWeight: '500' },
  valoreCalcolatoCho: { fontFamily: 'Space Grotesk', fontSize: 19, fontWeight: '800', color: COLORS.muted },
  unitaChoSub: { fontSize: 11, color: COLORS.muted, fontWeight: '500' }
});
