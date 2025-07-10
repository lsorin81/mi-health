import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/utils/constants';
import { User, HealthDocument, HealthMetric, DailySummary } from '@/types/health';

class SupabaseService {
  private client;

  constructor() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.warn('Supabase credentials not configured. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
    }
    this.client = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '');
  }

  // Auth methods
  getAuth() {
    return this.client.auth;
  }

  get supabase() {
    return this.client;
  }

  // User methods
  async createUser(appleId: string): Promise<User | null> {
    const { data, error } = await this.client
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
    const { data, error } = await this.client
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
    const { data, error } = await this.client.storage
      .from('health-documents')
      .upload(filePath, file);

    if (error) {
      console.error('Error uploading document:', error);
      return null;
    }
    return filePath;
  }

  async saveHealthDocument(document: Omit<HealthDocument, 'id' | 'createdAt'>): Promise<HealthDocument | null> {
    console.log('💾 Attempting to save health document to Supabase...');
    console.log('👤 User ID:', document.userId);
    console.log('📄 File name:', document.fileName);
    console.log('🔗 File URL:', document.fileUrl);
    console.log('📊 Has extracted text:', !!document.geminiExtractedText);
    console.log('📈 Has normalized data:', !!document.normalizedData);
    
    const { data, error } = await this.client
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
      console.error('❌ Error saving health document:', error);
      console.error('🔍 Error details:', JSON.stringify(error, null, 2));
      return null;
    }
    
    console.log('✅ Health document saved successfully');
    return data;
  }

  async saveHealthMetrics(metrics: Array<{
    userId: string;
    metricType: string;
    value: number;
    unit: string;
    recordedAt: Date;
    source: string;
  }>): Promise<boolean> {
    console.log('💾 Attempting to save health metrics to Supabase...');
    console.log('📊 Number of metrics:', metrics.length);
    
    const { data, error } = await this.client
      .from('health_metrics')
      .insert(
        metrics.map(metric => ({
          user_id: metric.userId,
          metric_type: metric.metricType,
          value: metric.value,
          unit: metric.unit,
          recorded_at: metric.recordedAt.toISOString(),
          source: metric.source,
        }))
      )
      .select();

    if (error) {
      console.error('❌ Error saving health metrics:', error);
      console.error('🔍 Error details:', JSON.stringify(error, null, 2));
      return false;
    }
    
    console.log('✅ Health metrics saved successfully to database!');
    console.log(`📊 Saved ${data?.length || 0} metrics:`, data?.map(d => `${d.metric_type}=${d.value}${d.unit}`).join(', '));
    return true;
  }


  async getHealthDocuments(userId: string): Promise<HealthDocument[]> {
    const { data, error } = await this.client
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
    const { data, error } = await this.client
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
    const { error } = await this.client
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
    let query = this.client
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
    const { data, error } = await this.client
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
    const { data, error } = await this.client
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
    const { data, error } = await this.client
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