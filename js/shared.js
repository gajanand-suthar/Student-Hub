// ═══════════════════════════════════════════════════════════════
//  STUDENT HUB — Shared Frontend Logic
// ═══════════════════════════════════════════════════════════════

import { CONFIG } from './config.js';
import { api } from './api.js';

// ── Theme Management ──
export function initTheme() {
  try {
    const saved = localStorage.getItem(CONFIG.THEME_KEY);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
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

// ── Credentials Management ──
export function loadCreds() {
  try {
    return JSON.parse(localStorage.getItem(CONFIG.CRED_KEY));
  } catch (e) {
    return null;
  }
}

export function toggleCeDd() {
  const dd = document.getElementById('ce-idtype-dd');
  if (dd) dd.classList.toggle('open');
}

export function pickCeIdType(val, label, el) {
  const input = document.getElementById('ce-idtype');
  const labelEl = document.getElementById('ce-idtype-label');
  if (input) input.value = val;
  if (labelEl) labelEl.textContent = label;
  document.querySelectorAll('.ce-dd-opt').forEach(opt => opt.classList.remove('selected'));
  if (el) el.classList.add('selected');
  const dd = document.getElementById('ce-idtype-dd');
  if (dd) dd.classList.remove('open');
}

export function openCredsEditor() {
  const isMoodle = window.location.pathname.includes('/moodle');
  const attCol = document.getElementById('ce-att-col');
  const moodleCol = document.getElementById('ce-moodle-col');
  const modalCard = document.getElementById('creds-modal-card');
  const modalTitle = document.getElementById('ce-modal-title');

  if (isMoodle) {
    if (attCol) attCol.style.display = 'none';
    if (moodleCol) moodleCol.style.display = 'block';
    if (modalCard) modalCard.style.width = 'min(360px, 100%)';
    if (modalTitle) modalTitle.textContent = 'Moodle Settings';
  } else {
    if (attCol) attCol.style.display = 'block';
    if (moodleCol) moodleCol.style.display = 'none';
    if (modalCard) modalCard.style.width = 'min(360px, 100%)';
    if (modalTitle) modalTitle.textContent = 'Attendance Settings';
  }

  const c = loadCreds() || {};
  const usnEl = document.getElementById('ce-usn');
  const dobEl = document.getElementById('ce-dob');
  const codeEl = document.getElementById('ce-code');
  const mPrefix = document.getElementById('ce-moodle-prefix');
  const mPass = document.getElementById('ce-moodle-pass');

  if (usnEl) usnEl.value = c.usn || '';
  if (dobEl) dobEl.value = c.dob || '';
  if (codeEl) codeEl.value = c.code || '';

  const idt = c.idType || '1';
  const label = idt === '2' ? "Mother's Last 4 Digits" : idt === '5' ? "Guardian's Last 4 Digits" : "Father's Last 4 Digits";
  const el = document.querySelector(`.ce-dd-opt[onclick*="'${idt}'"]`);
  if (el) pickCeIdType(idt, label, el);

  const email = c.moodleEmail || '';
  if (mPrefix) mPrefix.value = email.split('@')[0];
  if (mPass) mPass.value = c.moodlePass || '';

  const errEl = document.getElementById('ce-err-code');
  if (errEl) errEl.style.display = 'none';

  const modal = document.getElementById('creds-modal');
  if (modal) modal.classList.add('active');
}

export function closeCredsEditor() {
  const modal = document.getElementById('creds-modal');
  if (modal) modal.classList.remove('active');
}

export function saveCredsEditor() {
  const isMoodle = window.location.pathname.includes('/moodle');
  const code = (document.getElementById('ce-code')?.value || '').trim();

  if (!isMoodle) {
    if (code.length !== 4 || !/^[0-9]{4}$/.test(code)) {
      const e = document.getElementById('ce-err-code');
      if (e) e.style.display = 'block';
      else alert('Verification code must be exactly 4 digits.');
      return;
    }
  }

  const errEl = document.getElementById('ce-err-code');
  if (errEl) errEl.style.display = 'none';

  const c = loadCreds() || {};
  c.usn = (document.getElementById('ce-usn')?.value || '').trim().toUpperCase();
  c.dob = document.getElementById('ce-dob')?.value || '';
  c.idType = document.getElementById('ce-idtype')?.value || '1';
  c.code = code;

  const pfxRaw = (document.getElementById('ce-moodle-prefix')?.value || '').trim();
  const pfx = pfxRaw.split('@')[0];
  c.moodleEmail = pfx ? pfx + '@nie.ac.in' : '';
  c.moodlePass = document.getElementById('ce-moodle-pass')?.value || '';

  localStorage.setItem(CONFIG.CRED_KEY, JSON.stringify(c));
  localStorage.removeItem(CONFIG.USER_KEY);
  localStorage.removeItem(CONFIG.TOKEN_KEY);
  localStorage.removeItem(CONFIG.COURSES_KEY);
  sessionStorage.removeItem('nie_att_cache_v2');

  closeCredsEditor();
  window.location.reload();
}

// ── Drawer Menu ──
export function toggleDrawer(open) {
  const overlay = document.getElementById('drawer-overlay');
  if (overlay) {
    overlay.classList.toggle('active', open);
    if (open) {
      const theme = document.documentElement.getAttribute('data-theme') || 'light';
      applyTheme(theme);
    }
  }
}

// ── Logout ──
export function confirmLogout() {
  toggleDrawer(false);
  const modal = document.getElementById('logout-confirm-modal');
  if (modal) modal.classList.add('active');
}

export function closeLogoutConfirm() {
  const modal = document.getElementById('logout-confirm-modal');
  if (modal) modal.classList.remove('active');
}

export function executeLogout() {
  [
    CONFIG.CRED_KEY,
    CONFIG.USER_KEY,
    CONFIG.TOKEN_KEY,
    CONFIG.COURSES_KEY,
    'nie_attendance_html_cache'
  ].forEach(k => localStorage.removeItem(k));

  sessionStorage.removeItem('nie_att_cache_v2');
  sessionStorage.setItem('nie_skip_autologin', '1');

  if ('caches' in window) {
    caches.keys().then(keys => {
      Promise.all(keys.map(x => caches.delete(x))).then(() => {
        window.location.replace(window.location.pathname.includes('/attendance') || window.location.pathname.includes('/moodle') ? '../' : './');
      });
    });
  } else {
    window.location.replace(window.location.pathname.includes('/attendance') || window.location.pathname.includes('/moodle') ? '../' : './');
  }
}

// ── Suggestions & Feedback ──
export function openSugModal(tab = 'send') {
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
  }
  switchSugTab(tab);
}

export function closeSugModal() {
  const m = document.getElementById('sug-modal');
  if (m) {
    m.classList.remove('active');
    setTimeout(() => (m.style.display = 'none'), 200);
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

  let name = 'Anonymous', usn = 'Unknown';
  try {
    const u = JSON.parse(localStorage.getItem(CONFIG.USER_KEY) || '{}');
    if (u.name) name = u.name;
    const c = JSON.parse(localStorage.getItem(CONFIG.CRED_KEY) || '{}');
    if (c.usn) usn = c.usn;
  } catch (e) {}

  try {
    await api.submitSuggestion({ name, usn, suggestion: text });
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
  let usn = '';
  try {
    const c = JSON.parse(localStorage.getItem(CONFIG.CRED_KEY) || '{}');
    const p = JSON.parse(localStorage.getItem(CONFIG.USER_KEY) || '{}');
    usn = (c.usn || p.usn || '').trim().toUpperCase();
  } catch (e) {}

  const list = document.getElementById('sug-history-list');
  if (!list) return;

  if (!usn) {
    list.innerHTML = '<div class="sug-history-empty">Log in to see your past suggestions.</div>';
    return;
  }

  try {
    const data = await api.getMySuggestions(usn);
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
          replyHtml = '<div class="sug-history-pending">⏳ Awaiting reply...</div>';
        }
        return `
          <div class="sug-history-card">
            <div class="sug-history-text">${escHtml(s.suggestion)}</div>
            <div class="sug-history-date">${fmtDate(s.created_at)}</div>
            ${replyHtml}
          </div>`;
      })
      .join('');

    api.markSuggestionsSeen(usn).catch(() => {});
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

export function checkSugUnread() {
  let usn = '';
  try {
    const c = JSON.parse(localStorage.getItem(CONFIG.CRED_KEY) || '{}');
    const p = JSON.parse(localStorage.getItem(CONFIG.USER_KEY) || '{}');
    usn = (c.usn || p.usn || '').trim().toUpperCase();
  } catch (e) {}
  if (!usn) return;

  api
    .getUnreadSuggestions(usn)
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
const PWA_SNOOZED_KEY = 'nie_hub_pwa_snoozed';
const PWA_IOS_SHOWN_KEY = 'nie_hub_pwa_ios_shown';
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
    const isSub = window.location.pathname.includes('/attendance') ||
                  window.location.pathname.includes('/moodle') ||
                  window.location.pathname.includes('/results') ||
                  window.location.pathname.includes('/admin');
    const swPath = isSub ? '../sw.js' : './sw.js';
    navigator.serviceWorker.register(swPath).catch(() => {
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
  if (isStandalone) return;

  const ua = (navigator.userAgent || '').toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  function ensureModal() {
    let modal = document.getElementById('pwa-modal');
    if (!modal) {
      const container = document.createElement('div');
      container.id = 'pwa-modal';
      container.innerHTML = `
        <div class="pwa-card">
          <div class="pwa-app-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
              <rect width="512" height="512" fill="#2563eb" rx="120"/>
              <g transform="translate(256,256) scale(0.55) translate(-256,-256)">
                <rect x="64" y="64" width="171" height="171" rx="43" fill="#fff"/>
                <rect x="277" y="64" width="171" height="107" rx="43" fill="#fff"/>
                <rect x="277" y="213" width="171" height="235" rx="43" fill="#fff"/>
                <rect x="64" y="277" width="171" height="171" rx="43" fill="#fff"/>
              </g>
            </svg>
          </div>
          <div class="pwa-title" id="pwa-title">Install Student Hub</div>
          <div class="pwa-sub" id="pwa-sub-text">Add to your home screen for instant access.</div>
          <div id="pwa-ios-guide" style="display: none; text-align: left; background: var(--bg); padding: 12px 14px; border-radius: 12px; margin-bottom: 18px; font-size: 0.82rem; line-height: 1.6; border: 1px solid var(--border);">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
              <span style="font-weight: 700; color: var(--accent); width: 20px; height: 20px; border-radius: 50%; background: rgba(37,99,235,0.12); display: inline-flex; align-items: center; justify-content: center; font-size: 0.75rem; flex-shrink: 0;">1</span>
              <span>Tap the <strong>Share</strong> button in Safari (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -1px;"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>)</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
              <span style="font-weight: 700; color: var(--accent); width: 20px; height: 20px; border-radius: 50%; background: rgba(37,99,235,0.12); display: inline-flex; align-items: center; justify-content: center; font-size: 0.75rem; flex-shrink: 0;">2</span>
              <span>Scroll down &amp; tap <strong>&quot;Add to Home Screen&quot;</strong></span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-weight: 700; color: var(--accent); width: 20px; height: 20px; border-radius: 50%; background: rgba(37,99,235,0.12); display: inline-flex; align-items: center; justify-content: center; font-size: 0.75rem; flex-shrink: 0;">3</span>
              <span>Tap <strong>Add</strong> in the top right</span>
            </div>
          </div>
          <button class="pwa-install-btn" id="pwa-install-btn">Install</button>
          <button class="pwa-later-btn" id="pwa-later-btn">Maybe later</button>
        </div>
      `;
      document.body.appendChild(container);
      modal = container;
    }
    return modal;
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

    if (titleEl) titleEl.textContent = 'Add to Home Screen';
    if (subEl) subEl.textContent = 'Add Student Hub to your iPhone/iPad for instant, fast access.';
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
function escHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

// Expose on window for easy inline event binding
if (typeof window !== 'undefined') {
  window.toggleTheme = toggleTheme;
  window.openCredsEditor = openCredsEditor;
  window.closeCredsEditor = closeCredsEditor;
  window.saveCredsEditor = saveCredsEditor;
  window.toggleCeDd = toggleCeDd;
  window.pickCeIdType = pickCeIdType;
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
}
