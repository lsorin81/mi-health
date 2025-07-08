import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import authService from "@/services/authService";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { useThemeColor } from "@/hooks/useThemeColor";
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';

export default function LoginScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const borderColor = useThemeColor({ light: "#E0E0E0", dark: "#333" }, "border");

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
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


  const handleEmailSignIn = async (useWebRedirect: boolean = false) => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await authService.signInWithEmail(email, useWebRedirect);
      if (!error) {
        setEmailSent(true);
        const message = useWebRedirect 
          ? "We've sent you a magic link. The link will open a web page that redirects to the app."
          : "We've sent you a magic link. Click the link in your email to sign in.";
        
        Alert.alert("Check your email", message);
      } else {
        Alert.alert("Error", error.message || "Failed to send magic link");
      }
    } catch (error) {
      console.error("Email sign in error:", error);
      Alert.alert("Error", "An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const showRedirectOptions = () => {
    Alert.alert(
      "Choose Magic Link Type",
      "If the standard magic link doesn't work, try the web redirect option:",
      [
        { text: "Standard Link", onPress: () => handleEmailSignIn(false) },
        { text: "Web Redirect", onPress: () => handleEmailSignIn(true) },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  // Debug function to test deep link handling
  const testDeepLink = () => {
    // First, show environment info
    const isExpoGo = Constants.appOwnership === 'expo';
    const envInfo = {
      isExpoGo,
      appOwnership: Constants.appOwnership,
      slug: Constants.expoConfig?.slug,
      hostUri: Constants.expoConfig?.hostUri
    };
    
    console.log('Expo Environment:', envInfo);
    
    const testUrls = [
      'exp://exp.host/@anonymous/mi-health/--/auth/verify?access_token=test&refresh_token=test&type=magiclink',
      'exp://192.168.1.149:19000/--/auth/verify?access_token=test&refresh_token=test&type=magiclink',
      'mihealth://auth/verify?access_token=test&refresh_token=test&type=magiclink',
      'exp://localhost:19000/--/auth/verify?access_token=test&refresh_token=test&type=magiclink',
    ];
    
    Alert.alert(
      'Test Deep Link',
      `Environment: ${JSON.stringify(envInfo, null, 2)}\n\nWhich URL format should we test?`,
      testUrls.map((url, index) => ({
        text: `Test ${index + 1}`,
        onPress: () => {
          console.log('Testing URL:', url);
          Linking.openURL(url).catch(err => console.error('Failed to open URL:', err));
        }
      })).concat([{ text: 'Cancel', style: 'cancel' }])
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
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
              • Track your health data
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

          {!emailSent ? (
            <>
              <TextInput
                style={[
                  styles.input,
                  { 
                    backgroundColor, 
                    color: textColor,
                    borderColor: borderColor
                  }
                ]}
                placeholder="Enter your email"
                placeholderTextColor={textColor + "80"}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />

              <TouchableOpacity
                style={[
                  styles.button,
                  isLoading && styles.buttonDisabled
                ]}
                onPress={showRedirectOptions}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <ThemedText style={styles.buttonText}>
                    Send Magic Link
                  </ThemedText>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <ThemedView style={styles.successMessage}>
              <ThemedText style={styles.successText}>
                Check your email!
              </ThemedText>
              <ThemedText style={styles.successSubtext}>
                We&apos;ve sent a magic link to {email}
              </ThemedText>
              <TouchableOpacity
                style={styles.resendButton}
                onPress={() => {
                  setEmailSent(false);
                  setEmail("");
                }}
              >
                <ThemedText style={styles.resendText}>
                  Try a different email
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>
          )}

          {/* Debug button - only in development */}
          {__DEV__ && (
            <TouchableOpacity
              style={styles.debugButton}
              onPress={testDeepLink}
            >
              <ThemedText style={styles.debugButtonText}>
                🔧 Debug Deep Links
              </ThemedText>
            </TouchableOpacity>
          )}
        </ThemedView>
      </ThemedView>
    </KeyboardAvoidingView>
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
  input: {
    width: "100%",
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    width: "100%",
    height: 50,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  successMessage: {
    alignItems: "center",
    paddingTop: 24,
  },
  successText: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
  },
  successSubtext: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: "center",
    marginBottom: 24,
  },
  resendButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  resendText: {
    color: "#007AFF",
    fontSize: 16,
  },
  debugButton: {
    marginTop: 20,
    padding: 8,
    backgroundColor: "rgba(255, 165, 0, 0.1)",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "orange",
  },
  debugButtonText: {
    color: "orange",
    fontSize: 12,
    textAlign: "center",
  },
});
