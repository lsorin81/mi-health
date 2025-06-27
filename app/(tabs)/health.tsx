import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import authService from '@/services/authService';
import supabaseService from '@/services/supabaseService';
import healthKitService from '@/services/healthKitService';
import { HealthMetric, HealthMetricType } from '@/types/health';

export default function HealthDataScreen() {
  const colorScheme = useColorScheme();
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [lastSyncDate, setLastSyncDate] = useState<Date | null>(null);
  const [recentMetrics, setRecentMetrics] = useState<{
    [key: string]: HealthMetric[];
  }>({});

  useEffect(() => {
    loadHealthData();
  }, []);

  const loadHealthData = async () => {
    setIsLoading(true);
    try {
      const user = await authService.getCurrentUser();
      if (!user) return;

      // Get last 7 days of data
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const metrics = await supabaseService.getHealthMetrics(user.id, startDate, endDate);

      // Group metrics by type
      const groupedMetrics: { [key: string]: HealthMetric[] } = {};
      metrics.forEach((metric) => {
        if (!groupedMetrics[metric.metricType]) {
          groupedMetrics[metric.metricType] = [];
        }
        groupedMetrics[metric.metricType].push(metric);
      });

      setRecentMetrics(groupedMetrics);

      // Check last sync date
      if (metrics.length > 0) {
        const latestMetric = metrics[0];
        setLastSyncDate(new Date(latestMetric.recordedAt));
      }
    } catch (error) {
      console.error('Error loading health data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHealthData();
    setRefreshing(false);
  };

  const requestHealthKitPermissions = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Not Available', 'Health data sync is only available on iOS devices.');
      return;
    }

    const granted = await healthKitService.requestPermissions();
    setHasPermissions(granted);

    if (granted) {
      Alert.alert('Success', 'HealthKit permissions granted. You can now sync your health data.');
    } else {
      Alert.alert('Permission Denied', 'Please grant HealthKit permissions in Settings to sync health data.');
    }
  };

  const syncHealthData = async () => {
    if (!hasPermissions && Platform.OS === 'ios') {
      await requestHealthKitPermissions();
      return;
    }

    setIsSyncing(true);
    try {
      const user = await authService.getCurrentUser();
      if (!user) return;

      // Get last 7 days of data
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const allMetrics = await healthKitService.getAllHealthData(startDate, endDate, user.id);

      if (allMetrics.length > 0) {
        const success = await supabaseService.saveHealthMetricsBatch(allMetrics);
        if (success) {
          Alert.alert('Success', `Synced ${allMetrics.length} health metrics`);
          await loadHealthData();
        } else {
          Alert.alert('Error', 'Failed to save health data. Please try again.');
        }
      } else {
        Alert.alert('No Data', 'No new health data found to sync.');
      }
    } catch (error) {
      console.error('Error syncing health data:', error);
      Alert.alert('Error', 'Failed to sync health data. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  const formatMetricValue = (metric: HealthMetric): string => {
    switch (metric.metricType) {
      case HealthMetricType.STEPS:
        return `${metric.value.toLocaleString()} steps`;
      case HealthMetricType.HEART_RATE:
        return `${Math.round(metric.value)} bpm`;
      case HealthMetricType.SLEEP_HOURS:
        return `${metric.value.toFixed(1)} hours`;
      case HealthMetricType.CALORIES_BURNED:
        return `${Math.round(metric.value)} cal`;
      case HealthMetricType.WEIGHT:
        return `${metric.value.toFixed(1)} kg`;
      case HealthMetricType.BLOOD_GLUCOSE:
        return `${metric.value.toFixed(1)} mg/dL`;
      default:
        return `${metric.value} ${metric.unit}`;
    }
  };

  const getMetricIcon = (type: HealthMetricType): string => {
    switch (type) {
      case HealthMetricType.STEPS:
        return 'figure.walk';
      case HealthMetricType.HEART_RATE:
        return 'heart.fill';
      case HealthMetricType.SLEEP_HOURS:
        return 'moon.fill';
      case HealthMetricType.CALORIES_BURNED:
        return 'flame.fill';
      case HealthMetricType.WEIGHT:
        return 'scalemass.fill';
      case HealthMetricType.BLOOD_GLUCOSE:
        return 'drop.fill';
      default:
        return 'chart.line.uptrend.xyaxis';
    }
  };

  const getMetricColor = (type: HealthMetricType): string => {
    switch (type) {
      case HealthMetricType.STEPS:
        return Colors[colorScheme ?? 'light'].tint;
      case HealthMetricType.HEART_RATE:
        return '#FF6B6B';
      case HealthMetricType.SLEEP_HOURS:
        return '#4ECDC4';
      case HealthMetricType.CALORIES_BURNED:
        return '#FFE66D';
      case HealthMetricType.WEIGHT:
        return '#95E1D3';
      case HealthMetricType.BLOOD_GLUCOSE:
        return '#F38181';
      default:
        return Colors[colorScheme ?? 'light'].tint;
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
        <ThemedText type="title">Health Data</ThemedText>
        <ThemedText style={styles.subtitle}>
          Sync and view your health metrics
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.syncSection}>
        <TouchableOpacity
          style={[styles.syncButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}
          onPress={syncHealthData}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <IconSymbol name="arrow.triangle.2.circlepath" size={20} color="white" />
              <ThemedText style={styles.syncButtonText}>
                {Platform.OS === 'ios' ? 'Sync with Apple Health' : 'Sync Health Data'}
              </ThemedText>
            </>
          )}
        </TouchableOpacity>

        {lastSyncDate && (
          <ThemedText style={styles.lastSync}>
            Last synced: {lastSyncDate.toLocaleDateString()} at {lastSyncDate.toLocaleTimeString()}
          </ThemedText>
        )}
      </ThemedView>

      {Platform.OS !== 'ios' && (
        <ThemedView style={styles.warningCard}>
          <IconSymbol name="info.circle.fill" size={20} color={Colors[colorScheme ?? 'light'].tint} />
          <ThemedText style={styles.warningText}>
            Health data sync is currently only available on iOS devices with Apple Health
          </ThemedText>
        </ThemedView>
      )}

      <ThemedView style={styles.metricsSection}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Recent Metrics (Last 7 Days)
        </ThemedText>

        {Object.keys(recentMetrics).length === 0 ? (
          <ThemedView style={styles.emptyState}>
            <IconSymbol name="heart.text.square" size={48} color={Colors[colorScheme ?? 'light'].text + '40'} />
            <ThemedText style={styles.emptyText}>
              No health data synced yet
            </ThemedText>
            <ThemedText style={styles.emptySubtext}>
              Sync your health data to see metrics here
            </ThemedText>
          </ThemedView>
        ) : (
          Object.entries(recentMetrics).map(([type, metrics]) => {
            const latestMetric = metrics[0];
            const averageValue = metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
            
            return (
              <ThemedView key={type} style={styles.metricCard}>
                <ThemedView style={[styles.metricIcon, { backgroundColor: getMetricColor(type as HealthMetricType) + '20' }]}>
                  <IconSymbol
                    name={getMetricIcon(type as HealthMetricType)}
                    size={24}
                    color={getMetricColor(type as HealthMetricType)}
                  />
                </ThemedView>
                <ThemedView style={styles.metricInfo}>
                  <ThemedText style={styles.metricType}>
                    {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </ThemedText>
                  <ThemedText style={styles.metricLatest}>
                    Latest: {formatMetricValue(latestMetric)}
                  </ThemedText>
                  <ThemedText style={styles.metricAverage}>
                    7-day avg: {formatMetricValue({ ...latestMetric, value: averageValue })}
                  </ThemedText>
                </ThemedView>
                <ThemedText style={styles.metricCount}>
                  {metrics.length} records
                </ThemedText>
              </ThemedView>
            );
          })
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
  subtitle: {
    opacity: 0.6,
    marginTop: 4,
  },
  syncSection: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
  },
  syncButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  lastSync: {
    fontSize: 12,
    opacity: 0.6,
    textAlign: 'center',
    marginTop: 8,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 16,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    borderRadius: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  metricsSection: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
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
  },
  metricCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    borderRadius: 12,
    marginBottom: 12,
  },
  metricIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricInfo: {
    flex: 1,
  },
  metricType: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  metricLatest: {
    fontSize: 14,
    marginBottom: 2,
  },
  metricAverage: {
    fontSize: 12,
    opacity: 0.6,
  },
  metricCount: {
    fontSize: 12,
    opacity: 0.6,
  },
});