// ═══════════════════════════════════════════════════════════════
//  STUDENT HUB — Moodle Client Logic
// ═══════════════════════════════════════════════════════════════

import { CONFIG } from './config.js';
import { api } from './api.js';
import { loadCreds, escHtml, toTitleCase, loadUser } from './shared.js';

// ── State Management ──────────────────────────────────────────
let token = '';
let currentUserId = null;
let currentSem = 0;
let allCourses = [];       // all enrolled courses across all semesters
let allSemesters = [];     // sorted list of unique semester numbers found
let cachedCourses = [];    // courses for the currently selected semester
let displayedCourses = []; // currently rendered courses (filtered or searched)
let userName = 'Anonymous';
let userUsn = 'Unknown';

// ── HTML & String Utilities ───────────────────────────────────
export function decodeHtml(str) {
  return String(str || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export function loadingHtml() {
  return '<div class="loader-wrap"><div class="spinner"></div>Loading course materials...</div>';
}

export function stateHtml(msg) {
  return '<div class="state-msg">' + escHtml(msg) + '</div>';
}

function handleInvalidToken() {
  token = '';
  localStorage.removeItem(CONFIG.TOKEN_KEY);
  showView('auth');
}

export function showView(v) {
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  const el = document.getElementById('view-' + v);
  if (el) el.classList.add('active');

  if (v === 'content') {
    document.body.classList.add('page-scrollable');
  } else {
    document.body.classList.remove('page-scrollable');
  }

  // Scroll window back to top
  window.scrollTo({ top: 0 });
}

// ── Course Name Cleaner ──────────────────────────────────────
export function parseCourseInfo(fullname) {
  const raw = decodeHtml(fullname || '').trim();

  // 1. Replace underscores, parentheses, and brackets with spaces
  let str = raw.replace(/[_()[\]{}]/g, ' ');

  // 2. Loop to trim metadata from EXTREME LEFT (^) and EXTREME RIGHT ($) only
  let prev = '';
  while (str !== prev) {
    prev = str;

    // Trim EXTREME LEFT (anchored to ^)
    str = str.replace(/^(?:20\d{2}(?:-\d{2})?|\d{2}-\d{2}|20\d{2}|\d+(?:st|nd|rd|th)?|EEE|ECE|CSE|MECH|CIV|ISE|SEM|SEMESTER|EVEN|ODD|SEC|SECTION|DIV|[A-D])\b[\s:\-\|,()]*/gi, '');

    // Trim EXTREME RIGHT (anchored to $)
    str = str.replace(/[\s:\-\|,()]*\b(?:20\d{2}(?:-\d{2})?|\d{2}-\d{2}|20\d{2}|\d+(?:st|nd|rd|th)?|EEE|ECE|CSE|MECH|CIV|ISE|SEM|SEMESTER|EVEN|ODD|SEC|SECTION|DIV|[A-D])\s*$/gi, '');

    // Trim standalone numbers at EXTREME RIGHT (anchored to $)
    str = str.replace(/[\s:\-\|,()]+\d+\s*$/gi, '');
  }

  // 3. Clean up leading/trailing punctuation and multiple spaces
  const result = str.replace(/^[\s:\-\|,()]+/, '').replace(/[\s:\-\|,()]+$/, '').replace(/\s+/g, ' ');

  return { name: result || raw };
}

// ── Boot / Initialization ─────────────────────────────────────
export async function initMoodle() {

  // Setup PDF.js worker
  if (typeof window.pdfjsLib !== 'undefined') {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  token = localStorage.getItem(CONFIG.TOKEN_KEY) || '';

  try {
    const u = loadUser();
    if (u.name) {
      userName = toTitleCase(u.name);
    }
    const cCreds = loadCreds() || {};
    if (cCreds.usn) userUsn = cCreds.usn;
  } catch (e) {}

  // Prefill Moodle credentials if saved
  const c = loadCreds();
  if (c && c.moodleEmail) {
    const inpEmail = document.getElementById('inp-email');
    const inpPass = document.getElementById('inp-pass');
    if (inpEmail) inpEmail.value = c.moodleEmail.split('@')[0];
    if (inpPass) inpPass.value = c.moodlePass || '';
  }

  // If already loaded in memory for this session, display instantly
  if (allCourses && allCourses.length > 0) {
    showView('courses');
    return;
  }

  // Check course Cache
  let cache = null;
  try {
    cache = JSON.parse(localStorage.getItem(CONFIG.COURSES_KEY));
  } catch (e) {}

  if (cache && cache.allCourses && cache.allCourses.length > 0) {
    allCourses = cache.allCourses;
    assignSemesters(allCourses);
    const semSet = {};
    allCourses.forEach(crs => {
      if (crs._sem > 0) semSet[crs._sem] = true;
    });
    allSemesters = Object.keys(semSet).map(Number).sort((a, b) => b - a);
    currentSem = cache.sem || (allSemesters.length ? allSemesters[0] : 0);
    const hasOtherCached = allCourses.some(crs => crs._sem === 0);
    const active = currentSem > 0 ? allCourses.filter(crs => crs._sem === currentSem) : allCourses;
    cachedCourses = active;
    buildSemDropdown(allSemesters, currentSem, hasOtherCached);
    renderCourseList(cachedCourses);
    showView('courses');
  } else if (cache && cache.courses && cache.courses.length > 0) {
    // Legacy cache format
    cachedCourses = cache.courses;
    renderCourseList(cachedCourses);
    showView('courses');
  } else if (token) {
    showView('courses');
    fetchCoursesFromApi(true);
  } else {
    showView('auth');
    if (c && c.moodleEmail && c.moodlePass) {
      showAuthOverlay();
      doLoginWithCreds(c.moodleEmail, c.moodlePass);
    }
  }
}

// ── Auth Handling ─────────────────────────────────────────────
export function showAuthOverlay() {
  const overlay = document.getElementById('auth-overlay');
  if (overlay) overlay.classList.add('show');
}

export function hideAuthOverlay() {
  const overlay = document.getElementById('auth-overlay');
  if (overlay) overlay.classList.remove('show');
}

export function showAuthErr(msg) {
  const e = document.getElementById('auth-err');
  if (e) {
    e.textContent = msg;
    e.style.display = 'block';
  }
  hideAuthOverlay();
}

// ── Login ─────────────────────────────────────────────────────
export async function doLogin() {
  const email = (document.getElementById('inp-email')?.value || '').trim();
  const pass = document.getElementById('inp-pass')?.value || '';
  if (!email || !pass) {
    showAuthErr('Please enter both email prefix and password.');
    return;
  }

  const fullEmail = email.split('@')[0] + '@nie.ac.in';
  showAuthOverlay();
  const authErr = document.getElementById('auth-err');
  if (authErr) authErr.style.display = 'none';

  // Save credentials to settings storage
  const c = loadCreds() || {};
  c.moodleEmail = fullEmail;
  c.moodlePass = pass;
  localStorage.setItem(CONFIG.CRED_KEY, JSON.stringify(c));

  doLoginWithCreds(fullEmail, pass);
}

export async function doLoginWithCreds(email, pass) {
  try {
    const data = await api.moodleLogin(email, pass, userName, userUsn);
    if (!data.token) throw new Error('No token received');
    token = data.token;
    localStorage.setItem(CONFIG.TOKEN_KEY, token);
    hideAuthOverlay();
    showView('courses');
    fetchCoursesFromApi(true);
  } catch (err) {
    showAuthErr('Login failed: ' + (err.message || 'Please check your credentials.'));
  }
}

// ── Courses Dashboard Logic ──────────────────────────────────
export function renderCourseList(courses, isSearch = false) {
  displayedCourses = courses || [];
  const list = document.getElementById('courses-list');
  if (!list) return;

  if (!courses || courses.length === 0) {
    list.innerHTML = stateHtml('No enrolled courses found.');
    return;
  }

  // Only update --num-courses when rendering semester view, NOT during search,
  // so search results maintain exact same card height as current semester view.
  if (!isSearch) {
    list.style.setProperty('--num-courses', courses.length || 1);
  } else if (!list.style.getPropertyValue('--num-courses')) {
    list.style.setProperty('--num-courses', (cachedCourses && cachedCourses.length) ? cachedCourses.length : 7);
  }

  let html = '';
  courses.forEach((c, i) => {
    const info = parseCourseInfo(c.fullname);

    html += `
      <div class="course-card" onclick="openCourse(${i})">
        <div class="cc-info">
          <div class="cc-title">${escHtml(info.name)}</div>
        </div>
        <div class="cc-arrow-right">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>`;
  });
  list.innerHTML = html;
}

export function filterCourses() {
  const query = (document.getElementById('course-search')?.value || '').toLowerCase().trim();
  if (!query) {
    // Empty search -> restore current semester course list
    renderCourseList(cachedCourses, false);
    return;
  }

  // Search globally across ALL enrolled courses
  const matches = allCourses.filter(c => {
    const info = parseCourseInfo(c.fullname);
    const text = `${c.fullname || ''} ${info.name || ''} ${c.shortname || ''}`.toLowerCase();
    return text.includes(query);
  });

  renderCourseList(matches, true);
}

export async function fetchCoursesFromApi(forceRefresh = false) {
  const btn = document.getElementById('refresh-btn');
  if (btn && forceRefresh) btn.classList.add('spinning');
  if (!cachedCourses.length) {
    const list = document.getElementById('courses-list');
    if (list) list.innerHTML = loadingHtml();
  }

  try {
    const info = await api.moodleCall(token, 'core_webservice_get_site_info');
    if (!info || !info.userid) throw new Error('no userid');
    currentUserId = info.userid;

    const all = await api.moodleCall(token, 'core_enrol_get_users_courses', { userid: currentUserId });
    if (btn) btn.classList.remove('spinning');

    if (!Array.isArray(all) || !all.length) {
      const list = document.getElementById('courses-list');
      if (list) list.innerHTML = stateHtml('No courses found.');
      return;
    }

    // Store all courses and detect all available semesters with clustering
    allCourses = all;
    assignSemesters(allCourses);

    const semSet = {};
    let maxSem = 0;
    let hasOther = false;
    allCourses.forEach(c => {
      const n = c._sem || 0;
      if (n > 0) {
        semSet[n] = true;
        if (n > maxSem) maxSem = n;
      } else {
        hasOther = true;
      }
    });

    // Build sorted semester list (descending — latest first)
    allSemesters = Object.keys(semSet).map(Number).sort((a, b) => b - a);
    currentSem = maxSem || (allSemesters.length ? allSemesters[0] : 1);

    // Cache all courses for semester switching
    localStorage.setItem(
      CONFIG.COURSES_KEY,
      JSON.stringify({ allCourses: all, semesters: allSemesters, sem: currentSem, hasOther: hasOther })
    );

    // Build dropdown and show courses for current sem
    buildSemDropdown(allSemesters, currentSem, hasOther);
    switchSem(currentSem);
  } catch (e) {
    if (e.message === 'invalidtoken') {
      handleInvalidToken();
      return;
    }
    if (btn) btn.classList.remove('spinning');
    if (!cachedCourses.length) {
      const list = document.getElementById('courses-list');
      if (list) list.innerHTML = stateHtml('Could not load courses. Tap refresh.');
    }
  }
}

// ── Semester Categorization Algorithm (Category ID & Timestamp) ──
export function assignSemesters(courses) {
  if (!Array.isArray(courses) || !courses.length) return;

  // Step 1: Group courses by category ID and compute average timestamp per category
  const catMap = {}; // categoryId -> { id, courses: [], totalTimestamp: 0, count: 0 }

  courses.forEach(c => {
    const catId = c.category || 0;
    if (!catMap[catId]) {
      catMap[catId] = { id: catId, courses: [], totalTimestamp: 0, count: 0 };
    }
    catMap[catId].courses.push(c);
    const ts = c.startdate || c.lastaccess || 0;
    if (ts > 0) {
      catMap[catId].totalTimestamp += ts;
      catMap[catId].count++;
    }
  });

  // Calculate average timestamp for each category
  const categories = Object.values(catMap).map(item => {
    item.avgTimestamp = item.count > 0 ? item.totalTimestamp / item.count : 0;
    return item;
  });

  // Sort categories by avgTimestamp descending (newest semester first)
  categories.sort((a, b) => b.avgTimestamp - a.avgTimestamp);

  // Step 2: Cluster categories into Semesters
  // Categories whose timestamps are within 90 days (7,776,000 seconds) belong to SAME semester
  const CLUSTER_WINDOW = 90 * 24 * 3600;
  const clusters = [];

  categories.forEach(cat => {
    let matchedCluster = null;
    for (let i = 0; i < clusters.length; i++) {
      const cl = clusters[i];
      if (cat.avgTimestamp > 0 && cl.avgTimestamp > 0 && Math.abs(cat.avgTimestamp - cl.avgTimestamp) <= CLUSTER_WINDOW) {
        matchedCluster = cl;
        break;
      }
    }
    if (matchedCluster) {
      matchedCluster.categories.push(cat);
    } else {
      clusters.push({
        categories: [cat],
        avgTimestamp: cat.avgTimestamp
      });
    }
  });

  // Sort clusters descending by avgTimestamp (newest cluster = highest sem number)
  clusters.sort((a, b) => b.avgTimestamp - a.avgTimestamp);

  // Assign semester numbers: cluster 0 -> N, cluster 1 -> N-1, ..., down to 1
  const totalSems = clusters.length;
  const knownSemTimestamps = [];

  clusters.forEach((cluster, index) => {
    const semNumber = totalSems - index;
    cluster.semNum = semNumber;
    knownSemTimestamps.push({ sem: semNumber, timestamp: cluster.avgTimestamp });

    cluster.categories.forEach(cat => {
      cat.courses.forEach(c => {
        c._sem = semNumber;
      });
    });
  });

  // Step 3: Fallback for any individual course missing category or failing assignment
  courses.forEach(c => {
    if (!c._sem || c._sem === 0) {
      const courseTs = c.startdate || c.lastaccess || 0;
      if (courseTs > 0 && knownSemTimestamps.length > 0) {
        let minDiff = Infinity;
        let bestSem = 1;
        knownSemTimestamps.forEach(ks => {
          const diff = Math.abs(courseTs - ks.timestamp);
          if (diff < minDiff) {
            minDiff = diff;
            bestSem = ks.sem;
          }
        });
        c._sem = bestSem;
      } else {
        c._sem = 1;
      }
    }
  });
}

export function semNum(course) {
  return course ? (course._sem || 0) : 0;
}

// ── Semester Dropdown Logic ─────────────────────────────────
export function buildSemDropdown(semesters, activeSem, hasOther) {
  const dropdown = document.getElementById('sem-dropdown');
  const menu = document.getElementById('sem-menu');
  const label = document.getElementById('sem-trigger-label');
  if (!dropdown || !menu || !label) return;

  const totalOptions = (semesters ? semesters.length : 0) + (hasOther ? 1 : 0);
  if (totalOptions <= 1) {
    dropdown.classList.remove('visible');
    return;
  }

  dropdown.classList.add('visible');
  label.textContent = 'Sem ' + activeSem;

  let html = '';
  semesters.forEach(sem => {
    const isActive = sem === activeSem;
    html += `<button class="sem-option${isActive ? ' active' : ''}" data-sem="${sem}" onclick="selectSem(${sem})">Sem ${sem}</button>`;
  });
  if (hasOther) {
    html += '<div class="sem-divider"></div>';
    html += `<button class="sem-option${activeSem === 0 ? ' active' : ''}" data-sem="0" onclick="selectSem(0)">Other Courses</button>`;
  }
  menu.innerHTML = html;
}

export function toggleSemDropdown() {
  document.getElementById('sem-dropdown')?.classList.toggle('open');
}

export function closeSemDropdown() {
  document.getElementById('sem-dropdown')?.classList.remove('open');
}

export function selectSem(sem) {
  closeSemDropdown();
  if (sem === currentSem) return;
  currentSem = sem;
  switchSem(sem);
}

export function switchSem(sem) {
  const label = document.getElementById('sem-trigger-label');
  if (label) label.textContent = sem > 0 ? 'Sem ' + sem : 'Others';

  // Reset search query on semester change
  const searchInput = document.getElementById('course-search');
  if (searchInput) searchInput.value = '';

  // Update active state in menu options
  const options = document.querySelectorAll('.sem-option');
  options.forEach(opt => {
    opt.classList.toggle('active', parseInt(opt.getAttribute('data-sem'), 10) === sem);
  });

  // Filter courses to selected semester
  const filtered = sem > 0
    ? allCourses.filter(c => semNum(c) === sem)
    : allCourses.filter(c => semNum(c) === 0);

  cachedCourses = filtered;
  renderCourseList(filtered);
}

export function refreshCourses() {
  if (!token) {
    showView('auth');
    return;
  }
  fetchCoursesFromApi(true);
}

export function showCourses() {
  showView('courses');
}

// ── Course Content Accordion View ────────────────────────────
export async function openCourse(idx) {
  const course = displayedCourses[idx] || cachedCourses[idx];
  if (!course) return;

  if (!token) {
    const c = loadCreds();
    if (c && c.moodleEmail && c.moodlePass) {
      showView('auth');
      showAuthOverlay();
      doLoginWithCreds(c.moodleEmail, c.moodlePass);
    } else {
      showView('auth');
    }
    return;
  }

  const info = parseCourseInfo(course.fullname);
  const titleEl = document.getElementById('content-title');
  const listEl = document.getElementById('content-list');
  if (titleEl) titleEl.textContent = info.name;
  if (listEl) listEl.innerHTML = loadingHtml();
  showView('content');

  try {
    const sections = await api.moodleCall(token, 'core_course_get_contents', { courseid: course.id });
    if (!Array.isArray(sections) || !sections.length) {
      if (listEl) listEl.innerHTML = stateHtml('No content in this course.');
      return;
    }

    let html = '';
    let hasAny = false;
    sections.forEach((sec, si) => {
      if (!sec.modules || !sec.modules.length) return;
      // Skip simple layout labels, quizzes, and Announcements
      const real = sec.modules.filter(m => {
        if (m.modname === 'label') return false;
        if (m.modname === 'quiz') return false;
        if (m.modname === 'forum' && m.name && m.name.toLowerCase() === 'announcements') return false;
        return true;
      });
      if (!real.length) return;
      hasAny = true;

      const secName = sec.name || 'Section ' + (si + 1);

      html += `
        <div class="section-card" id="sc-${si}">
          <div class="section-header">
            <span class="section-title">${escHtml(secName)}</span>
          </div>
          <div class="section-body">
            <div class="section-body-inner">`;

      real.forEach(mod => {
        if (mod.contents && mod.contents.length) {
          mod.contents.forEach(f => {
            if (!f.fileurl) return;
            const ext = (f.filename || '').split('.').pop().toLowerCase();
            const size = f.filesize ? (f.filesize > 1048576 ? (f.filesize / 1048576).toFixed(1) + ' MB' : Math.ceil(f.filesize / 1024) + ' KB') : '';
            const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'tif', 'avif', 'heic'].includes(ext);
            const isPdf = ext === 'pdf';
            const isOfficeDoc = ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'csv', 'odt', 'ods', 'odp', 'rtf', 'txt'].includes(ext);
            const isVideo = ['mp4', 'webm', 'ogg', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'm4v', '3gp', 'ogv', 'ts', 'm2ts', 'vob', 'mpg', 'mpeg'].includes(ext);
            const isAudio = ['mp3', 'wav', 'aac', 'ogg', 'm4a', 'flac', 'wma', 'opus', 'aiff', 'alac', 'mid', 'midi'].includes(ext);

            // Determine file badge
            const badge = getFileBadge(f.filename, mod.modname);

            // Resource display name
            let displayName = f.filename;
            if (mod.modname === 'resource') {
              displayName = mod.name;
            } else if (mod.modname === 'folder' && mod.contents.length === 1) {
              displayName = mod.name;
            }
            displayName = decodeHtml(displayName);

            // Proxy URL routes to backend proxy
            const proxyUrl = api.getMoodleFileProxyUrl(f.fileurl, token, userName, userUsn, false);
            const downloadProxyUrl = api.getMoodleFileProxyUrl(f.fileurl, token, userName, userUsn, true);

            if (isImage) {
              const onclickAction = `openImageLightbox(${escHtml(JSON.stringify(proxyUrl))},${escHtml(JSON.stringify(displayName))})`;
              html += `
                <div class="res-item">
                  <span class="res-badge ${badge.toLowerCase()}">${badge}</span>
                  <span class="res-name">${escHtml(displayName)}</span>
                  ${size ? `<span class="res-size">${size}</span>` : ''}
                  <div class="res-actions">
                    <button class="res-btn btn-view" onclick="${onclickAction}">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg><span>View</span>
                    </button>
                    <a href="${escHtml(downloadProxyUrl)}" class="res-btn btn-download" download>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg><span>Download</span>
                    </a>
                  </div>
                </div>`;
            } else if (isPdf || isOfficeDoc || isVideo || isAudio) {
              const onclickAction = `openDocLightbox(${escHtml(JSON.stringify(proxyUrl))},${escHtml(JSON.stringify(displayName))},${escHtml(JSON.stringify(ext))})`;
              const isMedia = isVideo || isAudio;
              const btnIcon = isMedia
                ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>'
                : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
              const btnLabel = isMedia ? 'Play' : 'View';

              html += `
                <div class="res-item">
                  <span class="res-badge ${badge.toLowerCase()}">${badge}</span>
                  <span class="res-name">${escHtml(displayName)}</span>
                  ${size ? `<span class="res-size">${size}</span>` : ''}
                  <div class="res-actions">
                    <button class="res-btn btn-view" onclick="${onclickAction}">
                      ${btnIcon}<span>${btnLabel}</span>
                    </button>
                    <a href="${escHtml(downloadProxyUrl)}" class="res-btn btn-download" download>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg><span>Download</span>
                    </a>
                  </div>
                </div>`;
            } else {
              html += `
                <div class="res-item">
                  <span class="res-badge ${badge.toLowerCase()}">${badge}</span>
                  <span class="res-name">${escHtml(displayName)}</span>
                  ${size ? `<span class="res-size">${size}</span>` : ''}
                  <div class="res-actions">
                    <a href="${escHtml(proxyUrl)}" class="res-btn btn-view" target="_blank">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg><span>View</span>
                    </a>
                    <a href="${escHtml(downloadProxyUrl)}" class="res-btn btn-download" download>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg><span>Download</span>
                    </a>
                  </div>
                </div>`;
            }
          });
        } else {
          // Fallback if there is a web link but no contents files
          const modUrl = mod.url || '';
          const badge = getFileBadge('', mod.modname);
          if (modUrl) {
            const decodedName = decodeHtml(mod.name);
            html += `
              <div class="res-item">
                <span class="res-badge ${badge.toLowerCase()}">${badge}</span>
                <span class="res-name">${escHtml(decodedName)}</span>
                <div class="res-actions">
                  <a href="${escHtml(modUrl)}" class="res-btn btn-view" target="_blank">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg><span>Open</span>
                  </a>
                </div>
              </div>`;
          } else {
            const decodedName = decodeHtml(mod.name);
            html += `
              <div class="res-item no-link">
                <span class="res-badge ${badge.toLowerCase()}">${badge}</span>
                <span class="res-name">${escHtml(decodedName)}</span>
              </div>`;
          }
        }
      });
      html += '</div></div></div>';
    });

    if (!hasAny) html = stateHtml('No downloadable content in this course.');
    if (listEl) listEl.innerHTML = html;
  } catch (e) {
    if (e.message === 'invalidtoken') {
      handleInvalidToken();
      return;
    }
    if (listEl) listEl.innerHTML = stateHtml('Could not load course contents. Please try again.');
  }
}

// ── Badge Helpers ────────────────────────────────────────────
export function getFileBadge(filename, modname) {
  if (!filename) {
    const map = { assign: 'TASK', quiz: 'QUIZ', resource: 'PDF', folder: 'FLDR', url: 'LINK', forum: 'DISC', page: 'PAGE', label: 'INFO' };
    return map[modname] || (modname || 'FILE').toUpperCase().slice(0, 4);
  }
  const ext = filename.split('.').pop().toLowerCase();
  const map = {
    // PDF
    pdf: 'PDF',
    // Images
    png: 'IMG', jpg: 'IMG', jpeg: 'IMG', gif: 'IMG', webp: 'IMG', svg: 'IMG', bmp: 'IMG', ico: 'IMG', tiff: 'IMG', tif: 'IMG', avif: 'IMG', heic: 'IMG',
    // Presentations
    ppt: 'PPT', pptx: 'PPT', odp: 'PPT',
    // Documents
    doc: 'DOC', docx: 'DOC', odt: 'DOC', rtf: 'DOC', txt: 'TXT',
    // Spreadsheets
    xls: 'XLS', xlsx: 'XLS', ods: 'XLS', csv: 'XLS',
    // Archives
    zip: 'ZIP', rar: 'ZIP', '7z': 'ZIP', tar: 'ZIP', gz: 'ZIP',
    // Videos
    mp4: 'VIDEO', webm: 'VIDEO', mkv: 'VIDEO', avi: 'VIDEO', mov: 'VIDEO', wmv: 'VIDEO', flv: 'VIDEO', m4v: 'VIDEO', '3gp': 'VIDEO', ogv: 'VIDEO', ts: 'VIDEO', m2ts: 'VIDEO', vob: 'VIDEO', mpg: 'VIDEO', mpeg: 'VIDEO',
    // Audios
    mp3: 'AUDIO', wav: 'AUDIO', aac: 'AUDIO', ogg: 'AUDIO', m4a: 'AUDIO', flac: 'AUDIO', wma: 'AUDIO', opus: 'AUDIO', aiff: 'AUDIO', alac: 'AUDIO', mid: 'AUDIO', midi: 'AUDIO',
    // Code & Data
    py: 'CODE', java: 'CODE', c: 'CODE', cpp: 'CODE', cs: 'CODE', js: 'CODE', ts: 'CODE', html: 'CODE', css: 'CODE', php: 'CODE', json: 'CODE', xml: 'CODE', sql: 'CODE', sh: 'CODE', ipynb: 'NOTE', md: 'DOC'
  };
  return map[ext] || (ext.length <= 4 ? ext.toUpperCase() : 'FILE');
}

// ── Image Lightbox Handlers ──────────────────────────────────
export function openImageLightbox(url, name) {
  const lb = document.getElementById('image-lightbox');
  const img = document.getElementById('lightbox-img');
  const cap = document.getElementById('lightbox-caption');
  if (!lb || !img || !cap) return;

  img.src = url;
  cap.textContent = name;
  lb.style.display = 'flex';

  setTimeout(() => {
    lb.classList.add('show');
  }, 12);
}

export function closeImageLightbox() {
  const lb = document.getElementById('image-lightbox');
  if (!lb) return;
  lb.classList.remove('show');

  setTimeout(() => {
    lb.style.display = 'none';
    const img = document.getElementById('lightbox-img');
    if (img) img.src = '';
  }, 300);
}

// ── Document Lightbox Handlers ───────────────────────────────
export function openDocLightbox(url, name, ext) {
  const lb = document.getElementById('doc-lightbox');
  const ifr = document.getElementById('doc-iframe');
  const pdfC = document.getElementById('pdf-container');
  const mediaC = document.getElementById('media-container');
  const loader = document.getElementById('doc-loader');
  const title = document.getElementById('doc-title');
  const videoEl = document.getElementById('plyr-video');
  const audioEl = document.getElementById('plyr-audio');
  if (!lb || !title) return;

  title.textContent = name;

  const isMsDoc = ['doc', 'docx', 'xls', 'xlsx', 'csv'].includes(ext);
  const isGoogleDoc = ['ppt', 'pptx', 'odp', 'odt', 'ods', 'rtf'].includes(ext);
  const isPdf = ext === 'pdf';
  const isVideo = ['mp4', 'webm', 'ogg', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'm4v', '3gp', 'ogv', 'ts', 'm2ts', 'vob', 'mpg', 'mpeg'].includes(ext);
  const isAudio = ['mp3', 'wav', 'aac', 'ogg', 'm4a', 'flac', 'wma', 'opus', 'aiff', 'alac', 'mid', 'midi'].includes(ext);
  const absoluteUrl = url.startsWith('http') ? url : window.location.origin + url;

  if (ifr) ifr.style.display = 'none';
  if (pdfC) pdfC.style.display = 'none';
  if (mediaC) {
    mediaC.style.display = 'none';
    mediaC.classList.remove('active');
  }
  if (loader) loader.style.display = 'none';
  if (videoEl) {
    videoEl.style.display = 'none';
    videoEl.src = '';
  }
  if (audioEl) {
    audioEl.style.display = 'none';
    audioEl.src = '';
  }

  // Clean up any existing Plyr instance
  if (window.currentPlyr) {
    try {
      window.currentPlyr.destroy();
    } catch(e) {}
    window.currentPlyr = null;
  }

  if (isVideo || isAudio) {
    if (mediaC) {
      mediaC.style.display = 'flex';
      mediaC.classList.add('active');
    }
    const targetEl = isVideo ? videoEl : audioEl;
    if (targetEl) {
      targetEl.style.display = 'block';
      targetEl.src = url;

      const initPlyrInstance = () => {
        if (typeof window.Plyr !== 'undefined' && !window.currentPlyr) {
          try {
            window.currentPlyr = new window.Plyr(targetEl, {
              title: name,
              controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen'],
              autoplay: false
            });
          } catch(e) {
            console.warn('Plyr error:', e);
          }
        }
      };

      if (typeof window.Plyr !== 'undefined') {
        initPlyrInstance();
      } else {
        setTimeout(initPlyrInstance, 300);
      }
    }
  } else if (isMsDoc || isGoogleDoc || (!isPdf && !isVideo && !isAudio)) {
    if (loader) loader.style.display = 'flex';
    if (ifr) {
      ifr.style.display = 'block';
      if (isMsDoc) {
        ifr.src = 'https://view.officeapps.live.com/op/embed.aspx?src=' + encodeURIComponent(absoluteUrl);
      } else if (isGoogleDoc) {
        ifr.src = 'https://docs.google.com/gview?url=' + encodeURIComponent(absoluteUrl) + '&embedded=true';
      } else {
        ifr.src = url;
      }
    }
  } else if (isPdf) {
    if (pdfC) {
      pdfC.style.display = 'block';
      renderPdf(url);
    }
  }

  lb.style.display = 'flex';
  setTimeout(() => {
    lb.classList.add('show');
  }, 12);
}

export function hideDocLoader() {
  const loader = document.getElementById('doc-loader');
  if (loader) loader.style.display = 'none';
}

export function closeDocLightbox() {
  const lb = document.getElementById('doc-lightbox');
  if (!lb) return;
  lb.classList.remove('show');

  if (window.currentPlyr) {
    try {
      window.currentPlyr.stop();
    } catch(e) {}
  }

  setTimeout(() => {
    lb.style.display = 'none';
    const ifr = document.getElementById('doc-iframe');
    const pdfC = document.getElementById('pdf-container');
    const mediaC = document.getElementById('media-container');
    const videoEl = document.getElementById('plyr-video');
    const audioEl = document.getElementById('plyr-audio');
    if (ifr) ifr.src = '';
    if (pdfC) pdfC.innerHTML = '';
    if (videoEl) {
      videoEl.pause?.();
      videoEl.src = '';
    }
    if (audioEl) {
      audioEl.pause?.();
      audioEl.src = '';
    }
    if (mediaC) mediaC.classList.remove('active');

    if (window.currentPlyr) {
      try {
        window.currentPlyr.destroy();
      } catch(e) {}
      window.currentPlyr = null;
    }
  }, 300);
}

// ── PDF.js Multi-Page Canvas Renderer ─────────────────────────
export function renderPdf(url) {
  const container = document.getElementById('pdf-container');
  if (!container) return;
  container.innerHTML = '<div style="padding:40px; text-align:center; color:#64748b; font-weight:600; font-family:sans-serif;"><div class="spinner" style="margin: 0 auto 16px;"></div>Loading PDF...</div>';

  if (typeof window.pdfjsLib === 'undefined') {
    container.innerHTML = '<div style="padding:40px; text-align:center;"><a href="' + url + '" target="_blank" class="res-btn btn-view">Open PDF in New Tab</a></div>';
    return;
  }

  window.pdfjsLib.getDocument(url).promise.then(pdf => {
    container.innerHTML = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const canvasWrapper = document.createElement('div');
      canvasWrapper.style.marginBottom = '12px';
      canvasWrapper.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
      canvasWrapper.style.borderRadius = '8px';
      canvasWrapper.style.overflow = 'hidden';
      canvasWrapper.style.background = '#fff';
      canvasWrapper.style.display = 'flex';
      canvasWrapper.style.justifyContent = 'center';
      canvasWrapper.style.minHeight = '400px';

      const canvas = document.createElement('canvas');
      canvas.style.width = '100%';
      canvas.style.height = 'auto';
      canvas.style.display = 'block';

      canvasWrapper.appendChild(canvas);
      container.appendChild(canvasWrapper);

      renderPdfPage(pdf, i, canvas, canvasWrapper);
    }
  }).catch(err => {
    container.innerHTML = '<div style="padding:40px; text-align:center; color:#ef4444; font-weight:600;">Failed to load PDF: ' + escHtml(err.message) + '</div>';
  });
}

export function renderPdfPage(pdf, num, canvas, wrapper) {
  pdf.getPage(num).then(page => {
    const viewport = page.getViewport({ scale: window.devicePixelRatio > 1 ? 2 : 1.5 });
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    wrapper.style.minHeight = 'auto';
    const ctx = canvas.getContext('2d');
    page.render({ canvasContext: ctx, viewport: viewport });
  });
}

// ── Bind Window Global Handlers ──────────────────────────────
if (typeof window !== 'undefined') {
  window.doLogin = doLogin;
  window.refreshCourses = refreshCourses;
  window.showCourses = showCourses;
  window.filterCourses = filterCourses;
  window.toggleSemDropdown = toggleSemDropdown;
  window.closeSemDropdown = closeSemDropdown;
  window.selectSem = selectSem;
  window.switchSem = switchSem;
  window.openCourse = openCourse;
  window.openImageLightbox = openImageLightbox;
  window.closeImageLightbox = closeImageLightbox;
  window.openDocLightbox = openDocLightbox;
  window.closeDocLightbox = closeDocLightbox;
  window.hideDocLoader = hideDocLoader;

  // Auto-close image lightbox when clicking outside
  document.addEventListener('click', e => {
    const lb = document.getElementById('image-lightbox');
    if (e.target === lb) closeImageLightbox();
  });
}
