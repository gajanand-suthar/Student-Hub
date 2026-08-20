// ═══════════════════════════════════════════════════════════════
//  STUDENT HUB — Attendance & CIE Client Logic
// ═══════════════════════════════════════════════════════════════

import { CONFIG } from './config.js';
import { api } from './api.js';
import { loadCreds, escHtml } from './shared.js';
import { navigate } from './router.js';

let sgpaLoaded = false;
let currentStudentData = null;
let currentSgpaData = null;
let currentExplicitSem = null;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function initAttendance() {
  const creds = loadCreds();
  if (!creds || !creds.usn) {
    navigate('/');
    return;
  }

  // 1. In-memory check: if already loaded in this session, render instantly
  if (currentStudentData && currentStudentData.usn === creds.usn && currentStudentData.attendance) {
    renderStudentView(currentStudentData);
    return;
  }

  // 2. Session cache check (persists only for current tab/PWA browser session)
  let sessionAtt = null;
  try {
    sessionAtt = JSON.parse(sessionStorage.getItem(CONFIG.ATT_SESSION_KEY));
  } catch (e) {}

  if (sessionAtt && sessionAtt.usn === creds.usn && sessionAtt.attendance) {
    currentStudentData = sessionAtt;
    renderStudentView(sessionAtt);
    return;
  }

  // 3. First visit in this session: perform login & fetch fresh live data once
  fetchAttendanceData(true);
}

export async function fetchAttendanceData(showLoading = true, explicitSem = null) {
  closeAttModal();
  const creds = loadCreds();
  if (!creds || !creds.usn) return;

  if (explicitSem) currentExplicitSem = explicitSem;

  const overlay = document.getElementById('refresh-overlay');
  if (showLoading && overlay) overlay.classList.add('active');

  try {
    const payload = {
      action: 'login',
      usn: creds.usn,
      dob: creds.dob,
      idType: creds.idType,
      code: creds.code
    };
    if (currentExplicitSem) payload.sem = currentExplicitSem;

    const res = await api.login(payload);

    if (res && res.student) {
      currentStudentData = res.student;
      // Cache attendance for this particular session only
      try {
        sessionStorage.setItem(CONFIG.ATT_SESSION_KEY, JSON.stringify(res.student));
      } catch (e) {}

      // Persist student profile in localStorage for app functionality (greeting, calendar, notices)
      try {
        const profile = {
          name: res.student.name,
          usn: res.student.usn,
          program: res.student.program,
          semNum: res.student.semNum || '',
          section: res.student.section || '',
          photoUri: res.student.photoUri || null,
          sem: res.student.sem || ''
        };
        localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(profile));
      } catch (e) {}

      renderStudentView(res.student);
    }
  } catch (err) {
    if (showLoading) {
      alert('Could not fetch attendance data: ' + err.message);
    }
  } finally {
    if (overlay) overlay.classList.remove('active');
  }
}

export function renderStudentView(data) {
  if (!data) return;
  const name = data.name || 'Student';
  const usn = data.usn || '';
  const program = data.program || '';
  const attendance = data.attendance || [];
  const cie = data.cie || [];
  const cieLinks = data.cieLinks || {};

  // Student Info Face
  const nameEl = document.getElementById('stu-name-el');
  const usnEl = document.getElementById('stu-usn-el');
  const progEl = document.getElementById('stu-prog-el');
  if (nameEl) nameEl.textContent = name;
  if (usnEl) usnEl.textContent = usn;
  if (progEl) progEl.textContent = program;

  // Sync drawer semester UI dynamically to match semester returned from backend
  if (data.sem) {
    const attSemInput = document.getElementById('att-sem');
    if (attSemInput) attSemInput.value = data.sem;
    const btnEven = document.getElementById('m-sem-even');
    const btnOdd = document.getElementById('m-sem-odd');
    if (btnEven && btnOdd) {
      btnEven.classList.toggle('active', data.sem === 'even');
      btnOdd.classList.toggle('active', data.sem === 'odd');
    }
  }

  // Photo
  const photoSlot = document.getElementById('photo-slot') || document.getElementById('stu-photo-wrap');
  const initials = name.split(' ').slice(0, 2).map(w => w[0] || '').join('');
  if (photoSlot) {
    if (data.photoUri) {
      const fullPhotoUrl = data.photoUri.startsWith('http') || data.photoUri.startsWith('data:')
        ? data.photoUri
        : api.getApiUrl(data.photoUri);
      photoSlot.innerHTML = `
        <div class="photo-wrap">
          <div class="photo-skel">${escHtml(initials)}</div>
          <img src="${fullPhotoUrl}" class="student-photo" alt="${escHtml(name)}" onload="this.classList.add('loaded')" onerror="this.style.display='none'"/>
        </div>`;
    } else {
      photoSlot.innerHTML = `<div class="student-photo-ph">${escHtml(initials)}</div>`;
    }
  }

  // Attendance Rows
  const sortedAtt = [...attendance].sort((a, b) => a.pct - b.pct);
  let attHtml = '';
  if (!sortedAtt.length) {
    attHtml = '<p class="empty-panel">No attendance records found.</p>';
  } else {
    attHtml = sortedAtt
      .map(s => {
        let barColor = '#3b82f6', textColor = '#1d4ed8';
        if (s.pct < 75) { barColor = '#ef4444'; textColor = '#dc2626'; }
        else if (s.pct < 85) { barColor = '#f59e0b'; textColor = '#b45309'; }

        const safeName = escHtml(s.name);
        const safeCode = escHtml(s.code);
        const params = cieLinks[s.code] || {};
        return `
          <div class="cr" data-code="${safeCode}" data-name="${safeName}" data-pct="${s.pct}" data-courseid="${escHtml(params.courseId || '')}" data-secid="${escHtml(params.secId || '')}" data-semid="${escHtml(params.semId || '')}" onclick="showAttendanceDetail('${safeCode}')">
            <div class="cr-label"><span class="cr-name">${safeName}</span></div>
            <div class="cr-track">
              <div class="cr-fill" style="width:${Math.max(s.pct, 2)}%; background:${barColor}"></div>
              <div class="cr-mark" style="left:75%"></div>
              <div class="cr-mark" style="left:85%"></div>
            </div>
            <div class="cr-pill" style="background:${barColor}1a; color:${textColor}; border-color:${barColor}55">
              ${s.pct}%<span class="cr-pill-arrow">›</span>
            </div>
          </div>`;
      })
      .join('');
  }

  const attMobile = document.getElementById('att-rows-container');
  const attDesk = document.getElementById('desk-att-rows');
  if (attMobile) attMobile.innerHTML = attHtml;
  if (attDesk) attDesk.innerHTML = attHtml;

  // CIE Breakdown
  let cieHtml = '';
  if (!cie.length) {
    cieHtml = '<div class="empty-panel">No CIE data found.</div>';
  } else {
    cieHtml = cie
      .map(subject => {
        const params = cieLinks[subject.code] || {};
        const scoreLabel = subject.marks > 0 ? String(subject.marks) : '—';
        return `
          <details class="bd-item" data-code="${escHtml(subject.code)}" data-courseid="${escHtml(params.courseId || '')}" data-secid="${escHtml(params.secId || '')}" data-semid="${escHtml(params.semId || '')}" ontoggle="onCieItemToggle(this)">
            <summary>
              <div class="bd-left"><span class="bd-name">${escHtml(subject.name)}</span></div>
              <div class="bd-right">
                <span class="bd-pill bd-pill-main">${escHtml(scoreLabel)}</span>
                <span class="bd-chevron">›</span>
              </div>
            </summary>
            <div class="bd-body"></div>
          </details>`;
      })
      .join('');
  }

  const cieMobile = document.getElementById('cie-accordion-container');
  const cieDesk = document.getElementById('desk-cie-accordion');
  if (cieMobile) cieMobile.innerHTML = cieHtml;
  if (cieDesk) cieDesk.innerHTML = cieHtml;

  // Restore cached SGPA data if present in session storage
  if (!currentSgpaData) {
    try {
      const cached = JSON.parse(sessionStorage.getItem('student_sgpa_cache'));
      if (cached && cached.semesters && cached.semesters.length) {
        currentSgpaData = cached;
      }
    } catch (e) {}
  }

  if (currentSgpaData) {
    renderSgpaChip(currentSgpaData);
  } else {
    sgpaLoaded = false;
    const sgpaSlot = document.getElementById('sgpa-slot');
    if (sgpaSlot) {
      sgpaSlot.innerHTML = `
        <button class="sgpa-fetch-btn" id="sgpa-fetch-btn" onclick="event.stopPropagation(); fetchSgpa(event);">
          <span class="sgpa-fetch-label">Avg SGPA</span>
          <span class="sgpa-fetch-sub">Tap to view</span>
        </button>`;
    }
  }
}

export function switchTab(id, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  const panel = document.getElementById('tab-' + id);
  if (panel) panel.classList.add('active');
}

export function flipCard() {
  const inner = document.getElementById('flip-inner');
  if (!inner) return;

  if (sgpaLoaded) {
    inner.classList.toggle('flipped');
  } else {
    fetchSgpa();
  }
}

export async function fetchSgpa(e) {
  if (e) e.stopPropagation();

  // Check session storage first
  try {
    const cached = JSON.parse(sessionStorage.getItem('student_sgpa_cache'));
    if (cached && cached.semesters && cached.semesters.length) {
      renderSgpaChip(cached);
      return;
    }
  } catch (e) {}

  const btn = document.getElementById('sgpa-fetch-btn');
  if (btn) {
    if (btn.disabled) return;
    btn.disabled = true;
    btn.innerHTML = '<div style="width:16px;height:16px;border:2px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin .6s linear infinite;margin:4px auto"></div>';
  }

  const creds = loadCreds();
  const usn = creds?.usn || '';
  const cookies = currentStudentData?.cookies || '';
  const sem = currentExplicitSem || currentStudentData?.sem;

  try {
    const json = await api.getExamHistory({ cookies, usn, sem });
    renderSgpaChip(json);
  } catch (err) {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span class="sgpa-fetch-label">Avg SGPA</span><span class="sgpa-fetch-sub" style="color:var(--danger)">Retry</span>';
    }
  }
}

function renderSgpaChip(data) {
  const sgpaSlot = document.getElementById('sgpa-slot');
  const backSlot = document.getElementById('sgpa-back-slot');

  if (!data || !data.semesters || !data.semesters.length || data.cgpa === null) {
    if (sgpaSlot) {
      sgpaSlot.innerHTML = `
        <div class="sgpa-chip" style="color:var(--muted);background:var(--bg);border-color:var(--border)">
          <span class="sgpa-fetch-label">Avg SGPA</span>
          <span class="sgpa-chip-val" style="font-size:1rem">—</span>
          <span class="sgpa-chip-hint">not available</span>
        </div>`;
    }
    return;
  }

  const { semesters, cgpa } = data;
  let chipColor = '#16a34a', chipBg = '#f0fdf4', chipBorder = '#bbf7d0', chipDark = 'green';
  if (cgpa < 6) { chipColor = '#dc2626'; chipBg = '#fff1f2'; chipBorder = '#fecdd3'; chipDark = 'red'; }
  else if (cgpa < 7.5) { chipColor = '#b45309'; chipBg = '#fffbeb'; chipBorder = '#fde68a'; chipDark = 'amber'; }

  if (sgpaSlot) {
    sgpaSlot.innerHTML = `
      <div class="sgpa-chip" data-color="${chipDark}" style="color:${chipColor};background:${chipBg};border-color:${chipBorder}">
        <span class="sgpa-fetch-label">Avg SGPA</span>
        <span class="sgpa-chip-val">${cgpa.toFixed(2)}</span>
        <span class="sgpa-chip-hint">tap to flip</span>
      </div>`;
  }

  const semMap = {};
  semesters.forEach(s => (semMap[s.sem] = s.sgpa));
  const yearDefs = [
    { label: '1st Yr', sems: [1, 2] },
    { label: '2nd Yr', sems: [3, 4] },
    { label: '3rd Yr', sems: [5, 6] },
    { label: '4th Yr', sems: [7, 8] }
  ];

  function makeSemBox(sem) {
    const val = semMap[sem];
    const lbl = sem % 2 === 1 ? 'Odd' : 'Even';
    if (val === undefined) {
      return `<div class="sgpa-sem-box empty"><span class="sgpa-sem-row">${lbl}</span><span class="sgpa-sem-val">—</span></div>`;
    }
    let col = '#2563eb', bg = '#eff6ff', bdr = '#bfdbfe', dk = 'blue';
    if (val < 6) { col = '#dc2626'; bg = '#fff1f2'; bdr = '#fecdd3'; dk = 'red'; }
    else if (val < 7.5) { col = '#b45309'; bg = '#fffbeb'; bdr = '#fde68a'; dk = 'amber'; }
    else if (val >= 9) { col = '#16a34a'; bg = '#f0fdf4'; bdr = '#bbf7d0'; dk = 'green'; }
    return `<div class="sgpa-sem-box" data-color="${dk}" style="color:${col};background:${bg};border-color:${bdr}"><span class="sgpa-sem-row">${lbl}</span><span class="sgpa-sem-val">${val.toFixed(2)}</span></div>`;
  }

  let gridHtml = '<div class="sgpa-grid">';
  yearDefs.forEach(yr => {
    gridHtml += `<div class="sgpa-year-col"><div class="sgpa-yr-label">${yr.label}</div><div class="sgpa-year-boxes">${makeSemBox(yr.sems[0])}${makeSemBox(yr.sems[1])}</div></div>`;
  });
  gridHtml += '</div>';

  if (backSlot) backSlot.innerHTML = gridHtml;
  sgpaLoaded = true;
  currentSgpaData = data;
  try {
    sessionStorage.setItem('student_sgpa_cache', JSON.stringify(data));
  } catch (e) {}

  const flipWrap = document.getElementById('flip-wrap');
  if (flipWrap) flipWrap.style.cursor = 'pointer';
}

export async function onCieItemToggle(detailEl) {
  if (!detailEl || !detailEl.open || detailEl.dataset.loaded === '1' || detailEl.dataset.loading === '1') return;
  const courseId = detailEl.dataset.courseid;
  const secId = detailEl.dataset.secid;
  const semId = detailEl.dataset.semid;
  const cookies = currentStudentData?.cookies || '';
  const body = detailEl.querySelector('.bd-body');
  if (!courseId || !semId || !body) return;

  const cacheKey = `cie_detail_${courseId}_${semId}`;

  // Check session cache for CIE split
  try {
    const cached = JSON.parse(sessionStorage.getItem(cacheKey));
    if (cached && cached.components) {
      body.innerHTML = renderCieBreakdownBody(cached);
      detailEl.dataset.loaded = '1';
      return;
    }
  } catch (e) {}

  detailEl.dataset.loading = '1';
  body.innerHTML = '<div style="text-align:center;padding:8px 0"><div class="big-spinner" style="margin:0 auto;width:20px;height:20px;border-width:2px"></div></div>';

  const sem = currentExplicitSem || currentStudentData?.sem;

  try {
    const json = await api.getCieDetail({ cookies, courseId, secId, semId, sem });
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify(json));
    } catch (e) {}
    body.innerHTML = renderCieBreakdownBody(json);
    detailEl.dataset.loaded = '1';
  } catch (err) {
    if (err.message === 'SESSION_EXPIRED') {
      body.innerHTML =
        '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:12px 8px;text-align:center">'
        + '<div style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;color:var(--accent)"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></div>'
        + '<div style="font-weight:800;font-size:.85rem;color:var(--text)">Session expired</div>'
        + '<button onclick="refreshData()" style="background:var(--accent);color:#fff;border:none;border-radius:8px;padding:8px 16px;font-weight:700;font-size:.8rem;cursor:pointer">Refresh</button>'
        + '</div>';
      return;
    }
    body.innerHTML = `<div class="cie-detail-placeholder">Failed to load split: ${escHtml(err.message)}</div>`;
  } finally {
    detailEl.dataset.loading = '0';
  }
}

function renderCieBreakdownBody(detail) {
  if (!detail || !detail.components || !detail.components.length) {
    return '<div class="cie-detail-placeholder">No split uploaded yet.</div>';
  }
  return detail.components
    .map(comp => {
      const obtPct = comp.max > 0 ? Math.round((comp.obtained / comp.max) * 100) : 0;
      const avgPct = comp.max > 0 ? Math.round((comp.classAvg / comp.max) * 100) : 0;
      let fillColor = '#3b82f6';
      if (obtPct === 0) fillColor = '#e2e8f0';
      else if (obtPct < 40) fillColor = '#ef4444';
      else if (obtPct < 60) fillColor = '#f59e0b';

      const compLabel = comp.max > 0 ? `${comp.obtained}/${comp.max}` : '—';
      const labelColor = obtPct === 0 ? '#94a3b8' : fillColor;
      const avgBadge = avgPct > 0 ? `<div class="comp-avg-badge" style="left:${avgPct}%">${escHtml(String(comp.classAvg))}</div>` : '';

      return `
        <div class="comp-row">
          <div class="comp-meta"><span class="comp-name">${escHtml(comp.name)}</span><span class="comp-val" style="color:${labelColor}">${escHtml(compLabel)}</span></div>
          <div class="comp-track"><div class="comp-fill" style="width:${obtPct}%;background:${fillColor}"></div>${avgBadge}</div>
        </div>`;
    })
    .join('');
}

export async function showAttendanceDetail(code) {
  const row = document.querySelector(`.cr[data-code="${code}"]`);
  if (!row) return;
  const courseId = row.dataset.courseid;
  const secId = row.dataset.secid;
  const semId = row.dataset.semid;
  const cookies = currentStudentData?.cookies || '';
  const subjectName = row.dataset.name || code;

  const modal = document.getElementById('att-modal');
  const title = document.getElementById('att-modal-title');
  const body = document.getElementById('att-modal-body');
  if (!modal || !title || !body) return;

  title.textContent = subjectName;

  const cacheKey = `att_detail_${code}_${courseId}`;

  // Check session cache first
  try {
    const cached = JSON.parse(sessionStorage.getItem(cacheKey));
    if (cached && (cached.present || cached.absent || cached.counts)) {
      renderAttendanceModal(cached);
      modal.style.display = 'flex';
      return;
    }
  } catch (e) {}

  body.innerHTML = '<div style="text-align:center;padding:32px 0"><div class="big-spinner" style="margin:0 auto"></div></div>';
  modal.style.display = 'flex';

  const sem = currentExplicitSem || currentStudentData?.sem;

  try {
    const json = await api.getAttendanceDetail({ cookies, courseId, secId, semId, sem });
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify(json));
    } catch (e) {}
    renderAttendanceModal(json);
  } catch (err) {
    if (err.message === 'SESSION_EXPIRED') {
      body.innerHTML =
        '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:36px 20px;text-align:center">'
        + '<div style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;color:var(--accent)"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></div>'
        + '<div style="font-weight:800;font-size:.95rem;color:var(--text)">Session expired</div>'
        + '<div style="font-size:.82rem;color:var(--muted);max-width:260px;line-height:1.5">Someone logged in on another device. Refresh to restore your session.</div>'
        + '<button onclick="refreshData()" style="margin-top:4px;background:var(--accent);color:#fff;border:none;border-radius:10px;padding:10px 24px;font-weight:700;font-size:.88rem;cursor:pointer">Refresh</button>'
        + '</div>';
      return;
    }
    body.innerHTML = `<div style="padding:28px;text-align:center;color:var(--muted);font-size:.85rem">Failed to load details.<br><span style="font-size:.75rem">${escHtml(err.message)}</span></div>`;
  }
}

function renderAttendanceModal(data) {
  const { present = [], absent = [], counts = {} } = data;
  const body = document.getElementById('att-modal-body');
  if (!body) return;

  const total = counts.total || (present.length + absent.length);
  const attended = counts.attended !== undefined ? counts.attended : present.length;
  const missed = counts.missed !== undefined ? counts.missed : absent.length;
  const curPct = total > 0 ? (attended / total) * 100 : 0;

  // Bunk Math
  const b85 = Math.max(0, Math.floor(attended / 0.85 - total));
  const b75 = Math.max(0, Math.floor(attended / 0.75 - total));
  const r85 = Math.max(0, Math.ceil((0.85 * total - attended) / 0.15));
  const r75 = Math.max(0, Math.ceil((0.75 * total - attended) / 0.25));

  function makeCard(target, bunk, req, clr) {
    const isSafe = curPct >= target;
    const badgeTxt = isSafe ? 'SAFE' : 'ACTION REQUIRED';
    const num = isSafe ? bunk : req;
    const actionLabel = isSafe ? 'can miss' : 'must attend';
    const sub = isSafe ? `to stay above ${target}%` : `to reach ${target}%`;

    return `
      <div class="att-goal-card" style="border-top:3px solid ${clr}">
        <div class="att-goal-card-head">
          <span style="font-weight:700;font-size:.82rem">${target}% Target</span>
          <span style="font-size:.65rem;font-weight:800;background:${isSafe ? '#10b98120' : '#ef444420'};color:${isSafe ? '#10b981' : '#ef4444'};padding:2px 7px;border-radius:20px">${badgeTxt}</span>
        </div>
        <div class="att-goal-boxes">
          <div class="att-goal-box-cell" style="background:${clr}15">
            <span class="att-goal-box-val" style="color:${clr}">${num}</span>
            <span class="att-goal-box-lbl">${actionLabel}</span>
          </div>
          <div class="att-goal-box-cell" style="background:var(--surface)">
            <span style="font-size:.72rem;color:var(--muted);line-height:1.3">${sub}</span>
          </div>
        </div>
      </div>`;
  }

  function makeTable(arr, type) {
    if (!arr.length) return `<div class="cie-detail-placeholder" style="margin-top:8px">No ${type} records.</div>`;
    const rows = arr
      .map((item, idx) => {
        let dateStr = item.date || item.Date || '—';
        try {
          const d = new Date(dateStr);
          if (!isNaN(d.getTime())) {
            dateStr = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
          }
        } catch (e) {}

        const hour = item.hour || item.Hour || item.period || '—';
        const day = item.day || item.Day || '—';
        return `
          <tr>
            <td style="color:var(--muted);width:32px">${idx + 1}</td>
            <td style="font-weight:700">${escHtml(dateStr)}</td>
            <td>${escHtml(day)}</td>
            <td style="text-align:right">${escHtml(hour)}</td>
          </tr>`;
      })
      .join('');

    return `
      <table class="att-tbl">
        <thead>
          <tr>
            <th>#</th>
            <th>Date</th>
            <th>Day</th>
            <th style="text-align:right">Period</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  body.innerHTML = `
    <div class="att-goal-grid">
      ${makeCard(85, b85, r85, '#10b981')}
      ${makeCard(75, b75, r75, '#3b82f6')}
    </div>
    <div class="att-tables-wrap">
      <div class="att-tbl-section">
        <div class="att-tbl-head">
          <span style="font-weight:700;font-size:.85rem">Missed Classes</span>
          <span class="att-count-pill" style="background:#ef444420;color:#ef4444">${missed}</span>
        </div>
        ${makeTable(absent, 'missed')}
      </div>
      <div class="att-tbl-section">
        <div class="att-tbl-head">
          <span style="font-weight:700;font-size:.85rem">Attended Classes</span>
          <span class="att-count-pill" style="background:#10b98120;color:#10b981">${attended}</span>
        </div>
        ${makeTable(present, 'attended')}
      </div>
    </div>`;
}

export function closeAttModal() {
  const modal = document.getElementById('att-modal');
  if (modal) modal.style.display = 'none';
}

export function refreshData() {
  sessionStorage.removeItem(CONFIG.ATT_SESSION_KEY);
  sessionStorage.removeItem('student_sgpa_cache');
  // Clear any sub-caches
  Object.keys(sessionStorage).forEach(k => {
    if (k.startsWith('att_detail_') || k.startsWith('cie_detail_')) {
      sessionStorage.removeItem(k);
    }
  });
  currentStudentData = null;
  currentSgpaData = null;
  fetchAttendanceData(true);
}

export function setAttendanceSemester(newSem) {
  if (newSem !== 'even' && newSem !== 'odd') return;
  const attSemInput = document.getElementById('att-sem');
  const currentSem = attSemInput ? attSemInput.value : '';

  if (currentSem === newSem) {
    toggleDrawer(false);
    return;
  }

  const btnEven = document.getElementById('m-sem-even');
  const btnOdd = document.getElementById('m-sem-odd');
  if (btnEven && btnOdd) {
    btnEven.classList.toggle('active', newSem === 'even');
    btnOdd.classList.toggle('active', newSem === 'odd');
  }

  if (attSemInput) attSemInput.value = newSem;
  toggleDrawer(false);

  sessionStorage.removeItem(CONFIG.ATT_SESSION_KEY);
  sessionStorage.removeItem('student_sgpa_cache');
  Object.keys(sessionStorage).forEach(k => {
    if (k.startsWith('att_detail_') || k.startsWith('cie_detail_')) {
      sessionStorage.removeItem(k);
    }
  });
  currentStudentData = null;
  currentSgpaData = null;
  fetchAttendanceData(true, newSem);
}

// ── Expose globals for inline HTML event handlers ──
if (typeof window !== 'undefined') {
  window.initAttendance = initAttendance;
  window.fetchAttendanceData = fetchAttendanceData;
  window.renderStudentView = renderStudentView;
  window.switchTab = switchTab;
  window.flipCard = flipCard;
  window.fetchSgpa = fetchSgpa;
  window.onCieItemToggle = onCieItemToggle;
  window.showAttendanceDetail = showAttendanceDetail;
  window.closeAttModal = closeAttModal;
  window.refreshData = refreshData;
  window.setAttendanceSemester = setAttendanceSemester;
}
