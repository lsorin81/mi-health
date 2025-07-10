import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

interface LabResult {
  test: string;
  value: string;
  unit: string;
  referenceRange: string;
  date: string;
}

interface Vital {
  type: string;
  value: number;
  unit: string;
  date: string;
}

interface ExtractedData {
  documentType?: string;
  date?: string;
  provider?: string;
  labResults?: LabResult[];
  vitals?: Vital[];
  diagnoses?: {
    condition: string;
    date: string;
    notes: string;
  }[];
  medications?: {
    name: string;
    dosage: string;
    frequency: string;
  }[];
  notes?: string;
}

interface ExtractedDataViewProps {
  data: ExtractedData;
  fileName: string;
}

export function ExtractedDataView({ data, fileName }: ExtractedDataViewProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const formatValue = (value: string | number, unit?: string) => {
    return unit ? `${value} ${unit}` : String(value);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <ScrollView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={[styles.title, { color: colors.tint }]}>
          📄 {fileName}
        </ThemedText>
        {data.documentType && (
          <ThemedText style={styles.documentType}>
            Type: {data.documentType.replace('_', ' ').toUpperCase()}
          </ThemedText>
        )}
        {data.date && (
          <ThemedText style={styles.date}>
            Date: {formatDate(data.date)}
          </ThemedText>
        )}
        {data.provider && (
          <ThemedText style={styles.provider}>
            Provider: {data.provider}
          </ThemedText>
        )}
      </ThemedView>

      {data.labResults && data.labResults.length > 0 && (
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={[styles.sectionTitle, { color: colors.tint }]}>
            🧪 Lab Results
          </ThemedText>
          {data.labResults.map((result, index) => (
            <View key={index} style={[styles.resultCard, { borderColor: colors.text + '20' }]}>
              <ThemedText style={styles.testName}>{result.test}</ThemedText>
              <View style={styles.resultRow}>
                <ThemedText style={[styles.resultValue, { color: colors.tint }]}>
                  {formatValue(result.value, result.unit)}
                </ThemedText>
                {result.referenceRange && (
                  <ThemedText style={styles.referenceRange}>
                    Reference: {result.referenceRange}
                  </ThemedText>
                )}
              </View>
              {result.date && (
                <ThemedText style={styles.resultDate}>
                  {formatDate(result.date)}
                </ThemedText>
              )}
            </View>
          ))}
        </ThemedView>
      )}

      {data.vitals && data.vitals.length > 0 && (
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={[styles.sectionTitle, { color: colors.tint }]}>
            💓 Vital Signs
          </ThemedText>
          {data.vitals.map((vital, index) => (
            <View key={index} style={[styles.resultCard, { borderColor: colors.text + '20' }]}>
              <ThemedText style={styles.testName}>{vital.type}</ThemedText>
              <ThemedText style={[styles.resultValue, { color: colors.tint }]}>
                {formatValue(vital.value, vital.unit)}
              </ThemedText>
              {vital.date && (
                <ThemedText style={styles.resultDate}>
                  {formatDate(vital.date)}
                </ThemedText>
              )}
            </View>
          ))}
        </ThemedView>
      )}

      {data.medications && data.medications.length > 0 && (
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={[styles.sectionTitle, { color: colors.tint }]}>
            💊 Medications
          </ThemedText>
          {data.medications.map((med, index) => (
            <View key={index} style={[styles.resultCard, { borderColor: colors.text + '20' }]}>
              <ThemedText style={styles.testName}>{med.name}</ThemedText>
              <ThemedText style={styles.dosage}>
                Dosage: {med.dosage}
              </ThemedText>
              <ThemedText style={styles.frequency}>
                Frequency: {med.frequency}
              </ThemedText>
            </View>
          ))}
        </ThemedView>
      )}

      {data.diagnoses && data.diagnoses.length > 0 && (
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={[styles.sectionTitle, { color: colors.tint }]}>
            🩺 Diagnoses
          </ThemedText>
          {data.diagnoses.map((diagnosis, index) => (
            <View key={index} style={[styles.resultCard, { borderColor: colors.text + '20' }]}>
              <ThemedText style={styles.testName}>{diagnosis.condition}</ThemedText>
              {diagnosis.notes && (
                <ThemedText style={styles.notes}>{diagnosis.notes}</ThemedText>
              )}
              {diagnosis.date && (
                <ThemedText style={styles.resultDate}>
                  {formatDate(diagnosis.date)}
                </ThemedText>
              )}
            </View>
          ))}
        </ThemedView>
      )}

      {data.notes && (
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={[styles.sectionTitle, { color: colors.tint }]}>
            📝 Additional Notes
          </ThemedText>
          <ThemedText style={styles.notes}>{data.notes}</ThemedText>
        </ThemedView>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  documentType: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 4,
  },
  provider: {
    fontSize: 14,
    opacity: 0.8,
  },
  section: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  resultCard: {
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  testName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  resultValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  referenceRange: {
    fontSize: 12,
    opacity: 0.7,
  },
  resultDate: {
    fontSize: 12,
    opacity: 0.6,
  },
  dosage: {
    fontSize: 14,
    marginBottom: 2,
  },
  frequency: {
    fontSize: 14,
    marginBottom: 2,
  },
  notes: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },
});