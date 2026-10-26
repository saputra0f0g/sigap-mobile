/**
 * services/userService.js
 * Semua API call yang berkaitan dengan profil pengguna.
 *
 * Endpoints Laravel:
 *   GET   /api/user/profil         → Ambil profil user login
 *   PUT   /api/user/profil         → Update profil (nama, telp)
 *   POST  /api/user/foto-profil    → Upload foto profil (multipart)
 *   PUT   /api/user/password       → Ganti password
 */

import api from './api';

const userService = {

  /**
   * Ambil profil user yang sedang login
   */
  getProfil: async () => {
    return await api.get('/user/profil');
    // Response: { id, name, email, phone, role, foto_url, created_at }
  },

  /**
   * Update data profil (nama & nomor telp)
   * @param {{ name, phone }} data
   */
  updateProfil: async (data) => {
    return await api.put('/user/profil', {
      name:  data.name,
      phone: data.phone,
    });
  },

  /**
   * Upload/ganti foto profil
   * @param {{ uri, name, type }} foto  — dari expo-image-picker
   */
  uploadFotoProfil: async (foto) => {
    const formData = new FormData();
    formData.append('foto', {
      uri:  foto.uri,
      name: foto.name ?? 'foto_profil.jpg',
      type: foto.type ?? 'image/jpeg',
    });
    return await api.upload('/user/foto-profil', formData);
    // Response: { message, foto_url }
  },

  /**
   * Ganti password
   * @param {{ current_password, password, password_confirmation }} data
   */
  gantiPassword: async (data) => {
    return await api.put('/user/password', {
      current_password:      data.currentPassword,
      password:              data.newPassword,
      password_confirmation: data.confirmPassword,
    });
  },


};

export default userService;
