// App level error boundary, mounted once in app/_layout.tsx. A render crash
// shows a reload screen instead of a blank app; the error is also logged so
// it shows up in the Metro output. Do not mount additional boundaries.

import { reloadAppAsync } from "expo";
import { Component, type ErrorInfo, type PropsWithChildren, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { DIABETY_COLORS as COLORS } from "@/src/theme/diabety";

type ErrorBoundaryState = { error: Error | null };

export class ErrorBoundary extends Component<PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[ErrorBoundary] render crash:", error, info.componentStack ?? "");
  }

  resetError = (): void => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return <ErrorFallback error={this.state.error} resetError={this.resetError} />;
    }
    return this.props.children;
  }
}

function ErrorFallback({ error, resetError }: { error: Error; resetError: () => void }) {
  const [showDetails, setShowDetails] = useState(false);

  const handleReload = async () => {
    try {
      await reloadAppAsync();
    } catch {
      // Reload is unavailable in some environments; retry the render instead.
      resetError();
    }
  };

  return (
    <View style={styles.container} testID="error-fallback">
      <View style={styles.content}>
        <Text style={styles.title}>Si è verificato un errore</Text>
        <Text style={styles.message}>Riavvia DIABETY per continuare.</Text>
        {__DEV__ ? <Text style={styles.devMessage}>{error.message}</Text> : null}
        <Pressable
          onPress={handleReload}
          testID="error-fallback-reload"
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonText}>Riavvia DIABETY</Text>
        </Pressable>
        {__DEV__ ? (
          <Pressable onPress={() => setShowDetails((v) => !v)} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.detailsToggle}>{showDetails ? "Nascondi dettagli" : "Mostra dettagli"}</Text>
          </Pressable>
        ) : null}
      </View>
      {__DEV__ && showDetails ? (
        <ScrollView style={styles.details} contentContainerStyle={styles.detailsContent}>
          <Text selectable style={styles.detailsText}>
            {error.stack ?? error.message}
          </Text>
        </ScrollView>
      ) : null}
    </View>
  );
}

// Stessa palette premium delle altre schede; nessuna dipendenza dal tema GlicoTrack.
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    padding: 24,
  },
  content: {
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: "#32606B",
    borderRadius: 20,
    paddingVertical: 26,
    paddingHorizontal: 18,
  },
  title: {
    color: COLORS.onSurface,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  message: {
    color: "#B5C8D3",
    fontSize: 15,
    textAlign: "center",
  },
  devMessage: {
    color: COLORS.error,
    fontSize: 13,
    textAlign: "center",
  },
  button: {
    marginTop: 8,
    backgroundColor: COLORS.brandPrimary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    minWidth: 180,
  },
  buttonPressed: { opacity: 0.85 },
  buttonText: {
    color: "#06171D",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  detailsToggle: {
    color: COLORS.brandPrimary,
    fontSize: 13,
    textDecorationLine: "underline",
    paddingVertical: 8,
  },
  details: {
    marginTop: 16,
    maxHeight: 260,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#32606B",
    backgroundColor: "#0C2029",
  },
  detailsContent: { padding: 12 },
  detailsText: {
    color: "#DEE8EE",
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
  },
});
