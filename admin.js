// === Config ===
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// === Boot ===
document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  refreshAll();
});

function setupTabs() {
  document.querySelectorAll('nav button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.add('hidden'));
      document.getElementById(btn.dataset.tab).classList.remove('hidden');
    });
  });
}

async function refreshAll() {
  await Promise.all([
    loadOrders(),
    loadEnrollments(),
    loadPayments(),
    loadClasses(),
    loadStudents(),
    loadParents()
  ]);
}

// === Loaders ===
async function loadOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, parent_id, payment_method, total_amount, amount_paid, balance_due, status, created_at')
    .order('created_at', { ascending: false });
  renderTable('orders', data, error, (row) => ``);
}

async function loadEnrollments() {
  const { data, error } = await supabase
    .from('enrollments')
    .select('id, student_id, class_slot_id, order_id, status, payment_status, enrolled_at')
    .order('enrolled_at', { ascending: false });
  renderTable('enrollments', data, error, (row) => `
    <div class="actions">
      <button class="action" onclick="markEnrollmentStatus('${row.id}', 'enrolled')">Mark Enrolled</button>
      <button class="action" onclick="markEnrollmentStatus('${row.id}', 'waitlist')">Waitlist</button>
      <button class="action danger" onclick="markEnrollmentStatus('${row.id}', 'cancelled')">Cancel</button>
    </div>
  `);
}

async function loadPayments() {
  const { data, error } = await supabase
    .from('payments')
    .select('id, order_id, amount, payment_type, status, stripe_charge_id, processed_at, created_at')
    .order('created_at', { ascending: false });
  renderTable('payments', data, error, (row) => ``);
}

async function loadClasses() {
  const { data, error } = await supabase
    .from('class_slots')
    .select('id, day_of_week, start_time, end_time, age_group');
  renderTable('classes', data, error, (row) => ``);
}

async function loadStudents() {
  const { data, error } = await supabase
    .from('students')
    .select('id, parent_id, first_name, last_name, grade, age, experience_level, created_at');
  renderTable('students', data, error, (row) => `
    <div class="actions">
      <button class="action danger" onclick="deleteStudent('${row.id}')">Delete</button>
    </div>
  `);
}

async function loadParents() {
  const { data, error } = await supabase
    .from('parents')
    .select('id, email, name, phone, created_at');
  renderTable('parents', data, error, (row) => ``);
}

// === Actions ===
async function markEnrollmentStatus(id, newStatus) {
  try {
    const { error } = await supabase
      .from('enrollments')
      .update({ status: newStatus })
      .eq('id', id);
    if (error) throw error;
    toast(`Enrollment ${id.slice(0,8)}… → ${newStatus}`);
    await loadEnrollments();
  } catch (e) {
    toast('Error updating enrollment: ' + e.message);
  }
}

// Deletes student only if no active enrollments
async function deleteStudent(studentId) {
  try {
    const { count, error: cntErr } = await supabase
      .from('enrollments')
      .select('id', { count:'exact', head:true })
      .eq('student_id', studentId)
      .neq('status', 'cancelled');
    if (cntErr) throw cntErr;
    if ((count||0) > 0) {
      toast('Cannot delete: student has active enrollments. Cancel them first.');
      return;
    }
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', studentId);
    if (error) throw error;
    toast('Student deleted.');
    await loadStudents();
  } catch (e) {
    toast('Error deleting student: ' + e.message);
  }
}

// === Renderer ===
function renderTable(sectionId, rows, error, actionRenderer) {
  const section = document.getElementById(sectionId);
  if (error) {
    section.innerHTML = `<p style="color:#b91c1c;">Error loading ${sectionId}: ${error.message}</p>`;
    return;
  }
  if (!rows || rows.length === 0) {
    section.innerHTML = `<p>No ${sectionId} found.</p>`;
    return;
  }
  const cols = Object.keys(rows[0]);
  let html = '<table><thead><tr>'
    + cols.map(c => `<th>${c}</th>`).join('')
    + '<th>Actions</th></tr></thead><tbody>';
  rows.forEach(r => {
    html += '<tr>'
      + cols.map(c => `<td>${escapeHtml(String(r[c] ?? ''))}</td>`).join('')
      + `<td>${actionRenderer ? actionRenderer(r) : ''}</td>`
      + '</tr>';
  });
  html += '</tbody></table>';
  section.innerHTML = html;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

// === Toast ===
function toast(msg) {
  const wrap = document.getElementById('toast');
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(()=> t.remove(), 3000);
}
