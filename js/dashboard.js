// ═══════════════════════════════════════════════════════════════
//  STUDENT HUB — Dashboard & Home Page Logic
// ═══════════════════════════════════════════════════════════════

import { CONFIG } from './config.js';
import { api } from './api.js';
import { loadCreds, initTheme, initPwa, loadUser, toTitleCase, escHtml, getStoredUsn, ensureHumanSession, getSessionToken, setIdentityToken, showAppNoticeToast } from './shared.js';

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
        usn: res.student.usn || usn,
        program: res.student.program,
        semNum: res.student.semNum || '',
        section: res.student.section || '',
        photoUri: res.student.photoUri || null,
        sem: res.student.sem || ''
      };
      localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(profile));

      try {
        sessionStorage.setItem(CONFIG.ATT_SESSION_KEY, JSON.stringify(res.student));
        if (res.student.attendance && Array.isArray(res.student.attendance)) {
          const enrolledCourses = res.student.attendance.map(a => ({
            code: (a.code || '').toUpperCase().trim(),
            name: (a.name || '').trim()
          })).filter(c => c.code);
          if (enrolledCourses.length > 0) {
            localStorage.setItem('nie_registered_courses', JSON.stringify(enrolledCourses));
          }
        }
      } catch (err) {}

      // Store verified credentials + portal cookies for session resume
      const creds = { usn, dob, idType, code };
      if (res.student.cookies) {
        creds.cookies = res.student.cookies;
        creds.cookiesAt = Date.now();
      }
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
let currentTimetableIsPending = false;
let selectedTtFile = null;

const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];


export function toggleHomeSection(section) {
  const sections = ['calendar', 'notices', 'syllabus'];
  const panelTimetable = document.getElementById('panel-timetable');

  // If already active or explicitly timetable, toggle off -> back to timetable
  if (currentHomeSection === section || section === 'timetable') {
    currentHomeSection = 'timetable';
    sections.forEach(s => {
      const btn = document.getElementById(`btn-toggle-${s}`);
      if (btn) { btn.classList.remove('active'); btn.setAttribute('aria-selected', 'false'); btn.blur(); }
      document.getElementById(`panel-${s}`)?.classList.remove('active');
    });
    panelTimetable?.classList.add('active');
    resetTtToToday();
    return;
  }

  // Activate selected section
  currentHomeSection = section;
  panelTimetable?.classList.remove('active');
  sections.forEach(s => {
    const btn = document.getElementById(`btn-toggle-${s}`);
    const isActive = s === section;
    btn?.classList.toggle('active', isActive);
    btn?.setAttribute('aria-selected', isActive ? 'true' : 'false');
    document.getElementById(`panel-${s}`)?.classList.toggle('active', isActive);
  });

  if (section === 'calendar') {
    initAcademicCalendar();
    requestAnimationFrame(() => updateCalendarLayout());
  } else if (section === 'notices') {
    if (!noticesLoaded) fetchNotices(false);
  } else if (section === 'syllabus') {
    fetchDepartmentData(false);
  }
}

// Guarantee immediate availability of toggleHomeSection for inline onclick
if (typeof window !== 'undefined') {
  window.toggleHomeSection = toggleHomeSection;
}

export function getRegisteredCourseCodes() {
  try {
    const cached = JSON.parse(localStorage.getItem('nie_registered_courses') || '[]');
    if (Array.isArray(cached) && cached.length) {
      return cached.map(c => {
        if (typeof c === 'string') return c.toUpperCase().trim();
        return (c?.code || '').toUpperCase().trim();
      }).filter(Boolean);
    }
  } catch (e) {}

  try {
    const session = JSON.parse(sessionStorage.getItem('nie_att_session') || '{}');
    if (session.attendance && Array.isArray(session.attendance)) {
      const courses = session.attendance.map(a => ({
        code: (a.code || '').toUpperCase().trim(),
        name: (a.name || '').trim()
      })).filter(c => c.code);
      if (courses.length) {
        try { localStorage.setItem('nie_registered_courses', JSON.stringify(courses)); } catch (err) {}
        return courses.map(c => c.code);
      }
    }
  } catch (e) {}

  return [];
}

export function getRegisteredCourses() {
  try {
    const cached = JSON.parse(localStorage.getItem('nie_registered_courses') || '[]');
    if (Array.isArray(cached) && cached.length) {
      return cached.map(c => {
        if (typeof c === 'string') return { code: c.toUpperCase().trim(), name: c.toUpperCase().trim() };
        return { code: (c?.code || '').toUpperCase().trim(), name: (c?.name || c?.code || '').trim() };
      }).filter(c => c.code);
    }
  } catch (e) {}

  try {
    const session = JSON.parse(sessionStorage.getItem('nie_att_session') || '{}');
    if (session.attendance && Array.isArray(session.attendance)) {
      return session.attendance.map(a => ({
        code: (a.code || '').toUpperCase().trim(),
        name: (a.name || '').trim()
      })).filter(c => c.code);
    }
  } catch (e) {}

  return [];
}

// ensureRegisteredCoursesLoaded removed — callers use getRegisteredCourseCodes() directly

// Standard NIE period slots with fixed Break timings
const FIXED_DAY_SLOTS = [
  { id: 'p1', type: 'period', num: 1, startMin: 540, endMin: 600, labelStart: '09:00', labelEnd: '10:00' },
  { id: 'p2', type: 'period', num: 2, startMin: 600, endMin: 660, labelStart: '10:00', labelEnd: '11:00' },
  { id: 'b1', type: 'break', name: 'Break', startMin: 660, endMin: 690, labelStart: '11:00', labelEnd: '11:30' },
  { id: 'p3', type: 'period', num: 3, startMin: 690, endMin: 750, labelStart: '11:30', labelEnd: '12:30' },
  { id: 'p4', type: 'period', num: 4, startMin: 750, endMin: 810, labelStart: '12:30', labelEnd: '01:30' },
  { id: 'b2', type: 'break', name: 'Break', startMin: 810, endMin: 870, labelStart: '01:30', labelEnd: '02:30' },
  { id: 'p5', type: 'period', num: 5, startMin: 870, endMin: 930, labelStart: '02:30', labelEnd: '03:30' },
  { id: 'p6', type: 'period', num: 6, startMin: 930, endMin: 990, labelStart: '03:30', labelEnd: '04:30' }
];

function parseTimeToMinutes(t) {
  if (!t) return -1;
  const parts = String(t).trim().split(':');
  let h = parseInt(parts[0], 10);
  let m = parts[1] ? parseInt(parts[1], 10) : 0;
  if (isNaN(h)) return -1;
  if (isNaN(m)) m = 0;
  // Convert 12h PM times (01:00 to 05:00) to 24h
  if (h >= 1 && h <= 5) h += 12;
  return h * 60 + m;
}

function cleanCourseCode(str) {
  return String(str || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function courseCodesMatch(codeA, codeB) {
  if (!codeA || !codeB) return false;
  const a = cleanCourseCode(codeA);
  const b = cleanCourseCode(codeB);
  if (!a || !b) return false;

  // Direct exact match
  if (a === b) return true;

  // Exact length required: no prefix/suffix variations allowed
  if (a.length !== b.length) return false;

  // Exact character match, where 'X' terms can be anything, other terms must match exactly
  for (let i = 0; i < a.length; i++) {
    const charA = a[i];
    const charB = b[i];
    if (charA === 'X' || charB === 'X') {
      continue; // X term can be anything
    }
    if (charA !== charB) {
      return false; // other terms must match exactly
    }
  }

  return true;
}

function matchesRegisteredCourse(candidateStr, regCodes) {
  if (!candidateStr) return false;
  if (!regCodes || !regCodes.length) return true; // allow fallback if no reg codes loaded yet
  const candNorm = cleanCourseCode(candidateStr);
  if (!candNorm) return false;
  return regCodes.some(rc => courseCodesMatch(candNorm, rc));
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

  const finalBranch = (branch || 'CS').toUpperCase();
  
  return {
    branch: finalBranch,
    semester: parseInt(semester, 10) || 5,
    section: (section || 'A').toUpperCase(),
    batch: batch || ''
  };
}

export function cleanBatch(b) {
  if (!b) return '';
  return String(b).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function getBatchesFromString(str) {
  if (!str) return [];
  const found = [];
  const matches = String(str).matchAll(/(?:^|[^A-Z0-9])([A-Z][0-9])(?:[^A-Z0-9]|$)/gi);
  for (const m of matches) {
    if (m[1]) found.push(m[1].toUpperCase());
  }
  if (found.length === 0) {
    const clean = cleanBatch(str);
    if (clean && clean !== 'ALL' && clean !== 'ALLBATCHES') found.push(clean);
  }
  return found;
}

export function batchMatches(slotBatchStr, targetBatch) {
  if (!slotBatchStr || !targetBatch) return false;
  const cleanTarget = cleanBatch(targetBatch);
  if (cleanTarget === 'ALL' || cleanTarget === 'ALLBATCHES') return true;
  const batches = getBatchesFromString(slotBatchStr);
  return batches.includes(cleanTarget);
}

function findBatchSetIndex(batchValue, batchSets) {
  if (!batchValue || !Array.isArray(batchSets)) return -1;
  const clean = cleanBatch(batchValue);
  if (!clean) return -1;
  for (let i = 0; i < batchSets.length; i++) {
    if (batchSets[i].some(b => cleanBatch(b) === clean)) return i;
  }
  return -1;
}

function getBatchSelections(timetable) {
  const batchSets = timetable?.batchSets || [];
  const selections = {};
  batchSets.forEach((set, idx) => {
    const saved = localStorage.getItem('nie_batch_' + idx);
    if (saved) {
      const clean = cleanBatch(saved);
      if (set.some(b => cleanBatch(b) === clean)) {
        selections[idx] = clean;
      }
    }
  });
  return selections;
}

export function toggleSlotBatchDropdown(triggerEl, event) {
  if (event) event.stopPropagation();
  const dropdown = triggerEl.closest('.sem-dropdown');
  if (!dropdown) return;
  const wasOpen = dropdown.classList.contains('open');
  // Close any other open slot batch dropdowns first
  document.querySelectorAll('.tt-slot-batch-dropdown.open').forEach(d => d.classList.remove('open'));
  if (!wasOpen) {
    dropdown.classList.add('open');
  }
}

export function closeSlotBatchDropdown(backdropEl, event) {
  if (event) event.stopPropagation();
  const dropdown = backdropEl ? backdropEl.closest('.sem-dropdown') : null;
  if (dropdown) dropdown.classList.remove('open');
  else document.querySelectorAll('.tt-slot-batch-dropdown.open').forEach(d => d.classList.remove('open'));
}

export function pickSlotBatch(batchSetIdx, value, event) {
  if (event) event.stopPropagation();
  const clean = cleanBatch(value);
  if (clean) localStorage.setItem('nie_batch_' + batchSetIdx, clean);
  closeSlotBatchDropdown();
  if (currentTimetableData) {
    renderTodaySchedule(currentTimetableData, currentTtDay);
  }
}






export function resetTtToToday() {
  const days = DAYS_OF_WEEK;
  const now = new Date();
  const todayIdx = now.getDay();
  currentTtDay = todayIdx === 0 ? 'monday' : days[todayIdx];
  updateTtDayNavUI();
  if (currentTimetableData) {
    renderTodaySchedule(currentTimetableData, currentTtDay);
  }
}


async function fetchAndApplyTimetable(params, { forceRefresh = false } = {}) {
  const cacheKey = `nie_tt_cache_${params.branch}_${params.semester}_${params.section}`;
  try {
    const fetchParams = forceRefresh ? { ...params, forceRefresh } : params;
    const data = await api.getTimetable(fetchParams);
    if (data && data.schedule) {
      currentTimetableData = data;
      currentTimetableIsPending = false;
      try { localStorage.setItem(cacheKey, JSON.stringify(data)); } catch (e) {}
      renderTodaySchedule(currentTimetableData, currentTtDay);
    } else if (data && data.pending) {
      currentTimetableIsPending = true;
      currentTimetableData = null;
      try { localStorage.removeItem(cacheKey); } catch (e) {}
      showPendingTimetable(params);
    } else {
      currentTimetableIsPending = false;
      try { localStorage.removeItem(cacheKey); } catch (e) {}
      currentTimetableData = null;
      showEmptyTimetable(params);
    }
  } catch (err) {
    console.warn('Timetable fetch failed:', err);
    if (!currentTimetableData) {
      showEmptyTimetable(params);
    }
  }
}

export async function initTimetable() {
  const heading = document.getElementById('tt-day-heading');
  if (heading) heading.textContent = "Schedule";

  const days = DAYS_OF_WEEK;
  const now = new Date();
  const todayIdx = now.getDay();
  currentTtDay = todayIdx === 0 ? 'monday' : days[todayIdx];

  updateTtDayNavUI();

  getRegisteredCourseCodes();

  const params = getStudentTimetableParams();

  // Render from cache first for instant UX
  const cacheKey = `nie_tt_cache_${params.branch}_${params.semester}_${params.section}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      currentTimetableData = JSON.parse(cached);
      renderTodaySchedule(currentTimetableData, currentTtDay);
    }
  } catch (e) {
    console.warn('Cache timetable error:', e);
  }

  await fetchAndApplyTimetable(params);
}

export async function refreshTimetable(force = true) {
  const icon = document.getElementById('tt-refresh-icon');
  const btn = document.getElementById('btn-tt-refresh');
  if (icon) icon.classList.add('spin');
  if (btn) btn.disabled = true;

  getRegisteredCourseCodes();
  const params = getStudentTimetableParams();

  try {
    await fetchAndApplyTimetable(params, { forceRefresh: force });
  } finally {
    if (icon) icon.classList.remove('spin');
    if (btn) btn.disabled = false;
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
  const days = DAYS_OF_WEEK;
  const todayDayName = days[new Date().getDay()];

  document.querySelectorAll('.tt-day-chip').forEach(btn => {
    const day = btn.getAttribute('data-day');
    btn.classList.toggle('active', day === currentTtDay);
    btn.classList.toggle('is-today', day === todayDayName);
  });
}

function resolveClassForPeriod(slotDef, rawDaySchedule, regCodes, batchSelections, timetable) {
  let matchedClass = null;
  const batchSets = timetable?.batchSets || [];

  for (const s of rawDaySchedule) {
    if (!s || s.type === 'break' || s.isBreak || s.type === 'free') continue;
    const codeClean = (s.code || '').trim().toLowerCase();
    const nameClean = (s.name || s.title || '').trim().toLowerCase();
    if (codeClean === 'free' || codeClean === 'nil' || codeClean === '-' || codeClean === 'na' || codeClean === 'no class') continue;
    if (nameClean === 'free' || nameClean === 'free period' || nameClean === 'no class' || nameClean === 'nil') continue;
    if (!codeClean && !nameClean && (!s.options || s.options.length === 0)) continue;

    const sStart = parseTimeToMinutes(s.start);
    const sEnd = parseTimeToMinutes(s.end);
    if (sStart < 0 || sEnd < 0) continue;
    if (sStart >= 990) continue;

    if (sStart < slotDef.endMin && sEnd > slotDef.startMin) {

      // 1. Structured options
      if (s.options && Array.isArray(s.options) && s.options.length > 0) {
        const batchOpts = s.options.filter(opt => opt.batch);
        const nonBatchOpts = s.options.filter(opt => !opt.batch);

        if (batchOpts.length > 0) {
          const bsIdx = findBatchSetIndex(batchOpts[0].batch, batchSets);
          const selectedForSet = bsIdx >= 0 ? (batchSelections[bsIdx] || '') : '';
          const dropdownBatches = bsIdx >= 0 ? batchSets[bsIdx].map(b => cleanBatch(b)) : [];

          if (selectedForSet) {
            const matched = batchOpts.find(opt => batchMatches(opt.batch, selectedForSet));
            if (matched) {
              matchedClass = {
                code: matched.code || '',
                name: matched.name || s.name || '',
                isLab: s.type === 'lab' || matched.type === 'lab',
                rawSlot: s,
                batchSetIdx: bsIdx,
                batchOptions: dropdownBatches,
                selectedBatchValue: selectedForSet
              };
              break;
            } else if (nonBatchOpts.length > 0 && regCodes.length > 0) {
              const electiveMatch = nonBatchOpts.find(opt => matchesRegisteredCourse(opt.code, regCodes));
              if (electiveMatch) {
                matchedClass = {
                  code: electiveMatch.code,
                  name: electiveMatch.name || s.name || '',
                  isLab: s.type === 'lab' || electiveMatch.type === 'lab',
                  rawSlot: s,
                  batchSetIdx: bsIdx,
                  batchOptions: dropdownBatches,
                  selectedBatchValue: selectedForSet
                };
                break;
              }
            }
            continue;
          }

          matchedClass = {
            code: s.options.map(o => o.code).filter(Boolean).join(' / '),
            name: s.name || 'Lab',
            isLab: true,
            rawSlot: s,
            batchSetIdx: bsIdx,
            batchOptions: dropdownBatches,
            selectedBatchValue: ''
          };
          break;
        }

        // Pure elective options (no batch)
        if (regCodes.length > 0) {
          const matchedOpt = s.options.find(opt => matchesRegisteredCourse(opt.code, regCodes));
          if (matchedOpt) {
            matchedClass = {
              code: matchedOpt.code,
              batch: s.batch || '',
              isLab: s.type === 'lab' || matchedOpt.type === 'lab',
              name: matchedOpt.name || s.name || '',
              rawSlot: s
            };
            break;
          }
          continue;
        }

        matchedClass = {
          code: s.options.map(o => o.code).filter(Boolean).join(' / '),
          batch: s.batch || '',
          isLab: s.type === 'lab',
          name: s.name || '',
          rawSlot: s
        };
        break;
      }

      // 2. Code with multiple parts (/ or newline)
      const rawCode = s.code || '';
      const parts = rawCode.includes('\n') ? rawCode.split('\n') : (rawCode.includes('/') ? rawCode.split('/') : null);
      if (parts && parts.length > 1) {
        if (regCodes.length > 0) {
          const matchedPart = parts.find(p => matchesRegisteredCourse(p, regCodes));
          if (matchedPart) {
            const m = matchedPart.match(/^([A-Z0-9]+)\s*(?:\(([^)]+)\))?/i);
            matchedClass = {
              code: m ? m[1] : matchedPart.trim(),
              batch: s.batch || '',
              isLab: s.type === 'lab',
              name: s.name || '',
              rawSlot: s
            };
            break;
          }
          continue;
        }
        matchedClass = {
          code: s.code,
          batch: s.batch || '',
          isLab: s.type === 'lab',
          name: s.name || '',
          rawSlot: s
        };
        break;
      }

      // 3. Single course slot
      if (s.batch) {
        const bsIdx = findBatchSetIndex(s.batch, batchSets);
        const selectedForSet = bsIdx >= 0 ? (batchSelections[bsIdx] || '') : '';
        if (selectedForSet && !batchMatches(s.batch, selectedForSet)) {
          continue;
        }
      }

      if (regCodes.length > 0) {
        if (matchesRegisteredCourse(s.code, regCodes)) {
          matchedClass = {
            code: s.code,
            batch: s.batch || '',
            isLab: s.type === 'lab' || (s.code || '').toLowerCase().includes('lab'),
            name: s.name || '',
            rawSlot: s
          };
          break;
        }
      } else {
        matchedClass = {
          code: s.code,
          batch: s.batch || '',
          isLab: s.type === 'lab' || (s.code || '').toLowerCase().includes('lab'),
          name: s.name || '',
          rawSlot: s
        };
        break;
      }
    }
  }

  // Resolve subject name
  if (matchedClass && !matchedClass.name && timetable?.subjects && Array.isArray(timetable.subjects)) {
    const code = (matchedClass.code || '').trim();
    if (code && !code.includes('/')) {
      const sub = timetable.subjects.find(item => courseCodesMatch(item.code, code));
      if (sub) {
        matchedClass.name = sub.name || sub.title || '';
      }
    }
  }

  return matchedClass;
}

function resolveSubjectName(matchedClass, timetable) {
  let name = matchedClass.name || '';
  if (!name && timetable?.subjects && Array.isArray(timetable.subjects)) {
    if (matchedClass.code && matchedClass.code.includes('/')) {
      name = matchedClass.isLab ? 'Lab' : 'Elective Options';
    } else {
      const primaryCode = (matchedClass.code || '').trim();
      const sub = timetable.subjects.find(item => courseCodesMatch(item.code, primaryCode));
      if (sub) name = sub.name || sub.title || '';
    }
  }
  return name || (matchedClass.isLab ? 'Lab' : (matchedClass.code || 'Class'));
}

function renderSlotHtml({ startLabel, endLabel, startMin, endMin, matchedClass, isViewingToday, nowMinutes, timetable, is2hr }) {
  const isNow = isViewingToday && (nowMinutes >= startMin && nowMinutes < endMin);

  if (!matchedClass || (!matchedClass.code && !matchedClass.name)) {
    return `
      <div class="tt-slot is-empty ${isNow ? 'is-now' : ''}">
        <div class="tt-slot-time">
          <div class="tt-time-start">${startLabel}</div>
          <div class="tt-time-end">${endLabel}</div>
        </div>
        <div class="tt-slot-divider">${isNow ? '<span class="tt-now-dot"></span>' : ''}</div>
        <div class="tt-slot-content">
          <div class="tt-slot-empty-label">No class scheduled</div>
        </div>
      </div>
    `;
  }

  const subjectName = resolveSubjectName(matchedClass, timetable);
  const cleanName = subjectName.replace(/\s*\([A-Z0-9\s-]{2,10}\)\s*$/i, '').trim();

  let batchDropdownHtml = '';
  if (matchedClass.batchOptions && matchedClass.batchOptions.length > 0 && matchedClass.batchSetIdx >= 0) {
    const currentVal = matchedClass.selectedBatchValue;
    const triggerLabel = currentVal ? (currentVal.toLowerCase().startsWith('batch') ? currentVal : 'Batch ' + currentVal) : 'Batch';
    
    batchDropdownHtml = `
      <div class="sem-dropdown tt-slot-batch-dropdown">
        <div class="sem-backdrop" onclick="closeSlotBatchDropdown(this, event)"></div>
        <div class="sem-trigger" onclick="toggleSlotBatchDropdown(this, event)">
          <span class="sem-trigger-label">${escHtml(triggerLabel)}</span>
          <span class="sem-trigger-chevron">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </span>
        </div>
        <div class="sem-menu">
          ${matchedClass.batchOptions.map(b => {
            const isSelected = cleanBatch(b) === cleanBatch(currentVal);
            const optLabel = b.toLowerCase().startsWith('batch') ? b : 'Batch ' + b;
            return `<button type="button" class="sem-option ${isSelected ? 'active' : ''}" onclick="pickSlotBatch(${matchedClass.batchSetIdx}, '${escHtml(b)}', event)">${escHtml(optLabel)}</button>`;
          }).join('')}
        </div>
      </div>
    `;
  }

  return `
    <div class="tt-slot ${is2hr ? 'is-2hr' : ''} ${isNow ? 'is-now' : ''}">
      <div class="tt-slot-time">
        <div class="tt-time-start">${startLabel}</div>
        <div class="tt-time-end">${endLabel}</div>
      </div>
      <div class="tt-slot-divider">${isNow ? '<span class="tt-now-dot"></span>' : ''}</div>
      <div class="tt-slot-content">
        <div class="tt-slot-title-row">
          <div class="tt-slot-title" title="${escHtml(subjectName)}">${escHtml(cleanName)}</div>
        </div>
        <div class="tt-slot-meta">
          ${matchedClass.code ? `<span class="tt-code-pill">${escHtml(matchedClass.code)}</span>` : ''}
        </div>
      </div>
      ${batchDropdownHtml ? `<div class="tt-slot-actions">${batchDropdownHtml}</div>` : ''}
    </div>
  `;
}

export function renderTodaySchedule(timetable, dayName = currentTtDay) {
  const container = document.getElementById('tt-schedule-body');
  const heading = document.getElementById('tt-day-heading');
  const editBtn = document.getElementById('btn-tt-edit');
  if (editBtn) editBtn.style.display = 'inline-flex';

  if (!container) return;

  if (heading) {
    heading.textContent = "Schedule";
  }

  const now = new Date();
  const isViewingToday = (dayName === DAYS_OF_WEEK[now.getDay()]);

  // Sunday holiday check
  if (dayName === 'sunday') {
    container.innerHTML = `
      <div class="tt-empty">
        <div style="font-size: 1.6rem; line-height: 1;">🎉</div>
        <div class="tt-empty-title">Sunday • Holiday</div>
        <div class="tt-empty-desc">No classes scheduled on Sundays. Tap Mon–Sat above to view your schedule.</div>
      </div>
    `;
    return;
  }

  const batchSelections = getBatchSelections(timetable);
  const rawDaySchedule = timetable?.schedule?.[dayName] || [];
  const regCodes = getRegisteredCourseCodes();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  let html = '';

  const schedulePairs = [
    { pA: FIXED_DAY_SLOTS[0], pB: FIXED_DAY_SLOTS[1] },
    { break: FIXED_DAY_SLOTS[2] },
    { pA: FIXED_DAY_SLOTS[3], pB: FIXED_DAY_SLOTS[4] },
    { break: FIXED_DAY_SLOTS[5] },
    { pA: FIXED_DAY_SLOTS[6], pB: FIXED_DAY_SLOTS[7] }
  ];

  schedulePairs.forEach(item => {
    if (item.break) {
      html += `
        <div class="tt-break-divider" role="separator" aria-label="Break">
          <span class="tt-break-line"></span>
          <span class="tt-break-text">Break</span>
          <span class="tt-break-line"></span>
        </div>
      `;
      return;
    }

    const classA = resolveClassForPeriod(item.pA, rawDaySchedule, regCodes, batchSelections, timetable);
    const classB = resolveClassForPeriod(item.pB, rawDaySchedule, regCodes, batchSelections, timetable);

    const hasClassA = Boolean(classA && (classA.code || classA.name));
    const hasClassB = Boolean(classB && (classB.code || classB.name));

    const canMerge = hasClassA && hasClassB && (
      (classA.rawSlot && classB.rawSlot && classA.rawSlot === classB.rawSlot) ||
      (
        Boolean(cleanCourseCode(classA.code)) &&
        courseCodesMatch(classA.code, classB.code) &&
        cleanBatch(classA.batch) === cleanBatch(classB.batch)
      ) ||
      (
        !classA.code && !classB.code &&
        classA.name && classB.name &&
        classA.name.trim().toLowerCase() === classB.name.trim().toLowerCase() &&
        cleanBatch(classA.batch) === cleanBatch(classB.batch)
      )
    );

    html += `<div class="tt-period-pair">`;
    if (canMerge) {
      html += renderSlotHtml({ startLabel: item.pA.labelStart, endLabel: item.pB.labelEnd, startMin: item.pA.startMin, endMin: item.pB.endMin, matchedClass: classA, isViewingToday, nowMinutes, timetable, is2hr: true });
    } else {
      html += renderSlotHtml({ startLabel: item.pA.labelStart, endLabel: item.pA.labelEnd, startMin: item.pA.startMin, endMin: item.pA.endMin, matchedClass: classA, isViewingToday, nowMinutes, timetable });
      html += renderSlotHtml({ startLabel: item.pB.labelStart, endLabel: item.pB.labelEnd, startMin: item.pB.startMin, endMin: item.pB.endMin, matchedClass: classB, isViewingToday, nowMinutes, timetable });
    }
    html += `</div>`;
  });

  container.innerHTML = html;
}

function showPendingTimetable(params) {
  const container = document.getElementById('tt-schedule-body');
  const editBtn = document.getElementById('btn-tt-edit');
  const heading = document.getElementById('tt-day-heading');
  if (editBtn) editBtn.style.display = 'none';

  if (heading) heading.textContent = "Schedule";
  if (!container) return;

  container.innerHTML = `
    <div class="tt-empty">
      <div class="tt-empty-title" style="color:var(--accent);display:inline-flex;align-items:center;gap:8px;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        <span>Timetable Under Review</span>
      </div>
      <div class="tt-empty-desc">
        A timetable for your section has already been submitted and is currently being verified and parsed by an administrator. Check back soon!
      </div>
      <div style="display:inline-flex;align-items:center;gap:6px;font-size:0.75rem;font-weight:700;color:var(--accent);background:rgba(37,99,235,0.08);padding:6px 14px;border-radius:20px;border:1px solid rgba(37,99,235,0.2);">
        <span>Status: Verification In Progress</span>
      </div>
    </div>
  `;
}

function showEmptyTimetable(params) {
  const container = document.getElementById('tt-schedule-body');
  const editBtn = document.getElementById('btn-tt-edit');
  const heading = document.getElementById('tt-day-heading');
  if (editBtn) editBtn.style.display = 'none';

  if (heading) heading.textContent = "Schedule";

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
  if (currentTimetableIsPending) {
    showAppNoticeToast(
      'Submission Already Pending',
      'A timetable for your class has already been submitted and is currently being reviewed in the admin panel.'
    );
    return;
  }

  const modal = document.getElementById('tt-upload-modal');
  if (modal) {
    const isEdit = (mode === 'edit');
    const titleEl = document.getElementById('tt-upload-modal-title');
    const btnEl = document.getElementById('tt-upload-btn');
    if (titleEl) {
      titleEl.textContent = isEdit ? 'Suggest Timetable Correction' : 'Upload Timetable';
    }
    if (btnEl) {
      btnEl.textContent = isEdit ? 'Submit Correction' : 'Submit for Review';
      btnEl.setAttribute('data-mode', mode);
      btnEl.disabled = false;
      btnEl.style.background = '';
      btnEl.style.borderColor = '';
      btnEl.style.color = '';
    }
    selectedTtFile = null;
    const fileInput = document.getElementById('tt-file-input');
    if (fileInput) fileInput.value = '';

    const dropzone = document.getElementById('tt-dropzone');
    const editFileRow = document.getElementById('tt-edit-file-row');
    const dropLabel = document.getElementById('tt-dropzone-label');
    const editFileLabel = document.getElementById('tt-edit-file-label');

    if (dropLabel) dropLabel.textContent = 'Click to select timetable file';
    if (editFileLabel) editFileLabel.textContent = 'Timetable (optional)';

    if (isEdit) {
      if (dropzone) dropzone.style.display = 'none';
      if (editFileRow) editFileRow.style.display = 'flex';
    } else {
      if (dropzone) dropzone.style.display = 'flex';
      if (editFileRow) editFileRow.style.display = 'none';
    }

    const descGroup = document.getElementById('tt-edit-desc-group');
    const descInput = document.getElementById('tt-edit-desc');
    if (descGroup) descGroup.style.display = isEdit ? 'block' : 'none';
    if (descInput) {
      descInput.value = '';
      if (isEdit) setTimeout(() => descInput.focus(), 150);
    }

    const status = document.getElementById('tt-upload-status');
    if (status) { status.style.display = 'none'; status.textContent = ''; }

    modal.classList.add('active');

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

    if (editFileRow && !editFileRow._dragInit) {
      editFileRow._dragInit = true;
      editFileRow.addEventListener('dragover', e => { e.preventDefault(); editFileRow.style.borderColor = 'var(--accent)'; });
      editFileRow.addEventListener('dragleave', () => { editFileRow.style.borderColor = ''; });
      editFileRow.addEventListener('drop', e => {
        e.preventDefault();
        editFileRow.style.borderColor = '';
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
  const editLabel = document.getElementById('tt-edit-file-label');
  if (file) {
    selectedTtFile = file;
    const text = `Selected: ${file.name} (${(file.size / 1024).toFixed(0)} KB)`;
    if (label) label.textContent = text;
    if (editLabel) editLabel.textContent = text;
  }
}

export async function submitTimetableUpload(e) {
  if (e) e.preventDefault();
  if (currentTimetableIsPending) {
    closeTtUploadModal();
    showAppNoticeToast(
      'Submission Already Pending',
      'A timetable for your class has already been submitted and is currently being reviewed in the admin panel.'
    );
    return;
  }

  const fileInput = document.getElementById('tt-file-input');
  const file = selectedTtFile || fileInput?.files?.[0];
  const descInput = document.getElementById('tt-edit-desc');
  const descText = descInput ? descInput.value.trim() : '';

  const statusEl = document.getElementById('tt-upload-status');
  const btn = document.getElementById('tt-upload-btn');
  const isEdit = btn?.getAttribute('data-mode') === 'edit';

  if (isEdit) {
    if (!descText) {
      if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.style.color = 'var(--danger)';
        statusEl.textContent = 'Please describe the required correction.';
      }
      descInput?.focus();
      return;
    }
  } else {
    if (!file) {
      if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.style.color = 'var(--danger)';
        statusEl.textContent = 'Please choose a timetable file (PDF or image).';
      }
      return;
    }
  }

  // Get student params automatically from local storage
  const { branch, semester, section, batch } = getStudentTimetableParams();

  if (btn) {
    btn.disabled = true;
    btn.textContent = isEdit ? 'Submitting...' : 'Uploading...';
  }
  if (statusEl) {
    statusEl.style.display = 'none';
    statusEl.textContent = '';
  }

  try {
    await api.uploadTimetable(file, { branch, semester, section, batch, editDescription: descText });
    if (statusEl) {
      statusEl.style.display = 'none';
      statusEl.textContent = '';
    }
    if (btn) {
      btn.textContent = 'Submitted';
      btn.style.background = '#10b981';
      btn.style.borderColor = '#10b981';
      btn.style.color = '#ffffff';
    }
    setTimeout(() => {
      closeTtUploadModal();
      refreshTimetable(true);
      resetUploadBtn(btn, isEdit);
    }, 1000);
  } catch (err) {
    if (err.alreadyPending || err.alreadyApproved || err.alreadyExists || err.duplicateFile || err.status === 409) {
      closeTtUploadModal();
      currentTimetableIsPending = !err.alreadyApproved;
      showAppNoticeToast(
        err.alreadyApproved ? 'Timetable Already Live' : 'Submission Already Pending',
        err.message || 'A timetable submission for this class is already pending review in the admin panel.'
      );
    } else {
      if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.style.color = 'var(--danger)';
        statusEl.textContent = err.message || 'Upload failed. Please try again.';
      }
    }
    resetUploadBtn(btn, isEdit);
  }
}

function resetUploadBtn(btn, isEdit) {
  if (!btn) return;
  btn.disabled = false;
  btn.textContent = isEdit ? 'Submit Correction' : 'Submit for Review';
  btn.style.background = '';
  btn.style.borderColor = '';
  btn.style.color = '';
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
  window.refreshTimetable = refreshTimetable;
  window.openTtUploadModal = openTtUploadModal;
  window.closeTtUploadModal = closeTtUploadModal;
  window.submitTimetableUpload = submitTimetableUpload;
  window.handleTtFileChange = handleTtFileChange;
  window.updateCalendarLayout = updateCalendarLayout;
  window.courseCodesMatch = courseCodesMatch;
  window.pickSlotBatch = pickSlotBatch;
  window.toggleSlotBatchDropdown = toggleSlotBatchDropdown;
  window.closeSlotBatchDropdown = closeSlotBatchDropdown;

  // Listen for course registrations updated by attendance tab
  window.addEventListener('nie_courses_updated', () => {
    if (currentTimetableData) {
      renderTodaySchedule(currentTimetableData, currentTtDay);
    }
  });

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
