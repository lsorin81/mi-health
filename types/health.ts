export interface User {
  id: string;
  appleId: string;
  createdAt: Date;
}

export interface HealthDocument {
  id: string;
  userId: string;
  fileUrl: string;
  fileName: string;
  geminiExtractedText?: string;
  normalizedData?: any;
  createdAt: Date;
}

export interface HealthMetric {
  id: string;
  userId: string;
  metricType: HealthMetricType;
  value: number;
  unit: string;
  recordedAt: Date;
}

export enum HealthMetricType {
  STEPS = 'steps',
  HEART_RATE = 'heart_rate',
  BLOOD_PRESSURE_SYSTOLIC = 'blood_pressure_systolic',
  BLOOD_PRESSURE_DIASTOLIC = 'blood_pressure_diastolic',
  SLEEP_HOURS = 'sleep_hours',
  CALORIES_BURNED = 'calories_burned',
  WEIGHT = 'weight',
  BLOOD_GLUCOSE = 'blood_glucose',
}

export interface DailySummary {
  id: string;
  userId: string;
  summaryDate: Date;
  summaryText: string;
  keyInsights: {
    category: string;
    insight: string;
    severity?: 'low' | 'medium' | 'high';
  }[];
  createdAt: Date;
}

export interface NormalizedHealthData {
  documentType: string;
  date: Date;
  provider?: string;
  medications?: Array<{
    name: string;
    dosage: string;
    frequency: string;
  }>;
  vitals?: Array<{
    type: string;
    value: number;
    unit: string;
    date: Date;
  }>;
  diagnoses?: Array<{
    condition: string;
    date: Date;
    notes?: string;
  }>;
  labResults?: Array<{
    test: string;
    value: string;
    unit?: string;
    referenceRange?: string;
    date: Date;
  }>;
  notes?: string;
}