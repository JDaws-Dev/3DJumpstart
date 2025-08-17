// portal-new.js
// Unified Portal Implementation - Combines all functionality

// Configuration
const SUPABASE_URL = 'https://hucjmggkasahwpjgnwia.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1Y2ptZ2drYXNhaHdwamdud2lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2MTI2MDIsImV4cCI6MjA3MDE4ODYwMn0.hxFmoZexaKverih9crJfP9fjWItOTfC_6D_CM7hr_Rg';

// Feature flags
const FEATURES = {
    unifiedEnrollment: true,
    showWelcomeBanner: true,
    multiChildDiscount: true,
    emailNotifications: true
};

class UnifiedPortal {
    constructor() {
        this.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        this.currentUser = null;
        this.parentData = null;
        this.students = [];
        this.enrollments = [];
        this.orders = [];
        this.isNewUser = false;
        this.currentTab = 'students';
        
        // Enrollment wizard state
        this.wizard = {
            active: false,
            step: 1,
            maxSteps: 3,
            mode: 'new', // 'new' or 'existing'
            studentData: {},
            studentId: null,
            classSelection: null,
            paymentType: 'full',
            availableSlots: {}
        };
        
        // Bind methods
        this.init = this.init.bind(this);
        this.render = this.render.bind(this);
    }

    async init() {
        try {
            // Check authentication
            const { data: { session } } = await this.supabase.auth.getSession();
            if (!session) {
                window.location.href = 'login.html';
                return;
            }
            
            this.currentUser = session.user;
            
            // Load all user data
            await this.loadUserData();
            
            // Check URL parameters for redirects
            this.handleUrlParams();
            
            // Initial render
            this.render();
            
            // Set up auth state listener
            this.supabase.auth.onAuthStateChange((event, session) => {
                if (event === 'SIGNED_OUT') {
                    window.location.href = 'login.html';
                }
            });
            
        } catch (error) {
            console.error('Initialization error:', error);
            this.showMessage('Error loading portal. Please refresh the page.', 'error');
        }
    }

    async loadUserData() {
        try {
            // Get parent info
            const { data: parent, error: parentError } = await this.supabase
                .from('parents')
                .select('*')
                .eq('id', this.currentUser.id)
                .single();
            
            if (parentError && parentError.code !== 'PGRST116') {
                throw parentError;
            }
            
            this.parentData = parent || {
                id: this.currentUser.id,
                email: this.currentUser.email,
                name: 'Parent'
            };
            
            // Get students with enrollments
            const { data: studentsList } = await this.supabase
                .from('students')
                .select(`
                    *,
                    enrollments (
                        *,
                        class_slots (
                            day_of_week,
                            start_time,
                            end_time,
                            age_group
                        )
                    )
                `)
                .eq('parent_id', this.currentUser.id)
                .order('created_at', { ascending: false });
            
            this.students = studentsList || [];
            this.isNewUser = this.students.length === 0;
            
            // Get orders
            const { data: ordersList } = await this.supabase
                .from('orders')
                .select(`
                    *,
                    order_items (
                        *,
                        students (first_name, last_name)
                    )
                `)
                .eq('parent_id', this.currentUser.id)
                .order('created_at', { ascending: false });
            
            this.orders = ordersList || [];
            
            // Check class availability
            await this.checkAllSlotsAvailability();
            
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    async checkAllSlotsAvailability() {
        const slots = [
            { time: '4:30-5:30pm', start: '16:30:00', end: '17:30:00' },
            { time: '5:30-6:30pm', start: '17:30:00', end: '18:30:00' }
        ];
        
        for (const slot of slots) {
            try {
                const { data } = await this.supabase
                    .rpc('get_availability_for_slot', {
                        day: 'Tuesday',
                        start: slot.start,
                        end: slot.end
                    });
                
                this.wizard.availableSlots[slot.time] = data?.[0]?.available_spots || 10;
            } catch (error) {
                this.wizard.availableSlots[slot.time] = 10; // Default
            }
        }
    }

    handleUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        
        // Check if redirected from app.html
        if (urlParams.get('redirected') === 'true') {
            this.showMessage('Welcome to your new dashboard! Everything is now in one place.', 'info');
        }
        
        // Check if coming from registration
        if (urlParams.get('new') === 'true' && this.isNewUser) {
            // Auto-start enrollment for new users
            setTimeout(() => this.startEnrollmentWizard(), 500);
        }
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    render() {
        // Clear and rebuild entire UI
        document.body.innerHTML = `
            <!-- Header -->
            <header class="portal-header">
                <div class="container">
                    <div class="header-content">
                        <a href="index.html" class="logo">
                            <img src="https://raw.githubusercontent.com/JDaws-Dev/3DJumpstart/main/3d-jumpstart-logo.png" 
                                 alt="3D Jumpstart" class="logo-image">
                        </a>
                        <nav>
                            <div style="display: flex; align-items: center; gap: 1rem;">
                                <span style="color: #6b7280;">Welcome, ${this.parentData?.name || 'Parent'}!</span>
                                <button onclick="portal.logout()" class="btn btn-secondary">Logout</button>
                            </div>
                        </nav>
                    </div>
                </div>
            </header>

            <div class="container">
                <!-- Tab Navigation -->
                <div class="portal-tabs">
                    <button class="tab-button ${this.currentTab === 'students' ? 'active' : ''}" 
                            onclick="portal.switchTab('students')">
                        <span>👥</span> Your Students
                    </button>
                    <button class="tab-button ${this.currentTab === 'schedule' ? 'active' : ''}" 
                            onclick="portal.switchTab('schedule')">
                        <span>📅</span> Schedule
                    </button>
                    <button class="tab-button ${this.currentTab === 'orders' ? 'active' : ''}" 
                            onclick="portal.switchTab('orders')">
                        <span>📦</span> Orders
                    </button>
                    <button class="tab-button ${this.currentTab === 'account' ? 'active' : ''}" 
                            onclick="portal.switchTab('account')">
                        <span>⚙️</span> Account
                    </button>
                </div>

                <!-- Message Area -->
                <div id="message-area"></div>

                <!-- Tab Content -->
                <div id="tab-content">
                    ${this.renderTabContent()}
                </div>
            </div>
        `;
        
        // Reattach any event listeners if needed
        this.attachEventListeners();
    }

    renderTabContent() {
        switch(this.currentTab) {
            case 'students':
                return this.renderStudentsTab();
            case 'schedule':
                return this.renderScheduleTab();
            case 'orders':
                return this.renderOrdersTab();
            case 'account':
                return this.renderAccountTab();
            default:
                return this.renderStudentsTab();
        }
    }

    renderStudentsTab() {
        if (this.wizard.active) {
            return this.renderEnrollmentWizard();
        }
        
        if (this.isNewUser) {
            return `
                <!-- Welcome Banner for New Users -->
                ${FEATURES.showWelcomeBanner ? `
                <div class="welcome-banner">
                    <h1 class="welcome-title">Welcome to 3D Jumpstart! 🎉</h1>
                    <p class="welcome-text">Let's get started by adding your first student</p>
                </div>
                ` : ''}

                <!-- Hero Empty State -->
                <div class="empty-state-hero">
                    <div class="hero-icon">🚀</div>
                    <h2 class="hero-title">Ready to Start Your 3D Journey?</h2>
                    <p class="hero-subtitle">
                        Add your child to begin enrollment in our professional 3D design program. 
                        They'll learn Fusion360, create amazing projects, and build skills that last a lifetime!
                    </p>
                    
                    <button onclick="portal.startEnrollmentWizard()" class="btn-hero">
                        <span style="font-size: 1.5rem; margin-right: 0.5rem;">➕</span>
                        Add Your First Student
                    </button>
                    
                    <div class="quick-start">
                        <div class="step-card">
                            <div class="step-number">1</div>
                            <h3 class="step-title">Add Student</h3>
                            <p class="step-description">Tell us about your child</p>
                        </div>
                        <div class="step-card">
                            <div class="step-number">2</div>
                            <h3 class="step-title">Choose Class</h3>
                            <p class="step-description">Pick the perfect time</p>
                        </div>
                        <div class="step-card">
                            <div class="step-number">3</div>
                            <h3 class="step-title">Enroll</h3>
                            <p class="step-description">Secure their spot</p>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Existing users see their students
        return `
            <div class="students-section">
                <h2 style="font-size: 2rem; font-weight: 700; margin-bottom: 0.5rem;">Your Students</h2>
                <p style="color: #6b7280; margin-bottom: 2rem;">Manage your children and their enrollments</p>
                
                <div class="students-grid">
                    ${this.students.map(student => this.renderStudentCard(student)).join('')}
                    
                    <!-- Add Student Card -->
                    <div class="add-student-card" onclick="portal.startEnrollmentWizard()">
                        <div style="position: relative; z-index: 1;">
                            <div style="font-size: 3rem; margin-bottom: 1rem;">➕</div>
                            <h3 style="font-weight: 700; color: #7c2d12;">Add Another Student</h3>
                            <p style="color: #92400e;">Click to add another child</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderStudentCard(student) {
        const enrollment = student.enrollments?.find(e => e.status === 'enrolled');
        const hasEnrollment = !!enrollment;
        
        return `
            <div class="student-card">
                <div class="student-header">
                    <h3 class="student-name">${student.first_name} ${student.last_name}</h3>
                    <button onclick="portal.editStudent('${student.id}')" class="btn-icon">✏️</button>
                </div>
                
                <div class="student-details">
                    <div class="detail-row">
                        <span>Age:</span>
                        <strong>${student.age}</strong>
                    </div>
                    <div class="detail-row">
                        <span>Grade:</span>
                        <strong>${student.grade}</strong>
                    </div>
                    <div class="detail-row">
                        <span>Experience:</span>
                        <strong>${student.experience_level || 'Beginner'}</strong>
                    </div>
                </div>
                
                ${hasEnrollment ? `
                    <div class="enrollment-status status-enrolled">
                        ✓ Enrolled in Level 1
                        <br><small>Tuesday ${this.formatTime(enrollment.class_slots.start_time)}</small>
                    </div>
                    <button class="btn btn-outline" disabled style="width: 100%;">
                        Ready for Level 2 (Coming Soon)
                    </button>
                ` : `
                    <div class="enrollment-status status-not-enrolled">
                        Not currently enrolled
                    </div>
                    <button onclick="portal.enrollStudent('${student.id}')" class="btn btn-primary" style="width: 100%;">
                        Enroll in Level 1
                    </button>
                `}
            </div>
        `;
    }

    renderEnrollmentWizard() {
        return `
            <div class="enrollment-wizard">
                <div class="wizard-header">
                    <h2 class="wizard-title">${this.getWizardTitle()}</h2>
                    <p class="wizard-subtitle">${this.getWizardSubtitle()}</p>
                    <button onclick="portal.cancelEnrollment()" class="close-wizard">×</button>
                </div>
                
                <!-- Progress Dots -->
                <div class="progress-dots">
                    ${Array.from({length: this.wizard.maxSteps}, (_, i) => {
                        const step = i + 1;
                        const isActive = step === this.wizard.step;
                        const isCompleted = step < this.wizard.step;
                        return `<div class="progress-dot ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}"></div>`;
                    }).join('')}
                </div>
                
                <!-- Wizard Content -->
                <div class="wizard-content">
                    ${this.renderWizardStep()}
                </div>
            </div>
        `;
    }

    renderWizardStep() {
        switch(this.wizard.step) {
            case 1:
                return this.renderStudentForm();
            case 2:
                return this.renderClassSelection();
            case 3:
                return this.renderPaymentReview();
            default:
                return '';
        }
    }

    renderStudentForm() {
        const isExisting = this.wizard.mode === 'existing';
        const data = this.wizard.studentData;
        
        if (isExisting) {
            return `
                <div class="student-confirm">
                    <h3>Enrolling Student</h3>
                    <div class="student-info-card">
                        <h4>${data.firstName} ${data.lastName}</h4>
                        <p>Grade ${data.grade} • Age ${data.age}</p>
                    </div>
                    <div class="wizard-actions">
                        <button onclick="portal.cancelEnrollment()" class="btn btn-secondary">Cancel</button>
                        <button onclick="portal.nextWizardStep()" class="btn btn-primary">
                            Continue to Class Selection →
                        </button>
                    </div>
                </div>
            `;
        }
        
        return `
            <form class="wizard-form" onsubmit="portal.handleStudentForm(event); return false;">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">First Name *</label>
                        <input type="text" name="firstName" class="form-input" required 
                               value="${data.firstName || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Last Name *</label>
                        <input type="text" name="lastName" class="form-input" required 
                               value="${data.lastName || ''}">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Age *</label>
                        <input type="number" name="age" class="form-input" min="9" max="18" required 
                               value="${data.age || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Grade *</label>
                        <select name="grade" class="form-select" required>
                            <option value="">Select Grade</option>
                            ${[4,5,6,7,8,9,10,11,12].map(g => 
                                `<option value="${g}" ${data.grade == g ? 'selected' : ''}>${g}th Grade</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">3D Design Experience</label>
                    <select name="experience" class="form-select">
                        <option value="None">No experience (perfect for beginners!)</option>
                        <option value="Beginner">Some basic experience</option>
                        <option value="Intermediate">Comfortable with design software</option>
                        <option value="Advanced">Experienced with CAD/3D modeling</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Special Notes (Optional)</label>
                    <textarea name="notes" class="form-input" rows="3" 
                              placeholder="Any learning differences or special considerations?">${data.notes || ''}</textarea>
                </div>
                
                <div class="wizard-actions">
                    <button type="button" onclick="portal.cancelEnrollment()" class="btn btn-secondary">
                        Cancel
                    </button>
                    <button type="submit" class="btn btn-primary">
                        Continue to Class Selection →
                    </button>
                </div>
            </form>
        `;
    }

    renderClassSelection() {
        const grade = parseInt(this.wizard.studentData.grade);
        const canSelectElementary = grade >= 4 && grade <= 7;
        const canSelectHighSchool = grade >= 8 && grade <= 12;
        
        return `
            <div class="class-selection">
                <h3>Select Class Time</h3>
                <p style="color: #6b7280; margin-bottom: 2rem;">
                    Based on Grade ${grade}, we recommend the ${canSelectElementary ? 'Elementary' : 'Jr High/High School'} time slot
                </p>
                
                <div class="class-options">
                    <div class="class-option ${canSelectElementary ? '' : 'disabled'} 
                         ${this.wizard.classSelection === '4:30-5:30pm' ? 'selected' : ''}"
                         onclick="${canSelectElementary ? 'portal.selectClass(\"4:30-5:30pm\")' : ''}">
                        <h4>Tuesday 4:30-5:30pm</h4>
                        <p>Elementary (Grades 4-7)</p>
                        <span class="availability ${this.wizard.availableSlots['4:30-5:30pm'] < 3 ? 'low' : ''}">
                            ${this.wizard.availableSlots['4:30-5:30pm']} spots available
                        </span>
                        ${!canSelectElementary ? '<p style="color: #dc2626;">Not available for Grade ' + grade + '</p>' : ''}
                    </div>
                    
                    <div class="class-option ${canSelectHighSchool ? '' : 'disabled'}
                         ${this.wizard.classSelection === '5:30-6:30pm' ? 'selected' : ''}"
                         onclick="${canSelectHighSchool ? 'portal.selectClass(\"5:30-6:30pm\")' : ''}">
                        <h4>Tuesday 5:30-6:30pm</h4>
                        <p>Jr High/High School (Grades 8-12)</p>
                        <span class="availability ${this.wizard.availableSlots['5:30-6:30pm'] < 3 ? 'low' : ''}">
                            ${this.wizard.availableSlots['5:30-6:30pm']} spots available
                        </span>
                        ${!canSelectHighSchool ? '<p style="color: #dc2626;">Not available for Grade ' + grade + '</p>' : ''}
                    </div>
                </div>
                
                <div class="wizard-actions">
                    <button onclick="portal.previousWizardStep()" class="btn btn-secondary">
                        ← Back
                    </button>
                    <button onclick="portal.nextWizardStep()" 
                            class="btn btn-primary"
                            ${!this.wizard.classSelection ? 'disabled' : ''}>
                        Continue to Review →
                    </button>
                </div>
            </div>
        `;
    }

    renderPaymentReview() {
        const basePrice = 700;
        const hasMultipleKids = this.students.length > 0 || (this.wizard.mode === 'new' && this.students.length >= 0);
        const discount = hasMultipleKids && FEATURES.multiChildDiscount ? 50 : 0;
        const subtotal = basePrice - discount;
        const fullPaymentPrice = subtotal - 20; // $20 discount for paying in full
        
        return `
            <div class="payment-review">
                <h3>Review & Complete Enrollment</h3>
                
                <div class="order-summary">
                    <h4>Order Summary</h4>
                    <div class="summary-item">
                        <div>
                            <strong>${this.wizard.studentData.firstName} ${this.wizard.studentData.lastName}</strong>
                            <br>Level 1 • Tuesday ${this.wizard.classSelection}
                            <br><small>12 weeks starting September 9, 2025</small>
                        </div>
                        <div>$${basePrice}</div>
                    </div>
                    
                    ${discount > 0 ? `
                        <div class="summary-item discount">
                            <div>Multi-child Discount</div>
                            <div>-$${discount}</div>
                        </div>
                    ` : ''}
                    
                    <div class="summary-total">
                        <div>Subtotal</div>
                        <div>$${subtotal}</div>
                    </div>
                </div>
                
                <div class="payment-options">
                    <h4>Payment Options</h4>
                    <label class="payment-option ${this.wizard.paymentType === 'full' ? 'selected' : ''}"
                           onclick="portal.selectPaymentType('full')">
                        <input type="radio" name="payment" value="full" 
                               ${this.wizard.paymentType === 'full' ? 'checked' : ''}>
                        <div>
                            <strong>Pay in Full</strong>
                            <p class="price">$${fullPaymentPrice}</p>
                            <small>Save $20 when you pay in full!</small>
                        </div>
                    </label>
                    
                    <label class="payment-option ${this.wizard.paymentType === 'split' ? 'selected' : ''}"
                           onclick="portal.selectPaymentType('split')">
                        <input type="radio" name="payment" value="split"
                               ${this.wizard.paymentType === 'split' ? 'checked' : ''}>
                        <div>
                            <strong>Payment Plan</strong>
                            <p class="price">$${Math.ceil(subtotal/2)} today</p>
                            <small>$${Math.floor(subtotal/2)} due October 15, 2025</small>
                        </div>
                    </label>
                </div>
                
                <div class="wizard-actions">
                    <button onclick="portal.previousWizardStep()" class="btn btn-secondary">
                        ← Back
                    </button>
                    <button onclick="portal.completeEnrollment()" class="btn btn-primary btn-large">
                        Proceed to Secure Payment →
                    </button>
                </div>
            </div>
        `;
    }

    renderScheduleTab() {
        return `
            <div class="schedule-section">
                <h2>Class Schedule</h2>
                <p>View upcoming classes and important dates</p>
                
                <div class="schedule-content">
                    ${this.students.filter(s => s.enrollments?.length > 0).map(student => {
                        const enrollment = student.enrollments[0];
                        return `
                            <div class="schedule-card">
                                <h4>${student.first_name} ${student.last_name}</h4>
                                <p>Every Tuesday ${this.formatTime(enrollment.class_slots.start_time)}</p>
                                <small>Level 1 • Shadowbrook Church</small>
                            </div>
                        `;
                    }).join('') || '<p>No upcoming classes scheduled</p>'}
                </div>
            </div>
        `;
    }

    renderOrdersTab() {
        return `
            <div class="orders-section">
                <h2>Order History</h2>
                <div class="orders-list">
                    ${this.orders.map(order => `
                        <div class="order-card">
                            <div class="order-header">
                                <strong>Order #${order.order_number}</strong>
                                <span>${new Date(order.created_at).toLocaleDateString()}</span>
                            </div>
                            <div class="order-details">
                                <p>Total: $${order.total_amount}</p>
                                <p>Status: ${order.status}</p>
                            </div>
                        </div>
                    `).join('') || '<p>No orders yet</p>'}
                </div>
            </div>
        `;
    }

    renderAccountTab() {
        return `
            <div class="account-section">
                <h2>Account Settings</h2>
                <div class="account-info">
                    <p><strong>Email:</strong> ${this.currentUser.email}</p>
                    <p><strong>Name:</strong> ${this.parentData?.name}</p>
                    <p><strong>Phone:</strong> ${this.parentData?.phone || 'Not provided'}</p>
                </div>
            </div>
        `;
    }

    // Wizard Management Methods
    startEnrollmentWizard(mode = 'new') {
        this.wizard = {
            active: true,
            step: 1,
            maxSteps: 3,
            mode: mode,
            studentData: {},
            studentId: null,
            classSelection: null,
            paymentType: 'full',
            availableSlots: this.wizard.availableSlots
        };
        this.render();
    }

    enrollStudent(studentId) {
        const student = this.students.find(s => s.id === studentId);
        if (student) {
            this.wizard = {
                active: true,
                step: 2, // Skip to class selection for existing students
                maxSteps: 3,
                mode: 'existing',
                studentData: {
                    firstName: student.first_name,
                    lastName: student.last_name,
                    age: student.age,
                    grade: parseInt(student.grade),
                    experience: student.experience_level
                },
                studentId: studentId,
                classSelection: null,
                paymentType: 'full',
                availableSlots: this.wizard.availableSlots
            };
            this.render();
        }
    }

    async handleStudentForm(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        
        this.wizard.studentData = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            age: formData.get('age'),
            grade: formData.get('grade'),
            experience: formData.get('experience'),
            notes: formData.get('notes')
        };
        
        this.nextWizardStep();
    }

    selectClass(time) {
        this.wizard.classSelection = time;
        this.render();
    }

    selectPaymentType(type) {
        this.wizard.paymentType = type;
        this.render();
    }

    nextWizardStep() {
        if (this.wizard.step < this.wizard.maxSteps) {
            this.wizard.step++;
            this.render();
        }
    }

    previousWizardStep() {
        if (this.wizard.step > 1) {
            this.wizard.step--;
            this.render();
        }
    }

    cancelEnrollment() {
        this.wizard.active = false;
        this.render();
    }

    async completeEnrollment() {
        try {
            this.showMessage('Processing enrollment...', 'info');
            
            let studentId = this.wizard.studentId;
            
            // Create new student if needed
            if (this.wizard.mode === 'new') {
                const { data: newStudent, error } = await this.supabase
                    .from('students')
                    .insert([{
                        parent_id: this.currentUser.id,
                        first_name: this.wizard.studentData.firstName,
                        last_name: this.wizard.studentData.lastName,
                        age: parseInt(this.wizard.studentData.age),
                        grade: this.wizard.studentData.grade + 'th',
                        experience_level: this.wizard.studentData.experience,
                        parent_notes: this.wizard.studentData.notes
                    }])
                    .select()
                    .single();
                
                if (error) throw error;
                
                studentId = newStudent.id;
                this.students.unshift(newStudent);
                this.isNewUser = false;
            }
            
            // Calculate pricing
            const basePrice = 700;
            const discount = (this.students.length > 1 && FEATURES.multiChildDiscount) ? 50 : 0;
            const subtotal = basePrice - discount;
            const total = this.wizard.paymentType === 'full' ? subtotal - 20 : subtotal;
            
            // Prepare payment data
            const paymentData = {
                paymentType: this.wizard.paymentType,
                students: [{
                    student: { id: studentId },
                    timeSlot: this.wizard.classSelection
                }],
                amounts: {
                    full: total,
                    splitFirst: Math.ceil(subtotal / 2),
                    splitSecond: Math.floor(subtotal / 2),
                    total: total,
                    paid: this.wizard.paymentType === 'full' ? total : Math.ceil(subtotal / 2)
                },
                customerEmail: this.currentUser.email
            };
            
            // Store for success page
            localStorage.setItem('pendingEnrollment', JSON.stringify(paymentData));
            
            // Create Stripe checkout
            const response = await fetch('/.netlify/functions/create-checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(paymentData)
            });
            
            const { url } = await response.json();
            
            if (url) {
                window.location.href = url;
            } else {
                throw new Error('Failed to create checkout session');
            }
            
        } catch (error) {
            console.error('Enrollment error:', error);
            this.showMessage('Error processing enrollment. Please try again.', 'error');
        }
    }

    // Utility Methods
    switchTab(tabName) {
        this.currentTab = tabName;
        this.wizard.active = false; // Close wizard when switching tabs
        this.render();
    }

    editStudent(studentId) {
        // TODO: Implement edit functionality
        console.log('Edit student:', studentId);
    }

    formatTime(timeString) {
        if (!timeString) return '';
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'pm' : 'am';
        const displayHour = hour > 12 ? hour - 12 : hour;
        return `${displayHour}:${minutes}${ampm}`;
    }

    showMessage(message, type = 'info') {
        const messageArea = document.getElementById('message-area');
        if (!messageArea) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        
        messageArea.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }

    getWizardTitle() {
        switch(this.wizard.step) {
            case 1: return this.wizard.mode === 'new' ? 'Add Your Student' : 'Confirm Student';
            case 2: return 'Choose a Class Time';
            case 3: return 'Review & Pay';
            default: return '';
        }
    }

    getWizardSubtitle() {
        switch(this.wizard.step) {
            case 1: return this.wizard.mode === 'new' ? 'Tell us about your child' : 'Enrolling existing student';
            case 2: return 'Select the best time for your schedule';
            case 3: return 'Complete your enrollment';
            default: return '';
        }
    }

    attachEventListeners() {
        // Add any global event listeners here
    }

    async logout() {
        await this.supabase.auth.signOut();
        window.location.href = 'login.html';
    }
}

// Initialize portal when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.portal = new UnifiedPortal();
    window.portal.init();
});
