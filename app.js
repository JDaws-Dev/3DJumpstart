// Configuration
const SUPABASE_URL = 'https://hucjmggkasahwpjgnwia.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....CI6MjA3MDE4ODYwMn0.hxFmoZexaKverih9crJfP9fjWItOTfC_6D_CM7hr_Rg';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global variables
let currentUser = null;
let students = [];
let cart = [];
let selectedPaymentOption = null;
let pendingTimeSlotAssignment = null;


// --- Class slots cache + helpers ---
window.ClassSlots = [];               // raw rows from class_slots
let LabelToSlotId = new Map();        // "4:30-5:30pm" -> slot.id

function toLabel(hhmm) {
  const [hStr, mStr] = String(hhmm).slice(0,5).split(':');
  const h = Number(hStr), m = Number(mStr);
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2,'0')}${h >= 12 ? 'pm' : 'am'}`;
}

function humanLabelFromRow(row) {
  return `${toLabel(row.start_time)}-${toLabel(row.end_time)}`;
}

async function loadClassSlots() {
  const { data, error } = await supabase
    .from('class_slots')
    .select('id, day_of_week, start_time, end_time');
  if (error) { console.error('loadClassSlots error', error); return; }
  window.ClassSlots = data || [];
  LabelToSlotId = new Map();
  for (const row of window.ClassSlots) {
    const label = humanLabelFromRow(row); // "4:30-5:30pm"
    LabelToSlotId.set(label, row.id);
  }
}

function getSlotIdByLabel(label) {
  return LabelToSlotId.get(label) || null;
}




// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuthAndInit();
});

async function checkAuthAndInit() {
    console.log('=== AUTH CHECK START ===');
    
    try {
        console.log('Step 1: Getting session...');
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
            console.log('No session found');
            window.location.href = 'index.html';
            return;
        }

        currentUser = session.user;
        console.log('User:', currentUser.id);
        
        // Show the app
        document.getElementById('app').classList.remove('hidden');
        document.getElementById('login-form').classList.add('hidden');
        await loadClassSlots();   // ✅ build label->id map before rendering

        
        // Load data
        await loadStudents();
        await loadInitialData();
        
        // Event listeners
        setupEventListeners();
        
        // Render initial UI
        renderStudents();
        renderCart();
        renderPortal();
        
        updateProgress('students');

    } catch (error) {
        console.error('Init error:', error);
        showMessage('There was a problem loading your account. Please try again.', 'error');
    }
}

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const section = e.target.dataset.section;
            showSection(section);
        });
    });
    
    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Proceed to payment button
    const proceedBtn = document.getElementById('proceed-to-payment-btn');
    if (proceedBtn) {
        proceedBtn.addEventListener('click', proceedToPayment);
    }
}

// Section management
function showSection(section) {
    document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
    document.getElementById(`${section}-section`).classList.remove('hidden');
    updateProgress(section);
}

function updateProgress(section) {
    document.querySelectorAll('.progress-step').forEach(step => step.classList.remove('active'));
    const step = document.getElementById(`step-${section}`);
    if (step) step.classList.add('active');
    
    // Update progress steps
    updateProgressSteps(section);
}

function updateProgressSteps(currentSection) {
    const steps = ['students', 'cart', 'payment', 'complete'];
    const currentIndex = steps.indexOf(currentSection);
    
    steps.forEach((step, index) => {
        const stepElement = document.getElementById(`step-${step}`);
        const dividers = document.querySelectorAll('.step-divider');
        
        if (stepElement) {
            if (index < currentIndex) {
                stepElement.className = 'progress-step completed';
                if (dividers[index]) dividers[index].classList.add('completed');
            } else if (index === currentIndex) {
                stepElement.className = 'progress-step active';
            } else {
                stepElement.className = 'progress-step';
                if (dividers[index - 1]) dividers[index - 1].classList.remove('completed');
            }
        }
    });
}

// Student Management
async function loadStudents() {
    try {
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .eq('parent_id', currentUser.id)
            .order('created_at', { ascending: true });

        if (error) throw error;

        students = data || [];
        renderStudents();
        updateProceedButton();
        
    } catch (error) {
        console.error('Error loading students:', error);
        showMessage('Error loading students. Please refresh the page.', 'error');
    }
}

function renderStudents() {
    const grid = document.getElementById('students-grid');
    grid.innerHTML = '';

    if (!students || students.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <h3>No students yet</h3>
                <p>Add students to enroll them in a class</p>
            </div>
        `;
        return;
    }

    students.forEach(student => {
        const inCart = cart.some(item => item.student.id === student.id);
        const studentCard = document.createElement('div');
        studentCard.className = 'student-card card';
        studentCard.innerHTML = `
            <div style="display: flex; gap: 1rem;">
                <div class="avatar">${student.first_name.charAt(0)}${student.last_name ? student.last_name.charAt(0) : ''}</div>
                <div>
                    <h3 style="margin: 0 0 0.25rem 0;">${student.first_name} ${student.last_name || ''}</h3>
                    <p style="margin: 0; color: #6b7280; font-size: 0.875rem;">
                        Age ${student.age} • ${student.grade} • ${student.experience_level || 'Beginner'}
                    </p>
                    ${student.allergies ? `<p style="margin: 0.25rem 0 0 0; font-size: 0.75rem; color: #6b7280;">Allergies: ${student.allergies}</p>` : ''}
                </div>
            </div>
            <div style="margin-top: 1rem;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                    ${inCart ? 
                        '<button class="btn btn-success" style="width: 100%;" disabled>✓ In Cart</button>' :
                        `<button onclick="addToCart('${student.id}')" class="btn btn-primary" style="width: 100%;">Add to Cart</button>`
                    }
                    <button onclick="removeStudent('${student.id}')" class="btn btn-outline" style="width: 100%;">Remove</button>
                </div>
            </div>
        `;
        
        grid.appendChild(studentCard);
    });
}

async function addStudent(studentData) {
    try {
        const { data, error } = await supabase
            .from('students')
            .insert([{
                parent_id: currentUser.id,
                ...studentData
            }])
            .select();

        if (error) throw error;
        
        await loadStudents();
        showMessage('Student added successfully', 'success');
        
    } catch (error) {
        console.error('Error adding student:', error);
        showMessage('Error adding student. Please try again.', 'error');
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

        // Remove from cart if present
        cart = cart.filter(item => String(item.student.id) !== String(studentId));
        updateCartCount();
        renderCart();
        renderStudents();
        updateProceedButton();
        showMessage('Student removed successfully', 'success');
        
    } catch (error) {
        console.error('Error removing student:', error);
        showMessage('Error removing student', 'error');
    }
}

// Form handling
document.addEventListener('DOMContentLoaded', () => {
    const addStudentForm = document.getElementById('add-student-form');
    if (addStudentForm) {
        addStudentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const submitBtn = e.target.querySelector('button[type="submit"]');
            
            try {
                submitBtn.classList.add('loading');
                submitBtn.disabled = true;

                const { error } = await supabase
                    .from('students')
                    .insert([{
                        parent_id: currentUser.id,
                        first_name: formData.get('firstName'),
                        last_name: formData.get('lastName'),
                        age: parseInt(formData.get('age')),
                        grade: formData.get('grade'),
                        experience_level: formData.get('experience'),
                        allergies: formData.get('allergies')
                    }]);

                if (error) throw error;

                e.target.reset();
                await loadStudents();
                showMessage('Student added successfully!', 'success');
                
            } catch (error) {
                console.error('Error adding student:', error);
                showMessage('Failed to add student. Please try again.', 'error');
            } finally {
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
            }
        });
    }
});

// Cart functionality
function addToCart(studentId) {
    const student = students.find(s => String(s.id) === String(studentId));
    if (!student) return;

    if (cart.find(item => item.student.id === studentId)) {
        showMessage(`${student.first_name} is already in your cart`, 'info');
        return;
    }

    cart.push({
        student: student,
        timeSlot: null
    });

    updateCartCount();
    renderStudents();
    showMessage(`${student.first_name} added to cart!`, 'success');
}

function removeFromCart(studentId) {
    const student = students.find(s => String(s.id) === String(studentId));
    if (!student) return;

    cart = cart.filter(item => item.student.id !== studentId);
    updateCartCount();
    renderCart();
    renderStudents();
    showMessage(`${student.first_name} removed from cart`, 'success');
}

function updateCartCount() {
    const count = cart.length;
    const badge = document.getElementById('cart-count');
    if (badge) {
        badge.textContent = count;
        badge.classList.toggle('hidden', count === 0);
    }
}

async function loadInitialData() {
    try {
        // Load anything else needed at startup
        await updateProceedButton();
    } catch (error) {
        console.error('Initial data load error:', error);
    }
}

async function updateProceedButton() {
    const proceedBtn = document.getElementById('proceed-to-payment-btn');
    if (!proceedBtn) return;

    const allHaveSlots = cart.length > 0 && cart.every(item => item.timeSlot);
    proceedBtn.disabled = !(allHaveSlots && selectedPaymentOption);
}

function renderCart() {
    const cartItems = document.getElementById('cart-items');
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<p style="color: #6b7280; font-size: 0.875rem;">No students in cart yet. Add students from the previous step.</p>';
        document.getElementById('cart-summary').classList.add('hidden');
        return;
    }

    const studentsWithSlots = cart.filter(item => item.timeSlot);
    const studentsWithoutSlots = cart.filter(item => !item.timeSlot);

    // Totals (example amounts)
    const fullTotal = 700 * studentsWithSlots.length;
    const multiDiscount = studentsWithSlots.length > 1 ? 50 * (studentsWithSlots.length - 1) : 0;
    const splitFirst = 360 * studentsWithSlots.length - (multiDiscount > 0 ? multiDiscount : 0);
    const splitSecond = 360 * studentsWithSlots.length - (multiDiscount > 0 ? multiDiscount : 0);
    const splitTotal = splitFirst + splitSecond;

    window.paymentAmounts = {
        full: fullTotal,
        splitFirst: splitFirst,
        splitSecond: splitSecond,
        splitTotal: splitTotal,
        students: studentsWithSlots
    };

    const allHaveSlots = cart.length > 0 && cart.every(item => item.timeSlot);
    if (allHaveSlots && selectedPaymentOption) {
        document.getElementById('proceed-to-payment-btn').disabled = false;
    }
}

function selectPaymentOption(option) {
    selectedPaymentOption = option;
    
    document.querySelectorAll('.payment-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    document.getElementById(`payment-${option}`).classList.add('selected');
    
    const allHaveSlots = cart.length > 0 && cart.every(item => item.timeSlot);
    document.getElementById('proceed-to-payment-btn').disabled = !allHaveSlots;
}

function showTimeSlotSelectionModal(studentIndex) {
    const student = cart[studentIndex].student;
    
    getTimeSlotAvailability().then(availability => {
        const modalHtml = `
            <div id="time-slot-selection-modal" class="modal">
                <div class="modal-content">
                    <h3 style="margin-bottom: 1rem;">Select Time Slot for ${student.first_name}</h3>
                    <p style="color: #6b7280; margin-bottom: 1.5rem;">Choose the most appropriate class time for ${student.first_name} (${student.grade})</p>
                    
                    <div style="display: flex; flex-direction: column; gap: 1rem;">
                        <button onclick="selectTimeSlotForStudent(${studentIndex}, '4:30-5:30pm')" 
                            class="btn ${isGradeAppropriate(student.grade, '4:30-5:30pm') ? 'btn-primary' : 'btn-outline'}" 
                            style="width: 100%; text-align: left; padding: 1rem;"
                            ${availability['4:30-5:30pm'] <= 0 ? 'disabled' : ''}>
                            <div>
                                <div style="font-weight: 600;">Tuesday 4:30-5:30 PM</div>
                                <div style="font-size: 0.875rem; color: #6b7280;">4th-7th Grade (Ages 9-13)</div>
                                <div style="font-size: 0.75rem; color: ${availability['4:30-5:30pm'] > 0 ? '#16a34a' : '#dc2626'};">
                                    ${availability['4:30-5:30pm']} spots remaining
                                </div>
                                ${!isGradeAppropriate(student.grade, '4:30-5:30pm') ? '<div style="font-size: 0.75rem; margin-top: 0.5rem; color: #dc2626;">⚠ Not typical for this grade</div>' : ''}
                            </div>
                        </button>
                        
                        <button onclick="selectTimeSlotForStudent(${studentIndex}, '5:30-6:30pm')" 
                            class="btn ${isGradeAppropriate(student.grade, '5:30-6:30pm') ? 'btn-primary' : 'btn-outline'}" 
                            style="width: 100%; text-align: left; padding: 1rem;"
                            ${availability['5:30-6:30pm'] <= 0 ? 'disabled' : ''}>
                            <div>
                                <div style="font-weight: 600;">Tuesday 5:30-6:30 PM</div>
                                <div style="font-size: 0.875rem; color: #6b7280;">8th-12th Grade (Ages 14-18)</div>
                                <div style="font-size: 0.75rem; color: ${availability['5:30-6:30pm'] > 0 ? '#16a34a' : '#dc2626'};">
                                    ${availability['5:30-6:30pm']} spots remaining
                                </div>
                                ${!isGradeAppropriate(student.grade, '5:30-6:30pm') ? '<div style="font-size: 0.75rem; margin-top: 0.5rem; color: #dc2626;">⚠ Not typical for this grade</div>' : ''}
                            </div>
                        </button>
                    </div>
                    
                    <div style="margin-top: 1.5rem; display: flex; justify-content: flex-end; gap: 0.5rem;">
                        <button class="btn btn-outline" onclick="closeTimeSlotSelectionModal()">Cancel</button>
                    </div>
                </div>
            </div>
        `;
        
        const container = document.createElement('div');
        container.innerHTML = modalHtml;
        document.body.appendChild(container);
    });
}

function closeTimeSlotSelectionModal() {
    const modal = document.getElementById('time-slot-selection-modal');
    if (modal) {
        modal.parentElement.remove();
    }
}

function selectTimeSlotForStudent(studentIndex, timeSlot) {
    if (studentIndex < 0 || studentIndex >= cart.length) return;
    
    const student = cart[studentIndex].student;
    
    if (isGradeAppropriate(student.grade, timeSlot)) {
        cart[studentIndex].timeSlot = timeSlot;
        cart[studentIndex].classSlotId = getSlotIdByLabel(timeSlot);  // ✅ store class_slots.id
        closeTimeSlotSelectionModal();
        renderCart();
        showMessage(`${student.first_name} assigned to ${timeSlot}`, 'success', 'cart');
    } else {
        pendingTimeSlotAssignment = { studentIndex, timeSlot };
        showGradeValidationModal(student, timeSlot);
    }
}

function showGradeValidationModal(student, timeSlot) {
    const timeSlotName = timeSlot === '4:30-5:30pm' ? '4:30-5:30 PM (4th-7th Grade)' : '5:30-6:30 PM (8th-12th Grade)';
    const recommendedSlot = getRecommendedTimeSlot(student.grade);
    const recommendedName = recommendedSlot === '4:30-5:30pm' ? '4:30-5:30 PM (4th-7th Grade)' : '5:30-6:30 PM (8th-12th Grade)';
    
    document.getElementById('grade-validation-content').innerHTML = `
        <div class="grade-warning">
            <h4 style="margin-bottom: 0.5rem;">⚠ Grade Level Notice</h4>
            <p style="margin-bottom: 1rem;">
                <strong>${student.first_name}</strong> is in <strong>${student.grade}</strong>. Please ensure you're comfortable before enrolling them in the <strong>${timeSlotName}</strong> class.
            </p>
            <p style="margin-bottom: 1rem;">
              Based on their grade, we typically recommend the <strong>${recommendedName}</strong> class.
            </p>
            <p style="margin: 0;">
                This is unusual but allowed. Students may benefit from different grade ranges. Would you like to continue with this assignment?
            </p>
        </div>
    `;
    
    document.getElementById('grade-validation-modal').classList.remove('hidden');
}

function confirmGradeAssignment() {
    if (pendingTimeSlotAssignment) {
        const { studentIndex, timeSlot } = pendingTimeSlotAssignment;
        cart[studentIndex].timeSlot = timeSlot;
        cart[studentIndex].classSlotId = getSlotIdByLabel(timeSlot);
        
        document.getElementById('grade-validation-modal').classList.add('hidden');
        renderCart();
        showMessage(`Assigned to ${timeSlot}`, 'success', 'cart');
        
        pendingTimeSlotAssignment = null;
    }
}

function cancelGradeAssignment() {
    document.getElementById('grade-validation-modal').classList.add('hidden');
    pendingTimeSlotAssignment = null;
}

// Availability (placeholder; replace with real availability if needed)
async function getTimeSlotAvailability() {
    // Demo: pretend both have 10 spots; only show "spots remaining" if < 3
    const counts = await countEnrollmentsBySlot();
    const base = 10;
    const remaining430 = Math.max(base - (counts['4:30-5:30pm'] || 0), 0);
    const remaining530 = Math.max(base - (counts['5:30-6:30pm'] || 0), 0);
    return {
        '4:30-5:30pm': remaining430,
        '5:30-6:30pm': remaining530
    };
}

async function countEnrollmentsBySlot() {
    try {
        const { data, error } = await supabase
            .from('enrollments')
            .select('time_slot')
        if (error) return {};
        const by = {};
        (data || []).forEach(r => {
            if (!r.time_slot) return;
            by[r.time_slot] = (by[r.time_slot] || 0) + 1;
        });
        return by;
    } catch {
        return {};
    }
}

// --- CHANGED: Proceed to payment via Supabase Edge Function ---
async function proceedToPayment() {
    if (!selectedPaymentOption) {
        showMessage('Please select a payment option', 'error', 'cart');
        return;
    }

    const btn = document.getElementById('proceed-to-payment-btn');
    btn.classList.add('loading');
    btn.disabled = true;

    try {
        showMessage('Creating secure payment session...', 'info', 'cart');

        // Ensure user is logged in
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('You must be logged in.');
        }

        // Build items array from cart (only students with a selected timeSlot)
        const items = cart
            .filter(item => item.timeSlot)
            .map(item => ({
                student_id: item.student.id,
                time_label: item.timeSlot,
                class_slot_id: item.classSlotId || null // if you store it when selecting a slot
            }));

        if (!items.length) {
            throw new Error('Please assign a class time to each student.');
        }

        // Decide how much is being paid now
        const amounts = window.paymentAmounts || {};
        const amountPaid =
            selectedPaymentOption === 'full'
                ? Number(amounts.full || 0)
                : Number(amounts.splitFirst || 0);

        const body = {
            parentId: user.id,
            paymentType: selectedPaymentOption, // 'full' | 'split' | 'deposit'
            amountPaid,
            items
        };

        // Call your Supabase Edge Function (create-checkout)
        const resp = await fetch('https://hucjmggkasahwpjgnwia.supabase.co/functions/v1/create-checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!resp.ok) {
            const txt = await resp.text();
            throw new Error(`Failed to create payment session: ${txt}`);
        }

        const { url } = await resp.json();
        window.location.href = url; // Redirect to Stripe Checkout
    } catch (error) {
        console.error('Payment error:', error);
        showMessage('Payment setup failed. Please try again or contact support.', 'error', 'cart');
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

// Portal rendering (orders, history, etc.)
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

        const ordersList = document.getElementById('orders-list');
        if (!orders || orders.length === 0) {
            ordersList.innerHTML = `<div class="empty-state">
                <h3>No orders yet</h3>
                <p>Enroll students to see your orders here.</p>
            </div>`;
            return;
        }

        ordersList.innerHTML = orders.map(order => `
        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                <div>
                    <h3 style="margin: 0; font-size: 1.25rem;">Order #${order.order_number}</h3>
                    <p style="color: #6b7280; margin: 0.25rem 0;">Placed ${new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <span class="badge" style="background: #dcfce7; color: #166534; padding: 0.25rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600;">
                    ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
            </div>
            
            <div style="background: #f9fafb; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem;">
                <h4 style="margin: 0 0 0.5rem 0;">Enrolled Students:</h4>
                ${order.order_items.map(item => `
                    <div style="margin-bottom: 0.5rem;">
                        <strong>${item.students.first_name} ${item.students.last_name}</strong> - Tuesday ${item.time_slot}
                    </div>
                `).join('')}
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.875rem;">
                <div>
                    <strong>Total Amount:</strong> ${order.total_amount}
                </div>
                <div>
                    <strong>Amount Paid:</strong> ${order.amount_paid}
                </div>
                ${order.balance_due > 0 ? `
                <div>
                    <strong>Balance Due:</strong> ${order.balance_due}
                </div>` : ''}
            </div>
        </div>
        `).join('');

    } catch (error) {
        console.error('Portal render error:', error);
        showMessage('Could not load orders. Please refresh.', 'error');
    }
}

// Simple helpers
function isGradeAppropriate(grade, timeSlot) {
    // Example logic
    const early = ['4th', '5th', '6th', '7th'];
    const late = ['8th', '9th', '10th', '11th', '12th'];
    if (timeSlot === '4:30-5:30pm') return early.includes(grade);
    if (timeSlot === '5:30-6:30pm') return late.includes(grade);
    return true;
}

function getRecommendedTimeSlot(grade) {
    const early = ['4th', '5th', '6th', '7th'];
    return early.includes(grade) ? '4:30-5:30pm' : '5:30-6:30pm';
}

function showMessage(message, type = 'info', area = 'global') {
    const messageArea = document.getElementById(`${area}-message`) || document.getElementById('global-message');
    if (!messageArea) return;
    messageArea.innerHTML = `<div class="message ${type}">${message}</div>`;
    
    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            messageArea.innerHTML = '';
        }, 5000);
    }
}

function logout() {
    supabase.auth.signOut().then(() => {
        window.location.href = 'index.html';
    });
}
