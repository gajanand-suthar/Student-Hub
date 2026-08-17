// ═══════════════════════════════════════════════════════════════
//  STUDENT HUB — Dashboard & Home Page Logic
// ═══════════════════════════════════════════════════════════════

import { CONFIG } from './config.js';
import { api } from './api.js';
import { loadCreds, checkSugUnread, initTheme, initPwa } from './shared.js';

let obStep = 0;
let isTouchDevice = false;

// ── Academic Events Database (Client-Side Static) ──
const ACADEMIC_EVENTS = [
  { startDate: '2026-08-10', endDate: '2026-08-11', title: 'Course Registration (Physical)', sems: ['III', 'V', 'VII'], isExam: false },
  { startDate: '2026-08-10', endDate: '2026-08-14', title: 'Placement Activity for V semester students', sems: ['V'], isExam: false },
  { startDate: '2026-08-10', endDate: '2026-08-10', title: 'Commencement of classes for III & VII semester students', sems: ['III', 'VII'], isExam: false },
  { startDate: '2026-08-12', endDate: '2026-08-13', title: 'Course registration with late fee', sems: ['III', 'V', 'VII'], isExam: false },
  { startDate: '2026-08-17', endDate: '2026-08-17', title: 'Commencement of classes for V semester students', sems: ['V'], isExam: false },
  { startDate: '2026-08-21', endDate: '2026-08-22', title: 'Add/Dropping of Courses', sems: ['III', 'V', 'VII'], isExam: false },
  { startDate: '2026-09-16', endDate: '2026-09-18', title: 'Minor & Major Project – Review 1 – Evaluation 1', sems: ['III', 'V', 'VII'], isExam: false },
  { startDate: '2026-09-23', endDate: '2026-09-25', title: 'Test 1', sems: ['III', 'V', 'VII'], isExam: true },
  { startDate: '2026-10-01', endDate: '2026-10-01', title: 'Announcement of marks of Test 1 and CIE Review', sems: ['III', 'V', 'VII'], isExam: false },
  { startDate: '2026-10-12', endDate: '2026-10-14', title: 'Review of Activity Points', sems: ['III', 'V', 'VII'], isExam: false },
  { startDate: '2026-10-14', endDate: '2026-10-16', title: 'Minor & Major Project – Review 2 – Evaluation 2', sems: ['III', 'V', 'VII'], isExam: false },
  { startDate: '2026-11-16', endDate: '2026-11-18', title: 'Test 2', sems: ['III', 'V', 'VII'], isExam: true },
  { startDate: '2026-11-19', endDate: '2026-11-19', title: 'Withdrawal from a course', sems: ['III', 'V', 'VII'], isExam: false },
  { startDate: '2026-11-19', endDate: '2026-11-25', title: 'Test for Laboratory courses', sems: ['III', 'V', 'VII'], isExam: true },
  { startDate: '2026-11-23', endDate: '2026-11-26', title: 'Quiz (With Regular Classes)', sems: ['III', 'V', 'VII'], isExam: true },
  { startDate: '2026-11-26', endDate: '2026-11-26', title: 'Announcement of marks of Test 2 and CIE Review', sems: ['III', 'V', 'VII'], isExam: false },
  { startDate: '2026-11-28', endDate: '2026-11-28', title: 'Announcement of CIE', sems: ['III', 'V', 'VII'], isExam: false },
  { startDate: '2026-11-28', endDate: '2026-11-28', title: 'Last working day', sems: ['III', 'V', 'VII'], isExam: false },
  { startDate: '2026-11-30', endDate: '2026-12-05', title: 'Semester End Test for laboratories', sems: ['III', 'V', 'VII'], isExam: true },
  { startDate: '2026-12-07', endDate: '2026-12-07', title: 'Commencement of Semester End Exam (SEE)', sems: ['III', 'V', 'VII'], isExam: true },
  { startDate: '2026-12-17', endDate: '2026-12-19', title: 'Major Project Final Evaluation and Viva-Voce (VII sem)', sems: ['VII'], isExam: false },
  { startDate: '2026-12-17', endDate: '2026-12-19', title: 'Course Registration for VIII semester (VII sem students)', sems: ['VII'], isExam: false },
  { startDate: '2026-12-21', endDate: '2026-12-21', title: 'Commencement of VIII semester 2026–27 (Tentative)', sems: ['VII'], isExam: false },
  { startDate: '2027-01-04', endDate: '2027-01-04', title: 'Announcement of SEE Result and Paper seeing', sems: ['III', 'V', 'VII'], isExam: false },
  { startDate: '2027-01-04', endDate: '2027-01-04', title: 'Commencement of IV & VI semesters 2026–27 & Registration', sems: ['III', 'V'], isExam: false },
  // Proctorship
  { startDate: '2026-08-10', endDate: '2026-08-14', title: 'Proctorship 1', sems: ['III', 'V', 'VII'], isExam: false },
  { startDate: '2026-10-01', endDate: '2026-10-03', title: 'Proctorship 2', sems: ['III', 'V', 'VII'], isExam: false },
  { startDate: '2026-11-26', endDate: '2026-11-28', title: 'Proctorship 3', sems: ['III', 'V', 'VII'], isExam: false }
];

ACADEMIC_EVENTS.sort((a, b) => a.startDate.localeCompare(b.startDate));

const HOLIDAYS_LIST = [
  { date: '2026-08-15', title: 'Independence Day', day: 'Saturday' },
  { date: '2026-08-26', title: 'Id-e-Melad', day: 'Wednesday' },
  { date: '2026-09-14', title: 'Ganesh Chaturthi', day: 'Monday' },
  { date: '2026-10-02', title: 'Gandhi Jayanti', day: 'Friday' },
  { date: '2026-10-10', title: 'Mahalaya Amavasya', day: 'Saturday' },
  { date: '2026-10-20', title: 'Maha Navami / Ayudha Pooja', day: 'Tuesday' },
  { date: '2026-10-21', title: 'Vijaya Dashami', day: 'Wednesday' },
  { date: '2026-10-25', title: 'Valmiki Jayanthi', day: 'Sunday' },
  { date: '2026-11-01', title: 'Rajyotsava Day', day: 'Sunday' },
  { date: '2026-11-08', title: 'Naraka Chaturdashi', day: 'Sunday' },
  { date: '2026-11-10', title: 'Balipadyami', day: 'Tuesday' },
  { date: '2026-11-27', title: 'Kanakadasa Jayanthi', day: 'Friday' }
];

const CAL_MONTHS = [
  { year: 2026, month: 7, label: 'Aug' },
  { year: 2026, month: 8, label: 'Sep' },
  { year: 2026, month: 9, label: 'Oct' },
  { year: 2026, month: 10, label: 'Nov' },
  { year: 2026, month: 11, label: 'Dec' },
  { year: 2027, month: 0, label: 'Jan' }
];

let currentCalMonthIdx = 0;
let selectedCalSem = 'III';

// ── Boot & Init ──
export function initDashboard() {
  initTheme();
  initPwa();

  window.addEventListener('touchstart', () => (isTouchDevice = true), { capture: true, passive: true });
  window.addEventListener('mousemove', e => {
    if (e.movementX !== 0 || e.movementY !== 0) isTouchDevice = false;
  }, { capture: true, passive: true });

  const consent = localStorage.getItem(CONFIG.CONSENT_KEY);
  if (!consent) {
    const cm = document.getElementById('consent-modal');
    if (cm) {
      cm.classList.add('active');
      setTimeout(() => cm.classList.add('show'), 10);
    }
    return;
  }
  continueBoot();
}

function continueBoot() {
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem(CONFIG.USER_KEY) || '{}');
  } catch (e) {}

  if (user && user.name) {
    const gName = document.getElementById('greeting-name');
    if (gName) gName.textContent = toTitleCase(user.name);
    const hour = new Date().getHours();
    let timeStr = 'Good evening,';
    if (hour < 12) timeStr = 'Good morning,';
    else if (hour < 17) timeStr = 'Good afternoon,';
    const gTime = document.getElementById('greeting-time');
    if (gTime) gTime.textContent = timeStr;
  }

  initAcademicCalendar();
  checkSugUnread();

  const creds = loadCreds();
  if (!creds || !creds.usn) {
    const ob = document.getElementById('onboarding');
    if (ob) ob.classList.add('active');
  }

  const obUsn = document.getElementById('ob-usn');
  if (obUsn) {
    obUsn.addEventListener('input', function () {
      this.value = this.value.toUpperCase();
    });
  }

  const obDob = document.getElementById('ob-dob');
  if (obDob) {
    obDob.addEventListener('input', function () {
      let v = this.value.replace(/\D/g, '');
      if (v.length > 4) this.value = v.slice(0, 2) + '/' + v.slice(2, 4) + '/' + v.slice(4, 8);
      else if (v.length > 2) this.value = v.slice(0, 2) + '/' + v.slice(2);
      else this.value = v;
    });
  }

  // Prevent keyboard from scrolling the page during onboarding
  document.querySelectorAll('#onboarding input').forEach(inp => {
    inp.addEventListener('focus', () => {
      setTimeout(() => window.scrollTo(0, 0), 50);
    });
  });

  // Enter key navigation on desktop
  const obCard = document.querySelector('.ob-card');
  if (obCard) {
    obCard.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        const activeId = document.activeElement ? document.activeElement.id : '';
        if (obStep === 0 && activeId === 'ob-usn') {
          e.preventDefault();
          obNext();
        } else if (obStep === 1 && activeId === 'ob-dob') {
          e.preventDefault();
          obNext();
        } else if (obStep === 2 && activeId === 'ob-code') {
          e.preventDefault();
          obNext();
        } else if (obStep === 3 && (activeId === 'ob-moodle-email' || activeId === 'ob-moodle-pass')) {
          e.preventDefault();
          obFinish(true);
        }
      }
    });
  }
}

export function checkCmScroll() {
  const content = document.getElementById('cm-content');
  const btn = document.getElementById('cm-accept-btn');
  if (!content || !btn) return;
  if (content.scrollTop + content.clientHeight >= content.scrollHeight - 5) {
    btn.disabled = false;
    btn.textContent = 'I Understand and Agree';
  }
}

export function acceptConsent() {
  let photoConsent = 'yes';
  const r = document.querySelector('input[name="photo_consent"]:checked');
  if (r) photoConsent = r.value;
  localStorage.setItem(CONFIG.PHOTO_CONSENT_KEY, photoConsent);
  localStorage.setItem(CONFIG.CONSENT_KEY, 'true');

  const cm = document.getElementById('consent-modal');
  if (cm) {
    cm.classList.remove('show');
    setTimeout(() => {
      cm.classList.remove('active');
      continueBoot();
    }, 300);
  }
}

// ── Onboarding Multi-Step ──
export function obShow(idx) {
  document.querySelectorAll('.ob-step').forEach((el, i) => {
    el.classList.toggle('active', i === idx);
  });
  document.getElementById('ob-back')?.classList.toggle('hide', idx === 0);
  obStep = idx;

  for (let i = 0; i < 4; i++) {
    const dot = document.getElementById('od-' + i);
    if (!dot) continue;
    dot.classList.remove('active', 'done');
    if (i === idx) dot.classList.add('active');
    else if (i < idx) dot.classList.add('done');
  }

  const fields = ['ob-usn', 'ob-dob', 'ob-code', 'ob-moodle-email'];
  setTimeout(() => document.getElementById(fields[idx])?.focus(), 100);
}

export function obBack() {
  if (obStep > 0) obShow(obStep - 1);
}

export function obNext() {
  if (obStep === 0) {
    const usn = (document.getElementById('ob-usn')?.value || '').trim();
    const e = document.getElementById('ob-err-0');
    if (!usn) {
      if (e) {
        e.textContent = 'Please enter your USN';
        e.style.display = 'block';
      }
      return;
    }
    if (e) e.style.display = 'none';
    obShow(1);
  } else if (obStep === 1) {
    const d = document.getElementById('ob-dob')?.value || '';
    if (d.length !== 10 || !d.includes('/')) {
      const e = document.getElementById('ob-err-1');
      if (e) {
        e.textContent = 'Enter DD/MM/YYYY';
        e.style.display = 'block';
      }
      return;
    }
    document.getElementById('ob-err-1').style.display = 'none';
    obShow(2);
  } else if (obStep === 2) {
    const code = (document.getElementById('ob-code')?.value || '').trim();
    if (code.length !== 4 || !/^[0-9]{4}$/.test(code)) {
      const e = document.getElementById('ob-err-2');
      if (e) {
        e.textContent = 'Enter exactly 4 digits';
        e.style.display = 'block';
      } else {
        alert('Verification code must be exactly 4 digits.');
      }
      return;
    }
    document.getElementById('ob-err-2').style.display = 'none';

    const existing = loadCreds();
    if (existing && existing.moodleEmail && existing.moodlePass) {
      obFinish(false);
    } else {
      obShow(3);
    }
  }
}

export function toggleObDd() {
  const dd = document.getElementById('ob-idtype-dd');
  if (dd) dd.classList.toggle('open');
}

export function pickObIdType(val, label, el) {
  const inp = document.getElementById('ob-idtype');
  const lbl = document.getElementById('ob-idtype-label');
  if (inp) inp.value = val;
  if (lbl) lbl.textContent = label;
  document.querySelectorAll('.ob-dd-opt').forEach(opt => opt.classList.remove('selected'));
  if (el) el.classList.add('selected');
  const dd = document.getElementById('ob-idtype-dd');
  if (dd) dd.classList.remove('open');
}

export function obFinish(saveMoodle) {
  const usn = (document.getElementById('ob-usn')?.value || '').trim().toUpperCase();
  const dob = document.getElementById('ob-dob')?.value || '';
  const idType = document.getElementById('ob-idtype')?.value || '1';
  const code = (document.getElementById('ob-code')?.value || '').trim();

  const creds = { usn, dob, idType, code };
  const existingCreds = loadCreds();
  if (existingCreds && existingCreds.moodleEmail && existingCreds.moodlePass) {
    creds.moodleEmail = existingCreds.moodleEmail;
    creds.moodlePass = existingCreds.moodlePass;
  }

  if (saveMoodle) {
    const pfxRaw = (document.getElementById('ob-moodle-email')?.value || '').trim();
    const pfx = pfxRaw.split('@')[0];
    const pw = document.getElementById('ob-moodle-pass')?.value || '';
    if (pfx && pw) {
      creds.moodleEmail = pfx + '@nie.ac.in';
      creds.moodlePass = pw;
    }
  }

  localStorage.setItem(CONFIG.CRED_KEY, JSON.stringify(creds));
  document.getElementById('onboarding')?.classList.remove('active');

  // Background auto-login test (backend uses its configured default semester)
  api.login({ usn, dob, idType, code }).then(res => {
    if (res && res.student) {
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
      const gName = document.getElementById('greeting-name');
      if (gName && res.student.name) gName.textContent = toTitleCase(res.student.name);
    }
  }).catch(() => {});

  initAcademicCalendar();
}

// ── Calendar Carousel ──
function getInferredSemFromUsn(usn) {
  if (!usn) return null;
  const match = usn.trim().toUpperCase().match(/^4NI(\d{2})[A-Z]{2}(\d{3})$/);
  if (!match) return null;

  const yy = parseInt(match[1], 10);
  const rollNum = parseInt(match[2], 10);
  const isLateral = rollNum >= 400 && rollNum <= 499;

  const entryYear = 2000 + yy;
  const now = new Date();
  const yearDiff = now.getFullYear() - entryYear;
  const isOddSem = now.getMonth() >= 7 || now.getMonth() === 0;

  const baseSem = isLateral ? 3 : 1;
  const sem = baseSem + yearDiff * 2 + (isOddSem ? 0 : 1);

  if (sem <= 3) return 'III';
  if (sem <= 5) return 'V';
  return 'VII';
}

export function initAcademicCalendar() {
  let usn = null;
  let resolved = false;

  try {
    const user = JSON.parse(localStorage.getItem(CONFIG.USER_KEY) || '{}');
    if (user.semNum) {
      const num = parseInt(user.semNum, 10) || 0;
      if (num <= 3) selectedCalSem = 'III';
      else if (num <= 5) selectedCalSem = 'V';
      else selectedCalSem = 'VII';
      resolved = true;
    }
    if (user.usn) usn = user.usn;
  } catch (e) {}

  if (!resolved) {
    const creds = loadCreds();
    if (creds && creds.usn) usn = creds.usn;
    if (usn) {
      const inferred = getInferredSemFromUsn(usn);
      if (inferred) selectedCalSem = inferred;
    }
  }

  const ddEl = document.getElementById('cal-sem-dropdown');
  if (ddEl) ddEl.style.display = 'block';

  syncCalSemDropdownUI();

  const now = new Date();
  const yr = now.getFullYear();
  const mo = now.getMonth();
  for (let i = 0; i < CAL_MONTHS.length; i++) {
    if (CAL_MONTHS[i].year === yr && CAL_MONTHS[i].month === mo) {
      currentCalMonthIdx = i;
      break;
    }
  }

  renderCalMonth();
  renderCalHolidays();
  renderCalEvents();
}

export function syncCalSemDropdownUI() {
  const lblEl = document.getElementById('cal-sem-trigger-label');
  if (lblEl) lblEl.textContent = 'Sem ' + selectedCalSem;
  document.querySelectorAll('#cal-sem-menu .sem-option').forEach(opt => {
    opt.classList.toggle('active', opt.textContent.trim() === 'Sem ' + selectedCalSem);
  });
}

export function toggleCalSemDropdown() {
  const dd = document.getElementById('cal-sem-dropdown');
  if (dd) dd.classList.toggle('open');
}

export function closeCalSemDropdown() {
  const dd = document.getElementById('cal-sem-dropdown');
  if (dd) dd.classList.remove('open');
}

export function pickCalSem(sem) {
  selectedCalSem = sem;
  syncCalSemDropdownUI();
  closeCalSemDropdown();
  renderCalMonth();
  renderCalEvents();
}

export function prevCalMonth() {
  if (currentCalMonthIdx > 0) {
    currentCalMonthIdx--;
    renderCalMonth();
  }
}

export function nextCalMonth() {
  if (currentCalMonthIdx < CAL_MONTHS.length - 1) {
    currentCalMonthIdx++;
    renderCalMonth();
  }
}

function getEventsForDate(dateStr) {
  const results = [];
  ACADEMIC_EVENTS.forEach(ev => {
    if (ev.sems.includes(selectedCalSem) && dateStr >= ev.startDate && dateStr <= ev.endDate) {
      results.push(ev);
    }
  });
  HOLIDAYS_LIST.forEach(hol => {
    if (hol.date === dateStr) {
      results.push({ title: hol.title + ' (Holiday)', isExam: false, isHoliday: true });
    }
  });
  return results;
}

export function renderCalMonth() {
  const mObj = CAL_MONTHS[currentCalMonthIdx];
  const labelEl = document.getElementById('cal-month-label');
  const prevBtn = document.getElementById('cal-prev-btn');
  const nextBtn = document.getElementById('cal-next-btn');

  if (labelEl) labelEl.textContent = mObj.label;
  if (prevBtn) prevBtn.disabled = currentCalMonthIdx === 0;
  if (nextBtn) nextBtn.disabled = currentCalMonthIdx === CAL_MONTHS.length - 1;

  const grid = document.getElementById('cal-grid-body');
  if (!grid) return;
  grid.innerHTML = '';

  const firstDayIndex = new Date(mObj.year, mObj.month, 1).getDay();
  const daysInMonth = new Date(mObj.year, mObj.month + 1, 0).getDate();
  const prevMonthDays = new Date(mObj.year, mObj.month, 0).getDate();

  const today = new Date();
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  for (let p = 0; p < firstDayIndex; p++) {
    const prevDayNum = prevMonthDays - firstDayIndex + 1 + p;
    const pCell = document.createElement('div');
    pCell.className = 'cal-day-cell other-month past';
    pCell.textContent = prevDayNum;
    grid.appendChild(pCell);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = String(d).padStart(2, '0');
    const monthStr = String(mObj.month + 1).padStart(2, '0');
    const dateStr = `${mObj.year}-${monthStr}-${dayStr}`;

    const cell = document.createElement('div');
    cell.className = 'cal-day-cell';
    cell.textContent = d;

    if (dateStr < todayISO) cell.classList.add('past');
    if (dateStr === todayISO) cell.classList.add('today');

    const evs = getEventsForDate(dateStr);
    if (evs.length > 0) {
      cell.classList.add('has-event');
      if (evs.some(e => e.isExam)) cell.classList.add('has-exam');
      else if (evs.some(e => e.isHoliday)) cell.classList.add('has-holiday');

      const dot = document.createElement('div');
      dot.className = 'cal-day-dot';
      cell.appendChild(dot);
    }

    cell.onmouseenter = () => {
      if (isTouchDevice) return;
      document.querySelectorAll('.cal-day-cell').forEach(c => c.classList.remove('selected'));
      cell.classList.add('selected');
      if (evs.length > 0) showCalPopover(cell, dateStr, evs);
    };
    cell.onmouseleave = () => {
      if (isTouchDevice) return;
      cell.classList.remove('selected');
      hideCalPopover();
    };
    cell.onclick = e => {
      e.stopPropagation();
      const wasSelected = cell.classList.contains('selected');
      const popEl = document.getElementById('cal-popover');
      const isPopShowing = popEl && popEl.classList.contains('show');
      document.querySelectorAll('.cal-day-cell').forEach(c => c.classList.remove('selected'));
      if (wasSelected && isPopShowing) {
        hideCalPopover();
      } else {
        cell.classList.add('selected');
        if (evs.length > 0) showCalPopover(cell, dateStr, evs);
        else hideCalPopover();
      }
    };

    grid.appendChild(cell);
  }

  const totalDaysSoFar = firstDayIndex + daysInMonth;
  const rowCount = Math.ceil(totalDaysSoFar / 7);
  const trailingCells = rowCount * 7 - totalDaysSoFar;
  for (let n = 1; n <= trailingCells; n++) {
    const nCell = document.createElement('div');
    nCell.className = 'cal-day-cell other-month';
    nCell.textContent = n;
    grid.appendChild(nCell);
  }
}

function showCalPopover(targetEl, dateStr, eventList) {
  const pop = document.getElementById('cal-popover');
  const dateEl = document.getElementById('cal-popover-date');
  const bodyEl = document.getElementById('cal-popover-body');
  if (!pop || !dateEl || !bodyEl) return;

  const parts = dateStr.split('-');
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  dateEl.textContent = d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });

  bodyEl.innerHTML = '';
  eventList.forEach(ev => {
    const item = document.createElement('div');
    item.className = 'cal-popover-item';
    if (ev.isExam) item.classList.add('exam');
    else if (ev.isHoliday) item.classList.add('holiday');
    item.textContent = '• ' + ev.title;
    bodyEl.appendChild(item);
  });

  const rect = targetEl.getBoundingClientRect();
  const popWidth = 220;
  let left = rect.left + rect.width / 2 - popWidth / 2;
  const top = rect.top - 10;

  if (left < 10) left = 10;
  if (left + popWidth > window.innerWidth - 10) left = window.innerWidth - popWidth - 10;

  pop.style.left = left + 'px';
  pop.style.top = top + 'px';
  pop.classList.remove('show');
  void pop.offsetWidth;
  pop.classList.add('show');
}

export function hideCalPopover() {
  const pop = document.getElementById('cal-popover');
  if (pop) pop.classList.remove('show');
  document.querySelectorAll('.cal-day-cell.selected').forEach(c => c.classList.remove('selected'));
}

export function scrollToCalCard(idx) {
  const car = document.getElementById('calendar-carousel');
  if (car && car.children[idx]) {
    car.scrollTo({ left: car.children[idx].offsetLeft, behavior: 'smooth' });
  }
}

export function updateCalCarouselDots() {
  const car = document.getElementById('calendar-carousel');
  if (!car || !car.children.length) return;
  const scrollPos = car.scrollLeft;
  let activeIdx = 0;
  let minDiff = Infinity;
  for (let i = 0; i < car.children.length; i++) {
    const diff = Math.abs(car.children[i].offsetLeft - scrollPos);
    if (diff < minDiff) {
      minDiff = diff;
      activeIdx = i;
    }
  }
  document.querySelectorAll('.cal-dot').forEach((d, i) => {
    d.classList.toggle('active', i === activeIdx);
  });
}

function renderCalHolidays() {
  const list = document.getElementById('cal-holidays-list');
  if (!list) return;
  list.innerHTML = '';

  const today = new Date();
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  HOLIDAYS_LIST.forEach(h => {
    const item = document.createElement('div');
    item.className = 'cal-item';
    if (h.date < todayISO) item.classList.add('past');

    const parts = h.date.split('-');
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const monthName = d.toLocaleString('en-US', { month: 'short' });
    const shortDay = h.day.slice(0, 3);
    const dateLabel = `${parseInt(parts[2], 10)} ${monthName} (${shortDay})`;

    item.innerHTML = `
      <div class="cal-item-title">${h.title}</div>
      <div class="cal-item-date-right">${dateLabel}</div>`;
    list.appendChild(item);
  });
}

function formatDateRange(start, end) {
  if (start === end) {
    const p = start.split('-');
    const d = new Date(p[0], p[1] - 1, p[2]);
    return `${parseInt(p[2], 10)} ${d.toLocaleString('en-US', { month: 'short' })}`;
  }
  const p1 = start.split('-');
  const p2 = end.split('-');
  const d1 = new Date(p1[0], p1[1] - 1, p1[2]);
  const d2 = new Date(p2[0], p2[1] - 1, p2[2]);
  if (p1[1] === p2[1]) {
    return `${parseInt(p1[2], 10)}–${parseInt(p2[2], 10)} ${d1.toLocaleString('en-US', { month: 'short' })}`;
  }
  return `${parseInt(p1[2], 10)} ${d1.toLocaleString('en-US', { month: 'short' })} – ${parseInt(p2[2], 10)} ${d2.toLocaleString('en-US', { month: 'short' })}`;
}

function renderCalEvents() {
  const list = document.getElementById('cal-events-list');
  if (!list) return;
  list.innerHTML = '';

  const today = new Date();
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const semEvents = ACADEMIC_EVENTS.filter(ev => ev.sems.includes(selectedCalSem));

  semEvents.forEach(ev => {
    const item = document.createElement('div');
    item.className = 'cal-item';
    if (ev.isExam) item.classList.add('is-exam');
    if (ev.endDate < todayISO) item.classList.add('past');

    item.innerHTML = `
      <div class="cal-item-title">${ev.title}</div>
      <div class="cal-item-date-right">${formatDateRange(ev.startDate, ev.endDate)}</div>`;
    list.appendChild(item);
  });
}

// ── Hall Ticket Download ──
export async function downloadHallTicket() {
  const creds = loadCreds();
  if (!creds || !creds.usn) {
    alert('Please complete setup first to download your hall ticket.');
    return;
  }

  const btn = document.getElementById('download-ht-btn');
  const isBypass = btn?.getAttribute('data-bypass') === 'true';

  if (btn && !btn.getAttribute('data-original')) {
    btn.setAttribute('data-original', btn.innerHTML);
  }

  if (btn) {
    btn.innerHTML = `<span style="display:inline-flex;align-items:center;gap:6px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation:spin .7s linear infinite"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"/></svg> Downloading...</span>`;
    btn.disabled = true;
  }

  let studentName = '';
  try {
    const user = JSON.parse(localStorage.getItem(CONFIG.USER_KEY) || '{}');
    if (user.name) studentName = user.name;
  } catch (e) {}

  try {
    const res = await api.downloadHallTicket({
      usn: creds.usn,
      dob: creds.dob,
      idType: creds.idType,
      code: creds.code,
      name: studentName,
      bypass: isBypass
    });

    if (res.isJson) {
      if (res.data.survey_required) {
        if (btn) {
          btn.setAttribute('data-bypass', 'true');
          btn.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;line-height:1.2"><div style="display:flex;align-items:center;gap:6px"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg><span style="font-weight:800">Survey Required</span></div><div style="font-size:0.7rem;opacity:0.9;font-weight:600;margin-top:2px">Tap to download anyway</div></div>`;
          btn.style.background = '#ef4444';
          btn.disabled = false;
        }
        return;
      }
      if (res.data.error) throw new Error(res.data.error);
    } else {
      const url = window.URL.createObjectURL(res.blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `HallTicket_${creds.usn}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      resetHtBtn();
    }
  } catch (err) {
    alert(err.message);
    resetHtBtn();
  } finally {
    if (btn && (btn.getAttribute('data-bypass') !== 'true' || btn.disabled)) {
      btn.disabled = false;
    }
  }
}

function resetHtBtn() {
  const btn = document.getElementById('download-ht-btn');
  if (!btn) return;
  const original = btn.getAttribute('data-original');
  if (original) btn.innerHTML = original;
  btn.style.background = '';
  btn.style.height = '48px';
  btn.removeAttribute('data-bypass');
  btn.disabled = false;
}

// ── Department & Notices Modals ──
let noticesLoaded = false;
let currentDeptTab = 'syllabus';
let cachedDeptData = null;

export function openNoticesModal() {
  const nm = document.getElementById('notices-modal');
  const bd = document.getElementById('notices-backdrop');
  if (!nm || !bd) return;

  const btn = document.querySelector('.notices-btn-wide[onclick*="openNoticesModal"]') || document.querySelectorAll('.notices-btn-wide')[2];
  if (btn) {
    const rect = btn.getBoundingClientRect();
    nm.style.transformOrigin = (rect.left + rect.width / 2 - 16) + 'px ' + (rect.top + rect.height / 2 - 16) + 'px';
    nm.style.transform = 'scale(0.3)';
  }

  bd.style.display = 'block';
  nm.classList.add('active');
  void nm.offsetWidth;
  bd.classList.add('show');
  nm.classList.add('show');

  if (!noticesLoaded) fetchNotices(false);
}

export function closeNoticesModal() {
  const nm = document.getElementById('notices-modal');
  const bd = document.getElementById('notices-backdrop');
  if (!nm || !bd) return;

  nm.classList.remove('show');
  bd.classList.remove('show');

  const btn = document.querySelector('.notices-btn-wide[onclick*="openNoticesModal"]') || document.querySelectorAll('.notices-btn-wide')[2];
  if (btn) {
    nm.style.transform = 'scale(0.3)';
  }

  setTimeout(() => {
    nm.classList.remove('active');
    bd.style.display = 'none';
  }, 300);
}

function getNoticeIconSvg(link, idPrefix = 'n') {
  const linkLower = (link || '').toLowerCase();
  if (linkLower.endsWith('.pdf')) {
    return `<svg viewBox="0 0 1024 1024" width="34" height="34" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="PDF file icon">
      <defs>
        <linearGradient id="${idPrefix}-paperGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#f1f2f6"/></linearGradient>
        <linearGradient id="${idPrefix}-paperFoldGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#eceef4"/><stop offset="100%" stop-color="#dfe3eb"/></linearGradient>
        <linearGradient id="${idPrefix}-redGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ff4a3d"/><stop offset="100%" stop-color="#ef1f1b"/></linearGradient>
        <filter id="${idPrefix}-softShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#cfd4df" flood-opacity="0.55"/></filter>
        <filter id="${idPrefix}-labelShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#d43a32" flood-opacity="0.35"/></filter>
      </defs>
      <g filter="url(#${idPrefix}-softShadow)">
        <path d="M360 170 Q360 130 400 130 H728 L880 282 V860 Q880 894 846 894 H400 Q360 894 360 854 Z" fill="url(#${idPrefix}-paperGrad)"/>
        <path d="M728 130 L880 282 H760 Q728 282 728 250 Z" fill="url(#${idPrefix}-paperFoldGrad)"/>
        <path d="M728 130 L880 282 H760 Q728 282 728 250 Z" fill="none" stroke="#e1e5ec" stroke-width="1"/>
      </g>
      <g filter="url(#${idPrefix}-labelShadow)">
        <rect x="145" y="540" width="534" height="230" rx="28" ry="28" fill="url(#${idPrefix}-redGrad)"/>
        <rect x="145" y="540" width="534" height="230" rx="28" ry="28" fill="none" stroke="#ff6a61" stroke-opacity="0.35"/>
        <text x="412" y="706" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="140" font-weight="700" letter-spacing="2" fill="#ffffff">PDF</text>
      </g>
    </svg>`;
  } else if (linkLower.endsWith('.doc') || linkLower.endsWith('.docx')) {
    return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>';
  } else if (linkLower.match(/\.(jpeg|jpg|gif|png|webp)$/)) {
    return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';
  } else {
    return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>';
  }
}

export async function fetchNotices(forceRefresh = false) {
  const list = document.getElementById('nm-list');
  const loader = document.getElementById('nm-loader');
  const refreshIcon = document.getElementById('nm-refresh-icon');
  if (!list || !loader) return;

  if (forceRefresh && refreshIcon) refreshIcon.classList.add('spin');
  if (!noticesLoaded || forceRefresh) {
    list.innerHTML = '';
    loader.classList.add('show');
  }

  let usn = '', name = '';
  try {
    const c = loadCreds() || {};
    usn = c.usn || '';
    const p = JSON.parse(localStorage.getItem(CONFIG.USER_KEY) || '{}');
    name = p.name || '';
  } catch (e) {}

  try {
    const notices = await api.getNotices(forceRefresh, usn, name);
    loader.classList.remove('show');
    list.innerHTML = '';

    if (!notices || !notices.length) {
      list.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--muted);">No notices found.</div>';
    } else {
      notices.forEach((n, idx) => {
        const card = document.createElement('a');
        card.className = 'notice-card';
        card.href = n.link;
        card.target = '_blank';
        card.rel = 'noopener noreferrer';

        card.innerHTML = `
          <div class="notice-icon">
            ${getNoticeIconSvg(n.link, 'n-' + idx)}
          </div>
          <div class="notice-content">
            <div class="notice-title" title="${n.title.replace(/"/g, '&quot;')}">${n.title}</div>
            <div class="notice-meta"><span>${n.date}</span></div>
          </div>`;
        list.appendChild(card);
      });
    }
    noticesLoaded = true;
  } catch (err) {
    loader.classList.remove('show');
    list.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--danger);">Failed to load notices.</div>';
  } finally {
    if (forceRefresh && refreshIcon) refreshIcon.classList.remove('spin');
  }
}

function getDepartmentSlug() {
  const creds = loadCreds();
  if (creds && creds.usn) {
    const match = creds.usn.toUpperCase().match(/^[0-9]{1}[A-Z]{2}[0-9]{2}([A-Z]{2})/);
    if (match && match[1]) {
      const map = {
        EE: 'electrical-electronics',
        EC: 'electronics-communication',
        IS: 'information-science',
        CS: 'computer-science',
        CI: 'cse-ai-ml',
        ME: 'mechanical',
        CV: 'civil'
      };
      return map[match[1]] || null;
    }
  }
  return null;
}

export function openDepartmentModal(tab) {
  currentDeptTab = tab;
  const titleEl = document.getElementById('dept-modal-title');
  if (titleEl) titleEl.textContent = tab === 'syllabus' ? 'Syllabus' : 'Time Table';

  const nm = document.getElementById('department-modal');
  const bd = document.getElementById('department-backdrop');
  if (!nm || !bd) return;

  const btn = document.querySelector(`.notices-btn-wide[onclick*="${tab}"]`) || document.querySelector('.notices-btn-wide')?.parentNode;
  if (btn) {
    const rect = btn.getBoundingClientRect();
    nm.style.transformOrigin = (rect.left + rect.width / 2 - 16) + 'px ' + (rect.top + rect.height / 2 - 16) + 'px';
    nm.style.transform = 'scale(0.3)';
  }

  bd.style.display = 'block';
  nm.classList.add('active');
  void nm.offsetWidth;
  bd.classList.add('show');
  nm.classList.add('show');

  fetchDepartmentData(false);
}

export function closeDepartmentModal() {
  const nm = document.getElementById('department-modal');
  const bd = document.getElementById('department-backdrop');
  if (!nm || !bd) return;

  nm.classList.remove('show');
  bd.classList.remove('show');
  nm.style.transform = 'scale(0.3)';

  setTimeout(() => {
    nm.classList.remove('active');
    bd.style.display = 'none';
  }, 300);
}

export async function fetchDepartmentData(forceRefresh = false) {
  const list = document.getElementById('dept-list');
  const loader = document.getElementById('dept-loader');
  const refreshIcon = document.getElementById('dept-refresh-icon');
  if (!list || !loader) return;

  if (forceRefresh && refreshIcon) refreshIcon.classList.add('spin');

  if (!cachedDeptData || forceRefresh) {
    list.innerHTML = '';
    loader.classList.add('show');

    const slug = getDepartmentSlug();
    if (!slug) {
      loader.classList.remove('show');
      list.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--muted);">Unable to detect your department from USN.</div>';
      if (forceRefresh && refreshIcon) refreshIcon.classList.remove('spin');
      return;
    }

    let usn = '', name = '';
    try {
      const c = loadCreds() || {};
      usn = c.usn || '';
      const p = JSON.parse(localStorage.getItem(CONFIG.USER_KEY) || '{}');
      name = p.name || '';
    } catch (e) {}

    try {
      const data = await api.getDepartment(slug, currentDeptTab, usn, name);
      cachedDeptData = data.department;
    } catch (err) {
      loader.classList.remove('show');
      list.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--danger);">Failed to load data.</div>';
      if (forceRefresh && refreshIcon) refreshIcon.classList.remove('spin');
      return;
    }
  }

  loader.classList.remove('show');
  list.innerHTML = '';

  const items = currentDeptTab === 'syllabus' ? cachedDeptData?.syllabus_files : cachedDeptData?.timetable_files;
  if (!items || !items.length) {
    list.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--muted);">No ${currentDeptTab} files found.</div>`;
  } else {
    items.forEach((item, idx) => {
      const card = document.createElement('a');
      card.className = 'notice-card';
      card.href = item.file;
      card.target = '_blank';
      card.rel = 'noopener noreferrer';
      const metaText = item.year || item.semester || '';

      card.innerHTML = `
        <div class="notice-icon">
          ${getNoticeIconSvg(item.file, 'dept-' + idx)}
        </div>
        <div class="notice-content">
          <div class="notice-title" title="${item.title.replace(/"/g, '&quot;')}">${item.title}</div>
          ${metaText ? `<div class="notice-meta"><span>${metaText}</span></div>` : ''}
        </div>`;
      list.appendChild(card);
    });
  }

  if (forceRefresh && refreshIcon) refreshIcon.classList.remove('spin');
}

export async function shareApp() {
  const shareData = {
    title: 'Student Hub — NIE',
    text: 'Check out Student Hub — the all-in-one portal for NIE students! Access attendance, results, moodle and more.',
    url: window.location.origin + window.location.pathname.replace(/\/index\.html$/, '')
  };
  try {
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(shareData.url);
      const btn = document.querySelector('.share-btn');
      if (btn) {
        const original = btn.innerHTML;
        btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
        setTimeout(() => (btn.innerHTML = original), 1500);
      }
    }
  } catch (e) {}
}

function toTitleCase(str) {
  return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

// Attach window handlers for dashboard events
if (typeof window !== 'undefined') {
  window.checkCmScroll = checkCmScroll;
  window.acceptConsent = acceptConsent;
  window.obNext = obNext;
  window.obBack = obBack;
  window.obFinish = obFinish;
  window.toggleObDd = toggleObDd;
  window.pickObIdType = pickObIdType;
  window.downloadHallTicket = downloadHallTicket;
  window.openNoticesModal = openNoticesModal;
  window.closeNoticesModal = closeNoticesModal;
  window.fetchNotices = fetchNotices;
  window.openDepartmentModal = openDepartmentModal;
  window.closeDepartmentModal = closeDepartmentModal;
  window.fetchDepartmentData = fetchDepartmentData;
  window.shareApp = shareApp;
  window.prevCalMonth = prevCalMonth;
  window.nextCalMonth = nextCalMonth;
  window.toggleCalSemDropdown = toggleCalSemDropdown;
  window.closeCalSemDropdown = closeCalSemDropdown;
  window.pickCalSem = pickCalSem;
  window.scrollToCalCard = scrollToCalCard;
  window.updateCalCarouselDots = updateCalCarouselDots;
}
