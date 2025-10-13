const { Resend } = require('resend');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method not allowed' })
    };
  }

  // Initialize Resend with your API key
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { type, recipientEmail, data } = JSON.parse(event.body);

    let emailHtml = '';
    let subject = '';

    switch(type) {
      case 'welcome':
        subject = 'Welcome to 3D Jumpstart!';
        emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; padding: 12px 30px; background: #ea580c; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
              h1 { margin: 0; }
              .info-box { background: #f9fafb; padding: 15px; border-left: 4px solid #ea580c; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to 3D Jumpstart!</h1>
              </div>
              <div class="content">
                <p>Dear ${data.parentName},</p>
                
                <p>Thank you for creating your parent account! We're excited to have you join the 3D Jumpstart family.</p>
                
                <p>Your account has been successfully created. You can now:</p>
                <ul>
                  <li>Add your students to your account</li>
                  <li>Enroll in Saturday morning classes starting October 25th</li>
                  <li>Access the parent portal for class information</li>
                </ul>

                <div class="info-box">
                  <strong>Next Steps:</strong><br>
                  1. Log in to your account<br>
                  2. Add your student(s)<br>
                  3. Select a Saturday morning time slot (9am for grades 4-8, 10am for grades 9-12, or 11am for advanced)<br>
                  4. Complete enrollment at $40/week
                </div>
                
                <center>
                  <a href="https://3djumpstart.com/login.html" class="button">Log In to Your Account</a>
                </center>
                
                <p>If you have any questions, please don't hesitate to reach out!</p>
                
                <p>Best regards,<br>
                Jeremiah Daws<br>
                3D Jumpstart Instructor</p>
              </div>
              <div class="footer">
                <p>3D Jumpstart | Suwanee, GA<br>
                📧 jeremiah@3djumpstart.com | 📱 310-845-5702</p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      case 'enrollment':
        subject = `Enrollment Confirmed - 3D Jumpstart`;
        const students = data.students.map(s =>
          `${s.name} - ${s.timeSlot}`
        ).join('<br>');
        
        emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; padding: 12px 30px; background: #ea580c; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
              .success-box { background: #dcfce7; border: 1px solid #86efac; padding: 15px; border-radius: 5px; margin: 20px 0; }
              .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
              .schedule-box { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 5px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>✓ Enrollment Confirmed!</h1>
              </div>
              <div class="content">
                <p>Dear ${data.parentName},</p>
                
                <div class="success-box">
                  <strong>🎉 Success!</strong> Your enrollment in 3D Jumpstart is confirmed.
                </div>

                <h3>Order Details</h3>
                <div class="info-row">
                  <span><strong>Order Number:</strong></span>
                  <span>${data.orderNumber}</span>
                </div>
                <div class="info-row">
                  <span><strong>Weekly Rate:</strong></span>
                  <span>$40/week per student</span>
                </div>
                <div class="info-row">
                  <span><strong>Classes Start:</strong></span>
                  <span>October 25th, 2025</span>
                </div>
                
                <h3>Enrolled Students</h3>
                <p>${students}</p>
                
                <div class="schedule-box">
                  <strong>📍 Location:</strong><br>
                  415 Brogdon Rd<br>
                  Suwanee, GA 30024<br><br>
                  <strong>⏰ Saturday Mornings</strong><br>
                  See your confirmation for your specific time slot
                </div>
                
                <h3>What to Bring</h3>
                <ul>
                  <li>Imperial (Inch) Dial Calipers - <a href="https://a.co/d/7BT1kL0">View on Amazon</a></li>
                  <li>Water bottle</li>
                  <li>Enthusiasm to learn!</li>
                </ul>
                
                <p><strong>Note:</strong> Computers are provided - no need to bring a laptop!</p>
                
                <center>
                  <a href="https://3djumpstart.com/portal.html" class="button">View Parent Portal</a>
                </center>
                
                <p>We'll send you a reminder email the week before classes begin. Looking forward to seeing you!</p>
                
                <p>Best regards,<br>
                Jeremiah Daws<br>
                3D Jumpstart Instructor</p>
              </div>
              <div class="footer">
                <p>3D Jumpstart | Professional 3D Design Education<br>
                📧 jeremiah@3djumpstart.com | 📱 310-845-5702</p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      case 'reminder':
        subject = '3D Jumpstart - Class Starting Soon!';
        // Add reminder email template here
        break;

      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ message: 'Invalid email type' })
        };
    }

    // Send the email
    const { data: emailData, error } = await resend.emails.send({
      from: ' 3D Jumpstart <noreply@3djumpstart.com>', // Update with your verified domain
      to: [recipientEmail],
      subject: subject,
      html: emailHtml,
      reply_to: 'jeremiah@3djumpstart.com'
    });

    if (error) {
      throw error;
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        success: true,
        messageId: emailData.id 
      })
    };

  } catch (error) {
    console.error('Email send error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        message: 'Failed to send email',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};
