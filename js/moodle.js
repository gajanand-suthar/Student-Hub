// ═══════════════════════════════════════════════════════════════
//  STUDENT HUB — Moodle Client Logic
// ═══════════════════════════════════════════════════════════════

import { CONFIG } from './config.js';
import { api } from './api.js';
import { loadCreds, initTheme, initPwa } from './shared.js';

let token = localStorage.getItem(CONFIG.TOKEN_KEY) || '';
let currentUserId = null;
let currentSem = 0;
let allCourses = [];
let allSemesters = [];
let cachedCourses = [];
let displayedCourses = [];
let userName = 'Anonymous';
let userUsn = 'Unknown';

export async function initMoodle() {
  initTheme();
  initPwa();

  try {
    const u = JSON.parse(localStorage.getItem(CONFIG.USER_KEY) || '{}');
    if (u.name) userName = u.name;
    const c = loadCreds() || {};
    if (c.usn) userUsn = c.usn;
  } catch (e) {}

  const c = loadCreds();
  if (c && c.moodleEmail) {
    const emailEl = document.getElementById('inp-email');
    const passEl = document.getElementById('inp-pass');
    if (emailEl) emailEl.value = c.moodleEmail.split('@')[0];
    if (passEl) passEl.value = c.moodlePass || '';
  }

  let cache = null;
  try {
    cache = JSON.parse(localStorage.getItem(CONFIG.COURSES_KEY));
  } catch (e) {}

  if (cache && cache.allCourses && cache.allCourses.length > 0) {
    allCourses = cache.allCourses;
    assignSemesters(allCourses);
    const semSet = {};
    allCourses.forEach(c => {
      if (c._sem > 0) semSet[c._sem] = true;
    });
    allSemesters = Object.keys(semSet).map(Number).sort((a, b) => b - a);
    currentSem = cache.sem || (allSemesters.length ? allSemesters[0] : 0);
    const hasOtherCached = allCourses.some(c => c._sem === 0);
    cachedCourses = currentSem > 0 ? allCourses.filter(c => c._sem === currentSem) : allCourses;
    buildSemDropdown(allSemesters, currentSem, hasOtherCached);
    renderCourseList(cachedCourses);
    showView('courses');
    if (token) fetchCoursesFromApi(false);
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

export function showView(v) {
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  document.getElementById('view-' + v)?.classList.add('active');

  if (v === 'content') {
    document.body.classList.add('page-scrollable');
  } else {
    document.body.classList.remove('page-scrollable');
  }
  window.scrollTo({ top: 0 });
}

export function showAuthOverlay() {
  document.getElementById('auth-overlay')?.classList.add('show');
}
export function hideAuthOverlay() {
  document.getElementById('auth-overlay')?.classList.remove('show');
}
export function showAuthErr(msg) {
  const e = document.getElementById('auth-err');
  if (e) {
    e.textContent = msg;
    e.style.display = 'block';
  }
  hideAuthOverlay();
}

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

  const c = loadCreds() || {};
  c.moodleEmail = fullEmail;
  c.moodlePass = pass;
  localStorage.setItem(CONFIG.CRED_KEY, JSON.stringify(c));

  doLoginWithCreds(fullEmail, pass);
}

async function doLoginWithCreds(email, pass) {
  try {
    const data = await api.moodleLogin(email, pass, userName, userUsn);
    token = data.token;
    localStorage.setItem(CONFIG.TOKEN_KEY, token);
    hideAuthOverlay();
    showView('courses');
    fetchCoursesFromApi(true);
  } catch (err) {
    showAuthErr('Login failed: ' + err.message);
  }
}

export async function fetchCoursesFromApi(forceRefresh) {
  const btn = document.getElementById('refresh-btn');
  if (btn && forceRefresh) btn.classList.add('spinning');
  if (!cachedCourses.length) {
    const list = document.getElementById('courses-list');
    if (list) list.innerHTML = '<div class="loader-wrap"><div class="spinner"></div>Loading course materials...</div>';
  }

  try {
    const info = await api.moodleCall(token, 'core_webservice_get_site_info');
    if (!info || !info.userid) throw new Error('no userid');
    currentUserId = info.userid;

    const all = await api.moodleCall(token, 'core_enrol_get_users_courses', { userid: currentUserId });
    if (btn) btn.classList.remove('spinning');

    if (!Array.isArray(all) || !all.length) {
      document.getElementById('courses-list').innerHTML = '<div class="loader-wrap">No courses found.</div>';
      return;
    }

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

    allSemesters = Object.keys(semSet).map(Number).sort((a, b) => b - a);
    currentSem = maxSem || (allSemesters.length ? allSemesters[0] : 1);

    localStorage.setItem(
      CONFIG.COURSES_KEY,
      JSON.stringify({ allCourses: all, semesters: allSemesters, sem: currentSem, hasOther })
    );

    buildSemDropdown(allSemesters, currentSem, hasOther);
    switchSem(currentSem);
  } catch (e) {
    if (e.message === 'invalidtoken') {
      token = '';
      localStorage.removeItem(CONFIG.TOKEN_KEY);
      showView('auth');
      return;
    }
    if (btn) btn.classList.remove('spinning');
    if (!cachedCourses.length) {
      document.getElementById('courses-list').innerHTML = '<div class="loader-wrap">Could not load courses. Tap refresh.</div>';
    }
  }
}

function assignSemesters(courses) {
  if (!Array.isArray(courses) || !courses.length) return;
  const catMap = {};

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

  const categories = Object.values(catMap).map(item => {
    item.avgTimestamp = item.count > 0 ? item.totalTimestamp / item.count : 0;
    return item;
  });

  categories.sort((a, b) => b.avgTimestamp - a.avgTimestamp);

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
      clusters.push({ categories: [cat], avgTimestamp: cat.avgTimestamp });
    }
  });

  clusters.sort((a, b) => b.avgTimestamp - a.avgTimestamp);
  const totalSems = clusters.length;
  const knownSemTimestamps = [];

  clusters.forEach((cluster, index) => {
    const semNum = totalSems - index;
    cluster.semNum = semNum;
    knownSemTimestamps.push({ sem: semNum, timestamp: cluster.avgTimestamp });
    cluster.categories.forEach(cat => {
      cat.courses.forEach(c => (c._sem = semNum));
    });
  });

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

function parseCourseInfo(fullname) {
  let str = (fullname || '').replace(/[_()[\]{}]/g, ' ');
  let prev = '';
  while (str !== prev) {
    prev = str;
    str = str.replace(/^(?:20\d{2}(?:-\d{2})?|\d{2}-\d{2}|20\d{2}|\d+(?:st|nd|rd|th)?|EEE|ECE|CSE|MECH|CIV|ISE|SEM|SEMESTER|EVEN|ODD|SEC|SECTION|DIV|[A-D])\b[\s:\-\|,()]*/gi, '');
    str = str.replace(/[\s:\-\|,()]*\b(?:20\d{2}(?:-\d{2})?|\d{2}-\d{2}|20\d{2}|\d+(?:st|nd|rd|th)?|EEE|ECE|CSE|MECH|CIV|ISE|SEM|SEMESTER|EVEN|ODD|SEC|SECTION|DIV|[A-D])\s*$/gi, '');
    str = str.replace(/[\s:\-\|,()]+\d+\s*$/gi, '');
  }
  const result = str.replace(/^[\s:\-\|,()]+/, '').replace(/[\s:\-\|,()]+$/, '').replace(/\s+/g, ' ');
  return { name: result || fullname };
}

export function renderCourseList(courses, isSearch = false) {
  displayedCourses = courses || [];
  const list = document.getElementById('courses-list');
  if (!list) return;

  if (!courses || !courses.length) {
    list.innerHTML = '<div class="loader-wrap">No courses found.</div>';
    return;
  }

  if (!isSearch) {
    list.style.setProperty('--num-courses', courses.length || 1);
  }

  list.innerHTML = courses
    .map((c, i) => {
      const info = parseCourseInfo(c.fullname);
      return `
        <div class="course-card" onclick="openCourse(${i})">
          <div class="cc-info">
            <div class="cc-title">${escHtml(info.name)}</div>
          </div>
          <div class="cc-arrow-right">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </div>`;
    })
    .join('');
}

export function filterCourses() {
  const query = (document.getElementById('course-search')?.value || '').toLowerCase().trim();
  if (!query) {
    renderCourseList(cachedCourses, false);
    return;
  }
  const matches = allCourses.filter(c => {
    const info = parseCourseInfo(c.fullname);
    const text = `${c.fullname || ''} ${info.name || ''} ${c.shortname || ''}`.toLowerCase();
    return text.includes(query);
  });
  renderCourseList(matches, true);
}

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

  let html = semesters
    .map(sem => `<button class="sem-option${sem === activeSem ? ' active' : ''}" data-sem="${sem}" onclick="selectSem(${sem})">Sem ${sem}</button>`)
    .join('');

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

  const searchInput = document.getElementById('course-search');
  if (searchInput) searchInput.value = '';

  document.querySelectorAll('.sem-option').forEach(opt => {
    opt.classList.toggle('active', parseInt(opt.getAttribute('data-sem'), 10) === sem);
  });

  const filtered = sem > 0 ? allCourses.filter(c => (c._sem || 0) === sem) : allCourses.filter(c => (c._sem || 0) === 0);
  cachedCourses = filtered;
  renderCourseList(filtered);
}

export async function openCourse(idx) {
  const course = displayedCourses[idx] || cachedCourses[idx];
  if (!course) return;

  if (!token) {
    showView('auth');
    return;
  }

  const info = parseCourseInfo(course.fullname);
  const titleEl = document.getElementById('content-title');
  const listEl = document.getElementById('content-list');
  if (titleEl) titleEl.textContent = info.name;
  if (listEl) listEl.innerHTML = '<div class="loader-wrap"><div class="spinner"></div>Loading course materials...</div>';
  showView('content');

  try {
    const sections = await api.moodleCall(token, 'core_course_get_contents', { courseid: course.id });
    if (!Array.isArray(sections) || !sections.length) {
      if (listEl) listEl.innerHTML = '<div class="loader-wrap">No content in this course.</div>';
      return;
    }

    let html = '';
    let hasAny = false;

    sections.forEach((sec, si) => {
      if (!sec.modules || !sec.modules.length) return;
      const real = sec.modules.filter(m => m.modname !== 'label' && m.modname !== 'quiz' && (m.modname !== 'forum' || (m.name && m.name.toLowerCase() !== 'announcements')));
      if (!real.length) return;
      hasAny = true;

      const secName = sec.name || `Section ${si + 1}`;
      html += `
        <div class="section-card">
          <div class="section-header"><span class="section-title">${escHtml(secName)}</span></div>
          <div class="section-body">`;

      real.forEach(mod => {
        if (mod.contents && mod.contents.length) {
          mod.contents.forEach(f => {
            if (!f.fileurl) return;
            const ext = (f.filename || '').split('.').pop().toLowerCase();
            const size = f.filesize ? (f.filesize > 1048576 ? (f.filesize / 1048576).toFixed(1) + ' MB' : Math.ceil(f.filesize / 1024) + ' KB') : '';
            const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
            const isPdf = ext === 'pdf';
            const isOfficeDoc = ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(ext);
            const badge = getFileBadge(f.filename, mod.modname);

            let displayName = f.filename;
            if (mod.modname === 'resource' || (mod.modname === 'folder' && mod.contents.length === 1)) {
              displayName = mod.name;
            }

            const proxyUrl = api.getMoodleFileProxyUrl(f.fileurl, token, userName, userUsn, false);
            const downloadProxyUrl = api.getMoodleFileProxyUrl(f.fileurl, token, userName, userUsn, true);

            if (isImage) {
              html += `
                <div class="res-item">
                  <span class="res-badge ${badge.toLowerCase()}">${badge}</span>
                  <span class="res-name">${escHtml(displayName)}</span>
                  ${size ? `<span class="res-size">${size}</span>` : ''}
                  <div class="res-actions">
                    <button class="res-btn btn-view" onclick="openImageLightbox('${escHtml(proxyUrl)}','${escHtml(displayName)}')">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg><span>View</span>
                    </button>
                    <a href="${escHtml(downloadProxyUrl)}" class="res-btn btn-download" download>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg><span>Download</span>
                    </a>
                  </div>
                </div>`;
            } else if (isPdf || isOfficeDoc) {
              html += `
                <div class="res-item">
                  <span class="res-badge ${badge.toLowerCase()}">${badge}</span>
                  <span class="res-name">${escHtml(displayName)}</span>
                  ${size ? `<span class="res-size">${size}</span>` : ''}
                  <div class="res-actions">
                    <button class="res-btn btn-view" onclick="openDocLightbox('${escHtml(proxyUrl)}','${escHtml(displayName)}','${ext}')">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg><span>View</span>
                    </button>
                    <a href="${escHtml(downloadProxyUrl)}" class="res-btn btn-download" download>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg><span>Download</span>
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
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg><span>View</span>
                    </a>
                    <a href="${escHtml(downloadProxyUrl)}" class="res-btn btn-download" download>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg><span>Download</span>
                    </a>
                  </div>
                </div>`;
            }
          });
        }
      });

      html += '</div></div>';
    });

    if (!hasAny) html = '<div class="loader-wrap">No downloadable content in this course.</div>';
    if (listEl) listEl.innerHTML = html;
  } catch (e) {
    if (listEl) listEl.innerHTML = '<div class="loader-wrap">Could not load course contents.</div>';
  }
}

function getFileBadge(filename, modname) {
  if (!filename) {
    const map = { assign: 'TASK', quiz: 'QUIZ', resource: 'PDF', folder: 'FLDR', url: 'LINK', forum: 'DISC', page: 'PAGE', label: 'INFO' };
    return map[modname] || (modname || 'FILE').toUpperCase().slice(0, 4);
  }
  const ext = filename.split('.').pop().toLowerCase();
  const map = { pdf: 'PDF', png: 'IMG', jpg: 'IMG', jpeg: 'IMG', gif: 'IMG', webp: 'IMG', ppt: 'PPT', pptx: 'PPT', doc: 'DOC', docx: 'DOC', xls: 'XLS', xlsx: 'XLS', zip: 'ZIP', txt: 'TXT' };
  return map[ext] || 'FILE';
}

// ── Lightbox Viewers ──
export function openImageLightbox(url, name) {
  const lb = document.getElementById('image-lightbox');
  const img = document.getElementById('lightbox-img');
  const cap = document.getElementById('lightbox-caption');
  if (!lb || !img || !cap) return;
  img.src = url;
  cap.textContent = name;
  lb.style.display = 'flex';
  setTimeout(() => lb.classList.add('show'), 12);
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
  const isMsDoc = ['doc', 'docx', 'xls', 'xlsx'].includes(ext);
  const isGoogleDoc = ['ppt', 'pptx'].includes(ext);
  const isPdf = ext === 'pdf';
  const isVideo = ['mp4', 'webm', 'ogg'].includes(ext);
  const isAudio = ['mp3', 'wav', 'aac'].includes(ext);
  const absoluteUrl = url.startsWith('http') ? url : window.location.origin + url;

  if (ifr) ifr.style.display = 'none';
  if (pdfC) pdfC.style.display = 'none';
  if (mediaC) mediaC.style.display = 'none';
  if (loader) loader.style.display = 'none';
  if (videoEl) videoEl.style.display = 'none';
  if (audioEl) audioEl.style.display = 'none';

  if (window.currentPlyr) {
    window.currentPlyr.destroy();
    window.currentPlyr = null;
  }

  if (isVideo || isAudio) {
    if (mediaC) mediaC.style.display = 'flex';
    const targetEl = isVideo ? videoEl : audioEl;
    if (targetEl) {
      targetEl.style.display = 'block';
      targetEl.src = url;
      if (typeof window.Plyr !== 'undefined') {
        window.currentPlyr = new window.Plyr(targetEl, {
          title: name,
          controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen']
        });
      }
    }
  } else if (isMsDoc || isGoogleDoc || (!isPdf && !isVideo && !isAudio)) {
    if (loader) loader.style.display = 'flex';
    if (ifr) {
      ifr.style.display = 'block';
      if (isMsDoc) ifr.src = 'https://view.officeapps.live.com/op/embed.aspx?src=' + encodeURIComponent(absoluteUrl);
      else if (isGoogleDoc) ifr.src = 'https://docs.google.com/gview?url=' + encodeURIComponent(absoluteUrl) + '&embedded=true';
      else ifr.src = url;
    }
  } else if (isPdf) {
    if (pdfC) {
      pdfC.style.display = 'block';
      renderPdf(url);
    }
  }

  lb.style.display = 'flex';
  setTimeout(() => lb.classList.add('show'), 12);
}

export function hideDocLoader() {
  const loader = document.getElementById('doc-loader');
  if (loader) loader.style.display = 'none';
}

export function closeDocLightbox() {
  const lb = document.getElementById('doc-lightbox');
  if (!lb) return;
  lb.classList.remove('show');
  if (window.currentPlyr) window.currentPlyr.stop();
  setTimeout(() => {
    lb.style.display = 'none';
    const ifr = document.getElementById('doc-iframe');
    const pdfC = document.getElementById('pdf-container');
    if (ifr) ifr.src = '';
    if (pdfC) pdfC.innerHTML = '';
    if (window.currentPlyr) {
      window.currentPlyr.destroy();
      window.currentPlyr = null;
    }
  }, 300);
}

function renderPdf(url) {
  const container = document.getElementById('pdf-container');
  if (!container) return;
  container.innerHTML = '<div style="padding:40px; text-align:center; color:#64748b;"><div class="spinner" style="margin: 0 auto 16px;"></div>Loading PDF...</div>';

  if (typeof window.pdfjsLib === 'undefined') {
    container.innerHTML = '<div style="padding:40px; text-align:center;"><a href="' + url + '" target="_blank" class="res-btn btn-view">Open PDF in New Tab</a></div>';
    return;
  }

  window.pdfjsLib.getDocument(url).promise.then(pdf => {
    container.innerHTML = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const canvasWrapper = document.createElement('div');
      canvasWrapper.style.marginBottom = '12px';
      canvasWrapper.style.borderRadius = '8px';
      canvasWrapper.style.overflow = 'hidden';
      canvasWrapper.style.background = '#fff';
      canvasWrapper.style.display = 'flex';
      canvasWrapper.style.justifyContent = 'center';

      const canvas = document.createElement('canvas');
      canvas.style.width = '100%';
      canvas.style.height = 'auto';
      canvas.style.display = 'block';

      canvasWrapper.appendChild(canvas);
      container.appendChild(canvasWrapper);

      pdf.getPage(i).then(page => {
        const viewport = page.getViewport({ scale: window.devicePixelRatio > 1 ? 2 : 1.5 });
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        const ctx = canvas.getContext('2d');
        page.render({ canvasContext: ctx, viewport });
      });
    }
  }).catch(err => {
    container.innerHTML = `<div style="padding:40px; text-align:center; color:#ef4444;">Failed to load PDF: ${err.message}</div>`;
  });
}

function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Bind window handlers
if (typeof window !== 'undefined') {
  window.doLogin = doLogin;
  window.refreshCourses = () => fetchCoursesFromApi(true);
  window.showCourses = () => showView('courses');
  window.filterCourses = filterCourses;
  window.toggleSemDropdown = toggleSemDropdown;
  window.closeSemDropdown = closeSemDropdown;
  window.selectSem = selectSem;
  window.openCourse = openCourse;
  window.openImageLightbox = openImageLightbox;
  window.closeImageLightbox = closeImageLightbox;
  window.openDocLightbox = openDocLightbox;
  window.closeDocLightbox = closeDocLightbox;
  window.hideDocLoader = hideDocLoader;
}
