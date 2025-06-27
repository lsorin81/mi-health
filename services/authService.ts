import * as AppleAuthentication from 'expo-apple-authentication';
import storageService from './storageService';
import supabaseService from './supabaseService';
import { User } from '@/types/health';

class AuthService {
  async signInWithApple(): Promise<User | null> {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Store Apple user ID
      await storageService.setAppleUserId(credential.user);

      // Check if user exists in Supabase
      let user = await supabaseService.getUserByAppleId(credential.user);

      // Create user if doesn't exist
      if (!user) {
        user = await supabaseService.createUser(credential.user);
      }

      if (user) {
        await storageService.setUserId(user.id);
      }

      return user;
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        console.log('User canceled Apple Sign In');
      } else {
        console.error('Error during Apple Sign In:', error);
      }
      return null;
    }
  }

  async isAppleAuthAvailable(): Promise<boolean> {
    return await AppleAuthentication.isAvailableAsync();
  }

  async getCurrentUser(): Promise<User | null> {
    const appleUserId = await storageService.getAppleUserId();
    if (!appleUserId) return null;

    return await supabaseService.getUserByAppleId(appleUserId);
  }

  async signOut(): Promise<void> {
    await storageService.clearAll();
  }

  async hasGeminiApiKey(): Promise<boolean> {
    const apiKey = await storageService.getGeminiApiKey();
    return !!apiKey;
  }
}

export default new AuthService();