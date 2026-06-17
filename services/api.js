/**
 * services/api.js
 * Base HTTP client untuk semua request ke Laravel API.
 *
 * Fitur:
 * - Base URL terpusat (ganti IP di sini saja)
 * - Attach Bearer token otomatis dari AsyncStorage
 * - Response interceptor: tangani 401 Unauthorized (token expired)
 * - Timeout 15 detik
 * - Error handler terpusat → lempar pesan Indonesia
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── KONFIGURASI ──────────────────────────────────────────────────────────────
// Ganti IP_LAPTOP dengan IP komputer/laptop kamu di jaringan WiFi yang sama.
// Cek dengan perintah: ipconfig (Windows) atau ifconfig (Mac/Linux)
// Contoh: '192.168.1.105'

export const BASE_URL = 
  `https://sigap-web-production-8e80.up.railway.app/api`;

const TIMEOUT_MS = 15000; // 15 detik

// ─── HELPER: Ambil token dari storage 
const getToken = async () => {
  return await AsyncStorage.getItem('sigap_auth_token');
};

// ─── HELPER: Buat headers standard 
const buildHeaders = async (isMultipart = false) => {
  const token = await getToken();
  const headers = {
    'Accept': 'application/json',
  };

  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

// ─── HELPER: Timeout wrapper 
const withTimeout = (promise, ms = TIMEOUT_MS) => {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Request timeout. Periksa koneksi internet.')), ms)
  );
  return Promise.race([promise, timeout]);
};

// ─── HELPER: Parse error response ────────────────────────────────────────────
const parseError = async (response) => {
  try {
    const data = await response.json();
    // Laravel validation errors: { errors: { field: ['message'] } }
    if (data.errors) {
      const firstError = Object.values(data.errors)[0];
      return Array.isArray(firstError) ? firstError[0] : String(firstError);
    }
    return data.message || `Error ${response.status}`;
  } catch {
    return `HTTP Error ${response.status}`;
  }
};

// ─── HELPER: Map HTTP status ke pesan Indonesia ───────────────────────────────
const mapHttpError = (status) => {
  switch (status) {
    case 400: return 'Permintaan tidak valid. Periksa data yang dikirim.';
    case 401: return 'Sesi berakhir. Silakan login kembali.';
    case 403: return 'Akses ditolak. Anda tidak memiliki izin untuk tindakan ini.';
    case 404: return 'Data tidak ditemukan.';
    case 408: return 'Waktu permintaan habis. Periksa koneksi internet.';
    case 409: return 'Konflik data. Data yang Anda kirim sudah ada atau bentrok.';
    case 422: return null; // akan diisi dari body validasi Laravel
    case 429: return 'Terlalu banyak permintaan. Tunggu sebentar dan coba lagi.';
    case 500: return 'Terjadi kesalahan di server. Coba lagi nanti.';
    case 502: return 'Server tidak dapat dijangkau (502). Coba lagi nanti.';
    case 503: return 'Layanan tidak tersedia sementara. Coba beberapa saat lagi.';
    default:  return `Terjadi kesalahan (${status}). Silakan coba lagi.`;
  }
};

// ─── CORE REQUEST FUNCTION ────────────────────────────────────────────────────
const request = async (method, endpoint, body = null, isMultipart = false) => {
  const headers = await buildHeaders(isMultipart);
  const url = `${BASE_URL}${endpoint}`;

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = isMultipart ? body : JSON.stringify(body);
  }

  try {
    const response = await withTimeout(fetch(url, options));

    // 401 → token expired / tidak valid
    if (response.status === 401) {
      await AsyncStorage.multiRemove(['sigap_auth_token', 'sigap_user']);
      throw new Error('Sesi berakhir. Silakan login kembali.');
    }

    // 403 → tidak punya akses
    if (response.status === 403) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'Akses ditolak. Anda tidak memiliki izin untuk tindakan ini.');
    }

    // 404 → tidak ditemukan
    if (response.status === 404) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'Data tidak ditemukan.');
    }

    // 422 → Validation error dari Laravel
    if (response.status === 422) {
      const msg = await parseError(response);
      throw new Error(msg);
    }

    // 5xx → Server error
    if (response.status >= 500) {
      const fallback = mapHttpError(response.status);
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || fallback);
    }

    // Error lain dari server
    if (!response.ok) {
      const msg = await parseError(response);
      const fallback = mapHttpError(response.status);
      throw new Error(msg || fallback);
    }

    // 204 No Content
    if (response.status === 204) return null;

    return await response.json();
  } catch (error) {
    // Network error (tidak ada koneksi / server mati)
    if (error.message === 'Network request failed') {
      throw new Error('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
    }
    // Lempar kembali error yang sudah diformat
    throw error;
  }
};

// ─── PUBLIC API ───────────────────────────────────────────────────────────────
const api = {
  get: (endpoint) => request('GET', endpoint),
  post: (endpoint, body) => request('POST', endpoint, body),
  put: (endpoint, body) => request('PUT', endpoint, body),
  patch: (endpoint, body) => request('PATCH', endpoint, body),
  delete: (endpoint) => request('DELETE', endpoint),
  upload: (endpoint, formData) => request('POST', endpoint, formData, true),
};

export default api;
