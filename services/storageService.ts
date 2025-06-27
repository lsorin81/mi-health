import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '@/utils/constants';

class StorageService {
  async setGeminiApiKey(apiKey: string): Promise<void> {
    await SecureStore.setItemAsync(STORAGE_KEYS.GEMINI_API_KEY, apiKey);
  }

  async getGeminiApiKey(): Promise<string | null> {
    return await SecureStore.getItemAsync(STORAGE_KEYS.GEMINI_API_KEY);
  }

  async removeGeminiApiKey(): Promise<void> {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.GEMINI_API_KEY);
  }

  async setUserId(userId: string): Promise<void> {
    await SecureStore.setItemAsync(STORAGE_KEYS.USER_ID, userId);
  }

  async getUserId(): Promise<string | null> {
    return await SecureStore.getItemAsync(STORAGE_KEYS.USER_ID);
  }

  async setAppleUserId(appleUserId: string): Promise<void> {
    await SecureStore.setItemAsync(STORAGE_KEYS.APPLE_USER_ID, appleUserId);
  }

  async getAppleUserId(): Promise<string | null> {
    return await SecureStore.getItemAsync(STORAGE_KEYS.APPLE_USER_ID);
  }

  async clearAll(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(STORAGE_KEYS.GEMINI_API_KEY),
      SecureStore.deleteItemAsync(STORAGE_KEYS.USER_ID),
      SecureStore.deleteItemAsync(STORAGE_KEYS.APPLE_USER_ID),
    ]);
  }
}

export default new StorageService();