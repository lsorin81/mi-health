import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import authService from "@/services/authService";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, Alert, StyleSheet } from "react-native";

export default function VerifyScreen() {
  const params = useLocalSearchParams();

  useEffect(() => {
    const verifyMagicLink = async () => {
      try {
        // Extract email and token from URL params
        const email = params.email as string;
        const token = params.token as string;

        if (!email || !token) {
          Alert.alert("Error", "Invalid verification link");
          router.replace("/(auth)/login");
          return;
        }

        const user = await authService.verifyOtp(email, token);
        
        if (user) {
          // Check if they have API key
          const hasApiKey = await authService.hasGeminiApiKey();
          if (hasApiKey) {
            router.replace("/(tabs)/");
          } else {
            router.replace("/(auth)/api-key");
          }
        } else {
          Alert.alert(
            "Verification Failed",
            "Unable to verify your email. Please try again."
          );
          router.replace("/(auth)/login");
        }
      } catch (error) {
        console.error("Verification error:", error);
        Alert.alert(
          "Error",
          "An error occurred during verification. Please try again."
        );
        router.replace("/(auth)/login");
      }
    };

    verifyMagicLink();
  }, [params.email, params.token]);

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.content}>
        <ActivityIndicator size="large" style={styles.loader} />
        <ThemedText style={styles.text}>
          Verifying your email...
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
  },
  loader: {
    marginBottom: 20,
  },
  text: {
    fontSize: 18,
    opacity: 0.7,
  },
});