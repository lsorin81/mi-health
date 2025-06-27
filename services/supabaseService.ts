import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/utils/constants';
import { User, HealthDocument, HealthMetric, DailySummary } from '@/types/health';

class SupabaseService {
  private supabase;

  constructor() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.warn('Supabase credentials not configured. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
    }
    this.supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '');
  }

  // User methods
  async createUser(appleId: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from('users')
      .insert({ apple_id: appleId })
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      return null;
    }
    return data;
  }

  async getUserByAppleId(appleId: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('apple_id', appleId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user:', error);
    }
    return data;
  }

  // Document methods
  async uploadDocument(file: Blob, fileName: string, userId: string): Promise<string | null> {
    const filePath = `${userId}/${Date.now()}-${fileName}`;
    const { data, error } = await this.supabase.storage
      .from('health-documents')
      .upload(filePath, file);

    if (error) {
      console.error('Error uploading document:', error);
      return null;
    }
    return filePath;
  }

  async saveHealthDocument(document: Omit<HealthDocument, 'id' | 'createdAt'>): Promise<HealthDocument | null> {
    const { data, error } = await this.supabase
      .from('health_documents')
      .insert({
        user_id: document.userId,
        file_url: document.fileUrl,
        file_name: document.fileName,
        gemini_extracted_text: document.geminiExtractedText,
        normalized_data: document.normalizedData,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving health document:', error);
      return null;
    }
    return data;
  }

  async getHealthDocuments(userId: string): Promise<HealthDocument[]> {
    const { data, error } = await this.supabase
      .from('health_documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching health documents:', error);
      return [];
    }
    return data || [];
  }

  // Health metrics methods
  async saveHealthMetric(metric: Omit<HealthMetric, 'id'>): Promise<HealthMetric | null> {
    const { data, error } = await this.supabase
      .from('health_metrics')
      .insert({
        user_id: metric.userId,
        metric_type: metric.metricType,
        value: metric.value,
        unit: metric.unit,
        recorded_at: metric.recordedAt,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving health metric:', error);
      return null;
    }
    return data;
  }

  async saveHealthMetricsBatch(metrics: Omit<HealthMetric, 'id'>[]): Promise<boolean> {
    const { error } = await this.supabase
      .from('health_metrics')
      .insert(
        metrics.map(m => ({
          user_id: m.userId,
          metric_type: m.metricType,
          value: m.value,
          unit: m.unit,
          recorded_at: m.recordedAt,
        }))
      );

    if (error) {
      console.error('Error saving health metrics batch:', error);
      return false;
    }
    return true;
  }

  async getHealthMetrics(userId: string, startDate?: Date, endDate?: Date): Promise<HealthMetric[]> {
    let query = this.supabase
      .from('health_metrics')
      .select('*')
      .eq('user_id', userId);

    if (startDate) {
      query = query.gte('recorded_at', startDate.toISOString());
    }
    if (endDate) {
      query = query.lte('recorded_at', endDate.toISOString());
    }

    const { data, error } = await query.order('recorded_at', { ascending: false });

    if (error) {
      console.error('Error fetching health metrics:', error);
      return [];
    }
    return data || [];
  }

  // Daily summary methods
  async saveDailySummary(summary: Omit<DailySummary, 'id' | 'createdAt'>): Promise<DailySummary | null> {
    const { data, error } = await this.supabase
      .from('daily_summaries')
      .insert({
        user_id: summary.userId,
        summary_date: summary.summaryDate,
        summary_text: summary.summaryText,
        key_insights: summary.keyInsights,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving daily summary:', error);
      return null;
    }
    return data;
  }

  async getLatestDailySummary(userId: string): Promise<DailySummary | null> {
    const { data, error } = await this.supabase
      .from('daily_summaries')
      .select('*')
      .eq('user_id', userId)
      .order('summary_date', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching latest daily summary:', error);
    }
    return data;
  }

  async getDailySummaries(userId: string, limit: number = 7): Promise<DailySummary[]> {
    const { data, error } = await this.supabase
      .from('daily_summaries')
      .select('*')
      .eq('user_id', userId)
      .order('summary_date', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching daily summaries:', error);
      return [];
    }
    return data || [];
  }
}

export default new SupabaseService();