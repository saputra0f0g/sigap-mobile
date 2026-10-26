/**
 * services/authService.js
 * Semua API call yang berkaitan dengan autentikasi.
 *
 * Endpoints Laravel (Sanctum):
 *   POST /api/auth/register
 *   POST /api/auth/login
 *   POST /api/auth/logout
 *   GET  /api/auth/me
 */

import api from './api';

const authService = {

  /**
   * Register pengguna baru (Masyarakat)
   * @param {{ name, username, email, phone, password, password_confirmation }} data
   */
  register: async (data) => {
    const response = await api.post('/auth/register', {
      name:                  data.name,
      username:              data.username,
      email:                 data.email,
      phone:                 data.phone,
      password:              data.password,
      password_confirmation: data.passwordConfirmation,
      role:                  'masyarakat', // default role untuk self-register
    });
    return response; // { message, user, token }
  },

  /**
   * Login
   * @param {{ email, password }} credentials
   * @returns {{ user, token }}
   */
  login: async (credentials) => {
    const response = await api.post('/auth/login', {
      email:    credentials.email ?? credentials.username,
      password: credentials.password,
    });
    return response; // { user: { id, name, email, role, ... }, token }
  },

  /**
   * Logout — mencabut token di server
   */
  logout: async () => {
    return await api.post('/auth/logout', {});
  },

  /**
   * Ambil data user yang sedang login (validate token)
   */
  me: async () => {
    return await api.get('/auth/me');
  },

};

export default authService;
