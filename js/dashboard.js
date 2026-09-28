// ═══════════════════════════════════════════════════════════════
//  STUDENT HUB — Dashboard & Home Page Logic
// ═══════════════════════════════════════════════════════════════

import { CONFIG } from './config.js';
import { api } from './api.js';
import { loadCreds, initTheme, initPwa, loadUser, toTitleCase, escHtml, getStoredUsn, ensureHumanSession, getSessionToken, setIdentityToken } from './shared.js';

function getTodayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const DEPT_SLUG_MAP = {
  EE: 'electrical-electronics',
  EC: 'electronics-communication',
  IS: 'information-science',
  CS: 'computer-science',
  CI: 'cse-ai-ml',
  ME: 'mechanical',
  CV: 'civil'
};

function openAnimatedModal(modalId, backdropId, triggerSelector) {
  const nm = document.getElementById(modalId);
  const nb = document.getElementById(backdropId);
  const btn = document.querySelector(triggerSelector);
  if (!nm) return;
  if (btn) {
    const rect = btn.getBoundingClientRect();
    nm.style.transformOrigin = (rect.left + rect.width / 2 - 16) + 'px ' + (rect.top + rect.height / 2 - 16) + 'px';
  }
  nm.style.transform = 'scale(0.3)';
  nm.classList.add('active');
  if (nb) nb.classList.add('active');
  void nm.offsetWidth;
  nm.classList.add('show');
  nm.style.transform = '';
  if (nb) nb.classList.add('show');
}

function closeAnimatedModal(modalId, backdropId) {
  const nm = document.getElementById(modalId);
  const nb = document.getElementById(backdropId);
  if (!nm) return;
  nm.classList.remove('show');
  nm.style.transform = 'scale(0.3)';
  if (nb) nb.classList.remove('show');
  setTimeout(() => {
    nm.classList.remove('active');
    nm.style.display = '';
    nm.style.transform = '';
    if (nb) {
      nb.classList.remove('active');
      nb.style.display = '';
    }
  }, 300);
}

let obStep = 0;
let isVerifying = false;
let isTouchDevice = false;

// ── Academic Events Database (Client-Side Static) ──
const ACADEMIC_EVENTS = [
  // Sem III, V, VII Events
  { startDate: '2026-08-10', endDate: '2026-08-11', title: 'Course Registration (Physical)', sems: ['III', 'V', 'VII'], isExam: false },
  { startDate: '2026-08-10', endDate: '2026-08-14', title: 'Placement Activity for V semester students', sems: ['V'], isExam: false },
  { startDate: '2026-08-10', endDate: '2026-08-10', title: 'Commencement of classes for III & VII semester students', sems: ['III', 'VII'], isExam: false },
  { startDate: '2026-08-10', endDate: '2026-08-14', title: 'Proctorship 1', sems: ['III', 'V', 'VII'], isExam: false },
  { startDate: '2026-08-12', endDate: '2026-08-13', title: 'Course registration with late fee', sems: ['III', 'V', 'VII'], isExam: false },
  { startDate: '2026-08-17', endDate: '2026-08-17', title: 'Commencement of classes for V semester students', sems: ['V'], isExam: false },
  { startDate: '2026-08-21', endDate: '2026-08-22', title: 'Add/Dropping of Courses', sems: ['III', 'V', 'VII'], isExam: false },
  { startDate: '2026-09-16', endDate: '2026-09-18', title: 'Minor & Major Project – Review 1 – Evaluation 1', sems: ['III', 'V', 'VII'], isExam: false },
  { startDate: '2026-10-01', endDate: '2026-10-03', title: 'Proctorship 2', sems: ['III', 'V', 'VII'], isExam: false },
  // Rescheduled dates as per Circular No: NIE/Dean (AA)-102/2026-27/Odd/21 dated 04.09.2026
  { startDate: '2026-10-07', endDate: '2026-10-09', title: 'Test 1', sems: ['III', 'V', 'VII'], isExam: true },
  { startDate: '2026-10-12', endDate: '2026-10-14', title: 'Review of Activity Points', sems: ['III', 'V', 'VII'], isExam: false },
  { startDate: '2026-10-14', endDate: '2026-10-16', title: 'Minor & Major Project – Review 2 – Evaluation 2', sems: ['III', 'V', 'VII'], isExam: false },
  { startDate: '2026-10-16', endDate: '2026-10-16', title: 'Announcement of marks of Test 1 and CIE Review', sems: ['III', 'V', 'VII'], isExam: false },
  { startDate: '2026-11-16', endDate: '2026-11-18', title: 'Test 2', sems: ['III', 'V', 'VII'], isExam: true },
  { startDate: '2026-11-19', endDate: '2026-11-19', title: 'Withdrawal from a course', sems: ['III', 'V', 'VII'], isExam: false },
  { startDate: '2026-11-19', endDate: '2026-11-25', title: 'Test for Laboratory courses', sems: ['III', 'V', 'VII'], isExam: true },
  { startDate: '2026-11-23', endDate: '2026-11-26', title: 'Quiz (With Regular Classes)', sems: ['III', 'V', 'VII'], isExam: true },
  { startDate: '2026-11-26', endDate: '2026-11-26', title: 'Announcement of marks of Test 2 and CIE Review', sems: ['III', 'V', 'VII'], isExam: false },
  { startDate: '2026-11-26', endDate: '2026-11-28', title: 'Proctorship 3', sems: ['III', 'V', 'VII'], isExam: false },
  { startDate: '2026-11-28', endDate: '2026-11-28', title: 'Announcement of CIE', sems: ['III', 'V', 'VII'], isExam: false },
  { startDate: '2026-11-28', endDate: '2026-11-28', title: 'Last working day', sems: ['III', 'V', 'VII'], isExam: false },
  { startDate: '2026-11-30', endDate: '2026-12-05', title: 'Semester End Test for laboratories', sems: ['III', 'V', 'VII'], isExam: true },
  { startDate: '2026-12-07', endDate: '2026-12-07', title: 'Commencement of Semester End Exam (SEE)', sems: ['III', 'V', 'VII'], isExam: true },
  { startDate: '2026-12-17', endDate: '2026-12-19', title: 'Major Project Final Evaluation and Viva-Voce (VII sem)', sems: ['VII'], isExam: false },
  { startDate: '2026-12-17', endDate: '2026-12-19', title: 'Course Registration for VIII semester (VII sem students)', sems: ['VII'], isExam: false },
  { startDate: '2026-12-21', endDate: '2026-12-21', title: 'Commencement of VIII semester 2026–27 (Tentative)', sems: ['VII'], isExam: false },
  { startDate: '2027-01-04', endDate: '2027-01-04', title: 'Announcement of SEE Result and Paper seeing', sems: ['III', 'V', 'VII'], isExam: false },
  { startDate: '2027-01-04', endDate: '2027-01-04', title: 'Commencement of IV & VI semesters 2026–27 & Registration', sems: ['III', 'V'], isExam: false },

  // Sem I Events (AY 2026-27 Odd Semester admitted batch)
  { startDate: '2026-09-06', endDate: '2026-09-15', title: 'Student Induction Programme', sems: ['I'], isExam: false },
  { startDate: '2026-09-15', endDate: '2026-09-17', title: 'Course Registration (Physical)', sems: ['I'], isExam: false },
  { startDate: '2026-09-15', endDate: '2026-09-15', title: 'Commencement of classes', sems: ['I'], isExam: false },
  { startDate: '2026-09-15', endDate: '2026-09-17', title: 'Proctorship 1', sems: ['I'], isExam: false },
  { startDate: '2026-09-30', endDate: '2026-09-30', title: 'Dropping of courses', sems: ['I'], isExam: false },
  { startDate: '2026-11-04', endDate: '2026-11-06', title: 'Test 1', sems: ['I'], isExam: true },
  { startDate: '2026-11-13', endDate: '2026-11-13', title: 'Announcement of marks of Test 1', sems: ['I'], isExam: false },
  { startDate: '2026-11-13', endDate: '2026-11-16', title: 'Proctorship 2', sems: ['I'], isExam: false },
  { startDate: '2026-11-16', endDate: '2026-11-21', title: 'Review of Activity Points', sems: ['I'], isExam: false },
  { startDate: '2026-12-28', endDate: '2026-12-30', title: 'Test 2', sems: ['I'], isExam: true },
  { startDate: '2026-12-31', endDate: '2027-01-01', title: 'Quiz', sems: ['I'], isExam: true },
  { startDate: '2027-01-02', endDate: '2027-01-04', title: 'Proctorship 3', sems: ['I'], isExam: false },
  { startDate: '2027-01-04', endDate: '2027-01-08', title: 'Test for laboratory courses', sems: ['I'], isExam: true },
  { startDate: '2027-01-07', endDate: '2027-01-07', title: 'Announcement of marks of Test 2', sems: ['I'], isExam: false },
  { startDate: '2027-01-08', endDate: '2027-01-08', title: 'Announcement of CIE', sems: ['I'], isExam: false },
  { startDate: '2027-01-09', endDate: '2027-01-09', title: 'Last working day', sems: ['I'], isExam: false },
  { startDate: '2027-01-11', endDate: '2027-01-16', title: 'Semester End Test for Laboratory (SET)', sems: ['I'], isExam: true },
  { startDate: '2027-01-19', endDate: '2027-01-19', title: 'Commencement of Semester End Exam (SEE)', sems: ['I'], isExam: true },
  { startDate: '2027-02-08', endDate: '2027-02-08', title: 'Commencement of Even Semester 2026–27', sems: ['I'], isExam: false }
];

ACADEMIC_EVENTS.sort((a, b) => a.startDate.localeCompare(b.startDate));

const HOLIDAYS_LIST = [
  { date: '2026-08-15', title: 'Independence Day', day: 'Saturday', sems: ['III', 'V', 'VII'] },
  { date: '2026-08-26', title: 'Id-e-Melad', day: 'Wednesday', sems: ['III', 'V', 'VII'] },
  { date: '2026-09-14', title: 'Ganesh Chaturthi', day: 'Monday', sems: ['I', 'III', 'V', 'VII'] },
  { date: '2026-10-02', title: 'Gandhi Jayanti', day: 'Friday', sems: ['I', 'III', 'V', 'VII'] },
  { date: '2026-10-10', title: 'Mahalaya Amavasya', day: 'Saturday', sems: ['I', 'III', 'V', 'VII'] },
  { date: '2026-10-20', title: 'Maha Navami / Ayudha Pooja', day: 'Tuesday', sems: ['I', 'III', 'V', 'VII'] },
  { date: '2026-10-21', title: 'Vijaya Dashami', day: 'Wednesday', sems: ['I', 'III', 'V', 'VII'] },
  { date: '2026-10-25', title: 'Valmiki Jayanthi', day: 'Sunday', sems: ['I', 'III', 'V', 'VII'] },
  { date: '2026-11-01', title: 'Rajyotsava Day', day: 'Sunday', sems: ['I', 'III', 'V', 'VII'] },
  { date: '2026-11-08', title: 'Naraka Chaturdashi', day: 'Sunday', sems: ['I', 'III', 'V', 'VII'] },
  { date: '2026-11-10', title: 'Balipadyami', day: 'Tuesday', sems: ['I', 'III', 'V', 'VII'] },
  { date: '2026-11-27', title: 'Kanakadasa Jayanthi', day: 'Friday', sems: ['I', 'III', 'V', 'VII'] },
  { date: '2026-12-25', title: 'Christmas', day: 'Friday', sems: ['I', 'III', 'V', 'VII'] },
  { date: '2027-01-15', title: 'Makara Sankranti', day: 'Friday', sems: ['I', 'III', 'V', 'VII'] },
  { date: '2027-01-26', title: 'Republic Day', day: 'Tuesday', sems: ['I', 'III', 'V', 'VII'] }
];

const CAL_MONTHS = [
  { year: 2026, month: 7, label: 'Aug' },
  { year: 2026, month: 8, label: 'Sep' },
  { year: 2026, month: 9, label: 'Oct' },
  { year: 2026, month: 10, label: 'Nov' },
  { year: 2026, month: 11, label: 'Dec' },
  { year: 2027, month: 0, label: 'Jan' },
  { year: 2027, month: 1, label: 'Feb' }
];

let currentCalMonthIdx = 0;
let selectedCalSem = 'III';

// ── Boot & Init ──
export function initDashboard() {

  window.addEventListener('touchstart', () => (isTouchDevice = true), { capture: true, passive: true });
  window.addEventListener('mousemove', e => {
    if (e.movementX !== 0 || e.movementY !== 0) isTouchDevice = false;
  }, { capture: true, passive: true });

  initHomeToggleListeners();
  initAcademicCalendar();
  initTimetable();

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
  const user = loadUser();

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
  initTimetable();

  const creds = loadCreds();
  if (!creds || !creds.usn) {
    const ob = document.getElementById('onboarding');
    if (ob) {
      ob.classList.add('active');
      setTimeout(() => document.getElementById('ob-usn')?.focus(), 150);
    }
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
        if (isVerifying) {
          e.preventDefault();
          return;
        }
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

  // Clear all step errors on navigation
  document.querySelectorAll('.ob-err').forEach(el => el.style.display = 'none');

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
  if (isVerifying) return;
  if (obStep > 0) obShow(obStep - 1);
}

export async function obNext() {
  if (isVerifying) return;

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
    const d = (document.getElementById('ob-dob')?.value || '').trim();
    const e = document.getElementById('ob-err-1');
    if (d.length !== 10 || !d.includes('/') || d.split('/').length !== 3) {
      if (e) {
        e.textContent = 'Enter DD/MM/YYYY';
        e.style.display = 'block';
      }
      return;
    }
    const [dd, mm, yyyy] = d.split('/').map(Number);
    if (!dd || !mm || !yyyy || dd < 1 || dd > 31 || mm < 1 || mm > 12 || yyyy < 1970 || yyyy > 2030) {
      if (e) {
        e.textContent = 'Enter a valid date (DD/MM/YYYY)';
        e.style.display = 'block';
      }
      return;
    }
    if (e) e.style.display = 'none';
    obShow(2);
  } else if (obStep === 2) {
    const usn = (document.getElementById('ob-usn')?.value || '').trim().toUpperCase();
    const dob = (document.getElementById('ob-dob')?.value || '').trim();
    const idType = (document.getElementById('ob-idtype')?.value || '1').trim();
    const code = (document.getElementById('ob-code')?.value || '').trim();
    const e = document.getElementById('ob-err-2');

    if (!/^[0-9]{4}$/.test(code)) {
      if (e) {
        e.textContent = 'Enter exactly 4 digits';
        e.style.display = 'block';
      }
      return;
    }

    if (!usn) {
      obShow(0);
      return;
    }
    if (dob.length !== 10) {
      obShow(1);
      return;
    }

    const btn = document.getElementById('ob-btn-verify') || document.querySelector('#ob-2 .ob-btn');
    const backBtn = document.getElementById('ob-back');
    const codeInp = document.getElementById('ob-code');
    const originalBtnHtml = btn ? btn.innerHTML : 'Verify & Continue';

    isVerifying = true;
    if (e) e.style.display = 'none';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="ob-spinner"></span> Verifying...';
    }
    if (codeInp) codeInp.disabled = true;
    if (backBtn) backBtn.style.pointerEvents = 'none';

    try {
      // Ensure bot protection session token
      await ensureHumanSession();
      const sessionToken = getSessionToken();

      const res = await api.login({
        action: 'login',
        usn,
        dob,
        idType,
        code,
        sessionToken
      });

      if (!res || !res.student) {
        throw new Error(res?.error || 'Verification failed. Please check your details.');
      }

      // Store 7-day cryptographic identity token
      const token = res.identityToken || res.student?.identityToken;
      if (token) setIdentityToken(token);

      // Gate authentication succeeded: store verified student profile and attendance cache
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

      try {
        sessionStorage.setItem(CONFIG.ATT_SESSION_KEY, JSON.stringify(res.student));
      } catch (err) {}

      // Store verified credentials
      const creds = { usn, dob, idType, code };
      const existingCreds = loadCreds();
      if (existingCreds && existingCreds.moodleEmail && existingCreds.moodlePass) {
        creds.moodleEmail = existingCreds.moodleEmail;
        creds.moodlePass = existingCreds.moodlePass;
      }
      localStorage.setItem(CONFIG.CRED_KEY, JSON.stringify(creds));

      // Update greeting name immediately
      const gName = document.getElementById('greeting-name');
      if (gName && res.student.name) gName.textContent = toTitleCase(res.student.name);

      // If Moodle credentials already exist, finish onboarding; otherwise proceed to Step 3
      if (existingCreds && existingCreds.moodleEmail && existingCreds.moodlePass) {
        obFinish(false);
      } else {
        obShow(3);
      }
    } catch (err) {
      let errMsg = err.message || 'Verification failed. Please check your details.';
      if (errMsg.includes('Invalid USN') || errMsg.includes('Authentication failed') || errMsg.includes('401')) {
        errMsg = 'Invalid USN, Date of Birth, or Verification Code.';
      } else if (errMsg.includes('Verification failed. Please refresh') || errMsg.includes('403')) {
        errMsg = 'Security check failed. Please refresh the page and try again.';
      } else if (errMsg.includes('Cannot reach portal') || errMsg.includes('502')) {
        errMsg = 'College portal is temporarily unavailable. Please try again later.';
      } else if (errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError') || errMsg.includes('Load failed')) {
        errMsg = 'Network error. Please check your connection and try again.';
      }
      if (e) {
        e.textContent = errMsg;
        e.style.display = 'block';
      }
    } finally {
      isVerifying = false;
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalBtnHtml;
      }
      if (codeInp) {
        codeInp.disabled = false;
        codeInp.focus();
      }
      if (backBtn) backBtn.style.pointerEvents = '';
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
  const creds = loadCreds() || {};

  if (saveMoodle) {
    const pfxRaw = (document.getElementById('ob-moodle-email')?.value || '').trim();
    const pfx = pfxRaw.split('@')[0];
    const pw = document.getElementById('ob-moodle-pass')?.value || '';
    if (pfx && pw) {
      creds.moodleEmail = pfx + '@nie.ac.in';
      creds.moodlePass = pw;
      localStorage.setItem(CONFIG.CRED_KEY, JSON.stringify(creds));
    }
  }

  document.getElementById('onboarding')?.classList.remove('active');
  initAcademicCalendar();
  initTimetable();
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

  if (sem <= 1) return 'I';
  if (sem <= 3) return 'III';
  if (sem <= 5) return 'V';
  return 'VII';
}

export function initAcademicCalendar() {
  let usn = null;
  let resolved = false;

  const user = loadUser();
  if (user.semNum) {
    const num = parseInt(user.semNum, 10) || 0;
    if (num <= 1) selectedCalSem = 'I';
    else if (num <= 3) selectedCalSem = 'III';
    else if (num <= 5) selectedCalSem = 'V';
    else selectedCalSem = 'VII';
    resolved = true;
  }
  if (user.usn) usn = user.usn;

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
  updateCalendarLayout();
}

export function updateCalendarLayout() {
  const carousel = document.getElementById('calendar-carousel');
  const actionBar = document.querySelector('.dash-action-bar');
  if (!carousel || !actionBar) return;

  const btnWidth = actionBar.clientWidth;
  if (!btnWidth) return;

  // When the 3 calendar cards have greater cumulative width than the three buttons
  // (requires ~930px for 3-column layout without clipping/overflow),
  // show the mobile view styled calendar to eliminate horizontal overflow.
  if (btnWidth < 930) {
    carousel.classList.add('force-mobile-cal');
  } else {
    carousel.classList.remove('force-mobile-cal');
    if (carousel.scrollWidth > btnWidth + 4) {
      carousel.classList.add('force-mobile-cal');
    }
  }
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
  renderCalHolidays();
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
    if ((!hol.sems || hol.sems.includes(selectedCalSem)) && hol.date === dateStr) {
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

  const todayISO = getTodayISO();

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

  const todayISO = getTodayISO();
  let firstUpcomingEl = null;

  const semHolidays = HOLIDAYS_LIST.filter(h => !h.sems || h.sems.includes(selectedCalSem));

  semHolidays.forEach(h => {
    const item = document.createElement('div');
    item.className = 'cal-item';
    const isPast = h.date < todayISO;
    if (isPast) {
      item.classList.add('past');
    } else if (!firstUpcomingEl) {
      firstUpcomingEl = item;
    }

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

  if (firstUpcomingEl) {
    setTimeout(() => {
      const offset = firstUpcomingEl.offsetTop || (firstUpcomingEl.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop);
      list.scrollTop = Math.max(0, offset);
    }, 50);
  }
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

  const todayISO = getTodayISO();
  const semEvents = ACADEMIC_EVENTS.filter(ev => ev.sems.includes(selectedCalSem));
  let firstUpcomingEl = null;

  semEvents.forEach(ev => {
    const item = document.createElement('div');
    item.className = 'cal-item';
    if (ev.isExam) item.classList.add('is-exam');
    const isPast = ev.endDate < todayISO;
    if (isPast) {
      item.classList.add('past');
    } else if (!firstUpcomingEl) {
      firstUpcomingEl = item;
    }

    item.innerHTML = `
      <div class="cal-item-title">${ev.title}</div>
      <div class="cal-item-date-right">${formatDateRange(ev.startDate, ev.endDate)}</div>`;
    list.appendChild(item);
  });

  if (firstUpcomingEl) {
    setTimeout(() => {
      const offset = firstUpcomingEl.offsetTop || (firstUpcomingEl.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop);
      list.scrollTop = Math.max(0, offset);
    }, 50);
  }
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
  const user = loadUser();
  if (user.name) studentName = user.name;

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

// ═══════════════════════════════════════════════════════════════
//  DYNAMIC HOME SECTIONS & TIMETABLE
// ═══════════════════════════════════════════════════════════════

let currentHomeSection = 'timetable';
let currentTtDay = 'monday';
let currentTimetableData = null;
let selectedTtFile = null;
let isTtWeekViewActive = false;

export function toggleHomeSection(section) {
  const btnCalendar = document.getElementById('btn-toggle-calendar');
  const btnNotices = document.getElementById('btn-toggle-notices');
  const btnSyllabus = document.getElementById('btn-toggle-syllabus');

  const panelTimetable = document.getElementById('panel-timetable');
  const panelCalendar = document.getElementById('panel-calendar');
  const panelNotices = document.getElementById('panel-notices');
  const panelSyllabus = document.getElementById('panel-syllabus');

  // If already active or explicitly timetable, toggle off -> back to timetable
  if (currentHomeSection === section || section === 'timetable') {
    currentHomeSection = 'timetable';

    btnCalendar?.classList.remove('active');
    btnNotices?.classList.remove('active');
    btnSyllabus?.classList.remove('active');

    btnCalendar?.setAttribute('aria-selected', 'false');
    btnNotices?.setAttribute('aria-selected', 'false');
    btnSyllabus?.setAttribute('aria-selected', 'false');

    panelTimetable?.classList.add('active');
    panelCalendar?.classList.remove('active');
    panelNotices?.classList.remove('active');
    panelSyllabus?.classList.remove('active');
    return;
  }

  // Activate selected section
  currentHomeSection = section;

  btnCalendar?.classList.toggle('active', section === 'calendar');
  btnNotices?.classList.toggle('active', section === 'notices');
  btnSyllabus?.classList.toggle('active', section === 'syllabus');

  btnCalendar?.setAttribute('aria-selected', section === 'calendar' ? 'true' : 'false');
  btnNotices?.setAttribute('aria-selected', section === 'notices' ? 'true' : 'false');
  btnSyllabus?.setAttribute('aria-selected', section === 'syllabus' ? 'true' : 'false');

  panelTimetable?.classList.remove('active');
  panelCalendar?.classList.toggle('active', section === 'calendar');
  panelNotices?.classList.toggle('active', section === 'notices');
  panelSyllabus?.classList.toggle('active', section === 'syllabus');

  if (section === 'calendar') {
    initAcademicCalendar();
    requestAnimationFrame(() => updateCalendarLayout());
  } else if (section === 'notices') {
    if (!noticesLoaded) fetchNotices(false);
  } else if (section === 'syllabus') {
    fetchDepartmentData(false);
  }
}

export function initHomeToggleListeners() {
  ['calendar', 'notices', 'syllabus'].forEach(sec => {
    const btn = document.getElementById(`btn-toggle-${sec}`);
    if (btn && !btn._toggleBound) {
      btn._toggleBound = true;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleHomeSection(sec);
      });
    }
  });
}

// Guarantee immediate availability of toggleHomeSection for inline onclick & event delegation
if (typeof window !== 'undefined') {
  window.toggleHomeSection = toggleHomeSection;
  window.initHomeToggleListeners = initHomeToggleListeners;
}

if (typeof document !== 'undefined' && !document._dashToggleBound) {
  document._dashToggleBound = true;
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.dash-toggle-btn');
    if (btn) {
      const id = btn.id || '';
      if (id.includes('calendar')) toggleHomeSection('calendar');
      else if (id.includes('notices')) toggleHomeSection('notices');
      else if (id.includes('syllabus')) toggleHomeSection('syllabus');
    }
  });
}

function getRegisteredCourseCodes() {
  try {
    const session = JSON.parse(sessionStorage.getItem('nie_att_session') || '{}');
    if (session.attendance && Array.isArray(session.attendance)) {
      const codes = session.attendance.map(a => (a.code || '').toUpperCase().trim()).filter(Boolean);
      if (codes.length) return codes;
    }
  } catch (e) {}
  try {
    const cached = JSON.parse(localStorage.getItem('nie_registered_courses') || '[]');
    if (Array.isArray(cached) && cached.length) return cached;
  } catch (e) {}
  return [];
}

function getStudentTimetableParams() {
  const creds = loadCreds() || {};
  const user = loadUser() || {};
  const usn = creds.usn || user.usn || '';

  let branch = user.branch || '';
  if (!branch && user.program) {
    const prog = user.program.toUpperCase();
    if (prog.includes('ELECTRICAL')) branch = 'EE';
    else if (prog.includes('ELECTRONICS') && prog.includes('COMMUNICATION')) branch = 'EC';
    else if (prog.includes('COMPUTER')) branch = 'CS';
    else if (prog.includes('INFORMATION')) branch = 'IS';
    else if (prog.includes('AI') || prog.includes('MACHINE LEARNING')) branch = 'CI';
    else if (prog.includes('MECHANICAL')) branch = 'ME';
    else if (prog.includes('CIVIL')) branch = 'CV';
  }
  if (!branch && usn) {
    const m = usn.toUpperCase().match(/^\d[A-Z]{2}(\d{2})([A-Z]{2})(\d{3})/);
    if (m && m[2]) branch = m[2];
  }

  let semester = user.semNum || '';
  if (!semester && user.sem) {
    const roman = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8 };
    semester = roman[user.sem.toUpperCase()] || '';
  }
  if (!semester && usn) {
    const inf = getInferredSemFromUsn(usn);
    const roman = { I: 1, III: 3, V: 5, VII: 7 };
    semester = roman[inf] || 5;
  }

  let section = user.section || 'A';
  let batch = user.batch || '';
  if (!batch && usn) {
    const m = usn.toUpperCase().match(/^\d[A-Z]{2}(\d{2})/);
    if (m && m[1]) batch = '20' + m[1];
  }

  return {
    branch: (branch || 'CS').toUpperCase(),
    semester: parseInt(semester, 10) || 5,
    section: (section || 'A').toUpperCase(),
    batch: batch || ''
  };
}

export async function initTimetable() {
  const heading = document.getElementById('tt-day-heading');
  const subheading = document.getElementById('tt-date-subheading');
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  if (heading && !isTtWeekViewActive) heading.textContent = "Today's Classes";
  if (subheading && !isTtWeekViewActive) subheading.textContent = dateStr;

  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayIdx = now.getDay();
  currentTtDay = todayIdx === 0 ? 'monday' : days[todayIdx];

  updateTtDayNavUI();

  const params = getStudentTimetableParams();
  const badgeEl = document.getElementById('tt-section-badge');
  if (badgeEl) {
    badgeEl.textContent = `${params.branch} • Sem ${params.semester} (${params.section})`;
  }

  // Pre-populate upload modal inputs
  const upBranch = document.getElementById('tt-up-branch');
  const upSem = document.getElementById('tt-up-sem');
  const upSec = document.getElementById('tt-up-section');
  const upBatch = document.getElementById('tt-up-batch');
  if (upBranch && !upBranch.value) upBranch.value = params.branch;
  if (upSem && !upSem.value) upSem.value = params.semester;
  if (upSec && !upSec.value) upSec.value = params.section;
  if (upBatch && !upBatch.value) upBatch.value = params.batch;

  // Render from cache first for instant UX
  const cacheKey = `nie_tt_cache_${params.branch}_${params.semester}_${params.section}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      currentTimetableData = JSON.parse(cached);
      renderTodaySchedule(currentTimetableData, currentTtDay);
    }
  } catch (e) {}

  // Fetch updated timetable from backend
  try {
    const data = await api.getTimetable(params);
    if (data && data.schedule) {
      currentTimetableData = data;
      try {
        localStorage.setItem(cacheKey, JSON.stringify(data));
      } catch (e) {}
      renderTodaySchedule(currentTimetableData, currentTtDay);
    } else {
      if (!currentTimetableData) {
        showEmptyTimetable(params);
      }
    }
  } catch (err) {
    if (!currentTimetableData) {
      showEmptyTimetable(params);
    }
  }
}

export function selectTtDay(dayName) {
  currentTtDay = dayName;
  updateTtDayNavUI();
  if (currentTimetableData) {
    renderTodaySchedule(currentTimetableData, currentTtDay);
  }
}

function updateTtDayNavUI() {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayDayName = days[new Date().getDay()];

  document.querySelectorAll('.tt-day-chip').forEach(btn => {
    const day = btn.getAttribute('data-day');
    btn.classList.toggle('active', day === currentTtDay);
    btn.classList.toggle('is-today', day === todayDayName);
  });
}

export function renderTodaySchedule(timetable, dayName = currentTtDay) {
  const container = document.getElementById('tt-schedule-body');
  const heading = document.getElementById('tt-day-heading');
  const subheading = document.getElementById('tt-date-subheading');
  const editBtn = document.getElementById('btn-tt-edit');
  if (editBtn) editBtn.style.display = 'inline-flex';

  if (!container) return;

  const now = new Date();

  if (heading) {
    heading.textContent = `Today's Classes`;
  }
  if (subheading) {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    subheading.textContent = now.toLocaleDateString('en-US', options);
  }

  const schedule = timetable?.schedule?.[dayName] || [];
  if (!schedule.length) {
    container.innerHTML = `
      <div class="tt-empty">
        <div style="font-size: 1.6rem; line-height: 1;">🎉</div>
        <div class="tt-empty-title">No Classes Scheduled Today</div>
        <div class="tt-empty-desc">Enjoy your day off or tap Week above to see your full schedule.</div>
      </div>
    `;
    return;
  }

  const regCodes = getRegisteredCourseCodes();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  let html = '';

  schedule.forEach(slot => {
    if (slot.type === 'break' || slot.isBreak) {
      const breakName = slot.name || (slot.start === '13:30' ? 'Lunch Break' : 'Tea Break');
      const icon = breakName.toLowerCase().includes('lunch') ? '🍱' : '☕';
      html += `
        <div class="tt-break-slot">
          <span>${icon}</span>
          <span>${escHtml(breakName)} (${slot.start} – ${slot.end})</span>
        </div>
      `;
      return;
    }

    // Resolve elective options against registered courses
    let displayCode = slot.code || '';
    let displayFaculty = slot.faculty || '';
    let displayRoom = slot.room || timetable.metadata?.roomNo || '';
    let isElective = (slot.type === 'elective');

    if (slot.options && slot.options.length > 0) {
      isElective = true;
      if (regCodes.length > 0) {
        const matched = slot.options.find(opt => regCodes.includes((opt.code || '').toUpperCase().trim()));
        if (matched) {
          displayCode = matched.code;
          if (matched.faculty) displayFaculty = matched.faculty;
          if (matched.room) displayRoom = matched.room;
        } else {
          displayCode = slot.options.map(o => o.code).filter(Boolean).join(' / ');
          displayFaculty = slot.options.map(o => o.faculty).filter(Boolean).join('/');
        }
      } else {
        displayCode = slot.options.map(o => o.code).filter(Boolean).join(' / ');
        displayFaculty = slot.options.map(o => o.faculty).filter(Boolean).join('/');
      }
    }

    // Resolve subject title from subjects table if available
    let subjectTitle = slot.name || '';
    if (!subjectTitle && timetable.subjects && Array.isArray(timetable.subjects)) {
      const primaryCode = (displayCode || '').split('/')[0].trim();
      const sub = timetable.subjects.find(s => (s.code || '').toUpperCase() === primaryCode.toUpperCase());
      if (sub) {
        subjectTitle = sub.name || sub.title || '';
        if (!displayFaculty && (sub.faculty || sub.initials || sub.instructor)) {
          displayFaculty = sub.faculty || sub.initials || sub.instructor;
        }
      }
    }
    if (!subjectTitle) subjectTitle = displayCode || 'Class';

    // Parse start & end in minutes
    let isNow = false;
    let isPast = false;
    if (slot.start && slot.end) {
      const [sh, sm] = slot.start.split(':').map(Number);
      const [eh, em] = slot.end.split(':').map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;

      if (isViewingToday) {
        if (nowMinutes >= startMin && nowMinutes < endMin) {
          isNow = true;
        } else if (nowMinutes >= endMin) {
          isPast = true;
        }
      }
    }

    const isLab = (slot.type === 'lab');

    html += `
      <div class="tt-slot ${isNow ? 'is-now' : ''} ${isPast ? 'is-past' : ''}">
        <div class="tt-slot-time">
          <div class="tt-time-start">${escHtml(slot.start || '')}</div>
          <div class="tt-time-end">${escHtml(slot.end || '')}</div>
        </div>
        <div class="tt-slot-divider">
          ${isNow ? '<div class="tt-now-dot"></div>' : ''}
        </div>
        <div class="tt-slot-content">
          <div class="tt-slot-title-row">
            <div class="tt-slot-title" title="${escAttr(subjectTitle)}">${escHtml(subjectTitle)}</div>
            ${isNow ? '<span class="tt-slot-tag tt-tag-now">NOW</span>' : ''}
            ${!isNow && isElective ? '<span class="tt-slot-tag tt-tag-elective">Elective</span>' : ''}
            ${!isNow && isLab ? '<span class="tt-slot-tag tt-tag-lab">Lab</span>' : ''}
          </div>
          <div class="tt-slot-meta">
            ${displayCode ? `<span class="tt-code-pill">${escHtml(displayCode)}</span>` : ''}
            ${displayRoom ? `<span class="tt-room">📍 ${escHtml(displayRoom)}</span>` : ''}
            ${displayFaculty ? `<span class="tt-fac">👤 ${escHtml(displayFaculty)}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function showEmptyTimetable(params) {
  const container = document.getElementById('tt-schedule-body');
  const editBtn = document.getElementById('btn-tt-edit');
  const heading = document.getElementById('tt-day-heading');
  const subheading = document.getElementById('tt-date-subheading');
  if (editBtn) editBtn.style.display = 'none';

  if (isTtWeekViewActive) {
    isTtWeekViewActive = false;
    updateTtSubView();
  }

  if (heading) heading.textContent = "Today's Classes";
  if (subheading) {
    const now = new Date();
    subheading.textContent = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  if (!container) return;

  container.innerHTML = `
    <div class="tt-empty">
      <div class="tt-empty-title">Timetable Not Available Yet</div>
      <div class="tt-empty-desc">
        We don't have the timetable for your section yet. Help your classmates out by uploading a copy!
      </div>
      <button type="button" class="tt-empty-btn" onclick="openTtUploadModal('upload')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <span>Upload Timetable</span>
      </button>
    </div>
  `;
}

export function openTtUploadModal(mode = 'upload') {
  const modal = document.getElementById('tt-upload-modal');
  if (modal) {
    const titleEl = document.getElementById('tt-upload-modal-title');
    const btnEl = document.getElementById('tt-upload-btn');
    if (titleEl) {
      titleEl.textContent = (mode === 'edit') ? 'Suggest Timetable Edit' : 'Upload Timetable';
    }
    if (btnEl) {
      btnEl.textContent = (mode === 'edit') ? 'Submit Correction' : 'Submit for Review';
      btnEl.setAttribute('data-mode', mode);
    }

    selectedTtFile = null;
    const fileInput = document.getElementById('tt-file-input');
    if (fileInput) fileInput.value = '';
    const label = document.getElementById('tt-dropzone-label');
    if (label) label.textContent = 'Click to select timetable file';

    const status = document.getElementById('tt-upload-status');
    if (status) { status.style.display = 'none'; status.textContent = ''; }

    modal.classList.add('active');

    const dropzone = document.getElementById('tt-dropzone');
    if (dropzone && !dropzone._dragInit) {
      dropzone._dragInit = true;
      dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.style.borderColor = 'var(--accent)'; });
      dropzone.addEventListener('dragleave', () => { dropzone.style.borderColor = ''; });
      dropzone.addEventListener('drop', e => {
        e.preventDefault();
        dropzone.style.borderColor = '';
        if (e.dataTransfer?.files?.[0]) {
          handleTtFileChange({ files: e.dataTransfer.files });
        }
      });
    }
  }
}

export function closeTtUploadModal() {
  const modal = document.getElementById('tt-upload-modal');
  if (modal) modal.classList.remove('active');
}

export function handleTtFileChange(input) {
  const file = input.files?.[0];
  const label = document.getElementById('tt-dropzone-label');
  if (file && label) {
    selectedTtFile = file;
    label.textContent = `Selected: ${file.name} (${(file.size / 1024).toFixed(0)} KB)`;
  }
}

export async function submitTimetableUpload(e) {
  if (e) e.preventDefault();
  const fileInput = document.getElementById('tt-file-input');
  const file = selectedTtFile || fileInput?.files?.[0];

  const statusEl = document.getElementById('tt-upload-status');
  const btn = document.getElementById('tt-upload-btn');
  const isEdit = btn?.getAttribute('data-mode') === 'edit';

  if (!file) {
    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.style.color = 'var(--danger)';
      statusEl.textContent = 'Please choose a timetable file (PDF or image).';
    }
    return;
  }

  // Get student params automatically from local storage
  const studentParams = getStudentTimetableParams();
  const branch = studentParams.branch;
  const semester = studentParams.semester;
  const section = studentParams.section;
  const batch = studentParams.batch;

  if (btn) {
    btn.disabled = true;
    btn.textContent = isEdit ? 'Submitting...' : 'Uploading...';
  }
  if (statusEl) {
    statusEl.style.display = 'none';
    statusEl.textContent = '';
  }

  try {
    await api.uploadTimetable(file, { branch, semester, section, batch });
    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.style.color = '#10b981';
      statusEl.textContent = 'Submitted';
    }
    setTimeout(() => {
      closeTtUploadModal();
      if (btn) {
        btn.disabled = false;
        btn.textContent = isEdit ? 'Submit Correction' : 'Submit for Review';
      }
    }, 2000);
  } catch (err) {
    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.style.color = 'var(--danger)';
      statusEl.textContent = err.message || 'Upload failed. Please try again.';
    }
    if (btn) {
      btn.disabled = false;
      btn.textContent = isEdit ? 'Submit Correction' : 'Submit for Review';
    }
  }
}

export function toggleTtWeekView() {
  isTtWeekViewActive = !isTtWeekViewActive;
  updateTtSubView();
}

export function updateTtSubView() {
  const scheduleBody = document.getElementById('tt-schedule-body');
  const weekBody = document.getElementById('tt-week-body');
  const weekBtn = document.getElementById('btn-tt-week');
  const weekBtnText = document.getElementById('tt-week-btn-text');
  const heading = document.getElementById('tt-day-heading');
  const subheading = document.getElementById('tt-date-subheading');

  if (isTtWeekViewActive) {
    if (scheduleBody) {
      scheduleBody.style.display = 'none';
      scheduleBody.classList.remove('active');
    }
    if (weekBody) {
      weekBody.style.display = 'flex';
      weekBody.classList.add('active');
    }
    if (weekBtn) weekBtn.classList.add('is-active');
    if (weekBtnText) weekBtnText.textContent = 'Today';
    if (heading) heading.textContent = 'Weekly Schedule';
    if (subheading) {
      if (currentTimetableData?.metadata) {
        const m = currentTimetableData.metadata;
        subheading.textContent = `${m.branch || ''} Sem ${m.semester || ''} (${m.section || ''})${m.roomNo ? ' • Room ' + m.roomNo : ''}`;
      } else {
        const p = getStudentTimetableParams();
        subheading.textContent = `${p.branch} Sem ${p.semester} (${p.section})`;
      }
    }
    renderWeekScheduleInline();
  } else {
    if (weekBody) {
      weekBody.style.display = 'none';
      weekBody.classList.remove('active');
    }
    if (scheduleBody) {
      scheduleBody.style.display = 'flex';
      scheduleBody.classList.add('active');
    }
    if (weekBtn) weekBtn.classList.remove('is-active');
    if (weekBtnText) weekBtnText.textContent = 'Week';
    if (heading) heading.textContent = "Today's Classes";
    if (subheading) {
      const now = new Date();
      subheading.textContent = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
    if (currentTimetableData) {
      renderTodaySchedule(currentTimetableData, currentTtDay);
    }
  }
}

export function renderWeekScheduleInline() {
  const wrap = document.getElementById('tt-week-table-wrap');
  if (!wrap) return;

  const data = currentTimetableData;
  if (!data || !data.schedule) {
    wrap.innerHTML = `
      <div class="tt-empty">
        <div class="tt-empty-title">Timetable Not Available Yet</div>
        <div class="tt-empty-desc">We don't have the timetable for your section yet. Help your classmates out by uploading a copy!</div>
        <button type="button" class="tt-empty-btn" onclick="openTtUploadModal('upload')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <span>Upload Timetable</span>
        </button>
      </div>
    `;
    return;
  }

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayDayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()];

  let timeSlots = data.timeSlots;
  if (!timeSlots || !timeSlots.length) {
    const slotSet = new Set();
    days.forEach(d => {
      (data.schedule[d] || []).forEach(s => {
        if (s.start && s.end) slotSet.add(`${s.start}-${s.end}`);
      });
    });
    timeSlots = Array.from(slotSet).sort();
    if (!timeSlots.length) {
      timeSlots = [
        '09:00-10:00',
        '10:00-11:00',
        '11:00-11:30',
        '11:30-12:30',
        '12:30-13:30',
        '13:30-14:30',
        '14:30-15:30',
        '15:30-16:30'
      ];
    }
  }

  const regCodes = getRegisteredCourseCodes();

  let html = `<table class="tt-week-table"><thead><tr><th>Time</th>`;
  days.forEach((d, idx) => {
    const isToday = (d === todayDayName);
    html += `<th class="${isToday ? 'is-today-col' : ''}">${dayLabels[idx]}${isToday ? ' •' : ''}</th>`;
  });
  html += `</tr></thead><tbody>`;

  timeSlots.forEach(ts => {
    const [tstart] = ts.split('-');
    const isBreak = (tstart === '11:00' || tstart === '13:30');
    html += `<tr><td class="is-time-col">${ts}</td>`;

    if (isBreak) {
      const bLabel = tstart === '13:30' ? '🍱 Lunch Break' : '☕ Tea Break';
      html += `<td colspan="6" style="text-align:center; color:var(--muted); font-weight:700; background:rgba(0,0,0,0.02);">${bLabel}</td>`;
    } else {
      days.forEach(day => {
        const slotsForDay = data.schedule[day] || [];
        const slot = slotsForDay.find(s => s.start === tstart);
        const isToday = (day === todayDayName);
        if (!slot) {
          html += `<td class="${isToday ? 'is-today-col' : ''}"></td>`;
        } else {
          let code = slot.code || '';
          let fac = slot.faculty || '';
          if (slot.options && slot.options.length) {
            const matched = slot.options.find(o => regCodes.includes((o.code || '').toUpperCase().trim()));
            if (matched) {
              code = matched.code;
              fac = matched.faculty || fac;
            } else {
              code = slot.options.map(o => o.code).join('/');
            }
          }
          html += `
            <td class="${isToday ? 'is-today-col' : ''}">
              <div class="tt-week-cell-slot">
                <div class="tt-week-code">${escHtml(code)}</div>
                ${fac ? `<div class="tt-week-fac">${escHtml(fac)}</div>` : ''}
              </div>
            </td>
          `;
        }
      });
    }
    html += `</tr>`;
  });

  html += `</tbody></table>`;
  wrap.innerHTML = html;
}

export function openTtWeekModal() {
  toggleTtWeekView();
}

export function closeTtWeekModal() {
  if (isTtWeekViewActive) {
    toggleTtWeekView();
  }
}

// ── Department & Notices Sections ──
let noticesLoaded = false;
let currentDeptTab = 'syllabus';
let cachedDeptData = null;

export function openNoticesModal() {
  toggleHomeSection('notices');
}

export function closeNoticesModal() {
  if (currentHomeSection === 'notices') toggleHomeSection('timetable');
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

  const creds = loadCreds() || {};
  const user = loadUser();
  const usn = creds.usn || '';
  const name = user.name || '';

  try {
    const notices = await api.getNotices(forceRefresh);
    loader.classList.remove('show');
    list.innerHTML = '';

    if (!notices || !notices.length) {
      list.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--muted); margin: auto 0;">No notices found.</div>';
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
    list.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--danger); margin: auto 0;">Failed to load notices.</div>';
  } finally {
    if (forceRefresh && refreshIcon) refreshIcon.classList.remove('spin');
  }
}

function getDepartmentSlug() {
  const creds = loadCreds();
  if (creds && creds.usn) {
    const match = creds.usn.toUpperCase().match(/^[0-9]{1}[A-Z]{2}[0-9]{2}([A-Z]{2})/);
    if (match && match[1]) {
      return DEPT_SLUG_MAP[match[1]] || null;
    }
  }
  return null;
}

export function openDepartmentModal(tab = 'syllabus') {
  currentDeptTab = 'syllabus';
  const titleEl = document.getElementById('dept-modal-title');
  if (titleEl) titleEl.textContent = 'Department Syllabus';
  toggleHomeSection('syllabus');
}

export function closeDepartmentModal() {
  if (currentHomeSection === 'syllabus') toggleHomeSection('timetable');
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
      list.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--muted); margin: auto 0;">Unable to detect your department from USN.</div>';
      if (forceRefresh && refreshIcon) refreshIcon.classList.remove('spin');
      return;
    }

    const creds = loadCreds() || {};
    const user = loadUser();
    const usn = creds.usn || '';
    const name = user.name || '';

    try {
      const data = await api.getDepartment(slug, 'syllabus');
      cachedDeptData = data.department;
    } catch (err) {
      loader.classList.remove('show');
      list.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--danger); margin: auto 0;">Failed to load data.</div>';
      if (forceRefresh && refreshIcon) refreshIcon.classList.remove('spin');
      return;
    }
  }

  loader.classList.remove('show');
  list.innerHTML = '';

  const items = cachedDeptData?.syllabus_files;
  if (!items || !items.length) {
    list.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--muted); margin: auto 0;">No syllabus files found.</div>`;
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
    title: 'Student Hub',
    text: 'Check out Student Hub — the all-in-one academic portal for students! Access attendance, results, courses and more.',
    url: window.location.origin + window.location.pathname.replace(/\/index\.html$/, '')
  };
  try {
    if (navigator.share) {
      if (typeof window.toggleDrawer === 'function') window.toggleDrawer(false);
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(shareData.url);
      const label = document.getElementById('drawer-share-label');
      if (label) {
        const original = label.textContent;
        label.textContent = 'Link Copied!';
        setTimeout(() => {
          label.textContent = original;
          if (typeof window.toggleDrawer === 'function') window.toggleDrawer(false);
        }, 1200);
      }
      const btn = document.querySelector('.drawer-share-btn, button.share-btn');
      if (btn && !label) {
        const original = btn.innerHTML;
        btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
        setTimeout(() => (btn.innerHTML = original), 1500);
      }
    }
  } catch (e) {}
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
  window.toggleHomeSection = toggleHomeSection;
  window.selectTtDay = selectTtDay;
  window.initTimetable = initTimetable;
  window.openTtUploadModal = openTtUploadModal;
  window.closeTtUploadModal = closeTtUploadModal;
  window.handleTtFileChange = handleTtFileChange;
  window.submitTimetableUpload = submitTimetableUpload;
  window.toggleTtWeekView = toggleTtWeekView;
  window.renderWeekScheduleInline = renderWeekScheduleInline;
  window.openTtWeekModal = openTtWeekModal;
  window.closeTtWeekModal = closeTtWeekModal;
  window.updateCalendarLayout = updateCalendarLayout;

  window.addEventListener('resize', updateCalendarLayout);
  if (typeof ResizeObserver !== 'undefined') {
    const calRo = new ResizeObserver(() => {
      updateCalendarLayout();
    });
    const calSec = document.querySelector('.cal-section');
    if (calSec) calRo.observe(calSec);
    const ab = document.querySelector('.dash-action-bar');
    if (ab) calRo.observe(ab);
  }
}
