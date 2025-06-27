# Mi-Health App

A React Native health data companion app that syncs with Apple Health, processes medical documents with AI, and provides intelligent health insights.

## Features

- **Apple ID Authentication** - Secure sign-in with Apple
- **Apple Health Integration** - Sync steps, heart rate, sleep, and other health metrics
- **Document Processing** - Upload PDFs and extract health data using Gemini AI
- **AI-Powered Insights** - Daily health summaries and recommendations
- **Secure Storage** - Data stored in Supabase with row-level security

## Setup Instructions

### 1. Prerequisites

- Node.js (v16 or higher)
- Expo CLI: `npm install -g @expo/cli`
- iOS device or simulator (for Apple Health features)
- Supabase account
- Google AI Studio account (for Gemini API)

### 2. Install Dependencies

```bash
npm install
```

### 3. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API to get your URL and anon key
3. Create the database schema by running this SQL in the Supabase SQL Editor:

```sql
-- Enable Row Level Security
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Users table
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  apple_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Health documents table
CREATE TABLE health_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  gemini_extracted_text TEXT,
  normalized_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Health metrics table
CREATE TABLE health_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  metric_type TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Daily summaries table
CREATE TABLE daily_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  summary_date DATE NOT NULL,
  summary_text TEXT NOT NULL,
  key_insights JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create storage bucket for health documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('health-documents', 'health-documents', false);

-- Row Level Security Policies
CREATE POLICY "Users can view their own data" ON users FOR SELECT USING (auth.uid()::text = apple_id);
CREATE POLICY "Users can insert their own data" ON users FOR INSERT WITH CHECK (auth.uid()::text = apple_id);

CREATE POLICY "Users can view their own documents" ON health_documents FOR SELECT USING (user_id IN (SELECT id FROM users WHERE apple_id = auth.uid()::text));
CREATE POLICY "Users can insert their own documents" ON health_documents FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE apple_id = auth.uid()::text));

CREATE POLICY "Users can view their own metrics" ON health_metrics FOR SELECT USING (user_id IN (SELECT id FROM users WHERE apple_id = auth.uid()::text));
CREATE POLICY "Users can insert their own metrics" ON health_metrics FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE apple_id = auth.uid()::text));

CREATE POLICY "Users can view their own summaries" ON daily_summaries FOR SELECT USING (user_id IN (SELECT id FROM users WHERE apple_id = auth.uid()::text));
CREATE POLICY "Users can insert their own summaries" ON daily_summaries FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE apple_id = auth.uid()::text));

-- Storage policies
CREATE POLICY "Users can upload their own documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'health-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view their own documents" ON storage.objects FOR SELECT USING (bucket_id = 'health-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;
```

4. Create a `.env` file in the project root:

```bash
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 4. Get Gemini API Key

1. Visit [aistudio.google.com](https://aistudio.google.com)
2. Sign in with your Google account
3. Click "Get API key" in the left sidebar
4. Create a new API key
5. Copy the key (you'll enter this in the app during setup)

### 5. Configure iOS Capabilities (for Apple Health)

Add these capabilities to your `app.json`:

```json
{
  "expo": {
    "ios": {
      "entitlements": {
        "com.apple.developer.healthkit": true,
        "com.apple.developer.healthkit.access": [
          "health-records"
        ]
      },
      "infoPlist": {
        "NSHealthShareUsageDescription": "This app needs access to health data to sync your metrics and provide personalized insights.",
        "NSHealthUpdateUsageDescription": "This app needs to read your health data to provide insights and track your progress."
      }
    }
  }
}
```

### 6. Run the App

```bash
# Start the development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator  
npm run android
```

## Usage

1. **First Launch**: Sign in with your Apple ID
2. **API Setup**: Enter your Gemini API key when prompted
3. **Health Sync**: Grant HealthKit permissions and sync your health data
4. **Upload Documents**: Upload medical PDFs which will be processed by AI
5. **View Insights**: Check your dashboard for daily summaries and health trends

## App Structure

```
/app
  /(auth)          # Authentication screens
  /(tabs)          # Main app tabs
    index.tsx      # Dashboard
    documents.tsx  # Document management
    health.tsx     # Health data sync
    settings.tsx   # App settings
/services          # Backend services
/types            # TypeScript type definitions
/utils            # Constants and utilities
```

## Technologies Used

- **Frontend**: React Native with Expo
- **Navigation**: Expo Router
- **Authentication**: Apple Sign In
- **Backend**: Supabase (PostgreSQL)
- **AI**: Google Gemini API
- **Health Data**: Apple HealthKit
- **Storage**: Expo SecureStore, Supabase Storage

## Security

- API keys stored securely on device using Expo SecureStore
- Row-level security enforced in Supabase
- Apple ID used as primary authentication
- All health data encrypted at rest and in transit

## Troubleshooting

### Common Issues

1. **Apple Sign In not working**: Ensure you're testing on a physical iOS device or properly configured simulator
2. **HealthKit permissions denied**: Check iOS Settings > Privacy & Security > Health
3. **Supabase connection issues**: Verify your environment variables are set correctly
4. **Gemini API errors**: Ensure your API key is valid and has proper quotas

### Development

```bash
# Reset project to clean state
npm run reset-project

# Lint code
npm run lint
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this project as a starting point for your own health apps!