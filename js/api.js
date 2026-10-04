// ═══════════════════════════════════════════════════════════════
//  STUDENT HUB — API Client
// ═══════════════════════════════════════════════════════════════

import { CONFIG } from './config.js';
import { loadCreds, getStoredCookies, savePortalCookies, getSessionToken, ensureHumanSession } from './shared.js';

const API_BASE = CONFIG.API_BASE.replace(/\/$/, '');

function getAuthHeaders(extraHeaders = {}) {
  const headers = { ...extraHeaders };
  try {
    const token = localStorage.getItem(CONFIG.IDENTITY_TOKEN_KEY);
    if (token) {
      headers['X-Identity-Token'] = token;
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (e) {}
  try {
    const sessionToken = getSessionToken();
    if (sessionToken) {
      headers['X-Session-Token'] = sessionToken;
    }
  } catch (e) {}
  return headers;
}

async function ensureSession() {
  if (getSessionToken()) return;
  try {
    const it = localStorage.getItem(CONFIG.IDENTITY_TOKEN_KEY);
    if (it) return;
  } catch (e) {}
  try {
    await ensureHumanSession();
  } catch (e) {}
}

export const api = {
  getApiUrl(path) {
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    return API_BASE + cleanPath;
  },

  _checkPortalResponse(res) {
    if (res.status === 401) throw new Error('SESSION_EXPIRED');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  _checkMoodleResponse(data) {
    if (data && data.exception === 'moodle_exception' && data.errorcode === 'invalidtoken') {
      throw new Error('invalidtoken');
    }
    if (data && data.exception) throw new Error(data.message || data.exception);
    return data;
  },

  // ── Authentication / Parents Portal ──
  async login(creds) {
    await ensureSession();
    const fd = new FormData();
    fd.append('action', creds.action || 'login');
    fd.append('usn', (creds.usn || '').toUpperCase());
    fd.append('dob', creds.dob || '');
    fd.append('idType', creds.idType || '1');
    fd.append('code', creds.code || '');
    if (creds.sem) fd.append('sem', creds.sem);
    if (creds.cookies) fd.append('cookies', creds.cookies);
    const sessionToken = creds.sessionToken || getSessionToken();
    if (sessionToken) fd.append('session_token', sessionToken);

    const res = await fetch(this.getApiUrl('/auth'), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: fd
    });

    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');
      return data;
    }
    // If backend returns HTML fallback or text
    const text = await res.text();
    return { ok: res.ok, html: text };
  },

  // ── Session Resume / Auto-login for portal cookies ──
  async ensurePortalCookies() {
    // 1. Check sessionStorage (current tab session) with timestamp validation
    try {
      const session = JSON.parse(sessionStorage.getItem(CONFIG.ATT_SESSION_KEY) || '{}');
      if (session.cookies) {
        const creds = loadCreds();
        if (creds && creds.cookiesAt && (Date.now() - creds.cookiesAt <= 15 * 60 * 1000)) {
          return session.cookies;
        }
      }
    } catch (e) {}

    // 2. Check localStorage (persisted cookies, < 15 min old)
    const stored = getStoredCookies();
    if (stored) return stored;

    // 3. Auto-login with stored credentials
    const creds = loadCreds();
    if (!creds || !creds.usn || !creds.dob || !creds.code) return '';

    try {
      const loginPayload = {
        usn: creds.usn,
        dob: creds.dob,
        idType: creds.idType || '1',
        code: creds.code,
      };

      // Try resume with old cookies first (even if expired, backend handles fallback)
      if (creds.cookies) {
        loginPayload.action = 'resume';
        loginPayload.cookies = creds.cookies;
      } else {
        loginPayload.action = 'login';
        loginPayload.sessionToken = getSessionToken();
      }

      const res = await this.login(loginPayload);
      if (res.student && res.student.cookies) {
        savePortalCookies(res.student.cookies);
        sessionStorage.setItem(CONFIG.ATT_SESSION_KEY, JSON.stringify(res.student));
        if (res.identityToken) {
          localStorage.setItem(CONFIG.IDENTITY_TOKEN_KEY, res.identityToken);
        }
        return res.student.cookies;
      }
    } catch (e) {
      console.warn('Auto-login for portal cookies failed:', e.message);
    }

    return '';
  },

  async _postPortalForm(path, { cookies = '', courseId = '', secId = '', semId = '', sem = '' } = {}) {
    await ensureSession();
    const fd = new FormData();
    fd.append('cookies', cookies);
    fd.append('courseId', courseId);
    fd.append('secId', secId);
    fd.append('semId', semId);
    if (sem) fd.append('sem', sem);
    const res = await fetch(this.getApiUrl(path), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: fd
    });
    return this._checkPortalResponse(res);
  },

  getAttendanceDetail(params) {
    return this._postPortalForm('/attendance-detail', params);
  },

  getCieDetail(params) {
    return this._postPortalForm('/cie-detail', params);
  },

  async getExamHistory(params) {
    await ensureSession();
    const fd = new FormData();
    fd.append('cookies', params.cookies || '');
    if (params.sem) fd.append('sem', params.sem);

    const res = await fetch(this.getApiUrl('/exam-history'), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: fd
    });

    return this._checkPortalResponse(res);
  },

  // ── Hall Ticket ──
  async downloadHallTicket(params) {
    await ensureSession();
    const fd = new FormData();
    if (params.name) fd.append('name', params.name);

    if (params.bypass) {
      fd.append('bypass', 'true');
    } else {
      fd.append('dob', params.dob || '');
      fd.append('idType', params.idType || '1');
      fd.append('code', params.code || '');
      if (params.sem) fd.append('sem', params.sem);
    }

    const res = await fetch(this.getApiUrl('/api/hallticket'), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: fd
    });

    const ct = res.headers.get('Content-Type') || '';
    if (ct.includes('application/json')) {
      const data = await res.json();
      return { isJson: true, data };
    }
    if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
    const blob = await res.blob();
    return { isJson: false, blob };
  },

  // ── Moodle ──
  async moodleLogin(email, pass, name) {
    await ensureSession();
    const body = new URLSearchParams({
      username: email,
      password: pass,
      name: name || 'Anonymous'
    });

    const res = await fetch(this.getApiUrl('/api/moodle/login'), {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' }),
      body: body.toString()
    });

    let data;
    try {
      data = await res.json();
    } catch (e) {
      throw new Error('Invalid response from server');
    }
    if (!res.ok || data.error) throw new Error(data.error || 'Moodle login failed');
    return data;
  },

  async moodleCall(token, wsfunction, params = {}) {
    await ensureSession();
    const query = new URLSearchParams({
      wstoken: token,
      wsfunction: wsfunction,
      ...params
    });

    // Try through backend proxy first, fallback to direct Moodle if needed
    try {
      const proxyRes = await fetch(this.getApiUrl('/api/moodle/rest'), {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' }),
        body: query.toString()
      });
      const data = await proxyRes.json();
      return this._checkMoodleResponse(data);
    } catch (err) {
      if (err.message === 'invalidtoken') throw err;
      // Fallback: try direct fetch to Moodle
      try {
        const directUrl = 'https://moodlegurukul.nie.ac.in/webservice/rest/server.php?' + query.toString();
        const directRes = await fetch(directUrl);
        const data = await directRes.json();
        return this._checkMoodleResponse(data);
      } catch (fallbackErr) {
        throw fallbackErr;
      }
    }
  },

  getMoodleFileProxyUrl(fileurl, token, name, download = false) {
    const params = new URLSearchParams({
      url: fileurl,
      token: token,
      name: name || 'Anonymous'
    });
    try {
      const it = localStorage.getItem(CONFIG.IDENTITY_TOKEN_KEY);
      if (it) params.set('it', it);
    } catch (e) {}
    try {
      const st = getSessionToken();
      if (st) params.set('st', st);
    } catch (e) {}
    if (download) params.set('download', '1');
    return this.getApiUrl('/api/moodle/file?' + params.toString());
  },

  async getConfig() {
    try {
      await ensureSession();
      const res = await fetch(this.getApiUrl('/api/config'), { headers: getAuthHeaders() });
      if (!res.ok) return { hall_ticket_enabled: true };
      return await res.json();
    } catch (e) {
      return { hall_ticket_enabled: true };
    }
  },

  // ── Notices & Department ──
  async getNotices(force = false) {
    await ensureSession();
    const params = new URLSearchParams();
    if (force) params.set('force', 'true');

    const qs = params.toString();
    const res = await fetch(this.getApiUrl('/api/notices' + (qs ? '?' + qs : '')), {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async getDepartment(slug) {
    await ensureSession();
    const params = new URLSearchParams({ slug, tab: 'syllabus' });
    const res = await fetch(this.getApiUrl('/api/department?' + params.toString()), {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  // ── Suggestions & Feedback ──
  async submitSuggestion(data) {
    return this.post('/api/suggestions', data);
  },

  async getMySuggestions() {
    await ensureSession();
    const res = await fetch(this.getApiUrl('/api/suggestions/my'), {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async getUnreadSuggestions() {
    await ensureSession();
    const res = await fetch(this.getApiUrl('/api/suggestions/unread'), {
      headers: getAuthHeaders()
    });
    if (!res.ok) return { unread: 0 };
    return res.json();
  },

  async markSuggestionsSeen() {
    return this.post('/api/suggestions/mark-seen', {});
  },

  // ── Results & Leaderboard ──
  async getResultsPerformance(sessionToken) {
    await ensureSession();
    const headers = getAuthHeaders();
    if (sessionToken) headers['X-Session-Token'] = sessionToken;
    const res = await fetch(this.getApiUrl('/api/results/performance'), { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async post(path, data) {
    await ensureSession();
    const res = await fetch(this.getApiUrl(path), {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async getResults() {
    await ensureSession();
    const res = await fetch(this.getApiUrl('/api/results'), {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async getResultsStatus() {
    await ensureSession();
    const res = await fetch(this.getApiUrl('/api/results/status'), {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  // ── Timetable ──
  async uploadTimetable(file, metadata = {}) {
    await ensureSession();
    const fd = new FormData();
    if (file) fd.append('file', file);
    if (metadata.branch) fd.append('branch', metadata.branch);
    if (metadata.semester) fd.append('semester', metadata.semester);
    if (metadata.section) fd.append('section', metadata.section);
    if (metadata.batch) fd.append('batch', metadata.batch);
    if (metadata.editDescription) fd.append('editDescription', metadata.editDescription);

    const res = await fetch(this.getApiUrl('/api/timetable/upload'), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: fd
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const error = new Error(err.error || `Upload failed: HTTP ${res.status}`);
      error.status = res.status;
      error.alreadyPending = Boolean(err.alreadyPending);
      error.alreadyApproved = Boolean(err.alreadyApproved);
      error.alreadyExists = Boolean(err.alreadyExists);
      error.duplicateFile = Boolean(err.duplicateFile);
      throw error;
    }
    return res.json();
  },

  async getTimetable({ branch, semester, section } = {}) {
    await ensureSession();
    const params = new URLSearchParams();
    if (branch) params.set('branch', branch);
    if (semester) params.set('semester', semester);
    if (section) params.set('section', section);
    // Always attach timestamp cache-buster so browser HTTP disk cache and CDN proxies never serve stale timetable
    params.set('_t', Date.now().toString());

    const qs = params.toString();
    const res = await fetch(this.getApiUrl('/api/timetable' + (qs ? '?' + qs : '')), {
      headers: {
        ...getAuthHeaders(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      },
      cache: 'no-store'
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
};
