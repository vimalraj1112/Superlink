export const env = {
  VITE_API_URL: import.meta.env.VITE_API_URL || 'http://localhost:3002',
  VITE_API_VERSION: import.meta.env.VITE_API_VERSION || 'v1',
  VITE_APP_NAME: import.meta.env.VITE_APP_NAME || 'SuperLink CRM',
};