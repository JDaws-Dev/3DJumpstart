// supabase/functions/stripe-webhook/index.ts
import Stripe from 'https://esm.sh/stripe@14?target=denonext'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_API_KEY')!, {
  apiVersion: '2024-10-28.acacia',
})
const cryptoProvider = Stripe.createSubtleCryptoProvider()

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// Email sending function
async function sendConfirmationEmail(parentEmail: string, studentNames: string[], classDetails: string[], totalAmount: number, passwordResetLink?: string) {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'noreply@3djumpstart.com'

  if (!RESEND_API_KEY) {
    console.log('RESEND_API_KEY not set, skipping email')
    return
  }

  const studentList = studentNames.map((name, i) => `
    <li style="margin-bottom: 10px;">
      <strong>${name}</strong><br>
      <span style="color: #64748b;">${classDetails[i]}</span>
    </li>
  `).join('')

  // Add password setup section for first-time users
  const passwordSection = passwordResetLink ? `
    <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 4px;">
      <h2 style="color: #1e40af; font-size: 18px; margin-top: 0; margin-bottom: 10px;">🔐 Set Up Your Password</h2>
      <p style="margin: 0 0 15px 0; color: #1e3a8a; font-size: 15px; line-height: 1.6;">
        Click the button below to create your password and access your Parent Portal:
      </p>
      <div style="text-align: center; margin: 20px 0;">
        <a href="${passwordResetLink}" style="display: inline-block; background: #3b82f6; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
          Create Password & Access Portal
        </a>
      </div>
      <p style="margin: 15px 0 0 0; color: #1e3a8a; font-size: 14px; line-height: 1.6;">
        Once you set your password, you can log in anytime at <a href="https://3djumpstart.com/portal.html" style="color: #ea580c; text-decoration: underline;">3djumpstart.com/portal</a>
      </p>
    </div>
  ` : '';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

      <div style="text-align: center; margin-bottom: 30px;">
        <div style="font-size: 48px; color: #16a34a; margin-bottom: 10px;">✓</div>
        <h1 style="color: #0f172a; margin: 0; font-size: 28px;">Enrollment Confirmed!</h1>
      </div>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
        Thank you for enrolling in <strong>3D Jumpstart</strong>! Your payment of <strong>$${totalAmount}</strong> has been processed successfully.
      </p>

      <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h2 style="color: #0f172a; font-size: 18px; margin-top: 0; margin-bottom: 15px;">Enrolled Students:</h2>
        <ul style="list-style: none; padding: 0; margin: 0; color: #334155;">
          ${studentList}
        </ul>
      </div>

      ${passwordSection}

      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          <strong>What to Bring:</strong> Imperial (inch) Dial Calipers - <a href="https://a.co/d/7BT1kL0" style="color: #ea580c; text-decoration: none; font-weight: 600;">View on Amazon</a>
        </p>
        <p style="margin: 10px 0 0 0; color: #92400e; font-size: 14px;">
          All other materials will be provided.
        </p>
        <p style="margin: 10px 0 0 0; color: #92400e; font-size: 14px;">
          <strong>Location:</strong> Class location will be sent before the first class.
        </p>
      </div>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
        You can view your enrollment details anytime in the <a href="https://3djumpstart.com/portal.html" style="color: #ea580c; text-decoration: none; font-weight: 600;">Parent Portal</a>.
      </p>

      <div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px;">
        <p style="color: #64748b; font-size: 14px; margin: 0;">
          Questions? Contact us for any changes or support.<br>
          <a href="https://3djumpstart.com" style="color: #ea580c; text-decoration: none;">3djumpstart.com</a>
        </p>
      </div>

    </div>
  </div>
</body>
</html>
  `

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: parentEmail,
        subject: '✓ Your 3D Jumpstart Enrollment is Confirmed!',
        html: htmlContent,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Resend API error:', error)
      throw new Error(`Resend API error: ${error}`)
    }

    const data = await response.json()
    console.log('Email sent successfully:', data.id)
  } catch (error) {
    console.error('Failed to send email:', error)
  }
}

// Admin notification email for new enrollments
async function sendAdminNotification(parentEmail: string, parentName: string, studentNames: string[], classDetails: string[], totalAmount: number) {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'noreply@3djumpstart.com'
  const ADMIN_EMAIL = 'jeremiah@3djumpstart.com'

  if (!RESEND_API_KEY) {
    console.log('RESEND_API_KEY not set, skipping admin notification')
    return
  }

  const studentList = studentNames.map((name, i) => `
    <li style="margin-bottom: 10px;">
      <strong>${name}</strong> - ${classDetails[i]}
    </li>
  `).join('')

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

      <div style="text-align: center; margin-bottom: 30px;">
        <div style="font-size: 48px; color: #ea580c; margin-bottom: 10px;">🎉</div>
        <h1 style="color: #0f172a; margin: 0; font-size: 28px;">New Enrollment!</h1>
      </div>

      <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h2 style="color: #0f172a; font-size: 18px; margin-top: 0; margin-bottom: 15px;">Enrollment Details:</h2>

        <p style="color: #334155; margin: 10px 0;">
          <strong>Parent:</strong> ${parentName}<br>
          <strong>Email:</strong> ${parentEmail}<br>
          <strong>Amount Paid:</strong> $${totalAmount}
        </p>

        <p style="color: #0f172a; font-weight: 600; margin-top: 20px; margin-bottom: 10px;">Students Enrolled:</p>
        <ul style="list-style: none; padding: 0; margin: 0; color: #334155;">
          ${studentList}
        </ul>
      </div>

      <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; color: #1e40af; font-size: 14px;">
          View full details in the <a href="https://3djumpstart.com/admin.html" style="color: #ea580c; text-decoration: none; font-weight: 600;">Admin Dashboard</a>
        </p>
      </div>

    </div>
  </div>
</body>
</html>
  `

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: ADMIN_EMAIL,
        subject: `🎉 New Enrollment: ${parentName} - ${studentNames.join(', ')}`,
        html: htmlContent,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Resend API error for admin notification:', error)
      throw new Error(`Resend API error: ${error}`)
    }

    const data = await response.json()
    console.log('Admin notification sent successfully:', data.id)
  } catch (error) {
    console.error('Failed to send admin notification:', error)
  }
}

// Email function for payment method not saved
async function sendPaymentMethodNeededEmail(parentEmail: string, parentName: string) {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'noreply@3djumpstart.com'

  if (!RESEND_API_KEY) {
    console.log('RESEND_API_KEY not set, skipping email')
    return
  }

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

      <div style="text-align: center; margin-bottom: 30px;">
        <div style="font-size: 48px; color: #f59e0b; margin-bottom: 10px;">⚠️</div>
        <h1 style="color: #0f172a; margin: 0; font-size: 28px;">Action Required: Add Payment Method</h1>
      </div>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
        Hi ${parentName},
      </p>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
        Your enrollment payment was successful! However, we were unable to save your payment method for future weekly charges.
      </p>

      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          <strong>What this means:</strong> To enable automatic weekly billing for attendance, please add a payment method to your account.
        </p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://3djumpstart.com/portal.html" style="display: inline-block; background: #ea580c; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
          Add Payment Method
        </a>
      </div>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
        Once you add a payment method, we'll be able to automatically charge for weekly classes based on attendance.
      </p>

      <div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px;">
        <p style="color: #64748b; font-size: 14px; margin: 0;">
          Questions? Contact us for any changes or support.<br>
          <a href="https://3djumpstart.com" style="color: #ea580c; text-decoration: none;">3djumpstart.com</a>
        </p>
      </div>

    </div>
  </div>
</body>
</html>
  `

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: parentEmail,
        subject: '⚠️ Action Required: Add Payment Method for Weekly Billing',
        html: htmlContent,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Resend API error:', error)
      throw new Error(`Resend API error: ${error}`)
    }

    const data = await response.json()
    console.log('Payment method needed email sent:', data.id)
  } catch (error) {
    console.error('Failed to send payment method email:', error)
  }
}

// Handle first-time guest enrollments (no existing auth user)
async function handleFirstTimeEnrollment(session: Stripe.Checkout.Session) {
  try {
    const metadata = session.metadata || {}
    const parentEmail = metadata.parent_email
    const parentName = metadata.parent_name
    const parentPhone = metadata.parent_phone
    const studentsData = JSON.parse(metadata.students_data || '[]')
    const totalAmount = Number(metadata.total_amount || 0)

    console.log('First-time enrollment for:', parentEmail)
    console.log('Students:', studentsData.length)

    // STEP 1: Get or Create Supabase Auth User
    let userId: string
    let isNewUser = false

    // First, try to find existing user by email
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email === parentEmail)

    if (existingUser) {
      console.log('User already exists:', existingUser.id)
      userId = existingUser.id
    } else {
      // Create new auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: parentEmail,
        email_confirm: true,
        user_metadata: {
          name: parentName,
          phone: parentPhone,
          first_enrollment: true,
          enrolled_at: new Date().toISOString()
        }
      })

      if (authError || !authData.user) {
        console.error('Failed to create auth user:', authError)
        throw new Error(`Failed to create auth user: ${authError?.message}`)
      }

      userId = authData.user.id
      isNewUser = true
      console.log('Created new auth user:', userId)
    }

    // STEP 2: Create or update parent record
    const { data: existingParent } = await supabase
      .from('parents')
      .select('id')
      .eq('id', userId)
      .single()

    if (existingParent) {
      console.log('Parent record already exists, updating...')
      const { error: updateError } = await supabase
        .from('parents')
        .update({
          name: parentName,
          phone: parentPhone,
          stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id || null
        })
        .eq('id', userId)

      if (updateError) {
        console.error('Failed to update parent:', updateError)
        throw new Error(`Failed to update parent: ${updateError.message}`)
      }
      console.log('Updated parent record')
    } else {
      console.log('Creating new parent record...')
      const { error: parentError } = await supabase
        .from('parents')
        .insert({
          id: userId,
          email: parentEmail,
          name: parentName,
          phone: parentPhone,
          stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id || null
        })

      if (parentError) {
        console.error('Failed to create parent:', parentError)
        throw new Error(`Failed to create parent: ${parentError.message}`)
      }
      console.log('Created parent record')
    }

    // STEP 3: Create students and enrollments
    const enrollmentIds = []
    const studentNames = []
    const classDetails = []

    for (const studentData of studentsData) {
      // Parse student name
      const [firstName, ...lastNameParts] = studentData.name.trim().split(' ')
      const lastName = lastNameParts.join(' ') || firstName
      const age = studentData.grade + 5 // Rough estimate

      // Create student
      const { data: student, error: studentError } = await supabase
        .from('students')
        .insert({
          parent_id: userId,
          first_name: firstName,
          last_name: lastName,
          age: age,
          grade: `${studentData.grade}th`,
          experience: 'Beginner'
        })
        .select()
        .single()

      if (studentError) {
        console.error('Failed to create student:', studentError)
        throw new Error(`Failed to create student: ${studentError.message}`)
      }

      console.log('Created student:', student.id)

      // Get class period details
      const CLASS_PERIODS: Record<string, any> = {
        'sat_930am': { label: 'Saturday 9:30-10:30 AM', time: 'Saturday 9:30-10:30am' },
        'sat_1030am': { label: 'Saturday 10:30-11:30 AM', time: 'Saturday 10:30-11:30am' },
        'mon_430pm': { label: 'Monday 4:30-5:30 PM', time: 'Monday 4:30-5:30pm' },
        'mon_530pm': { label: 'Monday 5:30-6:30 PM', time: 'Monday 5:30-6:30pm' }
      }

      const period = CLASS_PERIODS[studentData.timeSlot]

      // Create enrollment
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('enrollments')
        .insert({
          parent_id: userId,
          student_id: student.id,
          level: 'Level 1',
          season: 'Fall 2025',
          class_period_id: studentData.timeSlot,
          class_time: period.time,
          payment_plan: 'weekly',
          amount_list: 40,
          status: 'enrolled',
          balance_due: 0
        })
        .select()
        .single()

      if (enrollmentError) {
        console.error('Failed to create enrollment:', enrollmentError)
        throw new Error(`Failed to create enrollment: ${enrollmentError.message}`)
      }

      console.log('Created enrollment:', enrollment.id)

      // Record payment
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          parent_id: userId,
          enrollment_id: enrollment.id,
          amount: 40,
          event_type: 'First Week',
          stripe_object_id: session.id,
          created_at: new Date().toISOString()
        })

      if (paymentError) {
        console.error('Failed to record payment:', paymentError)
      }

      enrollmentIds.push(enrollment.id)
      studentNames.push(`${firstName} ${lastName}`)
      classDetails.push(period.label)
    }

    console.log('Successfully created all enrollments')

    // STEP 4: Generate magic link for new users to set password
    let passwordResetLink: string | undefined = undefined
    if (isNewUser) {
      // Generate magic link that redirects to password setup page
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: parentEmail,
        options: {
          redirectTo: 'https://3djumpstart.com/set-password.html'
        }
      })

      if (linkError) {
        console.error('Failed to generate magic link:', linkError)
      } else {
        passwordResetLink = linkData.properties.action_link
        console.log('Generated magic link for new user')
      }
    }

    // STEP 5: Send confirmation emails
    await sendConfirmationEmail(parentEmail, studentNames, classDetails, totalAmount, passwordResetLink)
    await sendAdminNotification(parentEmail, parentName, studentNames, classDetails, totalAmount)

    console.log('First-time enrollment completed successfully!')

  } catch (error) {
    console.error('Error handling first-time enrollment:', error)
    throw error
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log('Webhook received from Stripe')

  const sig = req.headers.get('Stripe-Signature')
  const body = await req.text()

  if (!sig) {
    console.error('No Stripe-Signature header found')
    return new Response('No signature header', { status: 400, headers: corsHeaders })
  }

  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SIGNING_SECRET')
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SIGNING_SECRET not configured')
    return new Response('Webhook secret not configured', { status: 500, headers: corsHeaders })
  }

  console.log('Verifying webhook signature...')
  let event: Stripe.Event

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      sig,
      webhookSecret,
      undefined,
      cryptoProvider
    )
    console.log('Webhook signature verified successfully')
  } catch (err) {
    console.error('Webhook signature verification failed:', (err as Error).message)
    return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400, headers: corsHeaders })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const metadata = session.metadata || {}

    // Check if this is a first-time guest enrollment
    if (metadata.first_time === 'true') {
      console.log('Processing FIRST-TIME guest enrollment')
      try {
        await handleFirstTimeEnrollment(session)
        console.log('First-time enrollment completed successfully')
        return new Response(JSON.stringify({ ok: true, message: 'Enrollment processed' }), { status: 200, headers: corsHeaders })
      } catch (enrollmentError) {
        console.error('FATAL: First-time enrollment failed:', enrollmentError)
        return new Response(JSON.stringify({ error: (enrollmentError as Error).message }), { status: 500, headers: corsHeaders })
      }
    }

    // Existing customer flow (from portal)
    const parentId = session.client_reference_id

    // Get email from session - check multiple sources
    let parentEmail = session.customer_email || null

    // Try customer_details.email
    if (!parentEmail && session.customer_details?.email) {
      parentEmail = session.customer_details.email
    }

    // Fallback to fetching from customer object
    if (!parentEmail && session.customer) {
      try {
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer.id
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer
        parentEmail = customer.email || null
      } catch (err) {
        console.error('Failed to fetch customer email:', err)
      }
    }

    console.log('Parent email resolved to:', parentEmail)

    const enrollmentIds = JSON.parse(metadata.enrollment_ids || '[]')
    const totalAmount = Number(metadata.total_amount || 0)

    console.log('Processing checkout for EXISTING parent:', parentId)
    console.log('Enrollment IDs:', enrollmentIds)
    console.log('Total amount:', totalAmount)

    try {
      // Save Stripe customer ID to parent record for future charges
      let paymentMethodSaved = false

      if (parentId && session.customer) {
        const { error: customerError } = await supabase
          .from('parents')
          .update({ stripe_customer_id: session.customer })
          .eq('id', parentId)

        if (customerError) {
          console.error('Failed to save Stripe customer ID:', customerError)
        } else {
          console.log('Saved Stripe customer ID for parent:', parentId)

          // Check if payment method was actually saved
          try {
            const customerId = typeof session.customer === 'string' ? session.customer : session.customer.id
            const paymentMethods = await stripe.paymentMethods.list({
              customer: customerId,
              type: 'card',
              limit: 1
            })

            paymentMethodSaved = paymentMethods.data.length > 0
            console.log('Payment method saved:', paymentMethodSaved)
          } catch (pmError) {
            console.error('Error checking payment methods:', pmError)
          }
        }
      }

      // Update enrollments from 'cart' to 'enrolled'
      const { error: enrollError } = await supabase
        .from('enrollments')
        .update({
          status: 'enrolled',
          balance_due: 0  // First week is paid
        })
        .in('id', enrollmentIds)
        .eq('status', 'cart')

      if (enrollError) {
        console.error('Failed to update enrollments:', enrollError)
        throw enrollError
      }

      console.log('Updated enrollments to enrolled status')

      // Record payment for each enrollment
      for (const enrollmentId of enrollmentIds) {
        const { error: paymentError } = await supabase.from('payments').insert({
          parent_id: parentId,
          enrollment_id: enrollmentId,
          amount: 40, // $40 per student for first week
          event_type: 'First Week',
          stripe_object_id: session.id,  // Use session.id NOT payment_intent
          created_at: new Date().toISOString()
        })

        if (paymentError) {
          console.error('Failed to record payment:', paymentError)
        }
      }

      console.log('Successfully processed payment and updated enrollments')

      // Send confirmation email
      if (parentEmail && enrollmentIds.length > 0) {
        console.log('Attempting to send confirmation email to:', parentEmail)

        // Get enrollment details with student info
        // Use the specific foreign key relationship to avoid ambiguity
        const { data: enrollmentData, error: enrollmentError } = await supabase
          .from('enrollments')
          .select('*, students!enrollments_student_id_fkey(first_name, last_name)')
          .in('id', enrollmentIds)

        if (enrollmentError) {
          console.error('Failed to fetch enrollment data for email:', enrollmentError)
        } else if (enrollmentData && enrollmentData.length > 0) {
          console.log('Found enrollment data, preparing email for', enrollmentData.length, 'students')

          const studentNames = enrollmentData.map(e => `${e.students.first_name} ${e.students.last_name}`)
          const classDetails = enrollmentData.map(e => e.class_time || 'TBD')

          // Get parent name for notifications
          const { data: parentData } = await supabase
            .from('parents')
            .select('name')
            .eq('id', parentId)
            .single()

          const parentName = parentData?.name || parentEmail || 'New Parent'

          // Send parent confirmation email
          await sendConfirmationEmail(parentEmail, studentNames, classDetails, totalAmount)

          // Send admin notification email
          await sendAdminNotification(parentEmail, parentName, studentNames, classDetails, totalAmount)

          // If payment method wasn't saved, send notification
          if (!paymentMethodSaved && parentId) {
            console.log('Payment method not saved, sending notification email')
            await sendPaymentMethodNeededEmail(parentEmail, parentName)
          }
        } else {
          console.log('No enrollment data found for email')
        }
      } else {
        console.log('Skipping email: parentEmail=', parentEmail, 'enrollmentIds.length=', enrollmentIds.length)
      }

    } catch (err) {
      console.error('Error processing webhook:', err)
      return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: corsHeaders })
    }
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders })
})
