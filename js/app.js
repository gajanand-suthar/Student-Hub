// Student Hub — SPA App Shell

import { initRouter, navigate, getCurrentRoute } from './router.js';
import { initTheme, initPwa, checkSugUnread } from './shared.js';
import { initDashboard } from './dashboard.js';
import { initAttendance } from './attendance.js';
import { initMoodle } from './moodle.js';
import { initResults } from './results.js';

// CDN scripts loaded flag
let moodleCdnLoaded = false;

const VIEW_INIT_FNS = {
  dashboard: initDashboard,
  attendance: initAttendance,
  moodle: initMoodle,
  results: initResults,
};

// ── Load Moodle CDN dependencies ──
async function loadMoodleCdn() {
  if (moodleCdnLoaded) return;
  moodleCdnLoaded = true;
  
  const loads = [];
  
  // PDF.js
  if (!window.pdfjsLib) {
    loads.push(loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'));
  }
  
  // Plyr CSS
  if (!document.querySelector('link[href*="plyr"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.plyr.io/3.7.8/plyr.css';
    document.head.appendChild(link);
  }
  
  // Plyr JS
  if (!window.Plyr) {
    loads.push(loadScript('https://cdn.plyr.io/3.7.8/plyr.polyfilled.js'));
  }
  
  await Promise.all(loads);
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// ── Update bottom nav active state ──
function updateNav(viewName) {
  const navTabs = document.querySelectorAll('.bottom-nav .nav-tab');
  
  navTabs.forEach(tab => {
    const href = tab.getAttribute('href') || '';
    let tabRoute = 'dashboard';
    if (href.includes('moodle')) tabRoute = 'moodle';
    else if (href.includes('attendance')) tabRoute = 'attendance';
    else if (href.includes('results')) tabRoute = 'results';
    
    tab.classList.toggle('active', tabRoute === viewName);
  });
}

// ── Cleanup before view switch ──
function cleanupView(viewName) {
  if (!viewName) return;
  
  // Close any open modals/overlays
  document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
  document.querySelectorAll('.att-modal-overlay').forEach(m => m.style.display = 'none');
  
  // Moodle-specific cleanup
  if (viewName === 'moodle') {
    document.body.classList.remove('page-scrollable');
    if (window.currentPlyr) {
      try { window.currentPlyr.stop(); } catch(e) {}
    }
  }
  
  // Close drawer if open
  const drawerOverlay = document.getElementById('drawer-overlay');
  if (drawerOverlay) drawerOverlay.classList.remove('active');
}

// ── Switch and render a view ──
export function loadView(viewName, oldViewName) {
  // Cleanup old view
  cleanupView(oldViewName);
  
  // Toggle active view container
  document.querySelectorAll('.spa-view').forEach(v => {
    v.classList.toggle('active', v.id === 'view-' + viewName);
  });
  
  // Update nav
  updateNav(viewName);
  
  // Toggle attendance-specific drawer semester controls
  const drawerAttSem = document.getElementById('drawer-att-sem');
  if (drawerAttSem) {
    drawerAttSem.style.display = viewName === 'attendance' ? 'block' : 'none';
  }
  
  // Load Moodle CDN deps if needed
  if (viewName === 'moodle') {
    loadMoodleCdn();
  }
  
  // Scroll to top
  window.scrollTo(0, 0);
  
  // Call view init function
  const initFn = VIEW_INIT_FNS[viewName];
  if (typeof initFn === 'function') {
    try {
      initFn();
    } catch (e) {
      console.error(`Error initializing view ${viewName}:`, e);
    }
  }
}

// ── Boot ──
function boot() {
  // Initialize shared services once
  initTheme();
  initPwa();
  
  // Check for unread suggestion replies
  setTimeout(() => checkSugUnread(), 1500);
  
  // Initialize router
  initRouter((newRoute, oldRoute) => {
    loadView(newRoute, oldRoute);
  });
  
  // Load the initial view
  const initialRoute = getCurrentRoute();
  loadView(initialRoute, null);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
