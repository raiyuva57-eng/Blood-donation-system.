/* ============================================
   LifeDrop — shared UI utilities
   ============================================ */

function highlightActiveNav() {
  const current = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach((link) => {
    const href = link.getAttribute('href');
    if (href === current) link.classList.add('active');
  });
}

function formatDate(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (isNaN(d)) return isoString;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function bloodTypeBadge(type) {
  const cls = type === 'O-' ? 'bt-badge bt-o-neg' : 'bt-badge';
  return `<span class="${cls}">${escapeHtml(type || '—')}</span>`;
}

document.addEventListener('DOMContentLoaded', highlightActiveNav);
