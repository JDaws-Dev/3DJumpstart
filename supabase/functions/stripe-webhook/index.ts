// supabase/functions/stripe-webhook/index.ts
import Stripe from 'https://esm.sh/stripe@14?target=denonext'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_API_KEY')!, {
  apiVersion: '2024-11-20',
})
const cryptoProvider = Stripe.createSubtleCryptoProvider()

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// Email sending function
async function sendConfirmationEmail(parentEmail: string, studentNames: string[], classDetails: string[], totalAmount: number) {
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

Deno.serve(async (req) => {
  const sig = req.headers.get('Stripe-Signature')!
  const body = await req.text()
  let event: Stripe.Event

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      sig,
      Deno.env.get('STRIPE_WEBHOOK_SIGNING_SECRET')!,
      undefined,
      cryptoProvider
    )
  } catch (err) {
    return new Response((err as Error).message, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const parentId = session.client_reference_id
    const parentEmail = session.customer_email || null
    const metadata = session.metadata || {}
    const enrollmentIds = JSON.parse(metadata.enrollment_ids || '[]')
    const totalAmount = Number(metadata.total_amount || 0)

    console.log('Processing checkout for parent:', parentId)
    console.log('Enrollment IDs:', enrollmentIds)
    console.log('Total amount:', totalAmount)

    try {
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
        const { data: enrollmentData, error: enrollmentError } = await supabase
          .from('enrollments')
          .select('*, students!inner(first_name, last_name)')
          .in('id', enrollmentIds)

        if (enrollmentError) {
          console.error('Failed to fetch enrollment data for email:', enrollmentError)
        } else if (enrollmentData && enrollmentData.length > 0) {
          console.log('Found enrollment data, preparing email for', enrollmentData.length, 'students')

          const studentNames = enrollmentData.map(e => `${e.students.first_name} ${e.students.last_name}`)
          const classDetails = enrollmentData.map(e => e.class_time || 'TBD')

          await sendConfirmationEmail(parentEmail, studentNames, classDetails, totalAmount)
        } else {
          console.log('No enrollment data found for email')
        }
      } else {
        console.log('Skipping email: parentEmail=', parentEmail, 'enrollmentIds.length=', enrollmentIds.length)
      }

    } catch (err) {
      console.error('Error processing webhook:', err)
      return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 })
    }
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
})
