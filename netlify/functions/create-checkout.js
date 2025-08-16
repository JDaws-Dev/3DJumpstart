exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method not allowed' })
    };
  }

  // Initialize Stripe
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

  try {
    const { paymentType, students, amounts, customerEmail } = JSON.parse(event.body);

    // Validate required fields
    if (!paymentType || !students || !amounts) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing required fields' })
      };
    }

    let lineItems = [];

    if (paymentType === 'full') {
      lineItems = [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: '3D Jumpstart Level 1 Course - Full Payment',
            description: `12-week professional 3D design course for ${students.length} student${students.length > 1 ? 's' : ''}`,
            images: ['https://raw.githubusercontent.com/JDaws-Dev/3DJumpstart/main/3d-jumpstart-logo.png'],
          },
          unit_amount: amounts.full * 100,
        },
        quantity: 1,
      }];
    } else if (paymentType === 'split') {
      lineItems = [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: '3D Jumpstart Level 1 Course - First Payment',
            description: `12-week course for ${students.length} student${students.length > 1 ? 's' : ''} (Second payment of $${amounts.splitSecond} due Oct 15th)`,
            images: ['https://raw.githubusercontent.com/JDaws-Dev/3DJumpstart/main/3d-jumpstart-logo.png'],
          },
          unit_amount: amounts.splitFirst * 100,
        },
        quantity: 1,
      }];
    }

    // Get the origin from headers
    const origin = event.headers.origin || event.headers.referer || 'https://3djumpstart.com';

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${origin}/payment-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/app.html`,
      metadata: {
        paymentType: paymentType,
        studentCount: students.length.toString(),
        totalAmount: paymentType === 'full' ? amounts.full.toString() : amounts.splitTotal.toString(),
        students: JSON.stringify(students.map(s => ({
          id: s.student.id,
          name: `${s.student.first_name} ${s.student.last_name}`,
          timeSlot: s.timeSlot
        })))
      },
      customer_email: customerEmail,
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: session.url })
    };

  } catch (error) {
    console.error('Stripe error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        message: 'Payment setup failed. Please try again.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};
