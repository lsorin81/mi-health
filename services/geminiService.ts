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
    
    if (!apiKey) {
      console.error('Gemini API key not found or not configured');
      return false;
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    console.log('Gemini service initialized successfully');
    return true;
  }

  async processPDF(pdfUri: string, _fileName: string): Promise<GeminiPDFResponse | null> {
    console.log('📄 Starting PDF processing:', { pdfUri, fileName: _fileName });
    
    try {
      if (!this.genAI) {
        console.log('🔧 Initializing Gemini service...');
        const initialized = await this.initialize();
        if (!initialized) {
          console.error('❌ Failed to initialize Gemini service');
          return null;
        }
      }

      // Read the PDF file as base64
      console.log('📖 Reading PDF file as base64...');
      const base64 = await FileSystem.readAsStringAsync(pdfUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      console.log('✅ PDF file read successfully, size:', base64.length);

      const model = this.genAI!.getGenerativeModel({ model: GEMINI_MODEL });
      console.log('🤖 Created Gemini model instance');

      // Create the PDF part
      const pdfPart = {
        inlineData: {
          data: base64,
          mimeType: 'application/pdf',
        },
      };
      console.log('📦 Created PDF part for Gemini');

      // Send to Gemini with extraction prompt
      console.log('🚀 Sending PDF to Gemini for processing...');
      const result = await model.generateContent([
        GEMINI_PROMPTS.EXTRACT_HEALTH_DATA,
        pdfPart,
      ]);

      const response = result.response;
      const text = response.text();
      console.log('✅ Received response from Gemini, length:', text.length);

      // Parse the JSON response
      let normalizedData: NormalizedHealthData;
      try {
        console.log('🔍 Parsing Gemini response...');
        console.log('📝 Raw response preview:', text.substring(0, 200) + '...');
        
        // Extract JSON from the response (Gemini might include markdown formatting)
        const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/{[\s\S]*}/);
        const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
        console.log('📋 Extracted JSON string:', jsonString.substring(0, 200) + '...');
        
        normalizedData = JSON.parse(jsonString);
        console.log('✅ Successfully parsed JSON response');
        console.log('📊 Normalized data keys:', Object.keys(normalizedData));
      } catch (parseError) {
        console.error('❌ Error parsing Gemini response:', parseError);
        console.error('🔍 Full response that failed to parse:', text);
        // Return raw text if JSON parsing fails
        return {
          extractedText: text,
          normalizedData: { raw: text },
          confidence: 0.5,
        };
      }

      const pdfResponse: GeminiPDFResponse = {
        extractedText: text,
        normalizedData,
        confidence: 0.9,
      };
      
      console.log('🎉 PDF processing completed successfully');
      console.log('📤 Returning result with confidence:', pdfResponse.confidence);
      
      return pdfResponse;
    } catch (error) {
      console.error('❌ Error processing PDF with Gemini:', error);
      return null;
    }
  }

  async generateDailySummary(healthData: {
    metrics: any[],
    documents: any[]
  }): Promise<{ summaryText: string; keyInsights: any[] } | null> {
    try {
      if (!this.genAI) {
        const initialized = await this.initialize();
        if (!initialized) {
          console.error('Failed to initialize Gemini service');
          return null;
        }
      }

      const model = this.genAI!.getGenerativeModel({ model: GEMINI_MODEL });

      const prompt = `${GEMINI_PROMPTS.GENERATE_DAILY_SUMMARY}\n\nHealth Data:\n${JSON.stringify(healthData, null, 2)}`;

      const result = await model.generateContent(prompt);
      const response = result.response;
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
      const response = result.response;
      const text = response.text();
      
      return text.toLowerCase().includes('valid');
    } catch (error) {
      console.error('API key test failed:', error);
      return false;
    }
  }
}

export default new GeminiService();