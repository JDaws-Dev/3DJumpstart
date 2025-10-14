// supabase/functions/send-billing-email/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { parent_id, student_names, class_date, amount } = await req.json()

    if (!parent_id || !student_names || !class_date || !amount) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get parent email
    const { data: parent } = await supabase
      .from('parents')
      .select('email, name')
      .eq('id', parent_id)
      .single()

    if (!parent || !parent.email) {
      return new Response(
        JSON.stringify({ error: 'Parent email not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send email via Resend
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'noreply@3djumpstart.com'

    if (!RESEND_API_KEY) {
      console.log('RESEND_API_KEY not set, skipping email')
      return new Response(
        JSON.stringify({ success: false, message: 'Email service not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const studentList = Array.isArray(student_names)
      ? student_names.map(name => `<li style="margin-bottom: 5px;">${name}</li>`).join('')
      : `<li>${student_names}</li>`

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
        <div style="font-size: 48px; color: #3b82f6; margin-bottom: 10px;">📧</div>
        <h1 style="color: #0f172a; margin: 0; font-size: 28px;">Weekly Class Payment</h1>
      </div>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
        Hello ${parent.name || 'Parent'},
      </p>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
        Your student${Array.isArray(student_names) && student_names.length > 1 ? 's' : ''} attended class on <strong>${new Date(class_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</strong>.
      </p>

      <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h2 style="color: #0f172a; font-size: 18px; margin-top: 0; margin-bottom: 15px;">Student${Array.isArray(student_names) && student_names.length > 1 ? 's' : ''}:</h2>
        <ul style="list-style: none; padding: 0; margin: 0; color: #334155;">
          ${studentList}
        </ul>
      </div>

      <div style="background: #dbeafe; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
        <div style="font-size: 14px; color: #1e40af; margin-bottom: 5px;">Amount Charged</div>
        <div style="font-size: 32px; font-weight: 700; color: #1e3a8a;">$${amount}</div>
        <div style="font-size: 14px; color: #1e40af; margin-top: 5px;">($40 per student)</div>
      </div>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
        You can view your enrollment details and payment history anytime in the <a href="https://3djumpstart.com/portal.html" style="color: #ea580c; text-decoration: none; font-weight: 600;">Parent Portal</a>.
      </p>

      <div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px;">
        <p style="color: #64748b; font-size: 14px; margin: 0;">
          Questions about this charge? Contact us for assistance.<br>
          <a href="https://3djumpstart.com" style="color: #ea580c; text-decoration: none;">3djumpstart.com</a>
        </p>
      </div>

    </div>
  </div>
</body>
</html>
    `

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: parent.email,
        subject: `3D Jumpstart Weekly Class Payment - ${new Date(class_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        html: htmlContent,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Resend API error:', error)
      throw new Error(`Resend API error: ${error}`)
    }

    const data = await response.json()
    console.log('Billing email sent successfully:', data.id)

    return new Response(
      JSON.stringify({ success: true, email_id: data.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Send billing email error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
