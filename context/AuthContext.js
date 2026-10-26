/**
 * context/AuthContext.js
 * Central authentication context untuk Sigap-Mobile.
 *
 * Manages:
 *   - isAuthenticated  : boolean
 *   - isLoading        : boolean (true while restoring session from AsyncStorage)
 *   - userRole         : 'masyarakat' | null
 *   - user             : full user object dari Laravel API
 *
 * ─── MODE ───────────────────────────────────────────────────────────────────
 * SIMULATION_MODE = true  → pakai data dummy (tidak butuh backend)
 * SIMULATION_MODE = false → koneksi ke Laravel API sungguhan
 *
 * Ganti IP di services/api.js jika testing di device fisik.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from '../services/authService';

// ─── TOGGLE MODE ──────────────────────────────────────────────────────────────
// Ubah ke false saat backend Laravel sudah siap
const SIMULATION_MODE = false;

const STORAGE_KEYS = {
  TOKEN: 'sigap_auth_token',
  USER: 'sigap_user',
};

// ─── CONTEXT ─────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

// ─── PROVIDER ─────────────────────────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // ── Restore session dari AsyncStorage ────────────────────────────────────
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
        const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.USER);

        // Hapus mock token lama dari versi sebelumnya
        if (token && token.startsWith('mock-token-')) {
          await AsyncStorage.multiRemove([STORAGE_KEYS.TOKEN, STORAGE_KEYS.USER]);
          return;
        }

        if (token && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser.role !== 'masyarakat') {
            await AsyncStorage.multiRemove([STORAGE_KEYS.TOKEN, STORAGE_KEYS.USER]);
            return;
          }

          setUser(parsedUser);
          setUserRole(parsedUser.role);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.warn('[AuthContext] Gagal memulihkan sesi:', error);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (credentials) => {

    if (SIMULATION_MODE) {
      // ── SIMULASI: tidak butuh backend ──────────────────────────────────
      const mockUser = {
        id: 1,
        name: credentials.email ?? credentials.username,
        email: credentials.email ?? credentials.username + '@sigap.id',
        phone: '08123456789',
        role: 'masyarakat',
      };
      setUser(mockUser);
      setUserRole(mockUser.role);
      setIsAuthenticated(true);
      return mockUser;
    }

    // ── REAL API: koneksi ke Laravel ───────────────────────────────────────
    const response = await authService.login(credentials);
    // response = { user: {...}, token: 'string' }

    const { user: loggedInUser, token } = response;
    if (loggedInUser?.role !== 'masyarakat') {
      throw new Error('Aplikasi mobile hanya dapat digunakan oleh masyarakat.');
    }

    // Simpan ke AsyncStorage untuk restore sesi setelah restart
    await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(loggedInUser));

    setUser(loggedInUser);
    setUserRole(loggedInUser.role);
    setIsAuthenticated(true);

    return loggedInUser;
  }, []);

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      if (!SIMULATION_MODE) {
        // Cabut token di server
        await authService.logout().catch(() => { }); // silent fail jika offline
      }
    } finally {
      await AsyncStorage.multiRemove([STORAGE_KEYS.TOKEN, STORAGE_KEYS.USER]);
      setUser(null);
      setUserRole(null);
      setIsAuthenticated(false);
    }
  }, []);

  // ── Update user state (dipanggil setelah update profil) ──────────────────
  const updateUser = useCallback((updatedUser) => {
    const merged = { ...updatedUser };
    setUser(merged);
    AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(merged)).catch(() => { });
  }, []);

  // ── Get token (untuk dipakai komponen lain jika perlu) ───────────────────
  const getToken = useCallback(async () => {
    return await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
  }, []);

  const value = {
    user,
    userRole,
    isAuthenticated,
    isLoading,
    login,
    logout,
    updateUser,
    getToken,
    isSimulationMode: SIMULATION_MODE,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ─── HOOK ─────────────────────────────────────────────────────────────────────
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth() harus digunakan di dalam <AuthProvider>');
  }
  return context;
};

export default AuthContext;
