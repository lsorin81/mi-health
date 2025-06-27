import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import authService from '@/services/authService';
import supabaseService from '@/services/supabaseService';
import healthKitService from '@/services/healthKitService';
import geminiService from '@/services/geminiService';
import { DailySummary, HealthMetric } from '@/types/health';

export default function DashboardScreen() {
  const colorScheme = useColorScheme();
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [todayMetrics, setTodayMetrics] = useState<{
    steps: number;
    heartRate: number;
    sleep: number;
  }>({ steps: 0, heartRate: 0, sleep: 0 });
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (!user) return;

      // Check API key status
      const apiKeyExists = await authService.hasGeminiApiKey();
      setHasApiKey(apiKeyExists);

      // Load latest daily summary
      const summary = await supabaseService.getLatestDailySummary(user.id);
      setDailySummary(summary);

      // Load today's health metrics
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const metrics = await supabaseService.getHealthMetrics(user.id, today, tomorrow);
      
      // Calculate aggregates
      const steps = metrics
        .filter(m => m.metricType === 'steps')
        .reduce((sum, m) => sum + m.value, 0);
      
      const heartRates = metrics.filter(m => m.metricType === 'heart_rate');
      const avgHeartRate = heartRates.length > 0
        ? Math.round(heartRates.reduce((sum, m) => sum + m.value, 0) / heartRates.length)
        : 0;
      
      const sleep = metrics
        .filter(m => m.metricType === 'sleep_hours')
        .reduce((sum, m) => sum + m.value, 0);

      setTodayMetrics({ steps, heartRate: avgHeartRate, sleep });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const generateDailySummary = async () => {
    if (!hasApiKey) return;
    
    setIsLoading(true);
    try {
      const user = await authService.getCurrentUser();
      if (!user) return;

      // Get last 24 hours of data
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 1);

      const [metrics, documents] = await Promise.all([
        supabaseService.getHealthMetrics(user.id, startDate, endDate),
        supabaseService.getHealthDocuments(user.id),
      ]);

      // Generate summary with Gemini
      const summary = await geminiService.generateDailySummary({
        metrics,
        documents: documents.slice(0, 5), // Last 5 documents
      });

      if (summary) {
        // Save to database
        const savedSummary = await supabaseService.saveDailySummary({
          userId: user.id,
          summaryDate: new Date(),
          summaryText: summary.summaryText,
          keyInsights: summary.keyInsights,
        });

        if (savedSummary) {
          setDailySummary(savedSummary);
        }
      }
    } catch (error) {
      console.error('Error generating daily summary:', error);
    } finally {
      setIsLoading(false);
    }
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
        <ThemedText type="title">Health Dashboard</ThemedText>
        <ThemedText style={styles.date}>
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </ThemedText>
      </ThemedView>

      {/* Today's Metrics */}
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Today's Metrics
        </ThemedText>
        <ThemedView style={styles.metricsGrid}>
          <ThemedView style={[styles.metricCard, { backgroundColor: Colors[colorScheme ?? 'light'].tint + '20' }]}>
            <IconSymbol name="figure.walk" size={24} color={Colors[colorScheme ?? 'light'].tint} />
            <ThemedText style={styles.metricValue}>{todayMetrics.steps.toLocaleString()}</ThemedText>
            <ThemedText style={styles.metricLabel}>Steps</ThemedText>
          </ThemedView>
          
          <ThemedView style={[styles.metricCard, { backgroundColor: '#FF6B6B20' }]}>
            <IconSymbol name="heart.fill" size={24} color="#FF6B6B" />
            <ThemedText style={styles.metricValue}>{todayMetrics.heartRate || '--'}</ThemedText>
            <ThemedText style={styles.metricLabel}>Avg HR</ThemedText>
          </ThemedView>
          
          <ThemedView style={[styles.metricCard, { backgroundColor: '#4ECDC420' }]}>
            <IconSymbol name="moon.fill" size={24} color="#4ECDC4" />
            <ThemedText style={styles.metricValue}>{todayMetrics.sleep.toFixed(1)}</ThemedText>
            <ThemedText style={styles.metricLabel}>Sleep (hrs)</ThemedText>
          </ThemedView>
        </ThemedView>
      </ThemedView>

      {/* Daily Summary */}
      <ThemedView style={styles.section}>
        <ThemedView style={styles.sectionHeader}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Daily Summary
          </ThemedText>
          {hasApiKey && (
            <TouchableOpacity onPress={generateDailySummary}>
              <IconSymbol name="arrow.clockwise" size={20} color={Colors[colorScheme ?? 'light'].tint} />
            </TouchableOpacity>
          )}
        </ThemedView>

        {!hasApiKey ? (
          <ThemedView style={styles.summaryCard}>
            <ThemedText style={styles.noApiKey}>
              Add your Gemini API key in Settings to enable AI-powered health summaries
            </ThemedText>
          </ThemedView>
        ) : dailySummary ? (
          <ThemedView style={styles.summaryCard}>
            <ThemedText style={styles.summaryText}>{dailySummary.summaryText}</ThemedText>
            
            {dailySummary.keyInsights.length > 0 && (
              <ThemedView style={styles.insights}>
                <ThemedText type="defaultSemiBold" style={styles.insightsTitle}>
                  Key Insights
                </ThemedText>
                {dailySummary.keyInsights.map((insight, index) => (
                  <ThemedView key={index} style={styles.insightItem}>
                    <ThemedView style={[
                      styles.insightSeverity,
                      { backgroundColor: 
                        insight.severity === 'high' ? '#FF6B6B' :
                        insight.severity === 'medium' ? '#FFE66D' :
                        '#4ECDC4'
                      }
                    ]} />
                    <ThemedView style={styles.insightContent}>
                      <ThemedText style={styles.insightCategory}>{insight.category}</ThemedText>
                      <ThemedText style={styles.insightText}>{insight.insight}</ThemedText>
                    </ThemedView>
                  </ThemedView>
                ))}
              </ThemedView>
            )}
          </ThemedView>
        ) : (
          <TouchableOpacity onPress={generateDailySummary}>
            <ThemedView style={styles.generateCard}>
              <IconSymbol name="sparkles" size={32} color={Colors[colorScheme ?? 'light'].tint} />
              <ThemedText style={styles.generateText}>
                Generate your first daily summary
              </ThemedText>
            </ThemedView>
          </TouchableOpacity>
        )}
      </ThemedView>
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
  date: {
    opacity: 0.6,
    marginTop: 4,
  },
  section: {
    padding: 24,
    paddingTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  metricLabel: {
    fontSize: 12,
    opacity: 0.6,
  },
  summaryCard: {
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    padding: 16,
    borderRadius: 12,
  },
  summaryText: {
    lineHeight: 22,
  },
  noApiKey: {
    textAlign: 'center',
    opacity: 0.6,
    lineHeight: 22,
  },
  generateCard: {
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
  },
  generateText: {
    opacity: 0.8,
  },
  insights: {
    marginTop: 16,
    gap: 12,
  },
  insightsTitle: {
    marginBottom: 4,
  },
  insightItem: {
    flexDirection: 'row',
    gap: 12,
  },
  insightSeverity: {
    width: 4,
    borderRadius: 2,
  },
  insightContent: {
    flex: 1,
  },
  insightCategory: {
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 2,
  },
  insightText: {
    fontSize: 14,
    lineHeight: 20,
  },
});