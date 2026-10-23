const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3002';

/**
 * Deploy targets sometimes inject a bare hostname (Render's blueprint
 * `fromService.property: host` gives `my-service.onrender.com`, with no
 * scheme). Normalise so axios/socket.io always get an absolute https URL.
 */
const apiUrl = /^https?:\/\//i.test(rawApiUrl) ? rawApiUrl : `https://${rawApiUrl}`;

export const env = {
  VITE_API_URL: apiUrl,
  VITE_API_VERSION: import.meta.env.VITE_API_VERSION || 'v1',
  VITE_APP_NAME: import.meta.env.VITE_APP_NAME || 'SuperLink CRM',
};
