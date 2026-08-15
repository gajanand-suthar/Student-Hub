// ═══════════════════════════════════════════════════════════════
//  STUDENT HUB — Attendance & CIE Client Logic
// ═══════════════════════════════════════════════════════════════

import { CONFIG } from './config.js';
import { api } from './api.js';
import { loadCreds, initTheme, initPwa } from './shared.js';

let sgpaLoaded = false;
let currentStudentData = null;

export async function initAttendance() {
  initTheme();
  initPwa();

  const creds = loadCreds();
  if (!creds || !creds.usn) {
    window.location.replace('../');
    return;
  }

  // Check cached user data in localStorage
  let cachedUser = null;
  try {
    cachedUser = JSON.parse(localStorage.getItem(CONFIG.USER_KEY));
  } catch (e) {}

  if (cachedUser && cachedUser.usn === creds.usn && cachedUser.attendance) {
    currentStudentData = cachedUser;
    renderStudentView(cachedUser);
    // Background refresh silently
    fetchAttendanceData(false);
  } else {
    fetchAttendanceData(true);
  }
}

export async function fetchAttendanceData(showLoading = true) {
  const creds = loadCreds();
  if (!creds || !creds.usn) return;

  const overlay = document.getElementById('refresh-overlay');
  if (showLoading && overlay) overlay.classList.add('active');

  try {
    const res = await api.login({
      action: 'login',
      usn: creds.usn,
      dob: creds.dob,
      idType: creds.idType,
      code: creds.code,
      sem: creds.sem || CONFIG.CURRENT_SEM
    });

    if (res.student) {
      currentStudentData = res.student;
      localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(res.student));
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

  // Photo
  const photoSlot = document.getElementById('photo-slot');
  const initials = name.split(' ').slice(0, 2).map(w => w[0] || '').join('');
  if (photoSlot) {
    if (data.photoUri) {
      photoSlot.innerHTML = `
        <div class="photo-wrap">
          <div class="photo-skel">${escHtml(initials)}</div>
          <img src="${data.photoUri}" class="student-photo" alt="${escHtml(name)}" onload="this.classList.add('loaded')"/>
        </div>`;
    } else {
      photoSlot.innerHTML = `<div class="student-photo-ph">${escHtml(initials)}</div>`;
    }
  }

  // Attendance Rows
  const sortedAtt = [...attendance].sort((a, b) => a.pct - b.pct);
  const attRowsEl = document.getElementById('att-rows-container');
  if (attRowsEl) {
    if (!sortedAtt.length) {
      attRowsEl.innerHTML = '<p class="empty-panel">No attendance records found.</p>';
    } else {
      attRowsEl.innerHTML = sortedAtt
        .map(s => {
          let barColor = '#3b82f6', textColor = '#1d4ed8';
          if (s.pct < 75) { barColor = '#ef4444'; textColor = '#dc2626'; }
          else if (s.pct < 85) { barColor = '#f59e0b'; textColor = '#b45309'; }

          const params = cieLinks[s.code] || {};
          return `
            <div class="cr" data-code="${escHtml(s.code)}" data-name="${escHtml(s.name)}" data-pct="${s.pct}" data-courseid="${escHtml(params.courseId || '')}" data-secid="${escHtml(params.secId || '')}" data-semid="${escHtml(params.semId || '')}" onclick="showAttendanceDetail('${escHtml(s.code)}')">
              <div class="cr-label"><span class="cr-name">${escHtml(s.name)}</span></div>
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
  }

  // CIE Breakdown
  const ciePanelEl = document.getElementById('cie-panel-container');
  if (ciePanelEl) {
    if (!cie.length) {
      ciePanelEl.innerHTML = '<div class="empty-panel">No CIE data found.</div>';
    } else {
      ciePanelEl.innerHTML = cie
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
  if (sgpaLoaded) {
    document.getElementById('flip-inner')?.classList.toggle('flipped');
  }
}

export async function fetchSgpa(e) {
  if (e) e.stopPropagation();
  const btn = document.getElementById('sgpa-fetch-btn');
  if (!btn || btn.disabled) return;

  btn.disabled = true;
  btn.innerHTML = '<div style="width:16px;height:16px;border:2px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin .6s linear infinite;margin:4px auto"></div>';

  const creds = loadCreds();
  const usn = creds?.usn || '';
  const cookies = currentStudentData?.cookies || '';
  const sem = creds?.sem || CONFIG.CURRENT_SEM;

  try {
    const json = await api.getExamHistory({ cookies, usn, sem });
    renderSgpaChip(json);
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '<span class="sgpa-fetch-label">Avg SGPA</span><span class="sgpa-fetch-sub" style="color:var(--danger)">Retry</span>';
  }
}

function renderSgpaChip(data) {
  const frontChipSlot = document.getElementById('sgpa-fetch-btn');
  const backSlot = document.getElementById('sgpa-back-slot');

  if (!data || !data.semesters || !data.semesters.length || data.cgpa === null) {
    if (frontChipSlot) {
      frontChipSlot.outerHTML = `
        <div class="sgpa-chip" style="color:var(--muted);background:var(--bg);border-color:var(--border);margin-left:auto">
          <span class="sgpa-fetch-label">Avg SGPA</span>
          <span class="sgpa-chip-val" style="font-size:1rem">—</span>
          <span class="sgpa-chip-hint">not available</span>
        </div>`;
    }
    return;
  }

  const { semesters, cgpa } = data;
  let chipColor = '#16a34a', chipBg = '#f0fdf4', chipBorder = '#bbf7d0', chipDark = 'green';
  if (cgpa !== null && cgpa < 6) { chipColor = '#dc2626'; chipBg = '#fff1f2'; chipBorder = '#fecdd3'; chipDark = 'red'; }
  else if (cgpa !== null && cgpa < 7.5) { chipColor = '#b45309'; chipBg = '#fffbeb'; chipBorder = '#fde68a'; chipDark = 'amber'; }

  if (frontChipSlot) {
    frontChipSlot.outerHTML = `
      <div class="sgpa-chip" data-color="${chipDark}" style="color:${chipColor};background:${chipBg};border-color:${chipBorder};margin-left:auto">
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
  sgpaLoaded = cgpa !== null;
}

export async function onCieItemToggle(detailEl) {
  if (!detailEl || !detailEl.open || detailEl.dataset.loaded === '1' || detailEl.dataset.loading === '1') return;
  const courseId = detailEl.dataset.courseid;
  const secId = detailEl.dataset.secid;
  const semId = detailEl.dataset.semid;
  const cookies = currentStudentData?.cookies || '';
  const body = detailEl.querySelector('.bd-body');
  if (!courseId || !semId || !body) return;

  detailEl.dataset.loading = '1';
  body.innerHTML = '<div style="text-align:center;padding:8px 0"><div class="big-spinner" style="margin:0 auto;width:20px;height:20px;border-width:2px"></div></div>';

  try {
    const json = await api.getCieDetail({ cookies, courseId, secId, semId, sem: CONFIG.CURRENT_SEM });
    body.innerHTML = renderCieBreakdownBody(json);
    detailEl.dataset.loaded = '1';
  } catch (err) {
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
  body.innerHTML = '<div style="text-align:center;padding:32px 0"><div class="big-spinner" style="margin:0 auto"></div></div>';
  modal.style.display = 'flex';

  try {
    const json = await api.getAttendanceDetail({ cookies, courseId, secId, semId, sem: CONFIG.CURRENT_SEM });
    renderAttendanceModal(json);
  } catch (err) {
    body.innerHTML = `<div style="padding:28px;text-align:center;color:var(--muted);font-size:.85rem">Failed to load details.<br><span style="font-size:.75rem">${escHtml(err.message)}</span></div>`;
  }
}

function renderAttendanceModal(data) {
  const { present = [], absent = [], counts = {} } = data;
  const body = document.getElementById('att-modal-body');
  if (!body) return;

  const p = counts.present || present.length;
  const a = counts.absent || absent.length;
  const t = p + a;

  function attendNeeded(goal) {
    if (t === 0) return 0;
    const n = Math.ceil((goal * t - 100 * p) / (100 - goal));
    return n > 0 ? n : 0;
  }
  function canBunk(goal) {
    if (t === 0) return 0;
    const n = Math.floor((100 * p - goal * t) / goal);
    return n > 0 ? n : 0;
  }

  function goalCard(label, goal, headClass) {
    const currentPct = t > 0 ? (100 * p) / t : 0;
    const achieved = currentPct >= goal;
    const head = `<div class="att-goal-card-head ${achieved ? 'done' : headClass}">${label}</div>`;
    if (achieved) {
      const bunk = canBunk(goal);
      return `
        <div class="att-goal-card">
          ${head}
          <div class="att-goal-boxes">
            <div class="att-goal-box-cell"><div class="att-goal-box-val" style="color:#16a34a">✓</div><div class="att-goal-box-lbl">Achieved</div></div>
            <div class="att-goal-box-cell"><div class="att-goal-box-val" style="color:${bunk > 0 ? '#16a34a' : 'var(--muted)'}">${bunk}</div><div class="att-goal-box-lbl">Can Bunk</div></div>
          </div>
        </div>`;
    }
    const attend = attendNeeded(goal);
    return `
      <div class="att-goal-card">
        ${head}
        <div class="att-goal-boxes">
          <div class="att-goal-box-cell"><div class="att-goal-box-val" style="color:#dc2626">${attend}</div><div class="att-goal-box-lbl">Must Attend</div></div>
          <div class="att-goal-box-cell"><div class="att-goal-box-val" style="color:var(--muted)">0</div><div class="att-goal-box-lbl">Can Bunk</div></div>
        </div>
      </div>`;
  }

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fmtDate(s) {
    const m = String(s).match(/([0-9]{1,2})[-/.]([0-9]{1,2})[-/.]([0-9]{2,4})/);
    if (!m) return s;
    const mon = MONTHS[parseInt(m[2], 10) - 1] || m[2];
    return `${parseInt(m[1], 10)} ${mon}`;
  }

  function rows(list) {
    if (!list.length) return '<tr><td colspan="2" style="text-align:center;color:var(--muted);padding:12px">No records</td></tr>';
    return list.map(r => `<tr><td class="mono">${escHtml(fmtDate(r.date))}</td><td class="mono">${escHtml(r.time)}</td></tr>`).join('');
  }

  body.innerHTML = `
    <div class="att-goal-grid">
      ${goalCard('75% Goal', 75, 'g75')}
      ${goalCard('85% Goal', 85, 'g85')}
    </div>
    <div class="att-tables-wrap">
      <div class="att-tbl-section">
        <div class="att-tbl-head att-tbl-head-present">Present <span class="att-count-pill present">${p}</span></div>
        <table class="att-tbl"><thead><tr><th>Date</th><th>Time</th></tr></thead><tbody>${rows(present)}</tbody></table>
      </div>
      <div class="att-tbl-section">
        <div class="att-tbl-head att-tbl-head-absent">Absent <span class="att-count-pill absent">${a}</span></div>
        <table class="att-tbl"><thead><tr><th>Date</th><th>Time</th></tr></thead><tbody>${rows(absent)}</tbody></table>
      </div>
    </div>`;
}

export function menuSwitchSem(newSem) {
  if (typeof window.toggleDrawer === 'function') window.toggleDrawer(false);
  const currentSem = (document.getElementById('att-sem') && document.getElementById('att-sem').value) || '';
  if (currentSem === newSem) return;
  try {
    const creds = loadCreds() || {};
    creds.sem = newSem;
    localStorage.setItem(CONFIG.CRED_KEY, JSON.stringify(creds));
    const attSemInput = document.getElementById('att-sem');
    if (attSemInput) attSemInput.value = newSem;
    const btnEven = document.getElementById('m-sem-even');
    const btnOdd = document.getElementById('m-sem-odd');
    if (btnEven && btnOdd) {
      btnEven.classList.toggle('active', newSem === 'even');
      btnOdd.classList.toggle('active', newSem === 'odd');
    }
    fetchAttendanceData(true);
  } catch (e) {
    alert('Error switching semester: ' + e.message);
  }
}

export function closeAttModal() {
  const modal = document.getElementById('att-modal');
  if (modal) modal.style.display = 'none';
}

export function switchSem(newSem) {
  menuSwitchSem(newSem);
}

function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Bind window helpers
if (typeof window !== 'undefined') {
  window.switchTab = switchTab;
  window.flipCard = flipCard;
  window.fetchSgpa = fetchSgpa;
  window.onCieItemToggle = onCieItemToggle;
  window.showAttendanceDetail = showAttendanceDetail;
  window.closeAttModal = closeAttModal;
  window.switchSem = switchSem;
  window.menuSwitchSem = menuSwitchSem;
  window.refreshData = () => fetchAttendanceData(true);
}
