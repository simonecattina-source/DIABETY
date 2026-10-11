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

// 📊 DATABASE ALIMENTI COMPATTO ED ESTENDIBILE CON VIRTUALIZZAZIONE NATIVA
const DATABASE_ALIMENTI = [
  // 🍝 PASTA, RISO E CEREALI
  { id: '1', nome: 'Pasta di semola comune (cruda)', cho100g: 73.0 },
  { id: '2', nome: 'Pasta integrale (cruda)', cho100g: 65.0 },
  { id: '3', nome: 'Pasta all\'uovo secca (cruda)', cho100g: 68.5 },
  { id: '4', nome: 'Riso brillato bianco (crudo)', cho100g: 80.4 },
  { id: '5', nome: 'Riso integrale (crudo)', cho100g: 72.4 },
  { id: '6', nome: 'Riso Basmati / Venere (crudo)', cho100g: 78.0 },
  { id: '7', nome: 'Gnocchi di patate', cho100g: 36.3 },
  { id: '8', nome: 'Farina di frumento Tipo 00', cho100g: 77.3 },
  { id: '9', nome: 'Farina d\'avena / Fiocchi d\'avena', cho100g: 66.2 },
  { id: '10', nome: 'Farina di mais / Polenta (cruda)', cho100g: 76.9 },
  { id: '11', nome: 'Couscous (crudo)', cho100g: 71.0 },
  { id: '12', nome: 'Farro o Orzo perlato (crudo)', cho100g: 71.3 },
  { id: '13', nome: 'Quinoa (cruda)', cho100g: 64.0 },
  { id: '14', nome: 'Pane grattugiato / Pan grattato', cho100g: 72.8 },

  // 🥖 PANE, PIZZE E PRODOTTI DA FORNO
  { id: '15', nome: 'Pane comune (Rosetta/Ciabatta)', cho100g: 52.8 },
  { id: '16', nome: 'Pane integrale', cho100g: 44.2 },
  { id: '17', nome: 'Pane per tramezzini / Pan bauletto', cho100g: 49.5 },
  { id: '18', nome: 'Pane di segale', cho100g: 45.4 },
  { id: '19', nome: 'Piadina romagnola all\'olio', cho100g: 50.0 },
  { id: '20', nome: 'Crackers salati comuni', cho100g: 68.1 },
  { id: '21', nome: 'Crackers integrali', cho100g: 62.0 },
  { id: '22', nome: 'Fette biscottate classiche', cho100g: 72.3 },
  { id: '23', nome: 'Fette biscottate integrali', cho100g: 66.5 },
  { id: '24', nome: 'Grissini classici comuni', cho100g: 68.3 },
  { id: '25', nome: 'Gallette di riso', cho100g: 81.0 },
  { id: '26', nome: 'Gallette di mais', cho100g: 79.5 },
  { id: '27', nome: 'Taralli classici pugliesi', cho100g: 61.5 },
  { id: '28', nome: 'Focaccia classica all\'olio', cho100g: 48.2 },
  { id: '29', nome: 'Pizza Margherita da pizzeria', cho100g: 52.9 },
  { id: '30', nome: 'Pizza Marinara', cho100g: 55.4 },
  // 🍎 FRUTTA FRESCA ED ESSICCATA
  { id: '31', nome: 'Mela fresca (con buccia)', cho100g: 13.8 },
  { id: '32', nome: 'Banana fresca', cho100g: 22.8 },
  { id: '33', nome: 'Arancia / Mandarino / Clementina', cho100g: 9.3 },
  { id: '34', nome: 'Pera fresca', cho100g: 15.5 },
  { id: '35', nome: 'Fragole fresche', cho100g: 5.3 },
  { id: '36', nome: 'Pesca / Albicocca fresca', cho100g: 9.5 },
  { id: '37', nome: 'Uva bianca o nera fresca', cho100g: 18.1 },
  { id: '38', nome: 'Melone / Anguria d\'estate', cho100g: 6.8 },
  { id: '39', nome: 'Kiwi', cho100g: 14.6 },
  { id: '40', nome: 'Ananas fresco', cho100g: 11.2 },
  { id: '41', nome: 'Frutta secca essiccata: Uva passa / Uvetta', cho100g: 79.2 },
  { id: '42', nome: 'Frutta secca essiccata: Datteri secchi', cho100g: 75.0 },
  { id: '43', nome: 'Frutta a guscio: Noci/Mandorle/Nocciole', cho100g: 5.5 },

  // 🍰 DOLCI, MERENDINE E LATTICINI
  { id: '44', nome: 'Biscotti frollini semplici', cho100g: 69.2 },
  { id: '45', nome: 'Brioche / Cornetto semplice vuoto', cho100g: 48.5 },
  { id: '46', nome: 'Cornetto farcito alla crema / cioccolato', cho100g: 54.0 },
  { id: '47', nome: 'Cioccolato al latte', cho100g: 54.1 },
  { id: '48', nome: 'Cioccolato fondente dal 70% in su', cho100g: 30.5 },
  { id: '49', nome: 'Zucchero bianco / Saccarosio puro', cho100g: 100.0 },
  { id: '50', nome: 'Yogurt bianco intero naturale dolce', cho100g: 4.3 },
  { id: '51', nome: 'Yogurt alla frutta classico vasetto', cho100g: 12.8 },
  { id: '52', nome: 'Yogurt Greco magro bianco 0%', cho100g: 3.2 },

  // 🥤 FAST FOOD, BEVANDE E VERDURE
  { id: '53', nome: 'Hamburger / Cheeseburger fast food', cho100g: 30.0 },
  { id: '54', nome: 'Patatine fritte da fast food / sacchetto', cho100g: 45.0 },
  { id: '55', nome: 'Patate lesse o al vapore', cho100g: 16.3 },
  { id: '56', nome: 'Patate al forno con olio', cho100g: 22.7 },
  { id: '57', nome: 'Coca Cola / Pepsi Classica (Zuccherata)', cho100g: 10.6 },
  { id: '58', nome: 'Coca Cola Zero / Sprite Zero / Dietetiche', cho100g: 0.0 },
  { id: '59', nome: 'Succo di frutta confezionato netto', cho100g: 13.5 },
  { id: '60', nome: 'Latte vaccino intero / parzialmente scremato', cho100g: 4.9 },
  { id: '61', nome: 'Fagioli / Lenticchie / Ceci in scatola scolati', cho100g: 15.2 },
  { id: '62', nome: 'Carote fresche crude o bollite', cho100g: 7.6 },
  { id: '63', nome: 'Pomodori rossi da insalata / sugo', cho100g: 3.5 },
  { id: '64', nome: 'Zucchine / Melanzane / Finocchi leggeri', cho100g: 2.5 },
  { id: '65', nome: 'Sushi Roll misto / Futomaki / Hosomaki', cho100g: 19.5 },
  { id: '66', nome: 'Carni e Pesci freschi al naturale', cho100g: 0.0 }
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
            placeholder="Cerca alimento..."
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

      {/* 📦 LISTA FLUIDA ALIMENTI CON SLIDER INTEGRATO (VIRTUALIZZAZIONE NATIVA AD ALTE PRESTAZIONI) */}
      <FlatList
        data={alimentiFiltrati}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        
        // ⚡ MOTORE DI VIRTUALIZZAZIONE PROTETTO: Ottimizzato per reggere database ultra-estesi
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
