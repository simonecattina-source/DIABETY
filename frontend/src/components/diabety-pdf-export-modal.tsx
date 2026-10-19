import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DIABETY_COLORS as COLORS } from '@/src/theme/diabety';

type DiabetyPdfExportModalProps = {
  visible: boolean;
  periodo: string;
  onClose: () => void;
  onViewHtml: () => void;
  onDownloadPdf: () => void;
};

/**
 * Scelta HTML/PDF condivisa dalle schede Storico e Impostazioni.
 * Solo interfaccia: filtri, calcoli e funzioni di esportazione restano nelle schede.
 */
export function DiabetyPdfExportModal({
  visible,
  periodo,
  onClose,
  onViewHtml,
  onDownloadPdf,
}: DiabetyPdfExportModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.pdfModalOverlay}>
        <View style={styles.pdfModalCard}>
          <View style={styles.pdfModalHeader}>
            <Ionicons name="document-text-outline" size={24} color={COLORS.brandPrimary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.pdfModalTitle}>Esporta registro</Text>
              <Text style={styles.pdfModalSubtitle}>DIABETY · Diario glicemico</Text>
            </View>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Chiudi finestra">
              <Ionicons name="close" size={24} color={COLORS.muted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.pdfModalPeriodo}>Periodo selezionato: {periodo}</Text>
          <TouchableOpacity style={styles.pdfModalOption} onPress={onViewHtml}>
            <Ionicons name="eye-outline" size={22} color={COLORS.brandPrimary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.pdfModalOptionTitle}>Visualizza HTML</Text>
              <Text style={styles.pdfModalOptionDesc}>Apri il documento formattato nel browser</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.pdfModalOption} onPress={onDownloadPdf}>
            <Ionicons name="download-outline" size={22} color={COLORS.brandSecondary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.pdfModalOptionTitle}>Scarica PDF</Text>
              <Text style={styles.pdfModalOptionDesc}>Salva un vero documento .pdf</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.pdfModalCancel} onPress={onClose}>
            <Text style={styles.pdfModalCancelText}>Annulla</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pdfModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'center', padding: 20 },
  pdfModalCard: { backgroundColor: COLORS.surfaceSecondary, borderRadius: 22, borderWidth: 1, borderColor: COLORS.borderGlassBright, padding: 20, maxWidth: 440, width: '100%', alignSelf: 'center' },
  pdfModalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  pdfModalTitle: { color: COLORS.onSurface, fontSize: 18, fontWeight: '700' },
  pdfModalSubtitle: { color: COLORS.muted, fontSize: 12, marginTop: 3 },
  pdfModalPeriodo: { color: COLORS.brandPrimary, fontSize: 13, marginBottom: 16, fontWeight: '600' },
  pdfModalOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgUtility, padding: 15, borderRadius: 14, borderWidth: 1, borderColor: COLORS.borderGlassBright, marginBottom: 10 },
  pdfModalOptionTitle: { color: COLORS.onSurface, fontWeight: '700', fontSize: 14 },
  pdfModalOptionDesc: { color: COLORS.muted, fontSize: 11, marginTop: 4 },
  pdfModalCancel: { padding: 12, alignItems: 'center' },
  pdfModalCancelText: { color: COLORS.muted, fontWeight: '700' },
});
