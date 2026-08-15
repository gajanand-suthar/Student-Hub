// ═══════════════════════════════════════════════════════════════
//  STUDENT HUB — Admin Portal Client Logic
// ═══════════════════════════════════════════════════════════════

import { CONFIG } from './config.js';
import { api } from './api.js';
import { initTheme } from './shared.js';

export function initAdmin() {
  initTheme();
  loadSuggestions();
}

export async function loadSuggestions() {
  const list = document.getElementById('admin-sug-list');
  if (!list) return;
  list.innerHTML = '<div class="loader-wrap"><div class="spinner"></div>Loading feedback...</div>';

  try {
    const res = await fetch(api.getApiUrl('/admin/api/suggestions'), {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error('Unauthorized or failed to load');
    const data = await res.json();
    const items = data.suggestions || [];

    if (!items.length) {
      list.innerHTML = '<div style="text-align:center;padding:24px 0;color:var(--muted)">No suggestions received yet.</div>';
      return;
    }

    list.innerHTML = items
      .map(item => `
        <div class="admin-sug-item" id="sug-${item.id}">
          <div class="admin-sug-meta">
            <span class="admin-sug-user">${escHtml(item.name || 'Anonymous')} (${escHtml(item.usn || 'Unknown')})</span>
            <span>${new Date(item.created_at + 'Z').toLocaleString()}</span>
          </div>
          <div class="admin-sug-text">${escHtml(item.suggestion)}</div>
          <div class="admin-reply-box">
            <input type="text" class="admin-reply-input" id="reply-inp-${item.id}" placeholder="Type reply to student..." value="${escHtml(item.admin_reply || '')}"/>
            <button class="admin-reply-btn" onclick="sendReply(${item.id})">Reply</button>
            <button class="admin-del-btn" onclick="deleteSuggestion(${item.id})">Delete</button>
          </div>
        </div>`)
      .join('');
  } catch (err) {
    list.innerHTML = `<div style="text-align:center;padding:24px 0;color:var(--danger)">${escHtml(err.message)}</div>`;
  }
}

export async function sendReply(id) {
  const inp = document.getElementById(`reply-inp-${id}`);
  const reply = inp ? inp.value.trim() : '';

  try {
    const res = await fetch(api.getApiUrl(`/admin/api/suggestions/${id}/reply`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply })
    });
    if (!res.ok) throw new Error('Failed to update reply');
    alert('Reply saved successfully!');
  } catch (err) {
    alert(err.message);
  }
}

export async function deleteSuggestion(id) {
  if (!confirm('Are you sure you want to delete this suggestion?')) return;

  try {
    const res = await fetch(api.getApiUrl(`/admin/api/suggestions/${id}`), {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete');
    const el = document.getElementById(`sug-${id}`);
    if (el) el.remove();
  } catch (err) {
    alert(err.message);
  }
}

function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

if (typeof window !== 'undefined') {
  window.sendReply = sendReply;
  window.deleteSuggestion = deleteSuggestion;
  window.loadSuggestions = loadSuggestions;
}
