// ═══════════════════════════════════════════════════════════════
//  STUDENT HUB — Results & Leaderboard Client Logic
// ═══════════════════════════════════════════════════════════════

import { CONFIG } from './config.js';
import { api } from './api.js';
import { loadCreds, initTheme, initPwa } from './shared.js';

let allStudents = [];
let myUsn = '';

export async function initResults() {
  initTheme();
  initPwa();

  const creds = loadCreds();
  if (creds && creds.usn) {
    myUsn = creds.usn.toUpperCase();
  }

  loadResultsData();
}

export async function loadResultsData() {
  const container = document.getElementById('results-content');
  const loader = document.getElementById('results-loader');
  const errState = document.getElementById('results-error');

  if (loader) loader.style.display = 'flex';
  if (container) container.style.display = 'none';
  if (errState) errState.style.display = 'none';

  const branch = document.getElementById('filter-branch')?.value || '';
  const batch = document.getElementById('filter-batch')?.value || '';

  try {
    const data = await api.getResults(branch, batch);
    allStudents = data.students || data.results || [];
    if (loader) loader.style.display = 'none';
    if (container) container.style.display = 'flex';
    renderResultsView(allStudents, data.stats || {});
  } catch (err) {
    if (loader) loader.style.display = 'none';
    if (errState) {
      errState.style.display = 'flex';
      const msg = document.getElementById('results-err-msg');
      if (msg) msg.textContent = err.message || 'Failed to load leaderboard.';
    }
  }
}

export function renderResultsView(students, stats) {
  // Update stats cards
  const totalCountEl = document.getElementById('stat-total-students');
  const highestSgpaEl = document.getElementById('stat-highest-sgpa');
  const avgSgpaEl = document.getElementById('stat-avg-sgpa');

  if (totalCountEl) totalCountEl.textContent = stats.total || students.length || 0;
  if (highestSgpaEl) highestSgpaEl.textContent = stats.highest ? stats.highest.toFixed(2) : (students[0]?.sgpa?.toFixed(2) || '—');
  if (avgSgpaEl) avgSgpaEl.textContent = stats.avg ? stats.avg.toFixed(2) : '—';

  // My Rank Banner
  const myRankCard = document.getElementById('my-rank-banner');
  const myIndex = students.findIndex(s => s.usn && s.usn.toUpperCase() === myUsn);

  if (myRankCard) {
    if (myIndex !== -1) {
      const me = students[myIndex];
      myRankCard.style.display = 'flex';
      const rankNum = myRankCard.querySelector('.my-rank-num');
      const rankName = myRankCard.querySelector('.my-rank-name');
      const rankMeta = myRankCard.querySelector('.my-rank-meta');
      const rankSgpa = myRankCard.querySelector('.my-rank-sgpa');

      if (rankNum) rankNum.textContent = `#${me.rank || myIndex + 1}`;
      if (rankName) rankName.textContent = me.name;
      if (rankMeta) rankMeta.textContent = `${me.usn} • ${me.branch || ''}`;
      if (rankSgpa) rankSgpa.textContent = me.sgpa ? me.sgpa.toFixed(2) : '—';
    } else {
      myRankCard.style.display = 'none';
    }
  }

  // Leaderboard List
  const listEl = document.getElementById('lb-list-items');
  if (!listEl) return;

  if (!students.length) {
    listEl.innerHTML = '<div style="text-align:center;padding:32px 0;color:var(--muted)">No results found for selected filters.</div>';
    return;
  }

  listEl.innerHTML = students
    .map((s, i) => {
      const rank = s.rank || i + 1;
      let rankBadge = `${rank}`;
      let rankClass = '';
      if (rank === 1) { rankBadge = '🥇'; rankClass = 'gold'; }
      else if (rank === 2) { rankBadge = '🥈'; rankClass = 'silver'; }
      else if (rank === 3) { rankBadge = '🥉'; rankClass = 'bronze'; }

      const isMe = s.usn && s.usn.toUpperCase() === myUsn;
      const failHtml = s.fails > 0 ? `<span class="lb-fail-badge">${s.fails} Backlog</span>` : '';

      return `
        <div class="lb-row ${isMe ? 'me' : ''}">
          <div class="lb-rank ${rankClass}">${rankBadge}</div>
          <div class="lb-info">
            <div class="lb-name">${escHtml(s.name)} ${failHtml}</div>
            <div class="lb-usn">${escHtml(s.usn)}</div>
          </div>
          ${s.credits ? `<div class="lb-cr">${s.credits} CR</div>` : ''}
          <div class="lb-right">
            <div class="lb-sgpa">${s.sgpa ? s.sgpa.toFixed(2) : '—'}</div>
          </div>
        </div>`;
    })
    .join('');
}

function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Bind window helpers
if (typeof window !== 'undefined') {
  window.loadResultsData = loadResultsData;
}
