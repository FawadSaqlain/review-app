document.addEventListener('submit', async (e) => {
  const form = e.target;
  if (!form.classList.contains('apiForm') && form.id !== 'uploadForm') return;
  e.preventDefault();

  if (form.id === 'uploadForm') {
    const formData = new FormData(form);
    const token = localStorage.getItem('adminToken');
    const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
    const res = await fetch(form.action, { method: 'POST', headers, body: formData, credentials: 'same-origin' });
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch (e) { data = null; }
    // Prefer uploadResult (page-specific) then generic result element
    const resultEl = document.getElementById('uploadResult') || document.getElementById('result');
    if (resultEl) {
      resultEl.textContent = JSON.stringify(data || { status: res.status, body: text.slice(0,200) }, null, 2);
    }
    return;
  }

  const formData = new FormData(form);
  const obj = {};
  for (const [k,v] of formData.entries()) obj[k]=v;

  const res = await fetch(form.action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj), credentials: 'same-origin' });
  const data = await res.json().catch(() => null);
  const responseEl = document.getElementById('response') || document.createElement('div');
  responseEl.className = 'response';
  responseEl.textContent = data ? (data.success ? JSON.stringify(data.data) : (data.error && data.error.message) || 'Error') : 'No response';
  if (!document.getElementById('response')) form.parentNode.appendChild(responseEl);

  // if admin login success and token present, store for admin upload
  if (form.action.includes('/admin/login') && data && data.success && data.data && data.data.token) {
    localStorage.setItem('adminToken', data.data.token);
    try { localStorage.setItem('user', JSON.stringify(data.data.user || {})); } catch (e) {}
    // redirect to `next` query param if provided (adminRequire appends ?next=...),
    // otherwise go to admin upload page by default
    try {
      const params = new URLSearchParams(window.location.search);
  const next = params.get('next');
  window.location.href = next || '/admin/class/add';
    } catch (e) {
      // fallback
  window.location.href = '/admin/class/add';
    }
  }

  // if normal login (student) success, store token and user info
  if (form.action.includes('/api/auth/login') && data && data.success && data.data && data.data.token) {
    localStorage.setItem('token', data.data.token);
    try { localStorage.setItem('user', JSON.stringify(data.data.user || {})); } catch (e) {}
    // redirect to next (if provided) or to ratings page so user lands on the expected area
    try {
      const params = new URLSearchParams(window.location.search);
      const next = params.get('next');
      window.location.href = next || '/ratings';
    } catch (e) {
      window.location.href = '/ratings';
    }
  }
});

// expose auth helpers for header and other UI
window.appAuth = {
  logout: async function () {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      if (token) await fetch('/api/auth/logout', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
    } catch (e) { /* ignore */ }
    localStorage.removeItem('token');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('user');
    // ensure cookies cleared by server for admin if possible (page reload will refresh cookie state)
    window.location = '/login';
  }
};
