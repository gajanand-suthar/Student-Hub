// SPA Router for Student Hub

let currentRoute = null;
let onNavigateCallback = null;

export function getCurrentRoute() {
  return currentRoute;
}

export function isRoute(name) {
  return currentRoute === name;
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
