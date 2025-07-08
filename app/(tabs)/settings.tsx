import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Colors } from '@/constants/Colors';
import authService from '@/services/authService';
import storageService from '@/services/storageService';
import geminiService from '@/services/geminiService';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({ light: '#E0E0E0', dark: '#404040' }, 'text');
  
  const [user, setUser] = useState<any>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const currentUser = await authService.getCurrentUser();
    setUser(currentUser);

    const apiKeyExists = await authService.hasGeminiApiKey();
    setHasApiKey(apiKeyExists);
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      Alert.alert('Error', 'Please enter your Gemini API key');
      return;
    }

    setIsLoading(true);
    try {
      const isValid = await geminiService.testApiKey(apiKey.trim());
      
      if (isValid) {
        await storageService.setGeminiApiKey(apiKey.trim());
        setHasApiKey(true);
        setShowApiKeyInput(false);
        setApiKey('');
        Alert.alert('Success', 'API key saved successfully!');
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

  const handleRemoveApiKey = () => {
    Alert.alert(
      'Remove API Key',
      'Are you sure you want to remove your Gemini API key? AI features will be disabled.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await storageService.removeGeminiApiKey();
            setHasApiKey(false);
            Alert.alert('API key removed', 'Your Gemini API key has been removed.');
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await authService.signOut();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.container}>
        <ThemedView style={styles.header}>
          <ThemedText type="title">Settings</ThemedText>
        </ThemedView>

        {/* User Section */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Account
          </ThemedText>
          <ThemedView style={styles.card}>
            <ThemedView style={styles.userInfo}>
              <IconSymbol name="person.circle.fill" size={48} color={Colors[colorScheme ?? 'light'].tint} />
              <ThemedView style={styles.userDetails}>
                <ThemedText style={styles.userName}>{user?.email || 'User'}</ThemedText>
                <ThemedText style={styles.userId}>ID: {user?.id?.substring(0, 8)}...</ThemedText>
              </ThemedView>
            </ThemedView>
          </ThemedView>
        </ThemedView>

        {/* API Key Section */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            AI Configuration
          </ThemedText>
          
          {hasApiKey && !showApiKeyInput ? (
            <ThemedView style={styles.card}>
              <ThemedView style={styles.apiKeyStatus}>
                <IconSymbol name="checkmark.circle.fill" size={24} color="#4ECDC4" />
                <ThemedText style={styles.apiKeyStatusText}>
                  Gemini API key configured
                </ThemedText>
              </ThemedView>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={handleRemoveApiKey}
              >
                <ThemedText style={styles.secondaryButtonText}>Remove API Key</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          ) : (
            <ThemedView style={styles.card}>
              {showApiKeyInput ? (
                <>
                  <ThemedText style={styles.inputLabel}>
                    Enter your Gemini API key
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.input,
                      { 
                        backgroundColor: borderColor + '10',
                        color: textColor,
                        borderColor,
                      }
                    ]}
                    placeholder="Paste your API key here"
                    placeholderTextColor={textColor + '60'}
                    value={apiKey}
                    onChangeText={setApiKey}
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry
                    editable={!isLoading}
                  />
                  <ThemedView style={styles.buttonRow}>
                    <TouchableOpacity
                      style={[styles.button, styles.cancelButton]}
                      onPress={() => {
                        setShowApiKeyInput(false);
                        setApiKey('');
                      }}
                      disabled={isLoading}
                    >
                      <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.button, styles.primaryButton]}
                      onPress={handleSaveApiKey}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <ThemedText style={styles.primaryButtonText}>Save</ThemedText>
                      )}
                    </TouchableOpacity>
                  </ThemedView>
                </>
              ) : (
                <>
                  <ThemedView style={styles.apiKeyMissing}>
                    <IconSymbol name="exclamationmark.circle" size={24} color="#FFE66D" />
                    <ThemedText style={styles.apiKeyMissingText}>
                      No API key configured
                    </ThemedText>
                  </ThemedView>
                  <TouchableOpacity
                    style={[styles.button, styles.primaryButton]}
                    onPress={() => setShowApiKeyInput(true)}
                  >
                    <ThemedText style={styles.primaryButtonText}>Add API Key</ThemedText>
                  </TouchableOpacity>
                </>
              )}
            </ThemedView>
          )}
        </ThemedView>

        {/* About Section */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            About
          </ThemedText>
          <ThemedView style={styles.card}>
            <ThemedView style={styles.aboutItem}>
              <ThemedText style={styles.aboutLabel}>Version</ThemedText>
              <ThemedText style={styles.aboutValue}>1.0.0</ThemedText>
            </ThemedView>
            <ThemedView style={styles.aboutItem}>
              <ThemedText style={styles.aboutLabel}>Data Storage</ThemedText>
              <ThemedText style={styles.aboutValue}>Supabase</ThemedText>
            </ThemedView>
            <ThemedView style={styles.aboutItem}>
              <ThemedText style={styles.aboutLabel}>AI Provider</ThemedText>
              <ThemedText style={styles.aboutValue}>Google Gemini</ThemedText>
            </ThemedView>
          </ThemedView>
        </ThemedView>

        {/* Sign Out */}
        <ThemedView style={styles.section}>
          <TouchableOpacity
            style={[styles.button, styles.signOutButton]}
            onPress={handleSignOut}
          >
            <IconSymbol name="rectangle.portrait.and.arrow.right" size={20} color="#FF6B6B" />
            <ThemedText style={styles.signOutText}>Sign Out</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 60,
  },
  section: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  card: {
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    borderRadius: 12,
    padding: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  userId: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
  apiKeyStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  apiKeyStatusText: {
    fontSize: 16,
  },
  apiKeyMissing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  apiKeyMissingText: {
    fontSize: 16,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
    opacity: 0.8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  secondaryButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  aboutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  aboutLabel: {
    opacity: 0.6,
  },
  aboutValue: {
    fontWeight: '600',
  },
  signOutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  signOutText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '600',
  },
});