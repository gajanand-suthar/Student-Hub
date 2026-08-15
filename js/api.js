// ═══════════════════════════════════════════════════════════════
//  STUDENT HUB — API Client
// ═══════════════════════════════════════════════════════════════

import { CONFIG } from './config.js';

export const api = {
  getApiUrl(path) {
    const base = CONFIG.API_BASE.replace(/\/$/, '');
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    return base + cleanPath;
  },

  // ── Authentication / Parents Portal ──
  async login(creds) {
    const fd = new FormData();
    fd.append('action', creds.action || 'login');
    fd.append('usn', (creds.usn || '').toUpperCase());
    fd.append('dob', creds.dob || '');
    fd.append('idType', creds.idType || '1');
    fd.append('code', creds.code || '');
    if (creds.sem) fd.append('sem', creds.sem);
    if (creds.cookies) fd.append('cookies', creds.cookies);

    const res = await fetch(this.getApiUrl('/auth'), {
      method: 'POST',
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

  async getAttendanceDetail(params) {
    const fd = new FormData();
    fd.append('cookies', params.cookies || '');
    fd.append('courseId', params.courseId);
    fd.append('secId', params.secId || '');
    fd.append('semId', params.semId);
    if (params.sem) fd.append('sem', params.sem);

    const res = await fetch(this.getApiUrl('/attendance-detail'), {
      method: 'POST',
      body: fd
    });

    if (res.status === 401) throw new Error('SESSION_EXPIRED');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async getCieDetail(params) {
    const fd = new FormData();
    fd.append('cookies', params.cookies || '');
    fd.append('courseId', params.courseId);
    fd.append('secId', params.secId || '');
    fd.append('semId', params.semId);
    if (params.sem) fd.append('sem', params.sem);

    const res = await fetch(this.getApiUrl('/cie-detail'), {
      method: 'POST',
      body: fd
    });

    if (res.status === 401) throw new Error('SESSION_EXPIRED');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async getExamHistory(params) {
    const fd = new FormData();
    fd.append('cookies', params.cookies || '');
    fd.append('usn', (params.usn || '').toUpperCase());
    if (params.sem) fd.append('sem', params.sem);

    const res = await fetch(this.getApiUrl('/exam-history'), {
      method: 'POST',
      body: fd
    });

    if (res.status === 401) throw new Error('SESSION_EXPIRED');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  // ── Hall Ticket ──
  async downloadHallTicket(params) {
    const fd = new FormData();
    fd.append('usn', (params.usn || '').toUpperCase());
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
  async moodleLogin(email, pass, name, usn) {
    const body = new URLSearchParams({
      username: email,
      password: pass,
      name: name || 'Anonymous',
      usn: usn || 'Unknown'
    });

    const res = await fetch(this.getApiUrl('/api/moodle/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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
    const query = new URLSearchParams({
      wstoken: token,
      wsfunction: wsfunction,
      moodlewsrestformat: 'json',
      ...params
    });

    // Try through backend proxy first, fallback to direct Moodle if needed
    try {
      const proxyRes = await fetch(this.getApiUrl('/api/moodle/rest'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: query.toString()
      });
      const data = await proxyRes.json();
      if (data && data.exception === 'moodle_exception' && data.errorcode === 'invalidtoken') {
        throw new Error('invalidtoken');
      }
      if (data && data.exception) throw new Error(data.message || data.exception);
      return data;
    } catch (err) {
      if (err.message === 'invalidtoken') throw err;
      // Fallback: try direct fetch to Moodle
      try {
        const directUrl = 'https://moodlegurukul.nie.ac.in/webservice/rest/server.php?' + query.toString();
        const directRes = await fetch(directUrl);
        const data = await directRes.json();
        if (data && data.exception === 'moodle_exception' && data.errorcode === 'invalidtoken') {
          throw new Error('invalidtoken');
        }
        if (data && data.exception) throw new Error(data.message || data.exception);
        return data;
      } catch (fallbackErr) {
        throw err || fallbackErr;
      }
    }
  },

  getMoodleFileProxyUrl(fileurl, token, name, usn, download = false) {
    const params = new URLSearchParams({
      url: fileurl,
      token: token,
      name: name || 'Anonymous',
      usn: usn || 'Unknown'
    });
    if (download) params.set('download', '1');
    return this.getApiUrl('/api/moodle/file?' + params.toString());
  },

  async getConfig() {
    try {
      const res = await fetch(this.getApiUrl('/api/config'));
      if (!res.ok) return { hall_ticket_enabled: true };
      return await res.json();
    } catch (e) {
      return { hall_ticket_enabled: true };
    }
  },

  // ── Notices & Department ──
  async getNotices(force = false, usn = '', name = '') {
    const params = new URLSearchParams();
    if (force) params.set('force', 'true');
    if (usn) params.set('usn', usn);
    if (name) params.set('name', name);

    const res = await fetch(this.getApiUrl('/api/notices?' + params.toString()));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async getDepartment(slug, tab, usn = '', name = '') {
    const params = new URLSearchParams({
      slug: slug,
      tab: tab || 'syllabus',
      usn: usn,
      name: name
    });
    const res = await fetch(this.getApiUrl('/api/department?' + params.toString()));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  // ── Suggestions & Feedback ──
  async submitSuggestion(data) {
    const res = await fetch(this.getApiUrl('/api/suggestions'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async getMySuggestions(usn) {
    const res = await fetch(this.getApiUrl('/api/suggestions/my?usn=' + encodeURIComponent(usn)));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async getUnreadSuggestions(usn) {
    const res = await fetch(this.getApiUrl('/api/suggestions/unread?usn=' + encodeURIComponent(usn)));
    if (!res.ok) return { unread: 0 };
    return res.json();
  },

  async markSuggestionsSeen(usn) {
    const res = await fetch(this.getApiUrl('/api/suggestions/mark-seen'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usn: usn })
    });
    return res.json();
  },

  // ── Results & Leaderboard ──
  async getResultsPerformance(usn) {
    const res = await fetch(this.getApiUrl('/api/results/performance?usn=' + encodeURIComponent(usn)));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async post(path, data) {
    const res = await fetch(this.getApiUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async getResults(branch = '', batch = '') {
    const params = new URLSearchParams();
    if (branch) params.set('branch', branch);
    if (batch) params.set('batch', batch);

    const res = await fetch(this.getApiUrl('/api/results?' + params.toString()));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async getResultsStatus() {
    const res = await fetch(this.getApiUrl('/api/results/status'));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
};
