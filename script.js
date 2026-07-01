// ── Storage key ────────────────────────────────────────────────────
const STORAGE_KEY = 'crud_records_v1';

// ── Load / save ────────────────────────────────────────────────────
function load()        { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; } }
function save(records) { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); }

// ── State ──────────────────────────────────────────────────────────
let records       = load();
let filterStatus  = 'All';
let sortKey       = 'name';
let sortAsc       = true;
let deleteTargetId = null;
let highlightId   = null;

// ── UID ────────────────────────────────────────────────────────────
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

// ── Toast ──────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = 'success') {
  const el  = document.getElementById('toast');
  const ico = document.getElementById('toastIcon');
  const txt = document.getElementById('toastMsg');
  ico.textContent = type === 'success' ? '✅' : '🗑';
  txt.textContent = msg;
  el.className = `show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = type; }, 3200);
}

// ── Validate ───────────────────────────────────────────────────────
function clearErrors() {
  ['name','email','role','dept'].forEach(k => {
    document.getElementById('err-' + k).classList.remove('show');
    document.getElementById('f' + (k === 'name' ? 'name' : k === 'email' ? 'email' : k === 'role' ? 'role' : 'dept')).classList.remove('error');
  });
}

function validate(data, editId) {
  let ok = true;
  clearErrors();

  function fail(field, msg) {
    document.getElementById('err-' + field).classList.add('show');
    document.getElementById('f' + (field === 'name' ? 'name' : field === 'email' ? 'email' : field === 'role' ? 'role' : 'dept')).classList.add('error');
    ok = false;
  }

  if (!data.name.trim())  fail('name');
  if (!data.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) fail('email');
  else if (records.find(r => r.email.toLowerCase() === data.email.toLowerCase() && r.id !== editId)) fail('email');
  if (!data.role.trim())  fail('role');
  if (!data.dept.trim())  fail('dept');
  return ok;
}

// ── CREATE / UPDATE ────────────────────────────────────────────────
document.getElementById('recordForm').addEventListener('submit', function(e) {
  e.preventDefault();

  const editId = document.getElementById('editId').value || null;
  const data = {
    name:   document.getElementById('fname').value.trim(),
    email:  document.getElementById('femail').value.trim(),
    role:   document.getElementById('frole').value.trim(),
    dept:   document.getElementById('fdept').value.trim(),
    status: document.getElementById('fstatus').value,
  };

  if (!validate(data, editId)) return;

  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = editId ? 'Saving…' : 'Adding…';

  setTimeout(() => {
    if (editId) {
      records = records.map(r => r.id === editId
        ? { ...r, name:data.name, email:data.email, role:data.role, department:data.dept, status:data.status, updatedAt:new Date().toISOString() }
        : r
      );
      showToast(`"${data.name}" updated successfully`);
      highlightId = editId;
      cancelEdit();
    } else {
      const newRec = {
        id: uid(),
        name: data.name, email: data.email, role: data.role,
        department: data.dept, status: data.status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      records.unshift(newRec);
      showToast(`"${data.name}" added to records`);
      highlightId = newRec.id;
      resetForm();
    }

    save(records);
    renderAll();

    btn.disabled = false;
    btn.textContent = '＋ Add Record';

    setTimeout(() => { highlightId = null; renderTable(); }, 2200);
  }, 300);
});

// ── READ / Render ──────────────────────────────────────────────────
function renderAll() { renderStats(); renderTable(); }

function renderStats() {
  const total    = records.length;
  const active   = records.filter(r => r.status === 'Active').length;
  const pending  = records.filter(r => r.status === 'Pending').length;
  const inactive = records.filter(r => r.status === 'Inactive').length;

  document.getElementById('s-total').textContent   = total;
  document.getElementById('s-active').textContent  = active;
  document.getElementById('s-pending').textContent = pending;
  document.getElementById('s-inactive').textContent = inactive;
  document.getElementById('headerBadge').textContent = `${total} record${total !== 1 ? 's' : ''}`;
}

function getFiltered() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  return records
    .filter(r => {
      const matchQ = !q ||
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.role.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q);
      const matchS = filterStatus === 'All' || r.status === filterStatus;
      return matchQ && matchS;
    })
    .sort((a, b) => {
      const va = (sortKey === 'department' ? a.department : a[sortKey] || '').toLowerCase();
      const vb = (sortKey === 'department' ? b.department : b[sortKey] || '').toLowerCase();
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    });
}

function renderTable() {
  const visible = getFiltered();
  const tbody   = document.getElementById('tableBody');
  const editId  = document.getElementById('editId').value;

  if (visible.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="6">
        <div class="empty">
          <div class="empty-icon">📋</div>
          <p>${records.length === 0 ? 'No records yet — add one using the form.' : 'No records match your search or filter.'}</p>
        </div>
      </td></tr>`;
    document.getElementById('tableFooter').textContent = `Showing 0 of ${records.length} records`;
    return;
  }

  tbody.innerHTML = visible.map(rec => {
    const badgeClass = rec.status === 'Active' ? 'badge-active' : rec.status === 'Pending' ? 'badge-pending' : 'badge-inactive';
    const date = new Date(rec.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
    const isHL  = highlightId === rec.id;
    const isEd  = editId === rec.id;
    return `
      <tr class="${isHL ? 'highlight' : ''} ${isEd ? 'editing-row' : ''}">
        <td>
          <div class="cell-name">${esc(rec.name)}</div>
          <div class="cell-date">${date}</div>
        </td>
        <td class="cell-email">${esc(rec.email)}</td>
        <td class="cell-muted">${esc(rec.department)}</td>
        <td class="cell-muted">${esc(rec.role)}</td>
        <td><span class="badge ${badgeClass}">${rec.status}</span></td>
        <td>
          <div class="actions">
            <button class="btn btn-icon" title="Edit" onclick="startEdit('${rec.id}')">✎</button>
            <button class="btn btn-icon del" title="Delete" onclick="openModal('${rec.id}')">🗑</button>
          </div>
        </td>
      </tr>`;
  }).join('');

  document.getElementById('tableFooter').textContent =
    `Showing ${visible.length} of ${records.length} record${records.length !== 1 ? 's' : ''}`;
}

// Escape HTML
function esc(str) {
  return String(str).replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])
  );
}

// ── UPDATE: start edit ─────────────────────────────────────────────
function startEdit(id) {
  const rec = records.find(r => r.id === id);
  if (!rec) return;

  document.getElementById('editId').value  = rec.id;
  document.getElementById('fname').value   = rec.name;
  document.getElementById('femail').value  = rec.email;
  document.getElementById('frole').value   = rec.role;
  document.getElementById('fdept').value   = rec.department;
  document.getElementById('fstatus').value = rec.status;

  document.getElementById('formEyebrow').textContent = '✎  EDITING RECORD';
  document.getElementById('formEyebrow').classList.add('active');
  document.getElementById('formTitle').textContent = 'Update details';
  document.getElementById('submitBtn').textContent = '✔ Save Changes';
  document.getElementById('cancelBtn').style.display = 'flex';
  document.getElementById('formPanel').classList.add('editing');
  clearErrors();
  renderTable();

  document.getElementById('formPanel').scrollIntoView({ behavior:'smooth', block:'start' });
}

function cancelEdit() {
  resetForm();
  renderTable();
}

function resetForm() {
  document.getElementById('recordForm').reset();
  document.getElementById('editId').value  = '';
  document.getElementById('formEyebrow').textContent = '✚ NEW RECORD';
  document.getElementById('formEyebrow').classList.remove('active');
  document.getElementById('formTitle').textContent   = 'Add a record';
  document.getElementById('submitBtn').textContent   = '＋ Add Record';
  document.getElementById('cancelBtn').style.display = 'none';
  document.getElementById('formPanel').classList.remove('editing');
  clearErrors();
}

// ── DELETE ─────────────────────────────────────────────────────────
function openModal(id) {
  deleteTargetId = id;
  const rec = records.find(r => r.id === id);
  document.getElementById('deleteName').textContent = rec ? rec.name : 'this record';
  document.getElementById('deleteOverlay').classList.add('show');
}

function closeModal() {
  deleteTargetId = null;
  document.getElementById('deleteOverlay').classList.remove('show');
}

function confirmDelete() {
  const rec = records.find(r => r.id === deleteTargetId);
  const name = rec ? rec.name : 'Record';

  if (document.getElementById('editId').value === deleteTargetId) cancelEdit();
  records = records.filter(r => r.id !== deleteTargetId);
  save(records);
  closeModal();
  renderAll();
  showToast(`"${name}" deleted`, 'error');
}

// Close modal on overlay click
document.getElementById('deleteOverlay').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

// ── SORT ───────────────────────────────────────────────────────────
function sortBy(key) {
  if (sortKey === key) sortAsc = !sortAsc;
  else { sortKey = key; sortAsc = true; }

  ['name','email','department','role','status'].forEach(k => {
    const el = document.getElementById('sort-' + k);
    if (!el) return;
    el.textContent = '';
    if (k === key) el.textContent = sortAsc ? ' ↑' : ' ↓';
    el.closest('th').classList.toggle('sorted', k === key);
  });

  renderTable();
}

// ── FILTER ─────────────────────────────────────────────────────────
function setFilter(status, btn) {
  filterStatus = status;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderTable();
}

// ── Init ───────────────────────────────────────────────────────────
renderAll();
// Set initial sort indicator
document.getElementById('sort-name').textContent = ' ↑';
document.querySelector('thead th').classList.add('sorted');
