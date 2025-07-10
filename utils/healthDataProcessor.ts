import supabaseService from '@/services/supabaseService';

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

interface ExtractedHealthData {
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

// Map common test names to specific health metric types
const metricTypeMap: { [key: string]: string } = {
  // Blood sugar
  'glucose': 'blood_glucose',
  'blood glucose': 'blood_glucose',
  'blood sugar': 'blood_glucose',
  'fasting glucose': 'blood_glucose',
  'random glucose': 'blood_glucose',
  
  // Cholesterol panel
  'cholesterol': 'total_cholesterol',
  'total cholesterol': 'total_cholesterol',
  'cholesteroltotal': 'total_cholesterol',
  'ldl cholesterol': 'ldl_cholesterol', 
  'ldl': 'ldl_cholesterol',
  'hdl cholesterol': 'hdl_cholesterol',
  'hdl': 'hdl_cholesterol',
  'triglycerides': 'triglycerides',
  
  // Vitamins
  'vitamin d': 'vitamin_d',
  'vitamin d3': 'vitamin_d',
  'vitamin d 25-hydroxy': 'vitamin_d',
  'vitamin b12': 'vitamin_b12',
  'vitamin b-12': 'vitamin_b12',
  'cobalamin': 'vitamin_b12',
  'folate': 'folate',
  'folic acid': 'folate',
  'vitamin c': 'vitamin_c',
  'ascorbic acid': 'vitamin_c',
  
  // Blood work
  'hemoglobin': 'hemoglobin',
  'hgb': 'hemoglobin',
  'hematocrit': 'hematocrit',
  'hct': 'hematocrit',
  'white blood cells': 'wbc',
  'wbc': 'wbc',
  'red blood cells': 'rbc',
  'rbc': 'rbc',
  'platelets': 'platelets',
  
  // Vital signs
  'blood pressure': 'blood_pressure_systolic',
  'systolic': 'blood_pressure_systolic',
  'diastolic': 'blood_pressure_diastolic',
  'weight': 'weight',
  'heart rate': 'heart_rate',
  'pulse': 'heart_rate',
  'temperature': 'temperature',
  
  // Kidney function
  'creatinine': 'creatinine',
  'bun': 'bun',
  'blood urea nitrogen': 'bun',
  'egfr': 'egfr',
  
  // Liver function
  'alt': 'alt',
  'ast': 'ast',
  'bilirubin': 'bilirubin',
  'alkaline phosphatase': 'alkaline_phosphatase',
  
  // Thyroid
  'tsh': 'tsh',
  'thyroid stimulating hormone': 'tsh',
  't3': 't3',
  't4': 't4',
  'free t4': 'free_t4',
  'free t3': 'free_t3',
  
  // Other common tests
  'iron': 'iron',
  'ferritin': 'ferritin',
  'calcium': 'calcium',
  'magnesium': 'magnesium',
  'phosphorus': 'phosphorus',
  'potassium': 'potassium',
  'sodium': 'sodium',
  'chloride': 'chloride',
  'testosterone': 'testosterone',
  'estrogen': 'estrogen',
  'cortisol': 'cortisol',
  'insulin': 'insulin',
  
  // International variations (Spanish)
  'vitamina b12': 'vitamin_b12',
  'vitamina d': 'vitamin_d',
  '25-oh-vitamina d': 'vitamin_d',
  'testosteron': 'testosterone',
  'mercur': 'mercury',
  'mercur in sange': 'mercury_blood',
  'mercurio': 'mercury',
  
  // International variations (French)
  'vitamine b12': 'vitamin_b12',
  'vitamine d': 'vitamin_d',
  'testosterone': 'testosterone',
  
  // International variations (German)
  'vitamin b12': 'vitamin_b12',
  'vitamin d': 'vitamin_d',
  'testosteron': 'testosterone',
  
  // Heavy metals and toxins
  'mercury': 'mercury',
  'lead': 'lead',
  'cadmium': 'cadmium',
  'arsenic': 'arsenic',
};

function getMetricType(testName: string): string {
  const normalized = testName.toLowerCase().trim();
  
  // First try exact match
  if (metricTypeMap[normalized]) {
    return metricTypeMap[normalized];
  }
  
  // Then try partial matches for complex test names
  for (const [key, value] of Object.entries(metricTypeMap)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  
  // If no match found, use the original test name (cleaned up)
  // Convert to snake_case and remove special characters
  return normalized
    .replace(/[^\w\s-]/g, '') // Remove special chars except hyphens
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/-+/g, '_') // Replace hyphens with underscores
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
}

function parseNumericValue(value: string | number | undefined | null): number | null {
  // Handle null, undefined, or empty values
  if (value === null || value === undefined || value === '') {
    return null;
  }
  
  // If it's already a number, return it
  if (typeof value === 'number') {
    return value;
  }
  
  // Convert to string and extract numeric value from strings like "95.5", "95-120", "< 100", etc.
  const stringValue = String(value);
  const match = stringValue.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}

export async function processAndSaveHealthData(
  extractedData: ExtractedHealthData,
  userId: string,
  fileName: string,
  extractedText: string
): Promise<boolean> {
  console.log('🔄 Processing and saving health data...');
  console.log('📋 Skipping document metadata - focusing on health metrics only');
  
  try {
    // Extract and save individual health metrics
    const metricsToSave: Array<{
      userId: string;
      metricType: string;
      value: number;
      unit: string;
      recordedAt: Date;
      source: string;
    }> = [];

    // Process lab results
    if (extractedData.labResults) {
      console.log(`🧪 Processing ${extractedData.labResults.length} lab results...`);
      for (let i = 0; i < extractedData.labResults.length; i++) {
        const result = extractedData.labResults[i];
        
        try {
          console.log(`🔍 Raw lab result ${i + 1}:`, JSON.stringify(result, null, 2));
          
          // Validate required fields
          if (!result.test) {
            console.log(`⚠️ Skipping result ${i + 1}: missing test name`);
            continue;
          }
          
          const numericValue = parseNumericValue(result.value);
          const metricType = getMetricType(result.test);
          const unit = result.unit || '';
          
          console.log(`📊 Lab result: "${result.test}" → metric_type: "${metricType}" → value: ${numericValue} ${unit}`);
          
          if (numericValue !== null) {
            metricsToSave.push({
              userId,
              metricType,
              value: numericValue,
              unit,
              recordedAt: result.date ? new Date(result.date) : new Date(),
              source: 'document_extraction',
            });
          } else {
            console.log(`⚠️ Could not parse numeric value from: "${result.value}" (type: ${typeof result.value})`);
          }
        } catch (error) {
          console.error(`❌ Error processing lab result ${i + 1}:`, error);
          console.error('Raw result data:', result);
        }
      }
    }

    // Process vitals
    if (extractedData.vitals) {
      console.log(`💓 Processing ${extractedData.vitals.length} vital signs...`);
      for (let i = 0; i < extractedData.vitals.length; i++) {
        const vital = extractedData.vitals[i];
        
        try {
          console.log(`🔍 Raw vital ${i + 1}:`, JSON.stringify(vital, null, 2));
          
          // Validate required fields
          if (!vital.type) {
            console.log(`⚠️ Skipping vital ${i + 1}: missing type`);
            continue;
          }
          
          if (vital.value === null || vital.value === undefined) {
            console.log(`⚠️ Skipping vital ${i + 1}: missing value`);
            continue;
          }
          
          const metricType = getMetricType(vital.type);
          console.log(`📊 Vital: "${vital.type}" → metric_type: "${metricType}" → value: ${vital.value} ${vital.unit || ''}`);
          
          metricsToSave.push({
            userId,
            metricType,
            value: vital.value,
            unit: vital.unit || '',
            recordedAt: vital.date ? new Date(vital.date) : new Date(),
            source: 'document_extraction',
          });
        } catch (error) {
          console.error(`❌ Error processing vital ${i + 1}:`, error);
          console.error('Raw vital data:', vital);
        }
      }
    }

    // Save metrics to database
    if (metricsToSave.length > 0) {
      const metricsResult = await supabaseService.saveHealthMetrics(metricsToSave);
      if (metricsResult) {
        console.log(`✅ Successfully saved ${metricsToSave.length} health metrics to database`);
      } else {
        console.error(`❌ Failed to save ${metricsToSave.length} health metrics`);
        return false;
      }
    } else {
      console.log('📋 No quantifiable health metrics found to save');
    }

    console.log('✅ Health data processing completed successfully');
    return true;

  } catch (error) {
    console.error('❌ Error processing health data:', error);
    return false;
  }
}