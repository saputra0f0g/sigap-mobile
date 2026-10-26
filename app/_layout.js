/**
 * app/_layout.js — Root Layout (Expo Router)
 *
 * Responsibilities:
 * 1. Wraps the entire app in <AuthProvider>
 * 2. Registers all route groups with <Stack>
 * 3. Guards routes so only masyarakat accounts can access the app.
 */

import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../context/AuthContext';

// ─── GUARD COMPONENT ──────────────────────────────────────────────────────────
// Separated so it can use useAuth() inside AuthProvider tree.
function RouteGuard() {
  const { isAuthenticated, userRole, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Don't redirect while restoring session from AsyncStorage
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated || userRole !== 'masyarakat') {
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
      return;
    }

    if (inAuthGroup) {
      router.replace('/(masyarakat)/beranda');
    }
  }, [isAuthenticated, userRole, isLoading, segments, router]);

  return null; // Pure logic component, renders nothing
}

// ─── ROOT LAYOUT ──────────────────────────────────────────────────────────────
export default function RootLayout() {
  return (
    <AuthProvider>
      <RouteGuard />
      <Stack screenOptions={{ headerShown: false }}>
        {/* Root entry point — loading splash, then RouteGuard redirects */}
        <Stack.Screen name="index" options={{ headerShown: false }} />

        {/* Auth group — Login, Register, dll */}
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />

        {/* Masyarakat group — Bottom tabs for public reporters */}
        <Stack.Screen name="(masyarakat)" options={{ headerShown: false }} />


      </Stack>
    </AuthProvider>
  );
}
