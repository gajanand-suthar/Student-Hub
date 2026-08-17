// ═══════════════════════════════════════════════════════════════
//  STUDENT HUB — Results & Leaderboard Client Logic
// ═══════════════════════════════════════════════════════════════

import { CONFIG } from './config.js';
import { api } from './api.js';
import { loadCreds, initTheme, initPwa } from './shared.js';

var BRANCH_NAMES = {
  'EE': 'Electrical & Electronics',
  'EC': 'Electronics & Communication',
  'IS': 'Information Science',
  'CS': 'Computer Science',
  'CI': 'CSE (AI & ML)',
  'ME': 'Mechanical',
  'CV': 'Civil'
};

var currentUsn = '';

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

function toTitleCase(str) {
  return (str || '').split(' ').map(function(w) {
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(' ');
}

function showState(stateId) {
  ['loading-state','error-state','main-content','empty-state','gen-state'].forEach(function(id) {
    var el = document.getElementById(id);
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

  var branchName = BRANCH_NAMES[data.branch] || data.branch;
  const perfTitle = document.getElementById('perf-title');
  const perfSub = document.getElementById('perf-sub');
  if (perfTitle) perfTitle.textContent = 'Semester Leaderboard';
  if (perfSub) perfSub.textContent = branchName + ' • Batch ' + data.batch;

  // Stats
  const statTotal = document.getElementById('stat-total');
  const statAvg = document.getElementById('stat-avg');
  const statRank = document.getElementById('stat-rank');
  if (statTotal) statTotal.textContent = data.totalStudents || '—';
  if (statAvg) statAvg.textContent = data.branchAvgSgpa !== null && data.branchAvgSgpa !== undefined ? Number(data.branchAvgSgpa).toFixed(2) : '—';

  // Find current user
  var me = null;
  var leaderboard = data.leaderboard || [];
  for (var i = 0; i < leaderboard.length; i++) {
    if (leaderboard[i].isCurrentUser) {
      me = leaderboard[i];
      break;
    }
  }

  if (me) {
    if (statRank) statRank.textContent = '#' + me.rank;
    var myCard = document.getElementById('my-rank-card');
    if (myCard) myCard.style.display = 'flex';
    var rankNum = document.getElementById('my-rank-num');
    var rankName = document.getElementById('my-rank-name');
    var rankMeta = document.getElementById('my-rank-meta');
    var rankSgpa = document.getElementById('my-rank-sgpa');
    if (rankNum) rankNum.textContent = '#' + me.rank;
    if (rankName) rankName.textContent = toTitleCase(me.name);
    if (rankMeta) rankMeta.textContent = me.usn + (me.creditsEarned !== null && me.creditsEarned !== undefined ? ' · Cr: ' + me.creditsEarned + '/' + me.creditsRegistered : '');
    if (rankSgpa) rankSgpa.textContent = me.sgpa !== null && me.sgpa !== undefined ? Number(me.sgpa).toFixed(2) : '—';
  }

  // Build leaderboard rows
  var listEl = document.getElementById('lb-list');
  if (!listEl) return;
  var html = '';

  for (var j = 0; j < leaderboard.length; j++) {
    var s = leaderboard[j];
    var isMe = s.isCurrentUser;
    var medal = getMedal(s.rank);
    var rankClass = getRankClass(s.rank);
    var failBadge = '';
    var displayName = isMe ? toTitleCase(s.name) + ' (You)' : toTitleCase(s.name);

    html += '<div class="lb-row' + (isMe ? ' me' : '') + '">'
      + '<div class="lb-rank ' + rankClass + '">' + medal + '</div>'
      + '<div class="lb-info">'
      +   '<div class="lb-name">' + escHtml(displayName) + failBadge + '</div>'
      +   '<div class="lb-usn">' + escHtml(s.usn) + '</div>'
      + '</div>'
      + '<div class="lb-cr">' + (s.creditsEarned !== null && s.creditsEarned !== undefined ? s.creditsEarned + '/' + s.creditsRegistered : '') + '</div>'
      + '<div class="lb-right">'
      +   '<div class="lb-sgpa">' + (s.sgpa !== null && s.sgpa !== undefined ? Number(s.sgpa).toFixed(2) : '—') + '</div>'
      + '</div>'
      + '</div>';
  }

  listEl.innerHTML = html;

  // Scroll to current user row after render
  setTimeout(function() {
    var meRow = document.querySelector('.lb-row.me');
    var list = document.getElementById('lb-list');
    if (meRow && list) {
       list.scrollTo({
         top: meRow.offsetTop - (list.clientHeight / 2) + (meRow.clientHeight / 2),
         behavior: 'smooth'
       });
    }
  }, 300);
}

function checkLeaderboard() {
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
  var btn = document.getElementById('start-gen-btn');
  if (btn) {
    btn.onclick = function() {
      showState('gen-state');
      var progWrap = document.getElementById('gen-prog-wrap');
      if (progWrap) progWrap.style.display = 'block';
      startGen(batch, branch);
    };
  }
}

function pad(n) { return ('000' + n).slice(-3); }

async function startGen(batch, branch) {
  var year = batch.slice(-2);
  var fill = document.getElementById('gen-fill');
  var sub = document.getElementById('gen-sub');
  
  try {
    var startRes = await api.post('/api/results/generate-start', { year: year, branch: branch, usn: currentUsn });
    
    var regularPrefix = '4NI' + year + branch;
    var lateralYear = String(parseInt(year, 10) + 1).padStart(2, '0');
    var lateralPrefix = '4NI' + lateralYear + branch;

    var chunkSize = 10;
    var totalMaxChunks = 70;
    var chunkIndex = 0;

    // Fetch Regular
    for (var s = 1; s <= 600; s += chunkSize) {
      var chunk = [];
      for (var i = 0; i < chunkSize; i++) chunk.push(regularPrefix + pad(s + i));
      chunkIndex++;
      if (sub) sub.textContent = 'Fetching USN ' + chunk[0] + ' to ' + chunk[chunk.length-1];
      
      var data = await api.post('/api/results/generate-chunk', { year: year, branch: branch, usns: chunk });
      if (fill) fill.style.width = Math.round((chunkIndex / totalMaxChunks) * 100) + '%';
      if (data.count === 0) {
        chunkIndex += Math.floor((600 - s) / chunkSize);
        break;
      }
    }

    // Fetch Lateral
    for (var s = 400; s <= 500; s += chunkSize) {
      var chunk = [];
      for (var i = 0; i < chunkSize; i++) chunk.push(lateralPrefix + pad(s + i));
      chunkIndex++;
      if (sub) sub.textContent = 'Fetching USN ' + chunk[0] + ' to ' + chunk[chunk.length-1];
      
      var data = await api.post('/api/results/generate-chunk', { year: year, branch: branch, usns: chunk });
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
      var genTitle = document.getElementById('gen-title');
      if (genTitle) genTitle.textContent = 'Please Wait';
      if (sub) sub.textContent = 'Someone else started generating! Waiting for them to finish...';
      var progWrap = document.getElementById('gen-prog-wrap');
      if (progWrap) progWrap.style.display = 'none';
      setTimeout(checkLeaderboard, 5000);
      return;
    }
    showError('Generation Failed', e.message);
  }
}

export function initResults() {
  initTheme();
  initPwa();

  var params = new URLSearchParams(window.location.search);
  var usn = params.get('usn') || '';

  if (!usn) {
    try {
      var creds = loadCreds() || {};
      usn = creds.usn || '';
    } catch(e) {}
    try {
      var user = JSON.parse(sessionStorage.getItem(CONFIG.USER_KEY) || '{}');
      if (!usn) usn = user.usn || '';
    } catch(e) {}
  }

  if (!usn) {
    showError('No USN Found', 'Please set your USN on the homepage or in settings first.');
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
        var genTitle = document.getElementById('gen-title');
        var genSub = document.getElementById('gen-sub');
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

function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

if (typeof window !== 'undefined') {
  window.initResults = initResults;
}
