// ═══════════════════════════════════════════════════════════════
//  STUDENT HUB — Frontend Config
// ═══════════════════════════════════════════════════════════════

export const CONFIG = {
  // Cloudflare Worker API URL (Set your custom worker domain here or leave dynamic)
  API_BASE: (function () {
    if (typeof window !== 'undefined') {
      // If hosted on GitHub Pages or custom frontend domain, point to your Cloudflare Worker URL
      if (window.location.hostname.includes('github.io')) {
        return 'https://student-hub.workers.dev'; // Replace with your actual Cloudflare Worker URL
      }
    }
    // Local / same-origin default
    return '';
  })(),

  CURRENT_SEM: 'even',
  HALL_TICKET_ENABLED: true,
  MOODLE_ENABLED: true,

  // Storage Keys
  CRED_KEY: 'nie_hub_creds',
  USER_KEY: 'nie_parents_user',
  THEME_KEY: 'nie_theme',
  COURSES_KEY: 'nie_moodle_courses',
  TOKEN_KEY: 'nie_moodle_token',
  CONSENT_KEY: 'student_hub_consent_v2',
  PHOTO_CONSENT_KEY: 'student_hub_photo_consent'
};
