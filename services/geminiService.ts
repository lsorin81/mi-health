import { GoogleGenerativeAI } from '@google/generative-ai';
import * as FileSystem from 'expo-file-system';
import storageService from './storageService';
import { GEMINI_MODEL, GEMINI_PROMPTS } from '@/utils/constants';
import { NormalizedHealthData } from '@/types/health';
import { GeminiPDFResponse } from '@/types/document';

class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;

  async initialize(): Promise<boolean> {
    // Use environment API key if available
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || await storageService.getGeminiApiKey();
    
    if (!apiKey || apiKey === 'your-gemini-api-key-here') {
      // Development bypass - skip API key initialization
      if (__DEV__ && process.env.EXPO_PUBLIC_DEV_BYPASS_AUTH === 'true') {
        console.log('Development mode: Bypassing Gemini API initialization');
        return true;
      }
      
      console.error('Gemini API key not found or not configured');
      return false;
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    return true;
  }

  async processPDF(pdfUri: string, fileName: string): Promise<GeminiPDFResponse | null> {
    try {
      // Development bypass - return mock data
      if (__DEV__ && process.env.EXPO_PUBLIC_DEV_BYPASS_AUTH === 'true') {
        console.log('Development mode: Returning mock PDF data');
        return {
          extractedText: 'Mock health report extracted',
          normalizedData: {
            patientInfo: {
              name: 'Dev User',
              dateOfBirth: '1990-01-01',
              patientId: 'DEV123'
            },
            testDate: new Date().toISOString(),
            provider: 'Mock Health Lab',
            bloodWork: {
              glucose: { value: 95, unit: 'mg/dL', reference: '70-100 mg/dL' },
              cholesterolTotal: { value: 180, unit: 'mg/dL', reference: '<200 mg/dL' },
              hemoglobin: { value: 14.5, unit: 'g/dL', reference: '12-16 g/dL' }
            }
          },
          confidence: 0.95
        };
      }

      if (!this.genAI) {
        const initialized = await this.initialize();
        if (!initialized) return null;
      }

      // Read the PDF file as base64
      const base64 = await FileSystem.readAsStringAsync(pdfUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const model = this.genAI!.getGenerativeModel({ model: GEMINI_MODEL });

      // Create the PDF part
      const pdfPart = {
        inlineData: {
          data: base64,
          mimeType: 'application/pdf',
        },
      };

      // Send to Gemini with extraction prompt
      const result = await model.generateContent([
        GEMINI_PROMPTS.EXTRACT_HEALTH_DATA,
        pdfPart,
      ]);

      const response = await result.response;
      const text = response.text();

      // Parse the JSON response
      let normalizedData: NormalizedHealthData;
      try {
        // Extract JSON from the response (Gemini might include markdown formatting)
        const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/{[\s\S]*}/);
        const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
        normalizedData = JSON.parse(jsonString);
      } catch (parseError) {
        console.error('Error parsing Gemini response:', parseError);
        // Return raw text if JSON parsing fails
        return {
          extractedText: text,
          normalizedData: { raw: text },
          confidence: 0.5,
        };
      }

      return {
        extractedText: text,
        normalizedData,
        confidence: 0.9,
      };
    } catch (error) {
      console.error('Error processing PDF with Gemini:', error);
      return null;
    }
  }

  async generateDailySummary(healthData: {
    metrics: any[],
    documents: any[]
  }): Promise<{ summaryText: string; keyInsights: any[] } | null> {
    try {
      // Development bypass - return mock summary
      if (__DEV__ && process.env.EXPO_PUBLIC_DEV_BYPASS_AUTH === 'true') {
        console.log('Development mode: Returning mock daily summary');
        return {
          summaryText: 'Your health metrics look good today! Keep up the healthy habits.',
          keyInsights: [
            'Your glucose levels are within normal range',
            'Blood pressure is stable',
            'Consider increasing daily water intake'
          ]
        };
      }

      if (!this.genAI) {
        const initialized = await this.initialize();
        if (!initialized) return null;
      }

      const model = this.genAI!.getGenerativeModel({ model: GEMINI_MODEL });

      const prompt = `${GEMINI_PROMPTS.GENERATE_DAILY_SUMMARY}\n\nHealth Data:\n${JSON.stringify(healthData, null, 2)}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse the JSON response
      try {
        const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/{[\s\S]*}/);
        const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
        return JSON.parse(jsonString);
      } catch (parseError) {
        console.error('Error parsing daily summary response:', parseError);
        return {
          summaryText: text,
          keyInsights: [],
        };
      }
    } catch (error) {
      console.error('Error generating daily summary:', error);
      return null;
    }
  }

  async testApiKey(apiKey: string): Promise<boolean> {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      
      // Simple test prompt
      const result = await model.generateContent('Hello, respond with "API key is valid"');
      const response = await result.response;
      const text = response.text();
      
      return text.toLowerCase().includes('valid');
    } catch (error) {
      console.error('API key test failed:', error);
      return false;
    }
  }
}

export default new GeminiService();