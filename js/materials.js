// Same-semester study material links. The API decides who can see a record;
// this module never sends a semester, name, or file to the server.
import { api } from './api.js';
import { loadUser } from './shared.js';

let initialized = false;

const $ = (id) => document.getElementById(id);

function validUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null;
  } catch (_) { return null; }
}

function previewUrl(value) {
  const url = validUrl(value);
  if (!url) return null;
  const host = url.hostname.toLowerCase();

  // Google Drive embeds only files that the owner has made viewable.
  const driveId = host.endsWith('drive.google.com') && url.pathname.match(/\/d\/([^/]+)/)?.[1];
  if (driveId) return `https://drive.google.com/file/d/${encodeURIComponent(driveId)}/preview`;
  if (host.endsWith('drive.google.com') && url.searchParams.get('id')) {
    return `https://drive.google.com/file/d/${encodeURIComponent(url.searchParams.get('id'))}/preview`;
  }

  // GitHub's raw URL is embeddable where a blob page may reject a frame.
  if (host === 'github.com' && /^\/[^/]+\/[^/]+\/blob\//.test(url.pathname)) {
    return `https://raw.githubusercontent.com${url.pathname.replace(/^\/([^/]+)\/([^/]+)\/blob\//, '/$1/$2/')}`;
  }
  if (host === 'raw.githubusercontent.com') return url.toString();

  // Direct browser-renderable resources are safe to attempt in an iframe.
  if (/\.(pdf|txt|md|png|jpe?g|gif|webp|svg)(?:$|[?#])/i.test(url.pathname)) return url.toString();
  return null;
}

function setState(message, kind = '') {
  const el = $('materials-state');
  if (!el) return;
  el.textContent = message;
  el.className = `materials-state ${kind}`;
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function renderMaterials(items) {
  const list = $('materials-list');
  if (!list) return;
  list.replaceChildren();
  if (!items.length) {
    setState('No materials have been shared yet. Be the first to add a useful link.', 'empty');
    return;
  }
  setState('');
  const fragment = document.createDocumentFragment();
  items.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'material-card';
    const title = document.createElement('h2');
    title.textContent = item.title;
    const description = document.createElement('p');
    description.className = 'material-description';
    description.textContent = item.description;
    const meta = document.createElement('p');
    meta.className = 'material-meta';
    // Name is text only: no photo URL is requested or rendered here.
    meta.textContent = `Shared by ${item.authorName || 'A classmate'}${item.createdAt ? ` · ${formatDate(item.createdAt)}` : ''}`;
    const actions = document.createElement('div');
    actions.className = 'material-actions';
    const preview = document.createElement('button');
    preview.type = 'button'; preview.className = 'material-action primary'; preview.textContent = 'Preview';
    preview.addEventListener('click', () => openMaterialPreview(item));
    const external = document.createElement('a');
    external.className = 'material-action'; external.textContent = 'Open link ↗';
    external.href = item.url; external.target = '_blank'; external.rel = 'noopener noreferrer';
    actions.append(preview, external);
    card.append(title, description, meta, actions);
    fragment.append(card);
  });
  list.append(fragment);
}

async function loadMaterials() {
  setState('Loading shared materials…');
  try {
    const data = await api.getStudyMaterials();
    renderMaterials(Array.isArray(data.materials) ? data.materials : []);
  } catch (error) {
    setState(error.message || 'Could not load shared materials. Please try again.', 'error');
  }
}

export function openMaterialShareModal() {
  const modal = $('material-share-modal');
  if (!modal) return;
  $('material-share-form')?.reset();
  $('material-form-error').textContent = '';
  modal.classList.add('active'); modal.setAttribute('aria-hidden', 'false');
  setTimeout(() => $('material-title')?.focus(), 0);
}

export function closeMaterialShareModal() {
  const modal = $('material-share-modal');
  modal?.classList.remove('active'); modal?.setAttribute('aria-hidden', 'true');
}

export function openMaterialPreview(item) {
  const modal = $('material-preview-modal');
  const content = $('material-preview-content');
  const external = $('material-open-external');
  if (!modal || !content || !external) return;
  $('material-preview-title').textContent = item.title;
  external.href = item.url;
  content.replaceChildren();
  const source = previewUrl(item.url);
  if (source) {
    const frame = document.createElement('iframe');
    frame.className = 'material-preview-frame'; frame.src = source;
    frame.title = `${item.title} preview`;
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-forms');
    content.append(frame);
  } else {
    const message = document.createElement('p');
    message.className = 'material-preview-message';
    message.textContent = 'This link cannot be previewed safely in Student Hub. Open the original link to view it.';
    content.append(message);
  }
  modal.classList.add('active'); modal.setAttribute('aria-hidden', 'false');
}

export function closeMaterialPreview() {
  const modal = $('material-preview-modal');
  $('material-preview-content')?.replaceChildren();
  modal?.classList.remove('active'); modal?.setAttribute('aria-hidden', 'true');
}

async function submitMaterial(event) {
  event.preventDefault();
  const title = $('material-title').value.trim();
  const description = $('material-description').value.trim();
  const url = validUrl($('material-url').value.trim());
  const error = $('material-form-error');
  if (!title || !description || !url) {
    error.textContent = 'Add a title, directions, and a valid http(s) link.';
    return;
  }
  const button = $('material-submit-btn');
  button.disabled = true; button.textContent = 'Sharing…'; error.textContent = '';
  try {
    await api.shareStudyMaterial({ title, description, url: url.toString() });
    closeMaterialShareModal();
    await loadMaterials();
  } catch (err) {
    error.textContent = err.message || 'Could not share this link.';
  } finally {
    button.disabled = false; button.textContent = 'Share link';
  }
}

export function initMaterials() {
  const user = loadUser();
  const sem = user.semNum || user.semester;
  const label = $('materials-semester-label');
  if (label) label.textContent = sem ? `Shared with Semester ${sem} students` : 'Shared with students in your semester';
  if (!initialized) {
    $('material-share-form')?.addEventListener('submit', submitMaterial);
    initialized = true;
  }
  loadMaterials();
}

if (typeof window !== 'undefined') {
  window.openMaterialShareModal = openMaterialShareModal;
  window.closeMaterialShareModal = closeMaterialShareModal;
  window.closeMaterialPreview = closeMaterialPreview;
}
