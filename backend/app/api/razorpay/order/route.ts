import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { supabaseAdmin } from '../../../../lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { courseId, couponCode, userId } = body;

    if (!courseId || !userId) {
      return NextResponse.json({ error: 'Missing courseId or userId' }, { status: 400 });
    }
    
    // Initialize Razorpay lazily
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        console.error('Razorpay keys missing');
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    // 1. Fetch Course Price
    const { data: course, error: courseError } = await supabaseAdmin
      .from('courses')
      .select('price, title')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    let finalPrice = course.price;
    let appliedCoupon = null;

    // 2. Apply Coupon if provided
    if (couponCode) {
      const { data: offer } = await supabaseAdmin
        .from('offers')
        .select('*')
        .eq('code', couponCode.toUpperCase())
        .eq('is_active', true)
        .gt('expiry_date', new Date().toISOString())
        .maybeSingle();

      if (offer) {
          // Check if offer is for this course
          if (offer.course_id && offer.course_id !== courseId) {
              // Invalid for this course
          } else {
            const discount = (course.price * offer.discount_percentage) / 100;
            finalPrice = Math.max(0, course.price - discount);
            appliedCoupon = offer.code;
          }
      }
    }

    const roundTo2 = (v: number) => Number((Math.round((v + Number.EPSILON) * 100) / 100).toFixed(2));
    const platformFee = roundTo2(finalPrice * 0.02);
    finalPrice = roundTo2(finalPrice + platformFee);

    const amountInPaise = Math.round(finalPrice * 100);

    // 3. Create Razorpay Order
    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: {
        courseId,
        userId,
        couponCode: appliedCoupon || '',
        platformFee: platformFee
      },
    };

    const order = await razorpay.orders.create(options);

    return NextResponse.json({
      orderId: order.id,
      amount: amountInPaise,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
      courseTitle: course.title,
    });

  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
