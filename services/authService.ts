import storageService from './storageService';
import supabaseService from './supabaseService';
import { User } from '@/types/health';
import Constants from 'expo-constants';

class AuthService {
  // Magic Link Authentication
  async signInWithEmail(email: string, useWebRedirect: boolean = false): Promise<{ error: Error | null }> {
    try {
      // Use different redirect URLs based on platform and preference
      let redirectTo = 'mihealth://auth/verify';
      
      if (useWebRedirect) {
        // Use a simple HTTP redirect that works with any email client
        redirectTo = 'http://localhost:3000/auth/verify';
        console.log('Using web redirect approach for better Expo Go compatibility');
      } else if (__DEV__) {
        // Check if we're running in Expo Go vs development build
        const isExpoGo = Constants.appOwnership === 'expo';
        
        console.log('Expo environment:', { 
          isExpoGo, 
          appOwnership: Constants.appOwnership,
          slug: Constants.expoConfig?.slug 
        });
        
        // For development builds, use the custom scheme which works much better
        redirectTo = 'mihealth://auth/verify';
        console.log('Using custom scheme for development build:', redirectTo);
      }
      
      console.log('Using redirect URL:', redirectTo);
      
      const { error } = await supabaseService.getAuth().signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });
      
      if (error) throw error;
      
      return { error: null };
    } catch (error) {
      console.error('Error sending magic link:', error);
      return { error: error as Error };
    }
  }

  async verifyOtp(email: string, token: string): Promise<User | null> {
    try {
      const { data, error } = await supabaseService.getAuth().verifyOtp({
        email,
        token,
        type: 'email',
      });

      if (error) throw error;

      if (data.user) {
        // Store user ID
        await storageService.setUserId(data.user.id);
        
        // Get or create user in our database
        const { data: existingUser } = await supabaseService.supabase
          .from('users')
          .select('*')
          .eq('auth_id', data.user.id)
          .single();
        
        if (existingUser) {
          return existingUser;
        }
        
        // Create new user
        const { data: newUser } = await supabaseService.supabase
          .from('users')
          .insert({ 
            email: data.user.email,
            auth_provider: 'email',
            auth_id: data.user.id 
          })
          .select()
          .single();
          
        return newUser;
      }
      
      return null;
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return null;
    }
  }

  async getSupabaseSession() {
    const { data: { session } } = await supabaseService.getAuth().getSession();
    return session;
  }

  async signOut(): Promise<void> {
    await supabaseService.getAuth().signOut();
    await storageService.clearAll();
  }

  async getCurrentUser(): Promise<User | null> {
    // Development bypass for authentication
    if (__DEV__ && process.env.EXPO_PUBLIC_DEV_BYPASS_AUTH === 'true') {
      // Return a mock user for development with valid UUID
      return {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'dev@mihealth.test',
        auth_provider: 'email',
        auth_id: '123e4567-e89b-12d3-a456-426614174001',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as User;
    }

    // Check for Supabase session first
    const session = await this.getSupabaseSession();
    if (session && session.user) {
      const { data: user } = await supabaseService.supabase
        .from('users')
        .select('*')
        .eq('auth_id', session.user.id)
        .single();
      
      if (user) return user;
    }
    
    return null;
  }


  async hasGeminiApiKey(): Promise<boolean> {
    // Check if we have an environment API key first
    if (process.env.EXPO_PUBLIC_GEMINI_API_KEY && process.env.EXPO_PUBLIC_GEMINI_API_KEY !== 'your-gemini-api-key-here') {
      return true;
    }
    
    // Development bypass for API key requirement
    if (__DEV__ && process.env.EXPO_PUBLIC_DEV_BYPASS_AUTH === 'true') {
      return true;
    }
    
    const apiKey = await storageService.getGeminiApiKey();
    return !!apiKey;
  }
}

export default new AuthService();