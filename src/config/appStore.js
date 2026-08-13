// ID numérico do CapiFit na App Store (App Store Connect → App Information →
// Apple ID).
export const APP_STORE_ID = '6792953935';

export function getAppStoreReviewUrl() {
  if (!APP_STORE_ID) return null;
  return `https://apps.apple.com/app/id${APP_STORE_ID}?action=write-review`;
}
