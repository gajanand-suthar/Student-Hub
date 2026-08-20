// SPA Router for Student Hub

const ROUTES = {
  '/': 'dashboard',
  '/index.html': 'dashboard',
  '/moodle/': 'moodle',
  '/moodle': 'moodle',
  '/attendance/': 'attendance',
  '/attendance': 'attendance',
  '/results/': 'results',
  '/results': 'results',
};

let currentRoute = null;
let onNavigateCallback = null;

export function getCurrentRoute() {
  return currentRoute;
}

export function isRoute(name) {
  return currentRoute === name;
}

// Resolve pathname to route name
function resolveRoute(pathname) {
  // Normalize: remove trailing index.html, ensure structure
  let path = pathname || '/';
  
  // Handle base path (if app is not at root)
  // Try direct match first
  if (ROUTES[path]) return ROUTES[path];
  
  // Try with/without trailing slash
  if (ROUTES[path + '/']) return ROUTES[path + '/'];
  if (path.endsWith('/') && ROUTES[path.slice(0, -1)]) return ROUTES[path.slice(0, -1)];
  
  // Fallback: check if path contains route segments
  if (path.includes('/moodle')) return 'moodle';
  if (path.includes('/attendance')) return 'attendance';
  if (path.includes('/results')) return 'results';
  
  return 'dashboard';
}

// Get the canonical path for a route name
function getRoutePath(routeName) {
  switch(routeName) {
    case 'moodle': return '/moodle/';
    case 'attendance': return '/attendance/';
    case 'results': return '/results/';
    default: return '/';
  }
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
  
  // Replace current history entry with route state
  history.replaceState({ route: currentRoute }, '', window.location.pathname + window.location.search);
  
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
    let resolvedPath = href;
    if (href === '../' || href === './' || href === '/') {
      resolvedPath = '/';
    } else if (href.startsWith('./')) {
      resolvedPath = '/' + href.slice(2);
    } else if (href.startsWith('../')) {
      resolvedPath = '/' + href.slice(3);
    }

    const route = resolveRoute(resolvedPath);
    if (route) {
      e.preventDefault();
      navigate(resolvedPath);
    }
  });
}
