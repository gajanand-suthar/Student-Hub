// ═══════════════════════════════════════════════════════════════
//  STUDENT HUB — Frontend Config
// ═══════════════════════════════════════════════════════════════

export const CONFIG = {
  // Cloudflare Worker API URL
  API_BASE: 'https://student-hub.gajanandsuthar003.workers.dev',

  // Storage Keys
  CRED_KEY: 'nie_hub_creds',
  USER_KEY: 'nie_parents_user',
  THEME_KEY: 'nie_theme',
  COURSES_KEY: 'nie_moodle_courses',
  TOKEN_KEY: 'nie_moodle_token',
  CONSENT_KEY: 'student_hub_consent_v2',
  PHOTO_CONSENT_KEY: 'student_hub_photo_consent',
  ATT_SESSION_KEY: 'nie_att_session',
  SKIP_AUTOLOGIN_KEY: 'nie_skip_autologin',
  PWA_SNOOZED_KEY: 'nie_hub_pwa_snoozed',
  PWA_IOS_SHOWN_KEY: 'nie_hub_pwa_ios_shown'
};

Object.freeze(CONFIG);
