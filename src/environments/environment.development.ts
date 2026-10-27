// Relative on purpose: `ng serve` proxies /api to the FastAPI backend (see
// proxy.conf.json), so the browser never makes a cross-origin call and the
// app works unchanged when opened from a phone on the LAN.
export const environment = {
  production: false,
  apiUrl: '/api/v1',
};
