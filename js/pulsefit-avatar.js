/**
 * PulseFit — Upload photo de profil (Supabase Storage ou local démo)
 */
(function (global) {
  'use strict';

  const MAX_BYTES = 2 * 1024 * 1024;
  const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  function readAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Impossible de lire l’image'));
      reader.readAsDataURL(file);
    });
  }

  async function upload(file) {
    if (!file) throw new Error('Aucune image sélectionnée');
    if (!ALLOWED.includes(file.type)) {
      throw new Error('Format accepté : JPG, PNG, WebP ou GIF');
    }
    if (file.size > MAX_BYTES) {
      throw new Error('Image trop lourde (maximum 2 Mo)');
    }

    const useCloud = global.PulseFitSupabase?.isConfigured?.();

    if (!useCloud) {
      return readAsDataUrl(file);
    }

    const sb = global.PulseFitSupabase.getClient();
    const userId = await global.PulseFitCloud?.getUserId?.();
    if (!sb || !userId) {
      throw new Error('Session expirée — reconnectez-vous');
    }

    const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }[file.type] || 'jpg';
    const path = `${userId}/avatar.${ext}`;

    const { error } = await sb.storage.from('avatars').upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: '3600',
    });

    if (error) {
      const msg = error.message || '';
      if (msg.includes('Bucket not found') || msg.includes('not found')) {
        throw new Error('Bucket « avatars » absent : exécutez supabase/storage-avatars.sql dans Supabase');
      }
      throw new Error(msg);
    }

    const { data } = sb.storage.from('avatars').getPublicUrl(path);
    return `${data.publicUrl}?v=${Date.now()}`;
  }

  global.PulseFitAvatar = { upload, MAX_BYTES, ALLOWED };
})(typeof window !== 'undefined' ? window : globalThis);
