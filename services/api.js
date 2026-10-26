/**
 * Base HTTP client untuk semua request ke Laravel API.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const TIMEOUT_MS = 15000;
const TOKEN_KEY = 'sigap_auth_token';
const USER_KEY = 'sigap_user';

const getExpoHost = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ?? Constants.manifest?.debuggerHost;

  if (!hostUri) return null;

  const hostWithoutScheme = hostUri.replace(/^[a-z]+:\/\//i, '');
  const ipv6Match = hostWithoutScheme.match(/^\[([^\]]+)\]/);
  const host = ipv6Match ? ipv6Match[1] : hostWithoutScheme.split(':')[0];

  return host || null;
};

const withApiPrefix = (url) => {
  const normalizedUrl = url.replace(/\/+$/, '');
  return /\/api$/i.test(normalizedUrl)
    ? normalizedUrl
    : `${normalizedUrl}/api`;
};

const configuredUrl = process.env.EXPO_PUBLIC_API_URL;
const developmentUrl = `http://${getExpoHost() || '10.107.249.189 '}:8003/api`;

export const BASE_URL = withApiPrefix(
  configuredUrl || (__DEV__ ? developmentUrl : 'http://sigap-web.test/api')
);  

export const getPublicFileUrl = (file) => {
  const value = typeof file === 'string' ? file : file?.url ?? file?.path;
  if (!value) return null;

  const apiOrigin = BASE_URL.replace(/\/api\/?$/, '');
  const localHostUrl = value.match(/^https?:\/\/(?:localhost|127\.0\.0\.1|[^/]+\.test)(?::\d+)?(\/.*)$/i);
  if (localHostUrl) return `${apiOrigin}${localHostUrl[1]}`;
  if (/^https?:\/\//i.test(value)) return value;

  const path = value.replace(/^\/+/, '').replace(/^storage\//i, '');
  return `${apiOrigin}/storage/${path}`;
};

const getToken = () => AsyncStorage.getItem(TOKEN_KEY);

const buildHeaders = async (isMultipart = false) => {
  const token = await getToken();
  const headers = {
    Accept: 'application/json',
  };

  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const withTimeout = async (promise, ms = TIMEOUT_MS) => {
  let timeoutId;

  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error('Request timeout. Periksa koneksi internet.')),
          ms
        );
      }),
    ]);
  } finally {
    clearTimeout(timeoutId);
  }
};

const parseError = async (response) => {
  try {
    const data = await response.json();
    if (data.errors) {
      const firstError = Object.values(data.errors)[0];
      return Array.isArray(firstError) ? firstError[0] : String(firstError);
    }

    return (
      data.message ||
      mapHttpError(response.status) ||
      `Error ${response.status}`
    );
  } catch {
    return mapHttpError(response.status) || `HTTP Error ${response.status}`;
  }
};

const mapHttpError = (status) => {
  switch (status) {
    case 400:
      return 'Permintaan tidak valid. Periksa data yang dikirim.';
    case 401:
      return 'Sesi berakhir. Silakan login kembali.';
    case 403:
      return 'Akses ditolak. Anda tidak memiliki izin untuk tindakan ini.';
    case 404:
      return 'Data tidak ditemukan.';
    case 408:
      return 'Waktu permintaan habis. Periksa koneksi internet.';
    case 409:
      return 'Konflik data. Data yang Anda kirim sudah ada atau bentrok.';
    case 422:
      return null;
    case 429:
      return 'Terlalu banyak permintaan. Tunggu sebentar dan coba lagi.';
    case 500:
      return 'Terjadi kesalahan di server. Coba lagi nanti.';
    case 502:
      return 'Server tidak dapat dijangkau (502). Coba lagi nanti.';
    case 503:
      return 'Layanan tidak tersedia sementara. Coba beberapa saat lagi.';
    default:
      return `Terjadi kesalahan (${status}). Silakan coba lagi.`;
  }
};

const request = async (method, endpoint, body = null, isMultipart = false) => {
  const normalizedEndpoint = endpoint.replace(/\/+$/, '');
  const isLoginRequest =
    normalizedEndpoint === 'auth/login' || normalizedEndpoint.endsWith('/auth/login');
  const headers = await buildHeaders(isMultipart);

  if (isLoginRequest) {
    delete headers.Authorization;
  }

  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const options = {
    method,
    headers,
  };

  if (body !== null) {
    options.body = isMultipart ? body : JSON.stringify(body);
  }

  try {
    const response = await withTimeout(fetch(url, options));

    if (response.status === 401 && !isLoginRequest) {
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
      throw new Error('Sesi berakhir. Silakan login kembali.');
    }

    if (!response.ok) {
      const message = await parseError(response);
      throw new Error(message || mapHttpError(response.status));
    }

    if (response.status === 204) return null;

    return await response.json();
  } catch (error) {
    if (
      error instanceof TypeError &&
      /network request failed|failed to fetch/i.test(error.message)
    ) {
      throw new Error(
        'Tidak dapat terhubung ke server. Pastikan HP dan laptop berada di Wi-Fi yang sama, lalu periksa server Laravel.'
      );
    }

    throw error;
  }
};

const api = {
  get: (endpoint) => request('GET', endpoint),
  post: (endpoint, body) => request('POST', endpoint, body),
  put: (endpoint, body) => request('PUT', endpoint, body),
  patch: (endpoint, body) => request('PATCH', endpoint, body),
  delete: (endpoint) => request('DELETE', endpoint),
  upload: (endpoint, formData) => request('POST', endpoint, formData, true),
};

export default api;
