import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import authService from "@/services/authService";
import * as AppleAuthentication from "expo-apple-authentication";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet } from "react-native";

export default function LoginScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [isAppleAuthAvailable, setIsAppleAuthAvailable] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    // Check if Apple Auth is available
    const available = await authService.isAppleAuthAvailable();
    setIsAppleAuthAvailable(available);

    // Check if user is already authenticated
    const user = await authService.getCurrentUser();
    if (user) {
      // Check if they have API key
      const hasApiKey = await authService.hasGeminiApiKey();
      if (hasApiKey) {
        router.replace("/(tabs)/");
      } else {
        router.replace("/(auth)/api-key");
      }
    }
  };

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    try {
      const user = await authService.signInWithApple();
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
          "Sign In Failed",
          "Unable to sign in with Apple. Please try again."
        );
      }
    } catch (error) {
      console.error("Sign in error:", error);
      Alert.alert(
        "Error",
        "An error occurred during sign in. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.content}>
        <ThemedText
          type="title"
          style={styles.title}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          Mi Health
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Your personal health data companion
        </ThemedText>

        <ThemedView style={styles.features}>
          <ThemedText style={styles.feature}>
            • Sync with Apple Health
          </ThemedText>
          <ThemedText style={styles.feature}>
            • Upload medical documents
          </ThemedText>
          <ThemedText style={styles.feature}>
            • AI-powered health insights
          </ThemedText>
          <ThemedText style={styles.feature}>
            • Daily health summaries
          </ThemedText>
        </ThemedView>

        {isLoading ? (
          <ActivityIndicator size="large" style={styles.loader} />
        ) : isAppleAuthAvailable ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={
              AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
            }
            buttonStyle={
              AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={8}
            style={styles.appleButton}
            onPress={handleAppleSignIn}
          />
        ) : (
          <ThemedText style={styles.unavailable}>
            Apple Sign In is not available on this device
          </ThemedText>
        )}
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
    width: "80%",
    maxWidth: 400,
    alignItems: "center",
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
    width: "100%",
    paddingHorizontal: 16,
  },
  subtitle: {
    fontSize: 18,
    opacity: 0.7,
    textAlign: "center",
    marginBottom: 48,
  },
  features: {
    width: "100%",
    marginBottom: 48,
  },
  feature: {
    fontSize: 16,
    marginBottom: 12,
  },
  appleButton: {
    width: "100%",
    height: 50,
  },
  loader: {
    marginTop: 20,
  },
  unavailable: {
    textAlign: "center",
    opacity: 0.5,
    marginTop: 20,
  },
});
