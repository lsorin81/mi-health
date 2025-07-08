import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';
import * as Linking from 'expo-linking';

import { useColorScheme } from '@/hooks/useColorScheme';
import authService from '@/services/authService';
import supabaseService from '@/services/supabaseService';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    // Handle deep links
    const handleDeepLink = async (url: string) => {
      const parsedUrl = Linking.parse(url);
      
      console.log('Deep link URL received:', url);
      console.log('Parsed URL:', parsedUrl);
      
      // Handle magic link authentication - check for auth/verify in the URL string
      const isAuthVerify = url.includes('auth/verify') || 
                          url.includes('--/auth/verify') ||
                          parsedUrl.path === 'auth/verify' || 
                          parsedUrl.path === '--/auth/verify';
      
      // For Expo URLs, we need to extract query params manually since parsing might not work correctly
      let queryParams = parsedUrl.queryParams || {};
      
      // If no query params from parsing, try to extract from URL string
      if (Object.keys(queryParams).length === 0) {
        // Try query parameters (after ?)
        if (url.includes('?')) {
          const urlParts = url.split('?');
          if (urlParts.length > 1) {
            const queryString = urlParts[1].split('#')[0]; // Remove hash if present
            const params = new URLSearchParams(queryString);
            queryParams = {};
            for (const [key, value] of params.entries()) {
              queryParams[key] = value;
            }
            console.log('Extracted query params from URL:', queryParams);
          }
        }
        
        // Also try hash fragments (after #) - common with OAuth
        if (Object.keys(queryParams).length === 0 && url.includes('#')) {
          const hashParts = url.split('#');
          if (hashParts.length > 1) {
            const hashString = hashParts[1];
            const params = new URLSearchParams(hashString);
            queryParams = {};
            for (const [key, value] of params.entries()) {
              queryParams[key] = value;
            }
            console.log('Extracted params from hash fragment:', queryParams);
          }
        }
      }
      
      // Check if this URL contains authentication tokens (regardless of path)
      const { access_token, refresh_token, type, token } = queryParams as any;
      const hasAuthTokens = access_token || refresh_token || token || type === 'magiclink';
      
      console.log('Checking for auth tokens:', { 
        access_token: access_token ? 'present' : 'missing',
        refresh_token: refresh_token ? 'present' : 'missing',
        type, 
        token: token ? 'present' : 'missing',
        hasAuthTokens
      });
      
      if (hasAuthTokens || isAuthVerify) {
        console.log('Processing authentication from deep link...');
        
        if (hasAuthTokens) {
          try {
            // Set the session from the tokens if available
            if (access_token && refresh_token) {
              console.log('Setting session with tokens...');
              await supabaseService.getAuth().setSession({
                access_token,
                refresh_token,
              });
            }
            
            // Give a moment for the session to be set
            setTimeout(async () => {
              try {
                // Check if session is valid
                const session = await authService.getSupabaseSession();
                console.log('Session after magic link:', session ? 'valid' : 'invalid');
                
                if (session) {
                  const hasApiKey = await authService.hasGeminiApiKey();
                  console.log('Has API key:', hasApiKey);
                  
                  if (hasApiKey) {
                    router.replace('/');
                  } else {
                    router.replace('/(auth)/api-key');
                  }
                } else {
                  console.error('No valid session after magic link');
                  router.replace('/(auth)/login');
                }
              } catch (error) {
                console.error('Error checking session after magic link:', error);
                router.replace('/(auth)/login');
              }
            }, 1000);
          } catch (error) {
            console.error('Error handling magic link:', error);
            router.replace('/(auth)/login');
          }
        }
      } else {
        // Even if no auth tokens found, check if user has a valid session
        // This handles cases where the magic link might have set the session without explicit URL params
        console.log('No auth tokens found in URL, checking existing session...');
        try {
          const session = await authService.getSupabaseSession();
          if (session && session.user) {
            console.log('Found existing valid session from deep link');
            const hasApiKey = await authService.hasGeminiApiKey();
            if (hasApiKey) {
              router.replace('/');
            } else {
              router.replace('/(auth)/api-key');
            }
          } else {
            console.log('No valid session found');
          }
        } catch (error) {
          console.error('Error checking session from deep link:', error);
        }
      }
    };

    // Listen for deep links
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    // Check if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
