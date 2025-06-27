import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import storageService from '@/services/storageService';
import geminiService from '@/services/geminiService';
import { useThemeColor } from '@/hooks/useThemeColor';

export default function ApiKeyScreen() {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({ light: '#E0E0E0', dark: '#404040' }, 'text');

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      Alert.alert('Error', 'Please enter your Gemini API key');
      return;
    }

    setIsLoading(true);
    try {
      // Test the API key
      const isValid = await geminiService.testApiKey(apiKey.trim());
      
      if (isValid) {
        // Save the API key
        await storageService.setGeminiApiKey(apiKey.trim());
        router.replace('/(tabs)/');
      } else {
        Alert.alert('Invalid API Key', 'The API key you entered is not valid. Please check and try again.');
      }
    } catch (error) {
      console.error('Error saving API key:', error);
      Alert.alert('Error', 'Failed to validate API key. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip API Key Setup?',
      'You can add your Gemini API key later in Settings, but PDF processing and AI features will not work until then.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Skip', onPress: () => router.replace('/(tabs)/') },
      ]
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedView style={styles.content}>
          <ThemedText type="title" style={styles.title}>
            Connect Gemini AI
          </ThemedText>
          
          <ThemedText style={styles.description}>
            To analyze your health documents and generate insights, Mi-Health needs access to Google's Gemini AI.
          </ThemedText>

          <ThemedView style={styles.steps}>
            <ThemedText type="subtitle" style={styles.stepsTitle}>
              How to get your API key:
            </ThemedText>
            <ThemedText style={styles.step}>
              1. Visit aistudio.google.com
            </ThemedText>
            <ThemedText style={styles.step}>
              2. Sign in with your Google account
            </ThemedText>
            <ThemedText style={styles.step}>
              3. Click "Get API key" in the left sidebar
            </ThemedText>
            <ThemedText style={styles.step}>
              4. Create a new API key or use an existing one
            </ThemedText>
            <ThemedText style={styles.step}>
              5. Copy and paste it below
            </ThemedText>
          </ThemedView>

          <TextInput
            style={[
              styles.input,
              { 
                backgroundColor,
                color: textColor,
                borderColor,
              }
            ]}
            placeholder="Paste your Gemini API key here"
            placeholderTextColor={textColor + '60'}
            value={apiKey}
            onChangeText={setApiKey}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            editable={!isLoading}
          />

          {isLoading ? (
            <ActivityIndicator size="large" style={styles.loader} />
          ) : (
            <>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={handleSaveApiKey}
              >
                <ThemedText style={styles.buttonText}>Save API Key</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={handleSkip}
              >
                <ThemedText style={styles.secondaryButtonText}>Skip for Now</ThemedText>
              </TouchableOpacity>
            </>
          )}

          <ThemedText style={styles.privacy}>
            Your API key is stored securely on your device and is never sent to our servers.
          </ThemedText>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    padding: 24,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    opacity: 0.8,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  steps: {
    marginBottom: 32,
  },
  stepsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  step: {
    fontSize: 14,
    marginBottom: 8,
    paddingLeft: 8,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    marginBottom: 24,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loader: {
    marginTop: 24,
  },
  privacy: {
    fontSize: 12,
    opacity: 0.6,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 18,
  },
});