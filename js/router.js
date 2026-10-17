// SPA Router for Student Hub

let currentRoute = null;
let onNavigateCallback = null;

export function getCurrentRoute() {
  return currentRoute;
}

// Automatically detect base path (e.g., '/Student-Hub/' on GitHub Pages, or '/' on custom domains / localhost)
export function getBasePath() {
  const pathname = window.location.pathname;
  const knownSegments = ['moodle', 'attendance', 'results', 'index.html', '404.html'];
  const parts = pathname.split('/').filter(Boolean);

  // If first segment is not a known view or page, it's the GitHub repository name / subfolder
  if (parts.length > 0 && !knownSegments.includes(parts[0].toLowerCase())) {
    return '/' + parts[0] + '/';
  }
  return '/';
}

// Get the canonical path for a route name preserving GitHub Pages subpath
export function getRoutePath(routeName) {
  const base = getBasePath();
  switch (routeName) {
    case 'moodle': return base + 'moodle/';
    case 'attendance': return base + 'attendance/';
    case 'results': return base + 'results/';
    default: return base;
  }
}

// Resolve pathname or relative href to route name
export function resolveRoute(pathname) {
  let path = pathname || '/';
  const base = getBasePath();

  // Strip base path prefix if present
  if (base !== '/' && path.startsWith(base)) {
    path = '/' + path.slice(base.length);
  }

  // Check known routes
  if (path.includes('/moodle') || path === 'moodle' || path === './moodle/' || path === 'moodle/') return 'moodle';
  if (path.includes('/attendance') || path === 'attendance' || path === './attendance/' || path === 'attendance/') return 'attendance';
  if (path.includes('/results') || path === 'results' || path === './results/' || path === 'results/') return 'results';

  return 'dashboard';
}

// Navigate to a new route
export function navigate(path, pushState = true) {
  const newRoute = resolveRoute(path);
  if (newRoute === currentRoute) return;

  const oldRoute = currentRoute;
  currentRoute = newRoute;

  if (pushState) {
    const canonicalPath = getRoutePath(newRoute);
    history.pushState({ route: newRoute }, '', canonicalPath);
  }

  if (onNavigateCallback) {
    onNavigateCallback(newRoute, oldRoute);
  }
}

// Initialize router
export function initRouter(callback) {
  onNavigateCallback = callback;

  // Set initial route from current URL without pushing state
  currentRoute = resolveRoute(window.location.pathname);

  // Listen for back/forward
  window.addEventListener('popstate', (e) => {
    // 1. Doc lightbox or image lightbox in Moodle (close it, stay on course content)
    const docLb = document.getElementById('doc-lightbox');
    if (docLb && (docLb.classList.contains('show') || docLb.style.display === 'flex')) {
      if (typeof window.closeDocLightbox === 'function') window.closeDocLightbox(false);
      return;
    }
    const imgLb = document.getElementById('image-lightbox');
    if (imgLb && (imgLb.classList.contains('show') || imgLb.style.display === 'flex')) {
      if (typeof window.closeImageLightbox === 'function') window.closeImageLightbox(false);
      return;
    }

    // 2. Attendance detail modal (close modal, stay on attendance view)
    const attModal = document.getElementById('att-modal');
    if (attModal && attModal.style.display !== 'none' && attModal.style.display !== '') {
      if (typeof window.closeAttModal === 'function') window.closeAttModal(false);
      return;
    }

    // 3. Suggestions modal (close modal)
    const sugModal = document.getElementById('sug-modal');
    if (sugModal && (sugModal.classList.contains('active') || sugModal.style.display === 'flex')) {
      if (typeof window.closeSugModal === 'function') window.closeSugModal(false);
      return;
    }

    // 4. Timetable upload / edit modal (close modal)
    const ttUploadModal = document.getElementById('tt-upload-modal');
    if (ttUploadModal && ttUploadModal.classList.contains('active')) {
      if (typeof window.closeTtUploadModal === 'function') window.closeTtUploadModal(false);
      return;
    }

    // 5. Logout confirm modal (close modal)
    const logoutModal = document.getElementById('logout-confirm-modal');
    if (logoutModal && logoutModal.classList.contains('active')) {
      if (typeof window.closeLogoutConfirm === 'function') window.closeLogoutConfirm(false);
      return;
    }

    // 6. Drawer menu (close drawer)
    const drawer = document.getElementById('drawer-overlay');
    if (drawer && drawer.classList.contains('active')) {
      if (typeof window.toggleDrawer === 'function') window.toggleDrawer(false, false);
      return;
    }

    // 7. CIE tab in Attendance -> switch back to Attendance tab
    const viewAtt = document.getElementById('view-attendance');
    const tabCie = document.getElementById('tab-cie');
    if (viewAtt && viewAtt.classList.contains('active') && tabCie && tabCie.classList.contains('active')) {
      const attBtn = document.getElementById('tab-btn-att');
      if (attBtn && typeof window.switchTab === 'function') {
        window.switchTab('att', attBtn, false);
        return;
      }
    }

    // 8. Homepage sections (calendar, notices, syllabus) -> return to timetable
    const viewDash = document.getElementById('view-dashboard');
    if (viewDash && viewDash.classList.contains('active')) {
      const activePanel = document.querySelector('#panel-calendar.active, #panel-notices.active, #panel-syllabus.active');
      if (activePanel) {
        if (typeof window.toggleHomeSection === 'function') {
          window.toggleHomeSection('timetable', false);
          return;
        }
      }
    }

    // 9. Moodle course content -> return to course list
    const contentEl = document.getElementById('view-content');
    if (contentEl && contentEl.classList.contains('active')) {
      if (typeof window.showCourses === 'function') {
        window.showCourses(true);
      }
      if (e.state?.route === 'moodle' || resolveRoute(window.location.pathname) === 'moodle') {
        currentRoute = 'moodle';
        return;
      }
    }

    // 10. Normal route navigation
    const route = e.state?.route || resolveRoute(window.location.pathname);
    const oldRoute = currentRoute;
    currentRoute = route;
    if (onNavigateCallback) {
      onNavigateCallback(route, oldRoute);
    }
  });

  // Replace current history entry with route state and correct canonical URL
  const initialCanonical = getRoutePath(currentRoute);
  history.replaceState({ route: currentRoute }, '', initialCanonical + window.location.search);

  // Intercept internal link clicks
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    // Skip external links, new tab links, and non-http links
    if (link.target === '_blank' || link.target === '_new') return;
    if (href.startsWith('http') || href.startsWith('//')) return;
    if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;
    if (link.hasAttribute('download')) return;

    // Check if this is a SPA-navigable link (data-spa-link or bottom nav link)
    const isSpaLink = link.hasAttribute('data-spa-link') || link.closest('.bottom-nav');
    if (!isSpaLink) return;

    // Resolve the route
    const route = resolveRoute(href);
    if (route) {
      e.preventDefault();
      navigate(href);
    }
  });
}
