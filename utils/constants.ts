export const STORAGE_KEYS = {
  GEMINI_API_KEY: "gemini_api_key",
  USER_ID: "user_id",
  APPLE_USER_ID: "apple_user_id",
} as const;

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

export const HEALTH_PERMISSIONS = [
  "StepCount",
  "HeartRate",
  "BloodPressureSystolic",
  "BloodPressureDiastolic",
  "SleepAnalysis",
  "ActiveEnergyBurned",
  "Weight",
  "BloodGlucose",
] as const;

export const GEMINI_MODEL = "gemini-2.5-pro";

export const GEMINI_PROMPTS = {
  EXTRACT_HEALTH_DATA: `
    You are a medical data extraction assistant. Extract all health-related information from this document and normalize it into a structured format.
    
    Return a JSON object with the following structure:
    {
      "documentType": "lab_report" | "prescription" | "medical_record" | "imaging_report" | "other",
      "date": "ISO date string",
      "provider": "provider name if available",
      "medications": [{"name": "", "dosage": "", "frequency": ""}],
      "vitals": [{"type": "", "value": 0, "unit": "", "date": "ISO date"}],
      "diagnoses": [{"condition": "", "date": "ISO date", "notes": ""}],
      "labResults": [{"test": "", "value": "", "unit": "", "referenceRange": "", "date": "ISO date"}],
      "notes": "any additional relevant information"
    }
    
    Only include fields that have actual data. Be precise with numbers and units.
  `,

  GENERATE_DAILY_SUMMARY: `
    You are a health insights assistant. Based on the following health data from the past 24 hours, provide a concise daily summary.
    
    Include:
    1. Key health metrics and trends
    2. Any notable changes or patterns
    3. Actionable insights or recommendations
    4. Areas that might need attention
    
    Be encouraging but factual. Keep the summary under 300 words.
    
    Format the response as JSON:
    {
      "summaryText": "main summary text",
      "keyInsights": [
        {"category": "category name", "insight": "specific insight", "severity": "low|medium|high"}
      ]
    }
  `,
};
