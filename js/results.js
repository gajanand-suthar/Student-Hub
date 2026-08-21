// ═══════════════════════════════════════════════════════════════
//  STUDENT HUB — Results & Leaderboard Client Logic
// ═══════════════════════════════════════════════════════════════

import { CONFIG } from './config.js';
import { api } from './api.js';
import { loadCreds, escHtml, toTitleCase, loadUser, getStoredUsn } from './shared.js';

const BRANCH_NAMES = {
  'EE': 'Electrical & Electronics',
  'EC': 'Electronics & Communication',
  'IS': 'Information Science',
  'CS': 'Computer Science',
  'CI': 'CSE (AI & ML)',
  'ME': 'Mechanical',
  'CV': 'Civil'
};

let currentUsn = '';
let pollRetries = 0;
const MAX_POLL_RETRIES = 60;

function fmtVal(val, decimals = 2) {
  return val !== null && val !== undefined ? Number(val).toFixed(decimals) : '—';
}

function getMedal(rank) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return rank;
}

function getRankClass(rank) {
  if (rank === 1) return 'gold';
  if (rank === 2) return 'silver';
  if (rank === 3) return 'bronze';
  return '';
}

function showState(stateId) {
  ['loading-state','error-state','main-content','empty-state','gen-state'].forEach(function(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = id === stateId ? 'flex' : 'none';
  });
}

function showError(title, sub) {
  showState('error-state');
  const titleEl = document.getElementById('err-title');
  const subEl = document.getElementById('err-sub');
  if (titleEl) titleEl.textContent = title;
  if (subEl) subEl.textContent = sub;
}

function renderLeaderboard(data) {
  showState('main-content');
  pollRetries = 0; // Reset retries on successful render

  const branchName = BRANCH_NAMES[data.branch] || data.branch;
  const perfTitle = document.getElementById('perf-title');
  const perfSub = document.getElementById('perf-sub');
  if (perfTitle) perfTitle.textContent = 'Semester Leaderboard';
  if (perfSub) perfSub.textContent = branchName + ' • Batch ' + data.batch;

  // Stats
  const statTotal = document.getElementById('stat-total');
  const statAvg = document.getElementById('stat-avg');
  const statRank = document.getElementById('stat-rank');
  if (statTotal) statTotal.textContent = data.totalStudents || '—';
  if (statAvg) statAvg.textContent = fmtVal(data.branchAvgSgpa);

  // Find current user
  let me = null;
  const leaderboard = data.leaderboard || [];
  for (let i = 0; i < leaderboard.length; i++) {
    if (leaderboard[i].isCurrentUser) {
      me = leaderboard[i];
      break;
    }
  }

  if (me) {
    if (statRank) statRank.textContent = '#' + me.rank;
    const myCard = document.getElementById('my-rank-card');
    if (myCard) myCard.style.display = 'flex';
    const rankNum = document.getElementById('my-rank-num');
    const rankName = document.getElementById('my-rank-name');
    const rankMeta = document.getElementById('my-rank-meta');
    const rankSgpa = document.getElementById('my-rank-sgpa');
    if (rankNum) rankNum.textContent = '#' + me.rank;
    if (rankName) rankName.textContent = toTitleCase(me.name);
    if (rankMeta) rankMeta.textContent = me.usn + (me.creditsEarned !== null && me.creditsEarned !== undefined ? ' · Cr: ' + me.creditsEarned + '/' + me.creditsRegistered : '');
    if (rankSgpa) rankSgpa.textContent = fmtVal(me.sgpa);
  }

  // Build leaderboard rows
  const listEl = document.getElementById('lb-list');
  if (!listEl) return;
  let html = '';

  for (let j = 0; j < leaderboard.length; j++) {
    const s = leaderboard[j];
    const isMe = s.isCurrentUser;
    const medal = getMedal(s.rank);
    const rankClass = getRankClass(s.rank);
    const displayName = isMe ? toTitleCase(s.name) + ' (You)' : toTitleCase(s.name);

    html += '<div class="lb-row' + (isMe ? ' me' : '') + '">'
      + '<div class="lb-rank ' + rankClass + '">' + medal + '</div>'
      + '<div class="lb-info">'
      +   '<div class="lb-name">' + escHtml(displayName) + '</div>'
      +   '<div class="lb-usn">' + escHtml(s.usn) + '</div>'
      + '</div>'
      + '<div class="lb-cr">' + (s.creditsEarned !== null && s.creditsEarned !== undefined ? s.creditsEarned + '/' + s.creditsRegistered : '') + '</div>'
      + '<div class="lb-right">'
      +   '<div class="lb-sgpa">' + fmtVal(s.sgpa) + '</div>'
      + '</div>'
      + '</div>';
  }

  listEl.innerHTML = html;

  // Scroll to current user row after render
  setTimeout(function() {
    const meRow = document.querySelector('.lb-row.me');
    const list = document.getElementById('lb-list');
    if (meRow && list) {
       list.scrollTo({
         top: meRow.offsetTop - (list.clientHeight / 2) + (meRow.clientHeight / 2),
         behavior: 'smooth'
       });
    }
  }, 300);
}

function checkLeaderboard() {
  if (pollRetries >= MAX_POLL_RETRIES) return;
  pollRetries++;

  api.getResultsPerformance(currentUsn)
    .then(function(data) {
      if (data.generating || data.empty) {
        setTimeout(checkLeaderboard, 5000);
      } else if (!data.error) {
        renderLeaderboard(data);
      }
    })
    .catch(function() {});
}

function setupGenerate(batch, branch) {
  const btn = document.getElementById('start-gen-btn');
  if (btn) {
    btn.onclick = function() {
      showState('gen-state');
      const progWrap = document.getElementById('gen-prog-wrap');
      if (progWrap) progWrap.style.display = 'block';
      startGen(batch, branch);
    };
  }
}

function pad(n) { return ('000' + n).slice(-3); }

async function startGen(batch, branch) {
  const year = batch.slice(-2);
  const fill = document.getElementById('gen-fill');
  const sub = document.getElementById('gen-sub');
  
  try {
    const startRes = await api.post('/api/results/generate-start', { year: year, branch: branch, usn: currentUsn });
    
    const regularPrefix = '4NI' + year + branch;
    const lateralYear = String(parseInt(year, 10) + 1).padStart(2, '0');
    const lateralPrefix = '4NI' + lateralYear + branch;

    const chunkSize = 10;
    const totalMaxChunks = 70;
    let chunkIndex = 0;

    // Fetch Regular
    for (let s = 1; s <= 600; s += chunkSize) {
      const chunk = [];
      for (let i = 0; i < chunkSize; i++) chunk.push(regularPrefix + pad(s + i));
      chunkIndex++;
      if (sub) sub.textContent = 'Fetching USN ' + chunk[0] + ' to ' + chunk[chunk.length-1];
      
      const data = await api.post('/api/results/generate-chunk', { year: year, branch: branch, usns: chunk });
      if (fill) fill.style.width = Math.round((chunkIndex / totalMaxChunks) * 100) + '%';
      if (data.count === 0) {
        chunkIndex += Math.floor((600 - s) / chunkSize);
        break;
      }
    }

    // Fetch Lateral
    for (let s = 400; s <= 500; s += chunkSize) {
      const chunk = [];
      for (let i = 0; i < chunkSize; i++) chunk.push(lateralPrefix + pad(s + i));
      chunkIndex++;
      if (sub) sub.textContent = 'Fetching USN ' + chunk[0] + ' to ' + chunk[chunk.length-1];
      
      const data = await api.post('/api/results/generate-chunk', { year: year, branch: branch, usns: chunk });
      if (fill) fill.style.width = Math.round((chunkIndex / totalMaxChunks) * 100) + '%';
      if (data.count === 0) break;
    }

    // End
    if (fill) fill.style.width = '100%';
    if (sub) sub.textContent = 'Finalizing...';
    await api.post('/api/results/generate-end', { year: year, branch: branch, usn: currentUsn });
    
    checkLeaderboard();

  } catch(e) {
    if (e.message && e.message.includes('Already generating')) {
      const genTitle = document.getElementById('gen-title');
      if (genTitle) genTitle.textContent = 'Please Wait';
      if (sub) sub.textContent = 'Someone else started generating! Waiting for them to finish...';
      const progWrap = document.getElementById('gen-prog-wrap');
      if (progWrap) progWrap.style.display = 'none';
      setTimeout(checkLeaderboard, 5000);
      return;
    }
    showError('Generation Failed', e.message);
  }
}

export function initResults() {

  const params = new URLSearchParams(window.location.search);
  let usn = params.get('usn') || '';

  if (!usn) {
    usn = getStoredUsn();
  }

  if (!usn) {
    showError('No USN Found', 'Please enter your USN on the homepage first.');
    return;
  }
  
  currentUsn = usn;

  api.getResultsPerformance(usn)
    .then(function(data) {
      if (data.error) {
        showError('Error', data.error);
        return;
      }
      if (data.empty) {
        setupGenerate(data.batch, data.branch);
        showState('empty-state');
        return;
      }
      if (data.generating) {
        showState('gen-state');
        const genTitle = document.getElementById('gen-title');
        const genSub = document.getElementById('gen-sub');
        if (genTitle) genTitle.textContent = 'Please Wait';
        if (genSub) genSub.textContent = 'Another student is currently generating the leaderboard. This updates automatically...';
        setTimeout(checkLeaderboard, 5000);
        return;
      }
      renderLeaderboard(data);
    })
    .catch(function() {
      showError('Connection Error', 'Could not load leaderboard data. Please check your connection.');
    });
}

if (typeof window !== 'undefined') {
  window.initResults = initResults;
}
