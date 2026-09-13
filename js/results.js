// ═══════════════════════════════════════════════════════════════
//  STUDENT HUB — Results & Leaderboard Client Logic
// ═══════════════════════════════════════════════════════════════

import { CONFIG } from './config.js';
import { api } from './api.js';
import { loadCreds, escHtml, toTitleCase, loadUser, getStoredUsn, getSessionToken, ensureHumanSession } from './shared.js';

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
  ['loading-state','error-state','main-content'].forEach(function(id) {
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
    const usnText = me.usn || data.myUsn || '';
    if (rankNum) rankNum.textContent = '#' + me.rank;
    if (rankName) rankName.textContent = toTitleCase(me.name);
    if (rankMeta) rankMeta.textContent = (usnText ? usnText + ' · ' : '') + (me.creditsEarned !== null && me.creditsEarned !== undefined ? 'Cr: ' + me.creditsEarned + '/' + me.creditsRegistered : '');
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
      +   (s.usn ? '<div class="lb-usn">' + escHtml(s.usn) + '</div>' : '')
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

export async function initResults() {

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

  try {
    // Ensure session is ready (instant if already solved on homepage)
    await ensureHumanSession();

    var data = await api.getResultsPerformance(usn, getSessionToken());
    if (data.error) {
      showError('Error', data.error);
      return;
    }
    renderLeaderboard(data);
  } catch(e) {
    if (e.message && (e.message.includes('Authentication required') || e.message.includes('401'))) {
      showError('Authentication Required', 'Please verify your details on the homepage to view your performance.');
    } else {
      showError('Results Unavailable', 'Results for your branch are not yet available. Please check back later.');
    }
  }
}

if (typeof window !== 'undefined') {
  window.initResults = initResults;
}
