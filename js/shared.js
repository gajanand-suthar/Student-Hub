// ═══════════════════════════════════════════════════════════════
//  STUDENT HUB — Shared Frontend Logic
// ═══════════════════════════════════════════════════════════════

import { CONFIG } from './config.js';
import { api } from './api.js';
import { getCurrentRoute, navigate } from './router.js';

// ── Theme Management ──
export function initTheme() {
  try {
    const current = document.documentElement.getAttribute('data-theme');
    const saved = localStorage.getItem(CONFIG.THEME_KEY);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = current || saved || (prefersDark ? 'dark' : 'light');
    applyTheme(theme);
  } catch (e) {}
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const moon = document.getElementById('icon-moon');
  const sun = document.getElementById('icon-sun');
  if (moon && sun) {
    if (theme === 'dark') {
      moon.style.display = 'none';
      sun.style.display = 'block';
    } else {
      moon.style.display = 'block';
      sun.style.display = 'none';
    }
  }
}

export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  try {
    localStorage.setItem(CONFIG.THEME_KEY, current);
  } catch (e) {}
  applyTheme(current);
}

// ── Branch & USN Parsing ──
export const BRANCH_MAP = {
  EE: { name: 'Electrical & Electronics', slug: 'electrical-electronics' },
  EC: { name: 'Electronics & Communication', slug: 'electronics-communication' },
  IS: { name: 'Information Science', slug: 'information-science' },
  CS: { name: 'Computer Science', slug: 'computer-science' },
  CI: { name: 'CSE (AI & ML)', slug: 'cse-ai-ml' },
  ME: { name: 'Mechanical', slug: 'mechanical' },
  CV: { name: 'Civil', slug: 'civil' }
};

export function parseUsn(usn) {
  if (!usn || typeof usn !== 'string') return null;
  const upper = usn.trim().toUpperCase();
  if (!upper) return null;

  let branch = '';
  let entryYear = null;
  let isLateral = false;
  let batch = '';

  const stdMatch = upper.match(/^[0-9][A-Z]{2}(\d{2})([A-Z]{2})(?:(\d{3}))?$/);
  if (stdMatch) {
    const yy = parseInt(stdMatch[1], 10);
    branch = stdMatch[2];
    const rollNum = stdMatch[3] ? parseInt(stdMatch[3], 10) : 0;
    isLateral = rollNum >= 400 && rollNum <= 499;
    entryYear = 2000 + yy;
    batch = '20' + stdMatch[1];
  } else {
    const tempMatch = upper.match(/^(20\d{2})(L?)([A-Z]{2,4})\d{2,4}$/);
    if (tempMatch) {
      entryYear = parseInt(tempMatch[1], 10);
      isLateral = tempMatch[2] === 'L';
      branch = tempMatch[3];
      batch = String(isLateral ? entryYear - 1 : entryYear);
    }
  }

  if (!branch && !entryYear) return null;

  let semNum = null;
  let oddSemRoman = null;
  if (entryYear) {
    const now = new Date();
    const yearDiff = now.getFullYear() - entryYear;
    const isOddSem = now.getMonth() >= 7 || now.getMonth() === 0;
    const baseSem = isLateral ? 3 : 1;
    semNum = Math.max(1, Math.min(8, baseSem + yearDiff * 2 + (isOddSem ? 0 : 1)));
    if (semNum <= 1) oddSemRoman = 'I';
    else if (semNum <= 3) oddSemRoman = 'III';
    else if (semNum <= 5) oddSemRoman = 'V';
    else oddSemRoman = 'VII';
  }

  return {
    usn: upper,
    branch,
    branchName: BRANCH_MAP[branch]?.name || branch,
    deptSlug: BRANCH_MAP[branch]?.slug || null,
    entryYear,
    batch,
    isLateral,
    semNum,
    oddSemRoman
  };
}

// ── Credentials & Profile Management ──
export function loadCreds() {
  try {
    return JSON.parse(localStorage.getItem(CONFIG.CRED_KEY));
  } catch (e) {
    return null;
  }
}

export function loadUser() {
  try {
    return JSON.parse(localStorage.getItem(CONFIG.USER_KEY)) || {};
  } catch (e) {
    return {};
  }
}

export function saveUserProfile(student, fallbackUsn = '') {
  if (!student) return null;
  try {
    const existing = loadUser() || {};
    const usn = (student.usn || fallbackUsn || existing.usn || '').trim().toUpperCase();
    const parsed = parseUsn(usn);
    const semNum = student.semNum || student.semester || existing.semNum || existing.semester || '';
    const profile = {
      ...existing,
      name: student.name || existing.name || '',
      usn,
      program: student.program || existing.program || '',
      semNum,
      semester: semNum,
      section: student.section || existing.section || '',
      batch: student.batch || existing.batch || parsed?.batch || '',
      sem: student.sem || existing.sem || '',
      primarySem: existing.primarySem || student.sem || '',
      photoUri: student.photoUri || existing.photoUri || null,
      savedAt: Date.now()
    };
    localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(profile));
    return profile;
  } catch (e) {
    return null;
  }
}

export function saveRegisteredCourses(student) {
  if (!student) return [];
  try {
    const map = new Map();
    for (const list of [student.attendance, student.cie]) {
      if (Array.isArray(list)) {
        for (const item of list) {
          const code = (item?.code || '').toUpperCase().trim();
          if (!code) continue;
          const name = (item?.name || '').trim();
          if (!map.has(code) || (!map.get(code).name && name)) {
            map.set(code, { code, name: name || code });
          }
        }
      }
    }
    const courses = Array.from(map.values());
    if (courses.length > 0) {
      localStorage.setItem('nie_registered_courses', JSON.stringify(courses));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nie_courses_updated', { detail: courses }));
      }
    }
    return courses;
  } catch (e) {
    return [];
  }
}

const COOKIE_TTL = 15 * 60 * 1000; // 15 minutes

export function getStoredCookies() {
  const creds = loadCreds();
  if (!creds || !creds.cookies || !creds.cookiesAt) return null;
  if (Date.now() - creds.cookiesAt > COOKIE_TTL) return null;
  return creds.cookies;
}

export function savePortalCookies(cookies) {
  if (!cookies) return;
  const creds = loadCreds();
  if (!creds) return;
  creds.cookies = cookies;
  creds.cookiesAt = Date.now();
  try { localStorage.setItem(CONFIG.CRED_KEY, JSON.stringify(creds)); } catch (e) {}
}

// ── Identity Token Management ──
export function getIdentityToken() {
  try {
    const token = localStorage.getItem(CONFIG.IDENTITY_TOKEN_KEY);
    if (!token) return '';
    const parts = token.split('.');
    if (parts.length !== 4) return '';
    const expiry = parseInt(parts[0], 10);
    if (isNaN(expiry) || Date.now() > expiry) {
      localStorage.removeItem(CONFIG.IDENTITY_TOKEN_KEY);
      return '';
    }
    return token;
  } catch (e) {
    return '';
  }
}

export function setIdentityToken(token) {
  if (token && typeof token === 'string') {
    try {
      localStorage.setItem(CONFIG.IDENTITY_TOKEN_KEY, token);
    } catch (e) {}
  }
}

// ── Drawer Menu ──
export function toggleDrawer(open, push = true) {
  const overlay = document.getElementById('drawer-overlay');
  if (overlay) {
    const isCurrentlyActive = overlay.classList.contains('active');
    if (open && !isCurrentlyActive) {
      overlay.classList.add('active');
      const theme = document.documentElement.getAttribute('data-theme') || 'light';
      applyTheme(theme);
      if (push && history.state?.modal !== 'drawer') {
        history.pushState({ modal: 'drawer', route: getCurrentRoute() || 'dashboard' }, '', window.location.href);
      }
    } else if (!open && isCurrentlyActive) {
      overlay.classList.remove('active');
      if (push && history.state?.modal === 'drawer') {
        history.back();
      }
    }
  }
}

// ── Logout ──
export function confirmLogout(push = true) {
  toggleDrawer(false, false);
  const modal = document.getElementById('logout-confirm-modal');
  if (modal) {
    modal.classList.add('active');
    if (push && history.state?.modal !== 'logout-modal') {
      history.pushState({ modal: 'logout-modal', route: getCurrentRoute() || 'dashboard' }, '', window.location.href);
    }
  }
}

export function closeLogoutConfirm(fromUi = true) {
  const modal = document.getElementById('logout-confirm-modal');
  if (modal) modal.classList.remove('active');
  if (fromUi && history.state?.modal === 'logout-modal') {
    history.back();
  }
}

export function executeLogout() {
  [
    CONFIG.CRED_KEY,
    CONFIG.USER_KEY,
    CONFIG.TOKEN_KEY,
    CONFIG.COURSES_KEY,
    CONFIG.IDENTITY_TOKEN_KEY,
    CONFIG.PHOTO_CONSENT_KEY,
    'nie_session_token',
    'nie_registered_courses',
    'nie_moodle_userid'
  ].forEach(k => localStorage.removeItem(k));

  Object.keys(localStorage).forEach(k => {
    if (k.startsWith('nie_tt_cache_') || k.startsWith('nie_batch_')) {
      localStorage.removeItem(k);
    }
  });

  [
    CONFIG.ATT_SESSION_KEY,
    'student_sgpa_cache',
    'sug_unread_checked',
    'nie_results_cache'
  ].forEach(k => sessionStorage.removeItem(k));

  Object.keys(sessionStorage).forEach(k => {
    if (k.startsWith('att_detail_') || k.startsWith('cie_detail_')) {
      sessionStorage.removeItem(k);
    }
  });

  sessionStorage.setItem(CONFIG.SKIP_AUTOLOGIN_KEY, '1');

  if ('caches' in window) {
    caches.keys().then(keys => {
      Promise.all(keys.map(x => caches.delete(x))).then(() => {
        navigate('/');
        window.location.reload();
      });
    });
  } else {
    navigate('/');
    window.location.reload();
  }
}

// ── Suggestions & Feedback ──
export function openSugModal(tab = 'send', push = true) {
  const textEl = document.getElementById('sug-modal-text');
  if (textEl) textEl.value = '';
  const formEl = document.getElementById('sug-modal-form');
  if (formEl) formEl.style.display = 'block';
  const successEl = document.getElementById('sug-modal-success');
  if (successEl) successEl.style.display = 'none';

  const m = document.getElementById('sug-modal');
  if (m) {
    m.style.display = 'flex';
    setTimeout(() => m.classList.add('active'), 10);
    if (push && history.state?.modal !== 'sug-modal') {
      history.pushState({ modal: 'sug-modal', route: getCurrentRoute() || 'dashboard' }, '', window.location.href);
    }
  }
  switchSugTab(tab);
}

export function closeSugModal(fromUi = true) {
  const m = document.getElementById('sug-modal');
  if (m) {
    m.classList.remove('active');
    setTimeout(() => (m.style.display = 'none'), 200);
  }
  if (fromUi && history.state?.modal === 'sug-modal') {
    history.back();
  }
}

export function switchSugTab(tab) {
  document.querySelectorAll('.sug-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  const sendTab = document.getElementById('sug-tab-send');
  const historyTab = document.getElementById('sug-tab-history');
  if (sendTab) sendTab.style.display = tab === 'send' ? 'block' : 'none';
  if (historyTab) historyTab.style.display = tab === 'history' ? 'block' : 'none';
  if (tab === 'history') loadSugHistory();
}

export async function submitSugModal() {
  const text = (document.getElementById('sug-modal-text')?.value || '').trim();
  if (!text) return;
  const btn = document.getElementById('sug-modal-submit');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Sending...';
  }

  const u = loadUser();
  const name = u.name || 'Anonymous';

  try {
    await api.submitSuggestion({ name, suggestion: text });
    const formEl = document.getElementById('sug-modal-form');
    const successEl = document.getElementById('sug-modal-success');
    if (formEl) formEl.style.display = 'none';
    if (successEl) successEl.style.display = 'block';
  } catch (e) {
    alert('Failed to send feedback.');
  }

  if (btn) {
    btn.disabled = false;
    btn.textContent = 'Submit';
  }
}

export async function loadSugHistory() {
  const token = getIdentityToken();

  const list = document.getElementById('sug-history-list');
  if (!list) return;

  if (!token) {
    list.innerHTML = '<div class="sug-history-empty">Log in to see your past suggestions.</div>';
    return;
  }

  try {
    const data = await api.getMySuggestions();
    const items = data.suggestions || [];
    if (!items.length) {
      list.innerHTML = '<div class="sug-history-empty">No suggestions sent yet.</div>';
      return;
    }

    list.innerHTML = items
      .map(s => {
        let replyHtml = '';
        if (s.admin_reply && s.admin_reply.trim()) {
          replyHtml = `
            <div class="sug-history-reply">
              <div class="sug-history-reply-label">Admin Reply</div>
              <div class="sug-history-reply-text">${escHtml(s.admin_reply)}</div>
            </div>`;
        } else {
          replyHtml = '<div class="sug-history-pending">Awaiting reply...</div>';
        }
        return `
          <div class="sug-history-card">
            <div class="sug-history-text">${escHtml(s.suggestion)}</div>
            <div class="sug-history-date">${fmtDate(s.created_at)}</div>
            ${replyHtml}
          </div>`;
      })
      .join('');

    api.markSuggestionsSeen().catch(() => {});
    const dot = document.getElementById('sug-unread-dot');
    if (dot) dot.style.display = 'none';
  } catch (e) {
    list.innerHTML = '<div class="sug-history-empty">Failed to load suggestions.</div>';
  }
}

export function closeSugToast() {
  const t = document.getElementById('sug-toast');
  if (t) t.classList.remove('show');
}

let appNoticeTimer = null;

export function showAppNoticeToast(title, message, duration = 8500) {
  const toast = document.getElementById('app-notice-toast');
  const titleEl = document.getElementById('app-notice-title');
  const msgEl = document.getElementById('app-notice-msg');
  if (!toast) return;

  if (titleEl) titleEl.textContent = title || 'Submission Already Pending';
  if (msgEl) msgEl.textContent = message || '';

  toast.style.display = 'flex';
  void toast.offsetWidth;

  if (appNoticeTimer) clearTimeout(appNoticeTimer);

  setTimeout(() => toast.classList.add('show'), 20);

  if (duration > 0) {
    appNoticeTimer = setTimeout(() => {
      closeAppNoticeToast();
    }, duration);
  }
}

export function closeAppNoticeToast() {
  const toast = document.getElementById('app-notice-toast');
  if (toast) {
    toast.classList.remove('show');
    setTimeout(() => {
      if (!toast.classList.contains('show')) {
        toast.style.display = 'none';
      }
    }, 400);
  }
  if (appNoticeTimer) {
    clearTimeout(appNoticeTimer);
    appNoticeTimer = null;
  }
}

export function checkSugUnread(force = false) {
  if (!force) {
    try {
      if (sessionStorage.getItem('sug_unread_checked') === '1') return;
    } catch (e) {}
  }

  const token = getIdentityToken();
  if (!token) return;

  try {
    sessionStorage.setItem('sug_unread_checked', '1');
  } catch (e) {}

  api
    .getUnreadSuggestions()
    .then(data => {
      if (data && data.unread && data.unread > 0) {
        const msg = data.unread === 1 ? 'You have a new reply to your feedback!' : `You have ${data.unread} new replies to your feedback!`;
        const msgEl = document.getElementById('sug-toast-msg');
        if (msgEl) msgEl.textContent = msg;
        const toast = document.getElementById('sug-toast');
        if (toast) {
          setTimeout(() => toast.classList.add('show'), 600);
          setTimeout(() => toast && toast.classList.remove('show'), 9500);
        }
        const dot = document.getElementById('sug-unread-dot');
        if (dot) dot.style.display = 'inline-block';
      }
    })
    .catch(() => {});
}

// ── PWA Installation ──
const PWA_SNOOZED_KEY = CONFIG.PWA_SNOOZED_KEY;
const PWA_IOS_SHOWN_KEY = CONFIG.PWA_IOS_SHOWN_KEY;
const SNOOZE_MS = 24 * 60 * 60 * 1000; // 24 hours
let deferredPrompt = null;

// Catch beforeinstallprompt as early as possible
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    if (typeof window._triggerPwaPrompt === 'function') {
      window._triggerPwaPrompt();
    }
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    const modal = document.getElementById('pwa-modal');
    if (modal) modal.classList.remove('active');
  });
}

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }
}

export function initPwa() {
  registerServiceWorker();

  // If already running standalone (installed PWA / home screen), never show popup
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                       window.navigator.standalone === true ||
                       (typeof document !== 'undefined' && document.referrer.includes('android-app://'));
  if (isStandalone) {
    // Apply safe-area body class for iOS standalone PWA (status bar overlap fix)
    document.body.classList.add('pwa-standalone');
    return;
  }

  const ua = (navigator.userAgent || '').toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  function ensureModal() {
    return document.getElementById('pwa-modal');
  }

  function isSnoozed() {
    const t = parseInt(localStorage.getItem(PWA_SNOOZED_KEY) || '0', 10);
    return t > 0 && (Date.now() - t < SNOOZE_MS);
  }

  function snooze() {
    try {
      localStorage.setItem(PWA_SNOOZED_KEY, Date.now().toString());
    } catch (e) {}
    hideModal();
  }

  function hideModal() {
    const modal = document.getElementById('pwa-modal');
    if (modal) modal.classList.remove('active');
  }

  function showModal() {
    const modal = ensureModal();
    if (!modal) return;
    setTimeout(() => {
      modal.classList.add('active');
    }, 2500);
  }

  // --- iOS Handling ---
  // iOS has no programmatic PWA install; show instructions once at start, and never show again.
  if (isIos) {
    const iosShown = localStorage.getItem(PWA_IOS_SHOWN_KEY);
    if (iosShown === '1') {
      return; // Never show again on iOS
    }

    const modal = ensureModal();
    const titleEl = document.getElementById('pwa-title');
    const subEl = document.getElementById('pwa-sub-text');
    const iosGuide = document.getElementById('pwa-ios-guide');
    const installBtn = document.getElementById('pwa-install-btn');
    const laterBtn = document.getElementById('pwa-later-btn');

    if (titleEl) titleEl.textContent = 'Install Student Hub';
    if (subEl) subEl.textContent = 'Install the app on your iPhone/iPad for a full-screen, app-like experience.';
    if (iosGuide) iosGuide.style.display = 'block';
    if (installBtn) {
      installBtn.textContent = 'Got It';
      installBtn.onclick = () => {
        try { localStorage.setItem(PWA_IOS_SHOWN_KEY, '1'); } catch (e) {}
        hideModal();
      };
    }
    if (laterBtn) {
      laterBtn.textContent = 'Close';
      laterBtn.onclick = () => {
        try { localStorage.setItem(PWA_IOS_SHOWN_KEY, '1'); } catch (e) {}
        hideModal();
      };
    }

    showModal();
    return;
  }

  // --- Desktop & Android Handling ---
  // Show prompt with 24-hour snooze support when clicked "Maybe later"
  function setupDesktopAndroid() {
    const modal = ensureModal();
    const installBtn = document.getElementById('pwa-install-btn');
    const laterBtn = document.getElementById('pwa-later-btn');

    if (installBtn) {
      installBtn.onclick = () => {
        if (!deferredPrompt) {
          hideModal();
          return;
        }
        hideModal();
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(result => {
          if (result && result.outcome !== 'accepted') {
            snooze();
          }
          deferredPrompt = null;
        }).catch(() => {});
      };
    }

    if (laterBtn) {
      laterBtn.onclick = snooze;
    }

    if (!isSnoozed() && deferredPrompt) {
      showModal();
    }
  }

  window._triggerPwaPrompt = function() {
    if (!isIos && !isStandalone && !isSnoozed()) {
      setupDesktopAndroid();
      showModal();
    }
  };

  setupDesktopAndroid();
}

// ── Helpers ──
export function escHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function toTitleCase(str) {
  return (str || '').replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
}

function fmtDate(d) {
  if (!d) return '';
  try {
    return new Date(d + 'Z').toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return d;
  }
}

// ── Cloudflare Turnstile — Solve Once on Homepage ────────────
// Solves Turnstile once, exchanges for a session token, caches it.
// All subsequent API calls use the cached session token (instant).

var _sessionTokenPromise = null;

export function getSessionToken() {
  try {
    var token = localStorage.getItem('nie_session_token') || '';
    if (!token) return '';
    // Token format: expiry.nonce.signature — check if expired
    var expiry = parseInt(token.split('.')[0], 10);
    if (isNaN(expiry) || Date.now() > expiry) {
      localStorage.removeItem('nie_session_token');
      return '';
    }
    return token;
  } catch (e) {
    return '';
  }
}

export function ensureHumanSession() {
  // Already have a valid token in storage
  if (getSessionToken()) return Promise.resolve();

  // Already in progress (avoid duplicate solves)
  if (_sessionTokenPromise) return _sessionTokenPromise;

  _sessionTokenPromise = new Promise(function(resolve) {
    // Wait for Turnstile script to load (up to 10s)
    var attempts = 0;

    function tryRender() {
      if (window.turnstile) {
        renderWidget();
        return;
      }
      attempts++;
      if (attempts >= 100) {
        console.warn('[TURNSTILE] Script did not load');
        resolve(); // Don't block the app
        return;
      }
      setTimeout(tryRender, 100);
    }

    function renderWidget() {
      var container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.bottom = '0';
      container.style.right = '0';
      container.style.zIndex = '-1';
      container.style.opacity = '0';
      container.style.pointerEvents = 'none';
      document.body.appendChild(container);

      var widgetId = window.turnstile.render(container, {
        sitekey: CONFIG.TURNSTILE_SITEKEY,
        action: 'session',
        callback: function(turnstileToken) {
          cleanup();
          exchangeForSession(turnstileToken).then(resolve);
        },
        'error-callback': function() {
          cleanup();
          console.warn('[TURNSTILE] Challenge failed');
          resolve(); // Don't block the app
        },
        'expired-callback': function() {
          cleanup();
          console.warn('[TURNSTILE] Token expired');
          resolve();
        }
      });

      function cleanup() {
        try { window.turnstile.remove(widgetId); } catch(e) {}
        try { container.remove(); } catch(e) {}
      }
    }

    tryRender();
  });

  _sessionTokenPromise.finally(function() { _sessionTokenPromise = null; });
  return _sessionTokenPromise;
}

async function exchangeForSession(turnstileToken) {
  try {
    var res = await fetch(api.getApiUrl('/api/verify-human'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: turnstileToken })
    });
    if (!res.ok) return;
    var data = await res.json();
    if (data.sessionToken) {
      try { localStorage.setItem('nie_session_token', data.sessionToken); } catch(e) {}
    }
  } catch (e) {
    console.warn('[TURNSTILE] Session exchange failed:', e.message);
  }
}

// Expose on window for easy inline event binding
if (typeof window !== 'undefined') {
  window.toggleTheme = toggleTheme;
  window.toggleDrawer = toggleDrawer;
  window.confirmLogout = confirmLogout;
  window.closeLogoutConfirm = closeLogoutConfirm;
  window.executeLogout = executeLogout;
  window.openSugModal = openSugModal;
  window.closeSugModal = closeSugModal;
  window.switchSugTab = switchSugTab;
  window.submitSugModal = submitSugModal;
  window.closeSugToast = closeSugToast;
  window.checkSugUnread = checkSugUnread;
  window.showAppNoticeToast = showAppNoticeToast;
  window.closeAppNoticeToast = closeAppNoticeToast;
}
