// Configuration
const SUPABASE_URL = 'https://hucjmggkasahwpjgnwia.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1Y2ptZ2drYXNhaHdwamdud2lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2MTI2MDIsImV4cCI6MjA3MDE4ODYwMn0.hxFmoZexaKverih9crJfP9fjWItOTfC_6D_CM7hr_Rg';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global variables
let currentUser = null;
let students = [];
let cart = [];
let selectedPaymentOption = null;
let pendingTimeSlotAssignment = null;

// ============================================
// EMAIL SENDING FUNCTION
// ============================================
async function sendConfirmationEmail(type, recipientEmail, data) {
  try {
    const response = await fetch('/.netlify/functions/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: type,
        recipientEmail: recipientEmail,
        data: data
      })
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('Failed to send email:', result);
      // Don't block the user flow if email fails
      // Just log the error
    } else {
      console.log('Email sent successfully:', result.messageId);
    }
  } catch (error) {
    console.error('Error sending email:', error);
    // Don't block the user flow if email fails
  }
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
        console.log('Step 2: Session result:', session ? 'Found' : 'Not found');
        
        if (!session) {
            console.log('Step 3: No session, redirecting...');
            window.location.href = 'login.html';
            return;
        }

        console.log('Step 4: Setting current user...');
        currentUser = session.user;
        
        console.log('Step 5: Hiding auth check spinner...');
        document.getElementById('auth-check').classList.add('hidden');
        
        console.log('Step 6: Showing main app...');
        document.getElementById('main-app').classList.remove('hidden');
        
        console.log('Step 7: Loading students...');
        await loadStudents();
        
        console.log('Step 8: Updating cart count...');
        updateCartCount();
        
        console.log('=== AUTH CHECK COMPLETE ===');
        
    } catch (error) {
        console.error('=== AUTH CHECK ERROR ===', error);
        window.location.href = 'login.html';
    }
}

// Get real-time availability
async function getTimeSlotAvailability() {
    try {
        /**
         * Fetch all current enrollments along with their associated class slot times.
         * We join against class_slots to convert the database time values into the
         * human–readable labels used throughout the UI. The enrollments table is
         * authoritative for seat occupancy — order_items only records what was
         * purchased, not whether a student is actually in a class.
         */
        const { data, error } = await supabase
            .from('enrollments')
            .select(
                `id, class_slot_id, class_slots ( day_of_week, start_time, end_time, max_students )`
            );
        if (error) throw error;

        // Prepare counts keyed by our two known time labels.
        const slotCounts = {
            '4:30-5:30pm': 0,
            '5:30-6:30pm': 0
        };

        // Helper to convert a 24h time string into our am/pm label pair.
        function toLabel(start, end) {
            const to12 = (t) => {
                const parts = t.split(':').map((v) => Number(v));
                const hh = parts[0];
                const mm = parts[1];
                const h12 = ((hh + 11) % 12) + 1;
                const suffix = hh >= 12 ? 'pm' : 'am';
                return `${h12}:${String(mm).padStart(2, '0')}${suffix}`;
            };
            return `${to12(start)}-${to12(end)}`;
        }

        // Count seats per time slot by iterating through all enrollments.
        if (Array.isArray(data)) {
            data.forEach((row) => {
                const slot = row.class_slots;
                if (!slot) return;
                if (slot.day_of_week !== 'Tuesday') return;
                const start = String(slot.start_time).substring(0, 5);
                const end = String(slot.end_time).substring(0, 5);
                const label = toLabel(start, end);
                if (label in slotCounts) {
                    slotCounts[label] = (slotCounts[label] || 0) + 1;
                }
            });
        }

        // Each class holds 10 seats unless specified otherwise on the slot.
        // Compute available seats by subtracting counts from capacity.
        const availability = {
            '4:30-5:30pm': 10 - (slotCounts['4:30-5:30pm'] || 0),
            '5:30-6:30pm': 10 - (slotCounts['5:30-6:30pm'] || 0)
        };

        return availability;
    } catch (error) {
        console.error('Error getting availability:', error);
        // Fallback to assuming all seats are available
        return {
            '4:30-5:30pm': 10,
            '5:30-6:30pm': 10
        };
    }
}

// Navigation
function showSection(section, event) {
  if (event) event.preventDefault();

  // Hide all sections
  document.getElementById('students-section').classList.remove('active');
  document.getElementById('cart-section').classList.remove('active');

  // Remove active from all nav links
  document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));

  // Show selected section
  document.getElementById(`${section}-section`).classList.add('active');

  // Add active to clicked nav link
  if (event && event.target) event.target.classList.add('active');

  // Update progress steps
  updateProgressSteps(section);

  // 📹 Render section contents
  if (section === 'cart') {
    renderCart();       // ensures students + class tiles appear
  } else if (section === 'students') {
    renderStudents();   // refreshes the grid, "In Cart" badges, etc.
  }
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
    
    const addCard = grid.querySelector('.add-student-card');
    grid.innerHTML = '';
    
    students.forEach(student => {
        const studentCard = document.createElement('div');
        studentCard.className = 'student-card';
        
        const inCart = cart.some(item => item.student.id === student.id);
        
        studentCard.innerHTML = `
            <div class="student-card-header">
                <h3 style="font-weight: 700; margin: 0;">${student.first_name} ${student.last_name}</h3>
                <button onclick="removeStudent('${student.id}')" class="remove-student-btn" title="Remove student">×</button>
            </div>
            <p style="margin-bottom: 0.5rem;"><strong>Age:</strong> ${student.age} • <strong>Grade:</strong> ${student.grade}</p>
            <p style="margin-bottom: 1rem;"><strong>Experience:</strong> ${student.experience_level}</p>
            ${student.special_considerations ? `<p style="font-size: 0.875rem; color: #6b7280; margin-bottom: 1rem;"><strong>Notes:</strong> ${student.special_considerations}</p>` : ''}
            
            <div style="margin-top: auto;">
                ${inCart ? 
                    '<button class="btn btn-success" style="width: 100%;" disabled>✓ In Cart</button>' :
                    `<button onclick="addToCart('${student.id}')" class="btn btn-outline" style="width: 100%;">Add to Cart</button>`
                }
            </div>
        `;
        
        grid.appendChild(studentCard);
    });

    grid.appendChild(addCard);
}

function showAddStudentForm() {
    document.getElementById('add-student-modal').classList.remove('hidden');
}

function hideAddStudentForm() {
    document.getElementById('add-student-modal').classList.add('hidden');
    document.getElementById('add-student-form').reset();
}

async function removeStudent(studentId) {
    if (!confirm('Are you sure you want to remove this student?')) return;

    try {
        const { data, error } = await supabase
            .from('students')
            .delete()
            .eq('id', String(studentId))
            .eq('parent_id', currentUser.id)
            .select();

        if (error) throw error;
        if (!data || data.length === 0) throw new Error('No matching student deleted.');

        cart = cart.filter(item => String(item.student.id) !== String(studentId));
        updateCartCount();

        await loadStudents();
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
                        experience_level: formData.get('experienceLevel'),
                        special_considerations: formData.get('specialConsiderations') || null
                    }]);

                if (error) throw error;

                hideAddStudentForm();
                await loadStudents();
                showMessage(`${formData.get('firstName')} added successfully!`, 'success');
                
            } catch (error) {
                console.error('Error adding student:', error);
                showMessage('Error adding student. Please try again.', 'error');
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

function updateCartCount() {
    const countElement = document.getElementById('cart-count');
    if (cart.length > 0) {
        countElement.textContent = `(${cart.length})`;
        countElement.classList.remove('hidden');
    } else {
        countElement.classList.add('hidden');
    }
    updateProceedButton();
}

function updateProceedButton() {
    const btn = document.getElementById('proceed-to-cart-btn');
    btn.disabled = cart.length === 0;
}

function proceedToCart() {
  if (cart.length === 0) {
    showMessage('Add at least one student to continue', 'error');
    return;
  }
  showSection('cart');
  renderCart(); // harmless if already called by showSection
}

// Cart rendering
async function renderCart() {
    const cartItems = document.getElementById('cart-items');
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<p style="color: #6b7280; font-style: italic;">No students in cart yet. Add students from the previous step.</p>';
        document.getElementById('cart-summary').classList.add('hidden');
        return;
    }

    const availability = await getTimeSlotAvailability();

    // Build a small availability display. Only show remaining spots when under 3 seats remain.
    const availabilityHtml = `
        <div style="background: #f0f9ff; padding: 1rem; border-radius: 0.5rem; border: 2px solid #0ea5e9;">
            <div style="font-weight: 700; color: #0ea5e9; font-size: 1.125rem; margin-bottom: 0.5rem;">Tuesday 4:30 - 5:30 PM</div>
            <div style="font-size: 0.875rem; color: #0369a1; margin-bottom: 0.25rem;">4th - 7th Grade (Ages 9-13)</div>
            ${
                availability['4:30-5:30pm'] < 3
                    ? `<div style="font-size: 0.75rem; color: ${
                        availability['4:30-5:30pm'] > 0 ? '#16a34a' : '#dc2626'
                    };"><span>${availability['4:30-5:30pm']} spot${availability['4:30-5:30pm'] === 1 ? '' : 's'} remaining</span></div>`
                    : ''
            }
        </div>
        <div style="background: #f0f9ff; padding: 1rem; border-radius: 0.5rem; border: 2px solid #0ea5e9;">
            <div style="font-weight: 700; color: #0ea5e9; font-size: 1.125rem; margin-bottom: 0.5rem;">Tuesday 5:30 - 6:30 PM</div>
            <div style="font-size: 0.875rem; color: #0369a1; margin-bottom: 0.25rem;">8th - 12th Grade (Ages 14-18)</div>
            ${
                availability['5:30-6:30pm'] < 3
                    ? `<div style="font-size: 0.75rem; color: ${
                        availability['5:30-6:30pm'] > 0 ? '#16a34a' : '#dc2626'
                    };"><span>${availability['5:30-6:30pm']} spot${availability['5:30-6:30pm'] === 1 ? '' : 's'} remaining</span></div>`
                    : ''
            }
        </div>
    `;
    document.getElementById('time-slot-availability').innerHTML = availabilityHtml;

    cartItems.innerHTML = cart.map((item, index) => `
        <div class="cart-item">
            <div>
                <div style="font-weight: 600; font-size: 1.125rem;">${item.student.first_name} ${item.student.last_name}</div>
                <div style="font-size: 0.875rem; color: #6b7280;">
                    Age ${item.student.age} • ${item.student.grade} • ${item.student.experience_level} experience
                </div>
                <div style="font-size: 0.875rem; margin-top: 0.5rem;">
                    ${item.timeSlot ? 
                        `<span style="color: #16a34a; font-weight: 600;">✓ Tuesday ${item.timeSlot}</span>` : 
                        '<span style="color: #ea580c;">⚠ Click "Assign Time" to select class</span>'
                    }
                </div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                ${!item.timeSlot ? 
                    `<button onclick="assignTimeSlot(${index})" class="btn btn-primary" style="font-size: 0.75rem;">Assign Time</button>` : 
                    `<button onclick="clearTimeSlot(${index})" class="btn btn-secondary" style="font-size: 0.75rem;">Change Time</button>`
                }
                <button onclick="removeFromCart(${index})" class="btn btn-danger">Remove</button>
            </div>
        </div>
    `).join('');

    updateCartSummary();
}

function removeFromCart(index) {
    const student = cart[index].student;
    cart.splice(index, 1);
    updateCartCount();
    renderCart();
    renderStudents();
    showMessage(`${student.first_name} removed from cart`, 'info', 'cart');
}

function clearTimeSlot(index) {
    cart[index].timeSlot = null;
    renderCart();
}

// Grade checking helper functions
function getGradeLevel(grade) {
    const gradeMap = {
        '4th': 4, '5th': 5, '6th': 6, '7th': 7,
        '8th': 8, '9th': 9, '10th': 10, '11th': 11, '12th': 12
    };
    return gradeMap[grade] || 0;
}

function isGradeAppropriate(grade, timeSlot) {
    const gradeLevel = getGradeLevel(grade);
    if (timeSlot === '4:30-5:30pm') {
        return gradeLevel >= 4 && gradeLevel <= 7;
    } else if (timeSlot === '5:30-6:30pm') {
        return gradeLevel >= 8 && gradeLevel <= 12;
    }
    return false;
}

function getRecommendedTimeSlot(grade) {
    const gradeLevel = getGradeLevel(grade);
    if (gradeLevel >= 4 && gradeLevel <= 7) {
        return '4:30-5:30pm';
    } else if (gradeLevel >= 8 && gradeLevel <= 12) {
        return '5:30-6:30pm';
    }
    return null;
}

// Time slot assignment
function assignTimeSlot(studentIndex) {
    if (studentIndex < 0 || studentIndex >= cart.length) return;
    
    const student = cart[studentIndex].student;
    const recommendedSlot = getRecommendedTimeSlot(student.grade);
    
    if (recommendedSlot) {
        cart[studentIndex].timeSlot = recommendedSlot;
        renderCart();
        showMessage(`${student.first_name} assigned to recommended time slot`, 'success', 'cart');
    } else {
        showTimeSlotSelectionModal(studentIndex);
    }
}

function showTimeSlotSelectionModal(studentIndex) {
    const student = cart[studentIndex].student;
    
    getTimeSlotAvailability().then(availability => {
        const modalHtml = `
            <div id="time-slot-selection-modal" class="modal">
                <div class="modal-content">
                    <h3 style="margin-bottom: 1rem;">Select Time Slot for ${student.first_name}</h3>
                    <p style="color: #6b7280; margin-bottom: 1.5rem;">Choose the appropriate class time for ${student.first_name} (${student.grade})</p>
                    
                    <div style="display: flex; flex-direction: column; gap: 1rem;">
                        <button onclick="selectTimeSlotForStudent(${studentIndex}, '4:30-5:30pm')" 
                            class="btn ${isGradeAppropriate(student.grade, '4:30-5:30pm') ? 'btn-primary' : 'btn-outline'}" 
                            style="width: 100%; text-align: left; padding: 1rem;"
                            ${availability['4:30-5:30pm'] <= 0 ? 'disabled' : ''}>
                            <div>
                                <div style="font-weight: 600;">Tuesday 4:30-5:30 PM</div>
                                <div style="font-size: 0.875rem; color: #6b7280;">4th-7th Grade (Ages 9-13)</div>
                                ${
                                    availability['4:30-5:30pm'] < 3
                                        ? `<div style="font-size: 0.75rem; color: ${
                                            availability['4:30-5:30pm'] > 0 ? '#16a34a' : '#dc2626'
                                        };"><span>${availability['4:30-5:30pm']} spot${availability['4:30-5:30pm'] === 1 ? '' : 's'} left</span></div>`
                                        : ''
                                }
                                ${!isGradeAppropriate(student.grade, '4:30-5:30pm') ? '<div style="font-size: 0.75rem; color: #dc2626;">⚠ Not typical for this grade</div>' : ''}
                            </div>
                        </button>
                        
                        <button onclick="selectTimeSlotForStudent(${studentIndex}, '5:30-6:30pm')" 
                            class="btn ${isGradeAppropriate(student.grade, '5:30-6:30pm') ? 'btn-primary' : 'btn-outline'}" 
                            style="width: 100%; text-align: left; padding: 1rem;"
                            ${availability['5:30-6:30pm'] <= 0 ? 'disabled' : ''}>
                            <div>
                                <div style="font-weight: 600;">Tuesday 5:30-6:30 PM</div>
                                <div style="font-size: 0.875rem; color: #6b7280;">8th-12th Grade (Ages 14-18)</div>
                                ${
                                    availability['5:30-6:30pm'] < 3
                                        ? `<div style="font-size: 0.75rem; color: ${
                                            availability['5:30-6:30pm'] > 0 ? '#16a34a' : '#dc2626'
                                        };"><span>${availability['5:30-6:30pm']} spot${availability['5:30-6:30pm'] === 1 ? '' : 's'} left</span></div>`
                                        : ''
                                }
                                ${!isGradeAppropriate(student.grade, '5:30-6:30pm') ? '<div style="font-size: 0.75rem; color: #dc2626;">⚠ Not typical for this grade</div>' : ''}
                            </div>
                        </button>
                    </div>
                    
                    <button onclick="closeTimeSlotSelectionModal()" class="btn btn-secondary" style="width: 100%; margin-top: 1rem;">Cancel</button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    });
}

function selectTimeSlotForStudent(studentIndex, timeSlot) {
    if (studentIndex < 0 || studentIndex >= cart.length) return;
    
    const student = cart[studentIndex].student;
    
    if (isGradeAppropriate(student.grade, timeSlot)) {
        cart[studentIndex].timeSlot = timeSlot;
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
                <strong>${student.first_name}</strong> is in <strong>${student.grade}</strong> but you're enrolling them in the <strong>${timeSlotName}</strong> class.
            </p>
            <p style="margin-bottom: 1rem;">
                Based on their grade, we typically recommend the <strong>${recommendedName}</strong> class.
            </p>
            <p style="margin: 0;">
                This is unusual but allowed. Students may benefit from being with peers in different grade ranges. Would you like to continue with this assignment?
            </p>
        </div>
    `;
    
    document.getElementById('grade-validation-modal').classList.remove('hidden');
}

function confirmGradeAssignment() {
    if (pendingTimeSlotAssignment) {
        const { studentIndex, timeSlot } = pendingTimeSlotAssignment;
        cart[studentIndex].timeSlot = timeSlot;
        
        document.getElementById('grade-validation-modal').classList.add('hidden');
        closeTimeSlotSelectionModal();
        renderCart();
        
        const student = cart[studentIndex].student;
        showMessage(`${student.first_name} assigned to ${timeSlot} (grade override)`, 'success', 'cart');
        
        pendingTimeSlotAssignment = null;
    }
}

function cancelGradeAssignment() {
    document.getElementById('grade-validation-modal').classList.add('hidden');
    pendingTimeSlotAssignment = null;
}

function closeTimeSlotSelectionModal() {
    const modal = document.getElementById('time-slot-selection-modal');
    if (modal) modal.remove();
}

// Cart summary and payment
function updateCartSummary() {
    const studentsWithSlots = cart.filter(item => item.timeSlot);
    
    if (studentsWithSlots.length === 0) {
        document.getElementById('cart-summary').classList.add('hidden');
        return;
    }

    document.getElementById('cart-summary').classList.remove('hidden');
    
    const splitPrice = 720;
    const fullPrice = 700;
    const multiChildDiscount = studentsWithSlots.length > 1 ? 50 : 0;
    
    const splitTotal = (studentsWithSlots.length * splitPrice) - multiChildDiscount;
    const fullTotal = (studentsWithSlots.length * fullPrice) - multiChildDiscount;
    
    const splitFirst = 360 * studentsWithSlots.length - (multiChildDiscount > 0 ? 25 : 0);
    const splitSecond = splitTotal - splitFirst;
    
    document.getElementById('pricing-breakdown').innerHTML = `
        <div class="price-row">
            <span>${studentsWithSlots.length} student${studentsWithSlots.length > 1 ? 's' : ''}</span>
            <span>$${studentsWithSlots.length * splitPrice}</span>
        </div>
        ${multiChildDiscount > 0 ? `
        <div class="price-row">
            <span>Multi-child discount</span>
            <span style="color: #16a34a;">-$${multiChildDiscount}</span>
        </div>
        ` : ''}
    `;

    document.getElementById('full-amount').textContent = `$${fullTotal}`;
    document.getElementById('split-amount').textContent = `$${splitFirst}`;
    
    const savings = splitTotal - fullTotal;
    document.querySelector('#payment-full .payment-description').innerHTML = 
        `Complete payment today<br><span style="color: #16a34a; font-weight: 600;">Save $${savings}!</span>`;
    document.querySelector('#payment-split .payment-description').innerHTML = 
        `$${splitFirst} today<br>$${splitSecond} due Oct 15th`;

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
        
        const enrollmentData = {
            paymentType: selectedPaymentOption,
            students: cart.filter(item => item.timeSlot),
            amounts: {
                total: selectedPaymentOption === 'full' ? 
                    window.paymentAmounts.full : 
                    window.paymentAmounts.splitTotal,
                paid: selectedPaymentOption === 'full' ? 
                    window.paymentAmounts.full : 
                    window.paymentAmounts.splitFirst,
                balance: selectedPaymentOption === 'split' ? 
                    window.paymentAmounts.splitSecond : 0
            }
        };
        
        localStorage.setItem('pendingEnrollment', JSON.stringify(enrollmentData));
        
        const paymentData = {
            paymentType: selectedPaymentOption,
            students: cart.filter(item => item.timeSlot),
            amounts: window.paymentAmounts,
            customerEmail: currentUser.email
        };

        const response = await fetch('/.netlify/functions/create-checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(paymentData)
        });

        if (!response.ok) {
            throw new Error('Failed to create payment session');
        }

        const { url } = await response.json();
        
        // SEND ENROLLMENT STARTED EMAIL (Optional)
        // You could send an email here notifying that enrollment has started
        // but it's better to wait until payment is confirmed
        
        window.location.href = url;
        
    } catch (error) {
        console.error('Payment error:', error);
        showMessage('Payment setup failed. Please try again or contact support.', 'error', 'cart');
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

// Orders
async function loadOrders() {
    try {
        const { data: orders, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    *,
                    students (*)
                ),
                payments (*)
            `)
            .eq('parent_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        renderOrders(orders || []);
        
    } catch (error) {
        console.error('Error loading orders:', error);
        showMessage('Error loading orders', 'error', 'orders');
    }
}

function renderOrders(orders) {
    const ordersList = document.getElementById('orders-list');
    
    if (orders.length === 0) {
        ordersList.innerHTML = `
            <div class="card">
                <p style="color: #6b7280; font-style: italic; text-align: center;">No orders yet. Complete your enrollment to see confirmations here.</p>
            </div>
        `;
        return;
    }

    ordersList.innerHTML = orders.map(order => `
        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                <div>
                    <h3 style="margin: 0; font-size: 1.25rem;">Order #${order.order_number}</h3>
                    <p style="color: #6b7280; margin: 0.25rem 0;">Placed ${new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <span class="badge" style="background: #dcfce7; color: #15803d; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600;">
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
                </div>
                <div>
                    <strong>Due Date:</strong> ${new Date(order.second_payment_due).toLocaleDateString()}
                </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Utility functions
function showMessage(message, type, section = 'students') {
    const messageArea = document.getElementById(`${section === 'students' ? 'message' : section + '-message'}-area`);
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
