import { Stack } from "expo-router";
import React from "react";
import { StyleSheet, View, Text } from "react-native";

export default function ModalScreen() {
  return (
    <View style={styles.container} testID="modal-screen">
      <Stack.Screen options={{ title: "Modal" }} />
      <Text style={styles.title}>Modal</Text>
      <Text style={styles.subtitle}>This screen is ready for modal content.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: "#111827",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
  },
});
