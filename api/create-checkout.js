const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { paymentType, students, amounts } = req.body;

    if (!paymentType || !students || !amounts) {
      return res.status(400).json({ message: 'Missing required fields' });
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

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${req.headers.origin}/payment-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/app.html`,
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
      customer_email: req.body.customerEmail,
    });

    res.status(200).json({ url: session.url });

  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
