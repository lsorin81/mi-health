import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import authService from '@/services/authService';
import supabaseService from '@/services/supabaseService';
import geminiService from '@/services/geminiService';
import { HealthDocument } from '@/types/health';
import { ExtractedDataView } from '@/components/ExtractedDataView';
import { processAndSaveHealthData } from '@/utils/healthDataProcessor';

export default function DocumentsScreen() {
  const colorScheme = useColorScheme();
  const [documents, setDocuments] = useState<HealthDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [showExtractedData, setShowExtractedData] = useState(false);
  const [currentExtractedData, setCurrentExtractedData] = useState<any>(null);
  const [currentFileName, setCurrentFileName] = useState<string>('');

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (!user) return;

      const apiKeyExists = await authService.hasGeminiApiKey();
      setHasApiKey(apiKeyExists);

      // For now, since we're not saving documents to the database,
      // we'll keep the existing local documents and only load any existing ones
      try {
        const docs = await supabaseService.getHealthDocuments(user.id);
        // Only replace if we got actual documents from the database
        if (docs.length > 0) {
          setDocuments(docs);
        }
      } catch (error) {
        console.log('📋 No documents in database yet, keeping local documents');
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDocuments();
    setRefreshing(false);
  };

  const pickDocument = async () => {
    if (!hasApiKey) {
      Alert.alert(
        'API Key Required',
        'Please add your Gemini API key in Settings to upload and process documents.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        await uploadDocument(asset.uri, asset.name);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    }
  };

  const uploadDocument = async (uri: string, fileName: string) => {
    setIsUploading(true);
    try {
      const user = await authService.getCurrentUser();
      if (!user) return;

      // Read file as blob
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error('File not found');
      }

      // Process with Gemini first
      const geminiResponse = await geminiService.processPDF(uri, fileName);
      if (!geminiResponse) {
        throw new Error('Failed to process PDF with Gemini');
      }

      // Process and save the health data
      console.log('📄 Processing and saving health data...');
      
      const saveSuccess = await processAndSaveHealthData(
        geminiResponse.normalizedData,
        user.id,
        fileName,
        geminiResponse.extractedText
      );

      if (saveSuccess) {
        // Create a local document record for UI display
        const localDoc: HealthDocument = {
          id: `local-${Date.now()}`,
          userId: user.id,
          fileUrl: uri,
          fileName: fileName,
          geminiExtractedText: geminiResponse.extractedText,
          normalizedData: geminiResponse.normalizedData,
          createdAt: new Date(),
        };
        
        // Add to local documents list
        setDocuments([localDoc, ...documents]);
        
        // Show the extracted data in a nice modal
        setCurrentExtractedData(geminiResponse.normalizedData);
        setCurrentFileName(fileName);
        setShowExtractedData(true);
        
        Alert.alert('Success!', 'Document processed and health metrics saved to database!');
      } else {
        Alert.alert('Warning', 'Document was processed but some data may not have been saved to the database.');
      }
    } catch (error) {
      console.error('❌ Error uploading document:', error);
      if (error instanceof Error) {
        console.error('🔍 Error message:', error.message);
        console.error('📋 Error stack:', error.stack);
        
        if (error.message.includes('row-level security policy')) {
          Alert.alert(
            'Authentication Error', 
            'Unable to save document. In development mode, the mock user cannot save to the database due to security policies.'
          );
        } else {
          Alert.alert('Upload Failed', error.message || 'Failed to upload document. Please try again.');
        }
      } else {
        Alert.alert('Upload Failed', 'Failed to upload document. Please try again.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <ThemedView style={styles.header}>
        <ThemedText type="title">Health Documents</ThemedText>
        <ThemedText style={styles.subtitle}>
          Upload and manage your medical documents
        </ThemedText>
      </ThemedView>

      <TouchableOpacity
        style={[styles.uploadButton, { borderColor: Colors[colorScheme ?? 'light'].tint }]}
        onPress={pickDocument}
        disabled={isUploading}
      >
        {isUploading ? (
          <ActivityIndicator size="small" color={Colors[colorScheme ?? 'light'].tint} />
        ) : (
          <>
            <IconSymbol name="doc.badge.plus" size={24} color={Colors[colorScheme ?? 'light'].tint} />
            <ThemedText style={[styles.uploadText, { color: Colors[colorScheme ?? 'light'].tint }]}>
              Upload PDF Document
            </ThemedText>
          </>
        )}
      </TouchableOpacity>

      {!hasApiKey && (
        <ThemedView style={styles.warningCard}>
          <IconSymbol name="exclamationmark.triangle.fill" size={20} color="#FFE66D" />
          <ThemedText style={styles.warningText}>
            Add your Gemini API key in Settings to enable document processing
          </ThemedText>
        </ThemedView>
      )}

      <ThemedView style={styles.documentsList}>
        {documents.length === 0 ? (
          <ThemedView style={styles.emptyState}>
            <IconSymbol name="doc.text" size={48} color={Colors[colorScheme ?? 'light'].text + '40'} />
            <ThemedText style={styles.emptyText}>
              No documents uploaded yet
            </ThemedText>
            <ThemedText style={styles.emptySubtext}>
              Upload your medical records, lab results, and prescriptions
            </ThemedText>
          </ThemedView>
        ) : (
          documents.map((doc) => (
            <ThemedView key={doc.id} style={styles.documentCard}>
              <ThemedView style={styles.documentIcon}>
                <IconSymbol name="doc.fill" size={32} color={Colors[colorScheme ?? 'light'].tint} />
              </ThemedView>
              <ThemedView style={styles.documentInfo}>
                <ThemedText style={styles.documentName} numberOfLines={1}>
                  {doc.fileName}
                </ThemedText>
                <ThemedText style={styles.documentDate}>
                  {formatDate(doc.createdAt)}
                </ThemedText>
                {doc.normalizedData && (
                  <ThemedView style={styles.documentTags}>
                    {doc.normalizedData.documentType && (
                      <ThemedView style={styles.tag}>
                        <ThemedText style={styles.tagText}>
                          {doc.normalizedData.documentType.replace('_', ' ')}
                        </ThemedText>
                      </ThemedView>
                    )}
                    {doc.normalizedData.provider && (
                      <ThemedView style={styles.tag}>
                        <ThemedText style={styles.tagText}>
                          {doc.normalizedData.provider}
                        </ThemedText>
                      </ThemedView>
                    )}
                  </ThemedView>
                )}
              </ThemedView>
            </ThemedView>
          ))
        )}
      </ThemedView>

      {/* Extracted Data Modal */}
      <Modal
        visible={showExtractedData}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <ThemedView style={styles.modalContainer}>
          <ThemedView style={styles.modalHeader}>
            <ThemedText type="title">Extracted Health Data</ThemedText>
            <TouchableOpacity
              onPress={() => setShowExtractedData(false)}
              style={styles.closeButton}
            >
              <IconSymbol name="xmark" size={24} color={Colors[colorScheme ?? 'light'].text} />
            </TouchableOpacity>
          </ThemedView>
          {currentExtractedData && (
            <ExtractedDataView
              data={currentExtractedData}
              fileName={currentFileName}
            />
          )}
        </ThemedView>
      </Modal>
    </ScrollView>
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
  subtitle: {
    opacity: 0.6,
    marginTop: 4,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginHorizontal: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '600',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 24,
    marginTop: 16,
    padding: 16,
    backgroundColor: '#FFE66D20',
    borderRadius: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  documentsList: {
    padding: 24,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    opacity: 0.8,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    opacity: 0.6,
    textAlign: 'center',
  },
  documentCard: {
    flexDirection: 'row',
    gap: 16,
    padding: 16,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    borderRadius: 12,
    marginBottom: 12,
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  documentDate: {
    fontSize: 12,
    opacity: 0.6,
  },
  documentTags: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
    borderRadius: 4,
  },
  tagText: {
    fontSize: 10,
    textTransform: 'capitalize',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
  },
  closeButton: {
    padding: 8,
  },
});