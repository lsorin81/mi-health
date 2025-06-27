import { Platform } from 'react-native';
import { HEALTH_PERMISSIONS } from '@/utils/constants';
import { HealthMetric, HealthMetricType } from '@/types/health';

// Note: react-native-health is iOS only
let AppleHealthKit: any = null;
if (Platform.OS === 'ios') {
  AppleHealthKit = require('react-native-health').default;
}

class HealthKitService {
  private permissions = {
    permissions: {
      read: HEALTH_PERMISSIONS,
      write: [],
    },
  };

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'ios' || !AppleHealthKit) {
      console.log('HealthKit is only available on iOS');
      return false;
    }

    return new Promise((resolve) => {
      AppleHealthKit.initHealthKit(this.permissions, (error: any) => {
        if (error) {
          console.error('Cannot grant permissions for HealthKit', error);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }

  async getSteps(startDate: Date, endDate: Date): Promise<HealthMetric[]> {
    if (Platform.OS !== 'ios' || !AppleHealthKit) return [];

    return new Promise((resolve) => {
      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      AppleHealthKit.getDailyStepCountSamples(options, (err: any, results: any) => {
        if (err) {
          console.error('Error getting steps:', err);
          resolve([]);
          return;
        }

        const metrics: HealthMetric[] = results.map((sample: any) => ({
          metricType: HealthMetricType.STEPS,
          value: sample.value,
          unit: 'count',
          recordedAt: new Date(sample.startDate),
          userId: '', // Will be set by the caller
        }));

        resolve(metrics);
      });
    });
  }

  async getHeartRate(startDate: Date, endDate: Date): Promise<HealthMetric[]> {
    if (Platform.OS !== 'ios' || !AppleHealthKit) return [];

    return new Promise((resolve) => {
      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        ascending: false,
        limit: 100,
      };

      AppleHealthKit.getHeartRateSamples(options, (err: any, results: any) => {
        if (err) {
          console.error('Error getting heart rate:', err);
          resolve([]);
          return;
        }

        const metrics: HealthMetric[] = results.map((sample: any) => ({
          metricType: HealthMetricType.HEART_RATE,
          value: sample.value,
          unit: 'bpm',
          recordedAt: new Date(sample.startDate),
          userId: '',
        }));

        resolve(metrics);
      });
    });
  }

  async getSleepAnalysis(startDate: Date, endDate: Date): Promise<HealthMetric[]> {
    if (Platform.OS !== 'ios' || !AppleHealthKit) return [];

    return new Promise((resolve) => {
      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      AppleHealthKit.getSleepSamples(options, (err: any, results: any) => {
        if (err) {
          console.error('Error getting sleep data:', err);
          resolve([]);
          return;
        }

        // Group sleep samples by day and calculate total hours
        const sleepByDay = new Map<string, number>();
        
        results.forEach((sample: any) => {
          const date = new Date(sample.startDate).toDateString();
          const duration = (new Date(sample.endDate).getTime() - new Date(sample.startDate).getTime()) / (1000 * 60 * 60);
          
          sleepByDay.set(date, (sleepByDay.get(date) || 0) + duration);
        });

        const metrics: HealthMetric[] = Array.from(sleepByDay.entries()).map(([date, hours]) => ({
          metricType: HealthMetricType.SLEEP_HOURS,
          value: Math.round(hours * 10) / 10, // Round to 1 decimal place
          unit: 'hours',
          recordedAt: new Date(date),
          userId: '',
        }));

        resolve(metrics);
      });
    });
  }

  async getWeight(startDate: Date, endDate: Date): Promise<HealthMetric[]> {
    if (Platform.OS !== 'ios' || !AppleHealthKit) return [];

    return new Promise((resolve) => {
      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        ascending: false,
      };

      AppleHealthKit.getWeightSamples(options, (err: any, results: any) => {
        if (err) {
          console.error('Error getting weight:', err);
          resolve([]);
          return;
        }

        const metrics: HealthMetric[] = results.map((sample: any) => ({
          metricType: HealthMetricType.WEIGHT,
          value: sample.value,
          unit: 'kg',
          recordedAt: new Date(sample.startDate),
          userId: '',
        }));

        resolve(metrics);
      });
    });
  }

  async getAllHealthData(startDate: Date, endDate: Date, userId: string): Promise<HealthMetric[]> {
    const [steps, heartRate, sleep, weight] = await Promise.all([
      this.getSteps(startDate, endDate),
      this.getHeartRate(startDate, endDate),
      this.getSleepAnalysis(startDate, endDate),
      this.getWeight(startDate, endDate),
    ]);

    // Set userId for all metrics
    const allMetrics = [...steps, ...heartRate, ...sleep, ...weight];
    return allMetrics.map(metric => ({ ...metric, userId }));
  }
}

export default new HealthKitService();