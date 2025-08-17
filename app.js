/*****************
 * CONFIG
 *****************/
const SUPABASE_URL = 'https://hucjmggkasahwpjgnwia.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1Y2ptZ2drYXNhaHdwamdud2lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2MTI2MDIsImV4cCI6MjA3MDE4ODYwMn0.hxFmoZexaKverih9crJfP9fjWItOTfC_6D_CM7hr_Rg';

const CREATE_CHECKOUT_URL = 'https://hucjmggkasahwpjgnwia.supabase.co/functions/v1/create-checkout';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/*****************
 * STATE
 *****************/
let currentUser = null;
let parentRow = null;
let students = [];
let cart = []; // used in wizard finish -> [{ student_id, time_label, class_slot_id }]
let selectedPayment = 'full'; // default
let wizard = { step: 1, student: {}, classLabel: null, classSlotId: null, paymentType: 'full' };

/*****************
 * HELPERS: DOM
 *****************/
const $ = (s) => document.querySelector(s);
const el = {
  // tabs
  tabBtnStudents:    () => document.querySelector('[data-ui="tab-students"]'),
  tabBtnSchedule:    () => document.querySelector('[data-ui="tab-schedule"]'),
  tabBtnOrders:      () => document.querySelector('[data-ui="tab-orders"]'),
  tabBtnAccount:     () => document.querySelector('[data-ui="tab-account"]'),
  tabStudents:       () => document.querySelector('[data-ui="tab-content-students"]'),
  tabSchedule:       () => document.querySelector('[data-ui="tab-content-schedule"]'),
  tabOrders:         () => document.querySelector('[data-ui="tab-content-orders"]'),
  tabAccount:        () => document.querySelector('[data-ui="tab-content-account"]'),

  parentName:        () => $('#parent-name'),
  globalMsg:         () => $('#global-message'),

  // students page sections
  welcomeBanner:     () => document.querySelector('[data-ui="welcome-banner"]'),
  heroEmpty:         () => document.querySelector('[data-ui="hero-empty"]'),
  studentsGrid:      () => document.querySelector('[data-ui="students-grid"]'),
  wizard:            () => document.querySelector('[data-ui="wizard"]'),

  // orders
  ordersList:        () => document.querySelector('[data-ui="orders-list"]'),

  // actions
  startWizardBtn:    () => document.querySelector('[data-action="start-wizard"]'),
  logoutBtn:         () => document.querySelector('[data-action="logout"]'),

  cartBadge:         () => $('#cart-count'),
};

/*****************
 * CLASS SLOTS
 *****************/
let ClassSlots = [];
let LabelToSlotId = new Map();

function hhmmToDisplay(hhmm) {
  const [hStr,mStr] = String(hhmm).slice(0,5).split(':');
  const h = +hStr, m = +mStr;
  const h12 = ((h+11)%12)+1;
  return `${h12}:${String(m).padStart(2,'0')}${h>=12?'pm':'am'}`;
}
function makeLabel(row){ return `${hhmmToDisplay(row.start_time)}-${hhmmToDisplay(row.end_time)}`; }

async function loadClassSlots() {
  const { data, error } = await supabase
    .from('class_slots')
    .select('id, day_of_week, start_time, end_time, age_group')
    .order('start_time');
  if (error) { console.error(error); return; }
  ClassSlots = data || [];
  LabelToSlotId = new Map();
  ClassSlots.forEach(r => LabelToSlotId.set(makeLabel(r), r.id));
}

/*****************
 * AUTH / INIT
 *****************/
document.addEventListener('DOMContentLoaded', init);

async function init() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.href = 'login.html'; return; }
  currentUser = session.user;

  // load basics
  await Promise.all([loadParent(), loadStudents(), loadClassSlots(), loadOrders()]);

  // header
  if (parentRow?.name) el.parentName().textContent = `Welcome, ${parentRow.name}!`;
  else el.parentName().textContent = 'Welcome!';

  // tab nav
  bindTabs();

  // students tab
  renderStudentsTab();

  // actions
  el.startWizardBtn()?.addEventListener('click', startWizard);
  el.logoutBtn()?.addEventListener('click', logout);
}

async function loadParent() {
  const { data } = await supabase.from('parents').select('*').eq('id', currentUser.id).single();
  parentRow = data || null;
}

async function loadStudents() {
  const { data } = await supabase
    .from('students')
    .select('*')
    .eq('parent_id', currentUser.id)
    .order('created_at', { ascending: false });
  students = data || [];
}

async function loadOrders() {
  // pre-render orders list; call renderOrders() later
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, order_number, status, total_amount, amount_paid, balance_due, created_at,
      order_items(
        id, time_slot,
        students(first_name, last_name)
      )
    `)
    .eq('parent_id', currentUser.id)
    .order('created_at', { ascending: false });
  if (error) console.error(error);
  renderOrders(data || []);
}

/*****************
 * TABS
 *****************/
function bindTabs() {
  const buttons = [
    { btn: el.tabBtnStudents(), show: 'students' },
    { btn: el.tabBtnSchedule(), show: 'schedule' },
    { btn: el.tabBtnOrders(),   show: 'orders'   },
    { btn: el.tabBtnAccount(),  show: 'account'  },
  ];
  buttons.forEach(({btn,show}) => btn?.addEventListener('click', () => switchTab(show)));
}
function switchTab(name) {
  // toggle buttons
  document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
  (name==='students'?el.tabBtnStudents():name==='schedule'?el.tabBtnSchedule():name==='orders'?el.tabBtnOrders():el.tabBtnAccount())?.classList.add('active');

  // toggle panels
  document.querySelectorAll('.tab-content').forEach(p => p.classList.remove('active'));
  (name==='students'?el.tabStudents():name==='schedule'?el.tabSchedule():name==='orders'?el.tabOrders():el.tabAccount()).classList.add('active');
}

/*****************
 * STUDENTS TAB
 *****************/
function renderStudentsTab() {
  const isNew = students.length === 0;

  // show hero for new users
  el.welcomeBanner().classList.toggle('hidden', !isNew);
  el.heroEmpty().classList.toggle('hidden', !isNew);
  el.studentsGrid().innerHTML = '';

  if (isNew) return; // wizard starts from hero button

  // existing user: student cards + add-another
  students.forEach(st => {
    const card = document.createElement('div');
    card.className = 'student-card';
    card.innerHTML = `
      <h3 style="font-size:1.25rem;font-weight:700;margin-bottom:1rem;">
        ${st.first_name} ${st.last_name || ''}
      </h3>
      <div style="display:grid;gap:.5rem;margin-bottom:1rem;color:#6b7280;font-size:.875rem">
        <div style="display:flex;justify-content:space-between"><span>Age:</span><strong>${st.age ?? '-'}</strong></div>
        <div style="display:flex;justify-content:space-between"><span>Grade:</span><strong>${st.grade ?? '-'}</strong></div>
        <div style="display:flex;justify-content:space-between"><span>Experience:</span><strong>${st.experience_level || 'Beginner'}</strong></div>
      </div>
      <div class="status" data-student="${st.id}" style="background:#fef3c7;color:#92400e;padding:.75rem;border-radius:.5rem;margin-bottom:1rem;text-align:center">
        Not currently enrolled
      </div>
      <button class="btn btn-primary" data-enroll="${st.id}" style="width:100%">Enroll in Level 1</button>
    `;
    el.studentsGrid().appendChild(card);
  });

  // add another student tile
  const add = document.createElement('div');
  add.className = 'add-student-card';
  add.innerHTML = `
    <div style="position:relative;z-index:1;text-align:center">
      <div style="font-size:3rem;margin-bottom:1rem">➕</div>
      <h3 style="font-weight:700;color:#7c2d12;margin-bottom:.5rem">Add Another Student</h3>
      <p style="color:#92400e">Click to enroll another child</p>
    </div>`;
  add.addEventListener('click', startWizard);
  el.studentsGrid().appendChild(add);

  // button handlers
  el.studentsGrid().querySelectorAll('[data-enroll]')?.forEach(b=>{
    b.addEventListener('click', () => startWizardForExisting(b.getAttribute('data-enroll')));
  });

  // hook hero button (if present)
  el.startWizardBtn()?.addEventListener('click', startWizard);
}

function startWizard() {
  wizard = { step: 1, student: {}, classLabel: null, classSlotId: null, paymentType: 'full' };
  el.heroEmpty().classList.add('hidden');
  el.wizard().classList.remove('hidden');
  renderWizard();
}

function startWizardForExisting(studentId) {
  const st = students.find(s => String(s.id) === String(studentId));
  if (!st) return;
  wizard = {
    step: 2,
    student: { id: st.id, firstName: st.first_name, lastName: st.last_name, age: st.age, grade: parseInt(st.grade) || null, existing: true },
    classLabel: null,
    classSlotId: null,
    paymentType: 'full'
  };
  el.wizard().classList.remove('hidden');
  renderWizard();
}

/*****************
 * WIZARD RENDER
 *****************/
function renderWizard() {
  const W = el.wizard();
  const title = wizard.step===1?'Add Your Student':wizard.step===2?'Choose a Class Time':'Complete Enrollment';
  const sub   = wizard.step===1?'Tell us about your child':wizard.step===2?'Select the best time for your schedule':'Review and complete your enrollment';

  W.innerHTML = `
    <div class="wizard-header">
      <h2 class="wizard-title">${title}</h2>
      <p class="wizard-subtitle">${sub}</p>
    </div>

    <div class="progress-dots">
      <div class="progress-dot ${wizard.step>=1?'active':''} ${wizard.step>1?'completed':''}"></div>
      <div class="progress-dot ${wizard.step>=2?'active':''} ${wizard.step>2?'completed':''}"></div>
      <div class="progress-dot ${wizard.step>=3?'active':''}"></div>
    </div>

    <div class="wizard-content">${renderWizardStep()}</div>
  `;

  // bind step actions
  bindWizardStepHandlers();
}

function renderWizardStep() {
  if (wizard.step === 1) {
    return `
      <form class="wizard-form" id="wizard-form">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">First Name *</label>
            <input class="form-input" name="firstName" required value="${wizard.student.firstName||''}" placeholder="Emma"/>
          </div>
          <div class="form-group">
            <label class="form-label">Last Name *</label>
            <input class="form-input" name="lastName" required value="${wizard.student.lastName||''}" placeholder="Johnson"/>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Age *</label>
            <input class="form-input" type="number" name="age" min="9" max="18" required value="${wizard.student.age||''}"/>
          </div>
          <div class="form-group">
            <label class="form-label">Grade *</label>
            <select class="form-select" name="grade" required>
              <option value="">Select Grade</option>
              ${[4,5,6,7,8,9,10,11,12].map(g=>`<option value="${g}" ${Number(wizard.student.grade)===g?'selected':''}>${g}th Grade</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">3D Design Experience</label>
          <select name="experience" class="form-select">
            <option value="None">No experience (perfect for beginners!)</option>
            <option value="Some">Some basic experience</option>
            <option value="Advanced">Experienced with 3D design</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Special Notes (Optional)</label>
          <textarea name="notes" class="form-input" rows="3" placeholder="Any learning differences or special considerations?">${wizard.student.notes||''}</textarea>
        </div>

        <div class="wizard-actions">
          <button type="button" class="btn" style="background:#6b7280;color:#fff" data-action="cancel-wizard">Cancel</button>
          <button type="submit" class="btn btn-primary">Continue to Class Selection →</button>
        </div>
      </form>
    `;
  }

  if (wizard.step === 2) {
    const grade = parseInt(wizard.student.grade);
    const isElementary = grade <= 7;
    const isHighSchool = grade >= 8;

    // Build slot cards from class_slots (Tuesday assumed by your program; extend if needed)
    const slotCards = ClassSlots.map(slot => {
      const label = makeLabel(slot);
      const isElemSlot = /4:30/.test(label);
      const allowed = (isElementary && isElemSlot) || (isHighSchool && !isElemSlot);
      const selected = wizard.classLabel === label;
      return `
        <div class="class-option ${selected?'selected':''}" data-slot-label="${label}" data-slot-id="${slot.id}"
             style="${allowed?'':'opacity:.5;cursor:not-allowed'}" ${allowed?'':'data-disabled="1"'}>
          <h3 style="font-size:1.25rem;font-weight:700;margin-bottom:.5rem;">
            ${slot.day_of_week} ${label}
          </h3>
          <p style="color:#6b7280;margin-bottom:.5rem;">${isElemSlot?'Elementary (Grades 4-7)':'Jr High/High School (Grades 8-12)'}</p>
          <div data-remaining="${slot.id}" style="font-size:.875rem"></div>
        </div>
      `;
    }).join('');

    return `
      <div class="class-options">${slotCards}</div>
      <div class="wizard-actions">
        <button class="btn" style="background:#6b7280;color:#fff" data-action="prev-step">← Back</button>
        <button class="btn btn-primary" data-action="next-step" ${wizard.classLabel?'':'disabled'}>Continue to Payment →</button>
      </div>
    `;
  }

  // step 3 - summary + payment option
  const basePrice = 700;
  const multiDiscount = students.length > 0 ? 50 : 0;
  const total = basePrice - multiDiscount;
  const first = Math.ceil(total/2), second = Math.floor(total/2);

  return `
    <div style="background:#f9fafb;border-radius:1rem;padding:2rem;margin-bottom:2rem">
      <h3 style="margin-bottom:1rem">Enrollment Summary</h3>
      <div style="border-bottom:1px solid #e5e7eb;padding-bottom:1rem;margin-bottom:1rem">
        <div style="display:flex;justify-content:space-between;margin-bottom:.5rem">
          <strong>${wizard.student.firstName} ${wizard.student.lastName}</strong>
          <span>Level 1</span>
        </div>
        <div style="color:#6b7280;font-size:.875rem">
          Tuesday ${wizard.classLabel} • 12 weeks
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:.5rem"><span>Level 1 Tuition</span><span>$${basePrice}</span></div>
      ${multiDiscount?`<div style="display:flex;justify-content:space-between;margin-bottom:.5rem;color:#16a34a"><span>Multi-child Discount</span><span>-$${multiDiscount}</span></div>`:''}
      <div style="display:flex;justify-content:space-between;padding-top:1rem;border-top:2px solid #e5e7eb;font-size:1.25rem;font-weight:700">
        <span>Total</span><span style="color:#ea580c">$${total}</span>
      </div>
    </div>

    <div style="margin-bottom:2rem">
      <h4 style="margin-bottom:1rem">Select Payment Option</h4>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
        <label class="class-option ${selectedPayment==='full'?'selected':''}" data-pay="full">
          <h4>Pay in Full</h4>
          <p style="color:#16a34a;font-weight:700">$${total-20} today</p>
          <small style="color:#6b7280">Save $20!</small>
        </label>
        <label class="class-option ${selectedPayment==='split'?'selected':''}" data-pay="split">
          <h4>Payment Plan</h4>
          <p style="font-weight:700">$${first} today</p>
          <small style="color:#6b7280">$${second} on Oct 15</small>
        </label>
      </div>
    </div>

    <div class="wizard-actions">
      <button class="btn" style="background:#6b7280;color:#fff" data-action="prev-step">← Back</button>
      <button class="btn btn-primary" data-action="finish">Complete Enrollment →</button>
    </div>
  `;
}

function bindWizardStepHandlers() {
  const W = el.wizard();

  // Cancel
  W.querySelector('[data-action="cancel-wizard"]')?.addEventListener('click', () => {
    el.wizard().classList.add('hidden');
    renderStudentsTab();
  });

  if (wizard.step === 1) {
    W.querySelector('#wizard-form')?.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      wizard.student = {
        ...wizard.student,
        firstName: fd.get('firstName').trim(),
        lastName:  fd.get('lastName').trim(),
        age:       Number(fd.get('age')),
        grade:     Number(fd.get('grade')),
        experience:fd.get('experience') || 'None',
        notes:     fd.get('notes') || ''
      };
      wizard.step = 2;
      renderWizard();
    });
  }

  if (wizard.step === 2) {
    // seat counts + select handlers
    W.querySelectorAll('.class-option').forEach(card=>{
      const disabled = card.hasAttribute('data-disabled');
      const slotId = card.getAttribute('data-slot-id');
      const label  = card.getAttribute('data-slot-label');

      // show remaining (only if <3)
      updateRemainingBadge(slotId, card.querySelector(`[data-remaining="${slotId}"]`));

      if (!disabled) {
        card.addEventListener('click', ()=>{
          W.querySelectorAll('.class-option').forEach(c=>c.classList.remove('selected'));
          card.classList.add('selected');
          wizard.classLabel = label;
          wizard.classSlotId = slotId;
          W.querySelector('[data-action="next-step"]').disabled = false;
        });
      }
    });

    W.querySelector('[data-action="prev-step"]')?.addEventListener('click', ()=>{
      wizard.step = 1; renderWizard();
    });
    W.querySelector('[data-action="next-step"]')?.addEventListener('click', ()=>{
      wizard.step = 3; renderWizard();
    });
  }

  if (wizard.step === 3) {
    // payment selection
    W.querySelectorAll('[data-pay]').forEach(p=>{
      p.addEventListener('click', ()=>{
        selectedPayment = p.getAttribute('data-pay'); // 'full' | 'split'
        renderWizard();
      });
    });
    W.querySelector('[data-action="prev-step"]')?.addEventListener('click', ()=>{
      wizard.step = 2; renderWizard();
    });
    W.querySelector('[data-action="finish"]')?.addEventListener('click', finishEnrollment);
  }
}

/*****************
 * AVAILABILITY
 *****************/
async function updateRemainingBadge(slotId, targetEl) {
  if (!targetEl) return;
  try {
    const { count } = await supabase
      .from('enrollments')
      .select('id', { head: true, count: 'exact' })
      .eq('class_slot_id', slotId);
    const remaining = Math.max(10 - (count || 0), 0);
    if (remaining < 3) {
      targetEl.innerHTML = `<span style="display:inline-block;margin-top:.5rem;padding:.25rem .5rem;background:${remaining>0?'#dcfce7':'#fef2f2'};color:${remaining>0?'#15803d':'#dc2626'};border-radius:.25rem;font-size:.75rem">${remaining} spots remaining</span>`;
    } else {
      targetEl.textContent = '';
    }
  } catch {}
}

/*****************
 * FINISH → Stripe Checkout
 *****************/
async function finishEnrollment() {
  try {
    // 1) create student if new
    let studentId = wizard.student.id;
    if (!wizard.student.existing) {
      const { data, error } = await supabase
        .from('students')
        .insert([{
          parent_id: currentUser.id,
          first_name: wizard.student.firstName,
          last_name: wizard.student.lastName,
          age: wizard.student.age,
          grade: `${wizard.student.grade}th`,
          experience_level: wizard.student.experience,
          parent_notes: wizard.student.notes
        }])
        .select()
        .single();
      if (error) throw error;
      studentId = data.id;
      // update local list
      students.unshift(data);
    }

    // 2) build items array for checkout
    const items = [{
      student_id: studentId,
      time_label: wizard.classLabel,
      class_slot_id: wizard.classSlotId
    }];

    // 3) amounts consistent with your webhook mapping
    const base = 700 - (students.length > 1 ? 50 : 0);
    const amountPaid = (selectedPayment === 'full') ? (base - 20) : Math.ceil(base/2);

    // 4) call your Edge Function (kept exactly as your system expects)
    const resp = await fetch(CREATE_CHECKOUT_URL, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        parentId: currentUser.id,
        paymentType: selectedPayment, // 'full' | 'split'
        amountPaid,
        items
      })
    });
    if (!resp.ok) throw new Error(await resp.text());
    const { url } = await resp.json();

    // 5) success splash then redirect
    showSuccessMessage(`${wizard.student.firstName} is ready to start their 3D journey. Redirecting to secure payment…`);
    setTimeout(()=> window.location.href = url, 1200);
  } catch (err) {
    console.error(err);
    flash('Could not start checkout. Please try again.', 'error');
  }
}

/*****************
 * ORDERS
 *****************/
function renderOrders(orders) {
  const list = el.ordersList();
  if (!list) return;
  if (!orders.length) {
    list.innerHTML = `<div class="student-card">No orders yet.</div>`;
    return;
  }
  list.innerHTML = orders.map(o=>`
    <div class="student-card">
      <div style="display:flex;justify-content:space-between;align-items:start">
        <div>
          <h3 style="margin:0;font-size:1.1rem">Order #${o.order_number}</h3>
          <p style="margin:.25rem 0;color:#6b7280">${new Date(o.created_at).toLocaleDateString()}</p>
        </div>
        <span class="badge">${o.status}</span>
      </div>
      <div style="background:#f9fafb;padding:10px;border-radius:.5rem;margin:12px 0">
        <strong>Students:</strong>
        ${(o.order_items||[]).map(i=>`<div>${i?.students?.first_name||''} ${i?.students?.last_name||''} — ${i?.time_slot||''}</div>`).join('')}
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">
        <div><strong>Total:</strong> ${o.total_amount ?? '-'}</div>
        <div><strong>Paid:</strong> ${o.amount_paid ?? '-'}</div>
        <div><strong>Balance:</strong> ${o.balance_due ?? 0}</div>
      </div>
    </div>
  `).join('');
}

/*****************
 * UTILS
 *****************/
function showSuccessMessage(text) {
  el.tabStudents().innerHTML = `
    <div class="success-message">
      <div style="font-size:4rem;margin-bottom:1rem">🎉</div>
      <h2 style="font-size:2rem;font-weight:700;margin-bottom:.5rem">Student Added Successfully!</h2>
      <p style="font-size:1.125rem;margin-bottom:1rem">${text}</p>
    </div>
  `;
}
function flash(msg,type='info') {
  el.globalMsg().innerHTML = `<div class="container"><div class="success-message" style="background:${type==='error'?'#fee2e2':'#dcfce7'};border-color:${type==='error'?'#dc2626':'#16a34a'}">${msg}</div></div>`;
  setTimeout(()=> el.globalMsg().innerHTML='', 3000);
}
async function logout(){ await supabase.auth.signOut(); window.location.href='login.html'; }
