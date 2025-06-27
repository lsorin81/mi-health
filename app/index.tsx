import { useEffect } from 'react';
import { router } from 'expo-router';
import authService from '@/services/authService';

export default function Index() {
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const user = await authService.getCurrentUser();
    if (user) {
      const hasApiKey = await authService.hasGeminiApiKey();
      if (hasApiKey) {
        router.replace('/(tabs)/');
      } else {
        router.replace('/(auth)/api-key');
      }
    } else {
      router.replace('/(auth)/login');
    }
  };

  return null;
}