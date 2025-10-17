// supabase/functions/send-lead-magnet/index.ts
// Allow anonymous access for lead capture
/// <reference types="https://esm.sh/@supabase/functions-js@2.0.0/src/edge-runtime.d.ts" />

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
    const { email } = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Store lead in database (optional - for tracking)
    try {
      await supabase
        .from('leads')
        .insert({
          email: email,
          source: 'exit_intent_popup',
          created_at: new Date().toISOString()
        })
    } catch (dbError) {
      console.log('Failed to store lead in database (non-critical):', dbError)
      // Continue even if database insert fails
    }

    // Send email via Resend
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'noreply@3djumpstart.com'
    const REPLY_TO_EMAIL = 'jeremiah@3djumpstart.com' // Always reply to jeremiah
    const LEAD_MAGNET_URL = 'https://docs.google.com/document/d/1MDgGOxhPGM7o1hwHxq7e6a4r0ty1R_OpFUazC-_cGmw/edit?usp=sharing'

    if (!RESEND_API_KEY) {
      console.log('RESEND_API_KEY not set, skipping email')
      return new Response(
        JSON.stringify({ success: false, message: 'Email service not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
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
        <img src="https://raw.githubusercontent.com/JDaws-Dev/3DJumpstart/main/3d-jumpstart-logo.png" alt="3D Jumpstart Logo" style="height: 80px; width: auto; margin-bottom: 20px;">
        <h1 style="color: #0f172a; margin: 0; font-size: 28px;">Here's Your Free Guide!</h1>
      </div>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
        Thanks for your interest in 3D Jumpstart!
      </p>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
        Here's the guide you requested: <strong style="color: #ea580c;">"5 Signs Your Kid is Ready for 3D Printing"</strong>
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${LEAD_MAGNET_URL}" style="display: inline-block; background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%); color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 18px; box-shadow: 0 4px 6px rgba(234, 88, 12, 0.25);">
          📄 Read The Guide Now
        </a>
      </div>

      <div style="background: #fff9f5; border-left: 4px solid #ea580c; border-radius: 8px; padding: 20px; margin: 30px 0;">
        <h2 style="color: #0f172a; font-size: 18px; margin-top: 0; margin-bottom: 15px;">What You'll Learn:</h2>
        <ul style="color: #334155; line-height: 1.8; margin: 0; padding-left: 20px;">
          <li>How to know if your child is developmentally ready for CAD software</li>
          <li>The key personality traits that predict success in 3D design</li>
          <li>Why some kids thrive in hands-on STEM learning</li>
          <li>What to look for before enrolling in a 3D printing class</li>
          <li>Real examples from our current students</li>
        </ul>
      </div>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
        Have questions about whether 3D Jumpstart is right for your child? Just reply to this email - I personally read and respond to every message.
      </p>

      <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; margin: 30px 0;">
        <h3 style="color: #0f172a; font-size: 16px; margin-top: 0; margin-bottom: 10px;">Ready to Enroll?</h3>
        <p style="color: #334155; font-size: 14px; line-height: 1.6; margin-bottom: 15px;">
          Classes start October 25th. Limited to 10 students per class.
        </p>
        <a href="https://3djumpstart.com/login.html" style="display: inline-block; background: white; color: #ea580c; border: 2px solid #ea580c; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Browse Available Times & Sign Up
        </a>
      </div>

      <div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px; text-align: center;">
        <p style="color: #334155; font-size: 16px; margin-bottom: 10px;">
          <strong>Jeremiah Daws</strong><br>
          <span style="color: #64748b;">Instructor & Founder</span>
        </p>
        <p style="color: #64748b; font-size: 14px; margin: 10px 0;">
          <a href="https://3djumpstart.com" style="color: #ea580c; text-decoration: none;">3djumpstart.com</a><br>
          jeremiah@3djumpstart.com
        </p>
      </div>

    </div>

    <div style="text-align: center; margin-top: 20px;">
      <p style="color: #94a3b8; font-size: 12px;">
        You're receiving this because you requested our free guide at 3djumpstart.com<br>
        <a href="#" style="color: #94a3b8; text-decoration: underline;">Unsubscribe</a>
      </p>
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
        reply_to: REPLY_TO_EMAIL,
        to: email,
        subject: '📄 Your Free Guide: 5 Signs Your Kid is Ready for 3D Printing',
        html: htmlContent,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Resend API error:', error)
      throw new Error(`Resend API error: ${error}`)
    }

    const data = await response.json()
    console.log('Lead magnet email sent successfully:', data.id)

    return new Response(
      JSON.stringify({ success: true, email_id: data.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Send lead magnet error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
