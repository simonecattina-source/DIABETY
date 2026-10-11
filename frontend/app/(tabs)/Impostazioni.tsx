import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';

export default function StrumentiScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerForm}>
        <Text style={styles.title}>Centro Strumenti (Safe Mode)</Text>
        <Text style={styles.subtitle}>
          Se vedi questa schermata, l'interfaccia di base funziona ed è sbloccata!
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 24, paddingTop: 60 },
  headerForm: { width: '100%' },
  title: { fontSize: 26, fontWeight: '700', color: '#1A1A1A' },
  subtitle: { fontSize: 14, color: '#666666', marginTop: 8 }
});
