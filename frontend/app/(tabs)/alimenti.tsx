import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

const COLORS = {
  background: "#0A0A0C",        
  surfaceSecondary: "#13131A",  
  brandPrimary: "#00E5FF",      // Cyan neon
  brandSecondary: "#7D52FF",    // Viola tech
  onSurface: "#FFFFFF",         
  muted: "#7E7E86",             
  success: "#00E676",           // Verde smeraldo Oled
  borderGlass: "rgba(255, 255, 255, 0.08)"
};

// 📊 DATABASE ISTITUZIONALE EXTENDED (Valori di g CHO espressi matematicamente su 100g di alimento)
const DATABASE_ALIMENTI = [
  // 🍝 PRIMI PIATTI, PASTA E CEREALI
  { id: '1', nome: 'Pasta di semola comune (cruda)', cho100g: 73.0 },
  { id: '2', nome: 'Pasta integrale (cruda)', cho100g: 65.0 },
  { id: '3', nome: 'Riso brillato bianco (crudo)', cho100g: 80.4 },
  { id: '4', nome: 'Riso integrale (crudo)', cho100g: 72.4 },
  { id: '5', nome: 'Gnocchi di patate', cho100g: 36.3 },
  { id: '6', nome: 'Farina di frumento Tipo 00', cho100g: 77.3 },
  { id: '7', nome: 'Farina d\'avena', cho100g: 66.2 },
  { id: '8', nome: 'Polenta (farina di mais cruda)', cho100g: 76.9 },
  { id: '9', nome: 'Couscous (crudo)', cho100g: 71.0 },
  { id: '10', nome: 'Farro o Orzo perlato (crudo)', cho100g: 71.3 },
  { id: '11', nome: 'Quinoa (cruda)', cho100g: 64.0 },

  // 🥖 PANE, SOSTITUTI E PRODOTTI DA FORNO
  { id: '12', nome: 'Pane comune (Rosetta/Ciabatta)', cho100g: 52.8 },
  { id: '13', nome: 'Pane integrale', cho100g: 44.2 },
  { id: '14', nome: 'Pane per tramezzini / Pan bauletto', cho100g: 49.5 },
  { id: '15', nome: 'Piadina romagnola all\'olio', cho100g: 50.0 },
  { id: '16', nome: 'Crackers salati comuni', cho100g: 68.1 },
  { id: '17', nome: 'Fette biscottate classiche', cho100g: 72.3 },
  { id: '18', nome: 'Grissini comuni', cho100g: 68.3 },
  { id: '19', nome: 'Gallette di riso', cho100g: 81.0 },
  { id: '20', nome: 'Gallette di mais', cho100g: 79.5 },
  { id: '21', nome: 'Taralli classici', cho100g: 61.5 },
  { id: '22', nome: 'Pane di segale', cho100g: 45.4 },

  // 🥛 COLAZIONE E PRODOTTI DA SPALMARE
  { id: '23', nome: 'Cereali da colazione (Cornflakes)', cho100g: 84.5 },
  { id: '24', nome: 'Muesli classico alla frutta', cho100g: 64.0 },
  { id: '25', nome: 'Marmellata / Confettura classica', cho100g: 58.6 },
  { id: '26', nome: 'Marmellata light / a ridotto contenuto', cho100g: 28.0 },
  { id: '27', nome: 'Miele d\'api asettico', cho100g: 82.4 },
  { id: '28', nome: 'Crema spalmabile alle nocciole (Nutella)', cho100g: 57.5 },
  { id: '29', nome: 'Burro d\'arachidi puro', cho100g: 13.0 },
  // 🍕 PIZZE, FAST FOOD E PATATE
  { id: '30', nome: 'Pizza Margherita da pizzeria', cho100g: 52.9 },
  { id: '31', nome: 'Pizza Marinara', cho100g: 55.4 },
  { id: '32', nome: 'Hamburger classico fast food', cho100g: 30.2 },
  { id: '33', nome: 'Patatine fritte da fast food', cho100g: 36.5 },
  { id: '34', nome: 'Patatine fritte in sacchetto (Snack)', cho100g: 53.5 },
  { id: '35', nome: 'Patate lesse o al vapore', cho100g: 16.3 },
  { id: '36', nome: 'Patate al forno con olio', cho100g: 22.7 },
  { id: '37', nome: 'Kebab (piadina farcita completa)', cho100g: 24.5 },
  { id: '38', nome: 'Bastoncini di pesce fritti', cho100g: 21.0 },

  // 🍎 FRUTTA E NETTARI (FRESCA E SECCA)
  { id: '39', nome: 'Mela fresca (con buccia)', cho100g: 13.8 },
  { id: '40', nome: 'Banana fresca', cho100g: 22.8 },
  { id: '41', nome: 'Arancia / Mandarino / Clementina', cho100g: 9.3 },
  { id: '42', nome: 'Pera fresca', cho100g: 15.5 },
  { id: '43', nome: 'Fragole fresche', cho100g: 5.3 },
  { id: '44', nome: 'Pesca / Albicocca fresca', cho100g: 9.5 },
  { id: '45', nome: 'Uva bianca o nera', cho100g: 18.1 },
  { id: '46', nome: 'Melone / Cocomero d\'estate', cho100g: 7.3 },
  { id: '47', nome: 'Kiwi', cho100g: 14.6 },
  { id: '48', nome: 'Ciliegie fresche', cho100g: 12.0 },
  { id: '49', nome: 'Ananas fresco', cho100g: 11.2 },
  { id: '50', nome: 'Fichi freschi', cho100g: 19.2 },
  { id: '51', nome: 'Prugne / Susine fresche', cho100g: 11.4 },
  { id: '52', nome: 'Frutta secca: Uva passa / Uvetta', cho100g: 79.2 },
  { id: '53', nome: 'Frutta secca: Datteri secchi', cho100g: 75.0 },
  { id: '54', nome: 'Noci / Mandorle / Nocciole (puro sgusciato)', cho100g: 5.5 },

  // 🍰 DOLCI, MERENDINE E PASTICCERIA
  { id: '55', nome: 'Biscotti frollini semplici', cho100g: 69.2 },
  { id: '56', nome: 'Brioche / Cornetto semplice vuoto', cho100g: 48.5 },
  { id: '57', nome: 'Cornetto farcito alla crema / cioccolato', cho100g: 54.0 },
  { id: '58', nome: 'Merendina tipo Pan di Spagna / Plumcake', cho100g: 53.0 },
  { id: '59', nome: 'Torta di mele fatta in casa', cho100g: 42.0 },
  { id: '60', nome: 'Cioccolato al latte', cho100g: 54.1 },
  { id: '61', nome: 'Cioccolato fondente 70-85%', cho100g: 30.5 },
  { id: '62', nome: 'Gelato alla crema / cioccolato (cono/coppa)', cho100g: 24.0 },
  { id: '63', nome: 'Gelato alla frutta / Sorbetto limone', cho100g: 28.5 },
  { id: '64', nome: 'Zucchero bianco da cucina / Saccarosio', cho100g: 100.0 },
  // 🥤 BEVANDE E LATTI
  { id: '65', nome: 'Coca Cola / Pepsi Classica (Lattina/Vetro)', cho100g: 10.6 },
  { id: '66', nome: 'Coca Cola Zero / Sprite Zero / Light', cho100g: 0.0 },
  { id: '67', nome: 'Succo di frutta confezionato (Pera/Pesca)', cho100g: 13.5 },
  { id: '68', nome: 'Succo 100% arancia senza zuccheri', cho100g: 10.2 },
  { id: '69', nome: 'Te freddo in bottiglia (Limone/Pesca)', cho100g: 8.0 },
  { id: '70', nome: 'Latte vaccino intero / parzialmente scremato', cho100g: 4.9 },
  { id: '71', nome: 'Bevanda vegetale di Soia naturale', cho100g: 1.5 },
  { id: '72', nome: 'Bevanda vegetale di Riso comune', cho100g: 12.5 },
  { id: '73', nome: 'Bevanda vegetale d\'Avena', cho100g: 6.8 },
  { id: '74', nome: 'Birra chiara standard', cho100g: 3.5 },
  { id: '75', nome: 'Vino rosso / bianco secco', cho100g: 0.6 },

  // 🥗 LEGUMI, VERDURE E ALTRI CONTRESTORI (Valori medi cotti o pronti)
  { id: '76', nome: 'Fagioli / Lenticchie / Ceci in scatola scolati', cho100g: 15.2 },
  { id: '77', nome: 'Piselli fini surgelati o cotti', cho100g: 12.5 },
  { id: '78', nome: 'Carote fresche crude o bollite', cho100g: 7.6 },
  { id: '79', nome: 'Pomodori rossi freschi', cho100g: 3.5 },
  { id: '80', nome: 'Zucca cotta al forno', cho100g: 7.0 },
  { id: '81', nome: 'Zucchine / Melanzane / Finocchi', cho100g: 2.5 },
  { id: '82', nome: 'Yogurt bianco intero naturale', cho100g: 4.3 },
  { id: '83', nome: 'Yogurt alla frutta classico', cho100g: 12.8 },
  { id: '84', nome: 'Yogurt Greco bianco 0% grassi', cho100g: 3.2 },
  { id: '85', nome: 'Sushi Roll / Futomaki / Hosomaki (Riso+Pesce)', cho100g: 19.5 }
].sort((a, b) => a.nome.localeCompare(b.nome));

export default function AlimentiScreen() {
  const [ricerca, setCerca] = useState('');
  const [grammature, setGrammature] = useState<Record<string, number>>({});

  const gestisciCambioGrammi = (id: string, valore: number) => {
    setGrammature(prev => ({ ...prev, [id]: Math.round(valore) }));
  };

  const alimentiFiltrati = DATABASE_ALIMENTI.filter(alimento =>
    alimento.nome.toLowerCase().includes(ricerca.toLowerCase())
  );
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
            placeholder="Cerca tra oltre 85 alimenti istituzionali..."
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

      {/* 📦 LISTA FLUIDA ALIMENTI CON SLIDER INTEGRATO */}
      <FlatList
        data={alimentiFiltrati}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
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

              {/* ───🔘─── LINEA SLIDER DA 0A 300 GRAMMI */}
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
              Nessun alimento trovato corrispondente alla ricerca.
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
