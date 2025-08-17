/***************
 * CONFIG
 ***************/
const SUPABASE_URL = 'https://hucjmggkasahwpjgnwia.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1Y2ptZ2drYXNhaHdwamdud2lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2MTI2MDIsImV4cCI6MjA3MDE4ODYwMn0.hxFmoZexaKverih9crJfP9fjWItOTfC_6D_CM7hr_Rg';
const CREATE_CHECKOUT_URL = 'https://hucjmggkasahwpjgnwia.supabase.co/functions/v1/create-checkout'; // your Edge Function

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/***************
 * GLOBAL STATE
 ***************/
let currentUser = null;
let students = [];
let cart = [];                     // [{ student, timeSlot, classSlotId }]
let selectedPaymentOption = null;  // 'full' | 'split'
let pendingTimeSlotAssignment = null;

/***************
 * BOOT
 ***************/
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuthAndInit();
});

/***************
 * CLASS SLOTS (label -> id)
 ***************/
window.ClassSlots = [];
let LabelToSlotId = new Map();

function toLabel(hhmm) {
  const [hStr, mStr] = String(hhmm).slice(0,5).split(':');
  const h = Number(hStr), m = Number(mStr);
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2,'0')}${h >= 12 ? 'pm' : 'am'}`;
}
function humanLabelFromRow(row) { return `${toLabel(row.start_time)}-${toLabel(row.end_time)}`; }
function getSlotIdByLabel(label) { return LabelToSlotId.get(label) || null; }

async function loadClassSlots() {
  const { data, error } = await supabase
    .from('class_slots')
    .select('id, day_of_week, start_time, end_time')
    .order('start_time', { ascending: true });

  if (error) { console.error('loadClassSlots error', error); return; }
  window.ClassSlots = data || [];
  LabelToSlotId = new Map();
  for (const row of window.ClassSlots) LabelToSlotId.set(humanLabelFromRow(row), row.id);
}

/***************
 * INIT / AUTH
 ***************/
async function checkAuthAndInit() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!session) {
      window.location.href = 'index.html';
      return;
    }
    currentUser = session.user;

    // Show app UI
    document.getElementById('app')?.classList.remove('hidden');
    document.getElementById('login-form')?.classList.add('hidden');

    // Load data
    await loadClassSlots();
    await loadStudents();
    await loadInitialData();

    setupEventListeners();
    renderStudents();
    renderCart();
    renderPortal();
    updateProgress('students');
  } catch (err) {
    console.error('Init error', err);
    showMessage('Problem loading your account. Check configuration and reload.', 'error');
  }
}

function setupEventListeners() {
  // Section nav
  document.querySelectorAll('.nav-button').forEach(btn => {
    btn.addEventListener('click', (e) => showSection(e.target.dataset.section));
  });
  // Proceed to payment
  document.getElementById('proceed-to-payment-btn')?.addEventListener('click', proceedToPayment);
}

function showSection(section) {
  document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
  document.getElementById(`${section}-section`)?.classList.remove('hidden');
  updateProgress(section);
}

function updateProgress(section) {
  document.querySelectorAll('.progress-step').forEach(s => s.classList.remove('active'));
  const step = document.getElementById(`step-${section}`);
  if (step) step.classList.add('active');

  const steps = ['students', 'cart', 'payment', 'complete'];
  const currentIndex = steps.indexOf(section);
  document.querySelectorAll('.progress-step').forEach((el, idx) => {
    el.classList.toggle('completed', idx < currentIndex);
  });
}

/***************
 * STUDENTS
 ***************/
async function loadStudents() {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('parent_id', currentUser.id)
      .order('created_at', { ascending: true });
    if (error) throw error;
    students = data || [];
  } catch (err) {
    console.error('loadStudents error', err);
    showMessage('Error loading students.', 'error');
  }
}

function renderStudents() {
  const grid = document.getElementById('students-grid');
  if (!grid) return;
  grid.innerHTML = '';

  // Empty state for new users
  if (!students.length) {
    grid.innerHTML = `
      <div class="card" style="text-align:center; padding:2rem;">
        <h2 style="margin:0 0 .5rem;">Add Your First Student</h2>
        <p style="color:#6b7280; margin:0 0 1rem;">Quick 3 steps: Add Student → Pick Time → Pay</p>
        <button class="btn" onclick="openAddStudentWizard()">Add Student</button>
      </div>
    `;
    return;
  }

  // Existing students grid
  students.forEach(s => {
    const inCart = cart.some(c => c.student.id === s.id);
    const el = document.createElement('div');
    el.className = 'card';
    el.innerHTML = `
      <div style="display:flex; gap:1rem;">
        <div class="avatar" style="background:#111827;color:#fff;width:40px;height:40px;border-radius:9999px;display:grid;place-items:center;">
          ${s.first_name?.[0] || 'S'}
        </div>
        <div style="flex:1;">
          <h3 style="margin:0;">${s.first_name || ''} ${s.last_name || ''}</h3>
          <p style="margin:.25rem 0; color:#6b7280;">Age ${s.age || ''} • ${s.grade || ''} • ${s.experience_level || 'Beginner'}</p>
        </div>
        <div>
          ${inCart
            ? `<button class="btn" disabled>✓ In Cart</button>`
            : `<button class="btn" onclick="addToCart('${s.id}')">Add to Cart</button>`
          }
        </div>
      </div>
    `;
    grid.appendChild(el);
  });

  // Add Another Student card
  const add = document.createElement('div');
  add.className = 'card';
  add.innerHTML = `
    <div style="text-align:center;">
      <button class="btn btn-outline" onclick="openAddStudentWizard()">Add Another Student</button>
    </div>
  `;
  grid.appendChild(add);
}

// Simple “wizard” entry point (you can replace with your modal/flow)
function openAddStudentWizard() {
  const first = prompt('First name?');
  if (!first) return;
  const last = prompt('Last name? (optional)') || '';
  const grade = prompt('Grade? (e.g., 6th)') || '6th';
  const age = Number(prompt('Age?')) || null;
  addStudent({ first_name:first, last_name:last, grade, age })
}

async function addStudent(studentData) {
  try {
    const { error } = await supabase
      .from('students')
      .insert([{ parent_id: currentUser.id, ...studentData }]);
    if (error) throw error;
    await loadStudents();
    renderStudents();
    showMessage('Student added!', 'success');
  } catch (err) {
    console.error('addStudent error', err);
    showMessage('Could not add student.', 'error');
  }
}

async function removeStudent(studentId) {
  try {
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', studentId)
      .eq('parent_id', currentUser.id);
    if (error) throw error;
    cart = cart.filter(x => x.student.id !== studentId);
    updateCartCount();
    await loadStudents();
    renderStudents();
    renderCart();
    showMessage('Removed', 'success');
  } catch (err) {
    console.error('removeStudent error', err);
    showMessage('Could not remove student.', 'error');
  }
}

/***************
 * CART
 ***************/
function addToCart(studentId) {
  const s = students.find(st => String(st.id) === String(studentId));
  if (!s) return;
  if (cart.some(c => c.student.id === s.id)) return;
  cart.push({ student: s, timeSlot: null, classSlotId: null });
  updateCartCount();
  renderCart();
  showSection('cart');
}
function removeFromCart(studentId) {
  cart = cart.filter(x => x.student.id !== studentId);
  updateCartCount();
  renderCart();
  renderStudents();
}

function updateCartCount() {
  const badge = document.getElementById('cart-count');
  if (!badge) return;
  badge.textContent = String(cart.length);
  badge.style.display = cart.length ? 'inline-block' : 'none';
}

async function loadInitialData() {
  // No-op placeholder for any extra boot logic
  updateProceedButton();
}

function updateProceedButton() {
  const btn = document.getElementById('proceed-to-payment-btn');
  if (!btn) return;
  const ready = cart.length > 0 && cart.every(c => !!c.timeSlot) && !!selectedPaymentOption;
  btn.disabled = !ready;
}

function renderCart() {
  const list = document.getElementById('cart-items');
  const summary = document.getElementById('cart-summary');
  if (!list || !summary) return;

  list.innerHTML = '';
  if (!cart.length) {
    list.innerHTML = `<div class="card" style="color:#6b7280;">No students in cart yet.</div>`;
    summary.classList.add('hidden');
    return;
  }

  // Totals (example pricing model)
  const withSlots = cart.filter(x => x.timeSlot);
  const fullTotal = 700 * withSlots.length;
  const multiDiscount = withSlots.length > 1 ? 50 * (withSlots.length - 1) : 0;
  const splitFirst = 360 * withSlots.length - (multiDiscount > 0 ? multiDiscount : 0);
  const splitSecond = 360 * withSlots.length - (multiDiscount > 0 ? multiDiscount : 0);

  window.paymentAmounts = {
    full: fullTotal,
    splitFirst,
    splitSecond,
    splitTotal: splitFirst + splitSecond
  };

  cart.forEach((c, idx) => {
    const el = document.createElement('div');
    el.className = 'card';
    el.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div style="font-weight:600;">${c.student.first_name} ${c.student.last_name || ''}</div>
          <div style="color:#6b7280; font-size:.875rem;">
            ${c.timeSlot ? `Time: ${c.timeSlot}` : `No time selected`}
          </div>
        </div>
        <div style="display:flex; gap:.5rem;">
          <button class="btn btn-outline" onclick="showTimeSlotSelection(${idx})">${c.timeSlot ? 'Change Time' : 'Pick Time'}</button>
          <button class="btn btn-outline" onclick="removeFromCart('${c.student.id}')">Remove</button>
        </div>
      </div>
    `;
    list.appendChild(el);
  });

  summary.classList.remove('hidden');
  updateProceedButton();
}

function selectPaymentOption(opt) {
  selectedPaymentOption = opt; // 'full' | 'split'
  document.querySelectorAll('.payment-option').forEach(el => el.classList.remove('selected'));
  document.getElementById(`payment-${opt}`)?.classList.add('selected');
  updateProceedButton();
}

function showTimeSlotSelection(cartIndex) {
  // Build options from class_slots
  const container = document.createElement('div');
  container.innerHTML = `
    <div class="card" style="position:fixed; inset:0; background:rgba(0,0,0,.5); display:grid; place-items:center; z-index:50;">
      <div class="card" style="min-width:320px; max-width:520px;">
        <h3 style="margin-top:0;">Select a Time</h3>
        <div id="slot-list" class="grid"></div>
        <div style="margin-top:12px; text-align:right;">
          <button class="btn btn-outline" onclick="this.closest('[data-modal]').remove()">Close</button>
        </div>
      </div>
    </div>
  `;
  const wrapper = document.createElement('div');
  wrapper.setAttribute('data-modal','');
  wrapper.appendChild(container);
  document.body.appendChild(wrapper);

  renderSlotList(cartIndex, wrapper);
}

async function renderSlotList(cartIndex, modalRoot) {
  const slotList = modalRoot.querySelector('#slot-list');
  slotList.innerHTML = '';

  for (const slot of window.ClassSlots) {
    const label = humanLabelFromRow(slot);

    // Count enrollments for this slot (base 10)
    let remaining = 10;
    try {
      const { count } = await supabase
        .from('enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('class_slot_id', slot.id);
      remaining = Math.max(10 - (count || 0), 0);
    } catch { /* ignore */ }

    const warn = remaining < 3 ? `<div style="font-size:.75rem; color:${remaining>0?'#16a34a':'#dc2626'};">${remaining} spots remaining</div>` : '';

    const btn = document.createElement('button');
    btn.className = 'btn btn-outline';
    btn.style = 'text-align:left;';
    btn.innerHTML = `
      <div style="display:flex; justify-content:space-between; width:100%;">
        <div><strong>${slot.day_of_week}</strong> ${label}</div>
        ${warn}
      </div>
    `;
    btn.disabled = remaining <= 0;
    btn.onclick = () => {
      cart[cartIndex].timeSlot = label;
      cart[cartIndex].classSlotId = slot.id; // ✅ store real id
      modalRoot.remove();
      renderCart();
      updateProceedButton();
    };
    slotList.appendChild(btn);
  }
}

/***************
 * PAYMENT → STRIPE CHECKOUT
 ***************/
async function proceedToPayment() {
  try {
    if (!selectedPaymentOption) {
      showMessage('Choose a payment option first.', 'error', 'cart');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not logged in.');

    const items = cart.filter(x => x.timeSlot).map(x => ({
      student_id: x.student.id,
      time_label: x.timeSlot,
      class_slot_id: x.classSlotId || null
    }));
    if (!items.length) throw new Error('Assign a class time to each student.');

    const amounts = window.paymentAmounts || {};
    const amountPaid = selectedPaymentOption === 'full'
      ? Number(amounts.full || 0)
      : Number(amounts.splitFirst || 0);

    const resp = await fetch(CREATE_CHECKOUT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parentId: user.id,
        paymentType: selectedPaymentOption, // 'full' | 'split' | 'deposit'
        amountPaid,
        items
      })
    });
    if (!resp.ok) throw new Error(await resp.text());
    const { url } = await resp.json();
    window.location.href = url;
  } catch (err) {
    console.error('proceedToPayment error', err);
    showMessage('Could not start checkout.', 'error', 'cart');
  }
}

/***************
 * ORDERS / HISTORY
 ***************/
async function renderPortal() {
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id, order_number, status, total_amount, amount_paid, balance_due, created_at,
        order_items (
          id, time_slot,
          students ( first_name, last_name )
        )
      `)
      .eq('parent_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const list = document.getElementById('orders-list');
    if (!list) return;
    if (!orders?.length) {
      list.innerHTML = `<div class="card">No orders yet.</div>`;
      return;
    }

    list.innerHTML = orders.map(o => `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:start;">
          <div>
            <h3 style="margin:0;">Order #${o.order_number}</h3>
            <p style="margin:.25rem 0; color:#6b7280;">${new Date(o.created_at).toLocaleDateString()}</p>
          </div>
          <span class="badge">${o.status}</span>
        </div>
        <div style="background:#f9fafb; padding:10px; border-radius:8px; margin:12px 0;">
          <strong>Students:</strong>
          ${(o.order_items || []).map(i => `
            <div>${i?.students?.first_name || ''} ${i?.students?.last_name || ''} — ${i?.time_slot || ''}</div>
          `).join('')}
        </div>
        <div style="display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:8px;">
          <div><strong>Total:</strong> ${o.total_amount ?? '-'}</div>
          <div><strong>Paid:</strong> ${o.amount_paid ?? '-'}</div>
          <div><strong>Balance:</strong> ${o.balance_due ?? 0}</div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('renderPortal error', err);
    showMessage('Could not load orders.', 'error');
  }
}

/***************
 * UTILS
 ***************/
function showMessage(msg, type='info', area='global') {
  const el = document.getElementById(area === 'cart' ? 'cart-message-area'
                : area === 'students' ? 'message-area'
                : 'global-message');
  if (!el) return;
  el.innerHTML = `<div class="message ${type}">${msg}</div>`;
  if (type !== 'error') setTimeout(() => el.innerHTML = '', 4000);
}
