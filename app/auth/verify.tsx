import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, Alert, StyleSheet, Platform } from "react-native";
import * as Linking from 'expo-linking';

export default function WebVerifyScreen() {
  const params = useLocalSearchParams();

  useEffect(() => {
    const handleWebMagicLink = async () => {
      const { access_token, refresh_token, type } = params;
      
      if (Platform.OS === 'web') {
        // For web, try to redirect to the app
        const appUrl = `mihealth://auth/verify?access_token=${access_token}&refresh_token=${refresh_token}&type=${type}`;
        
        try {
          // Try to open the app
          await Linking.openURL(appUrl);
          
          // Show a message that the app should open
          Alert.alert(
            "Opening App",
            "The Mi-Health app should open now. If it doesn&apos;t, please make sure the app is installed.",
            [
              {
                text: "OK",
                onPress: () => {
                  // After 3 seconds, show instructions
                  setTimeout(() => {
                    Alert.alert(
                      "App Not Opening?",
                      "If the app didn&apos;t open, please copy this URL and paste it in your browser:\n\n" + appUrl
                    );
                  }, 3000);
                }
              }
            ]
          );
        } catch (error) {
          console.error('Failed to open app:', error);
          Alert.alert(
            "Unable to Open App",
            "Please copy this URL and open it in your mobile browser:\n\n" + appUrl
          );
        }
      } else {
        // For mobile, redirect to the main login which will handle it
        router.replace('/(auth)/login');
      }
    };

    if (params.access_token) {
      handleWebMagicLink();
    } else {
      // No tokens, redirect to login
      router.replace('/(auth)/login');
    }
  }, [params]);

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.content}>
        <ActivityIndicator size="large" style={styles.loader} />
        <ThemedText style={styles.text}>
          Opening Mi-Health app...
        </ThemedText>
        <ThemedText style={styles.subtext}>
          If the app doesn&apos;t open automatically, please make sure it&apos;s installed on your device.
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
    paddingHorizontal: 24,
  },
  loader: {
    marginBottom: 20,
  },
  text: {
    fontSize: 18,
    marginBottom: 12,
    textAlign: "center",
  },
  subtext: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: "center",
  },
});