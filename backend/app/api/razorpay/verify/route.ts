import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '../../../../lib/supabase';

export async function POST(req: Request) {
  try {
    const bodyData = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      userId,
      userEmail,
      userName,
      courseId,
      amount,
      couponCode
    } = bodyData;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    
    // Debug logging
    console.log('Verifying payment:', {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signatureReceived: razorpay_signature,
      secretLength: process.env.RAZORPAY_KEY_SECRET?.length
    });

    if (!process.env.RAZORPAY_KEY_SECRET) {
      console.error('RAZORPAY_KEY_SECRET is missing');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    console.log('Signature calculation:', {
      body,
      expected: expectedSignature,
      received: razorpay_signature,
      match: expectedSignature === razorpay_signature
    });

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ 
        error: 'Invalid signature',
        details: {
          received: razorpay_signature,
          expected: expectedSignature, // WARNING: Only for debugging, remove in production
          body: body
        }
      }, { status: 400 });
    }

    // Payment Verified. 

    // Ensure user exists in public.users to avoid FK constraint violation
    const { data: userExists } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

    if (!userExists) {
        console.log(`User ${userId} missing in public.users. Attempting to create...`);
        // If email is missing, try to fetch from auth.users (though backend admin might not have easy access without service role calling auth api directly)
        // We rely on userEmail passed from client, or fallback
        const emailToUse = userEmail || `missing_email_${userId}@example.com`; 
        const nameToUse = userName || 'App User';

        const { error: createUserError } = await supabaseAdmin.from('users').insert({
            id: userId,
            email: emailToUse,
            name: nameToUse,
            role: 'student'
        });

        if (createUserError) {
            console.error('Failed to create user in public.users:', createUserError);
            // We continue, hoping it might have been a race condition or something
        } else {
            console.log('User created successfully in public.users');
        }
    }

    // Fulfill Purchase.
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 180); // 6 months validity

    const purchaseData = {
        user_id: userId,
        course_id: courseId,
        amount: amount,
        status: 'success',
        provider: 'razorpay',
        provider_payment_id: razorpay_payment_id,
        coupon_code: couponCode || null,
        expiry_date: expiryDate.toISOString(),
        subscription_status: 'active'
    };

    console.log('Attempting to insert purchase:', purchaseData);

    const { error: insertError } = await supabaseAdmin.from('purchases').insert(purchaseData);

    if (insertError) {
        console.error('Error inserting purchase (full data):', insertError);
        
        // Fallback: Try inserting without new columns if they don't exist
        // This handles cases where the schema migration hasn't been run yet
        if (insertError.message.includes('column') && insertError.message.includes('does not exist')) {
            console.log('Retrying insert with minimal fields...');
            const minimalData = {
                user_id: userId,
                course_id: courseId,
                amount: amount,
                status: 'success',
                provider: 'razorpay'
            };
            const { error: retryError } = await supabaseAdmin.from('purchases').insert(minimalData);
            
            if (retryError) {
                console.error('Retry failed:', retryError);
                return NextResponse.json({ 
                    error: 'Payment verified but failed to record purchase (retry failed)', 
                    details: retryError.message 
                }, { status: 500 });
            } else {
                console.log('Retry successful with minimal fields');
                return NextResponse.json({ 
                    success: true, 
                    warning: 'Purchase recorded but some fields were omitted due to schema mismatch. Please run fix_purchases.sql.' 
                });
            }
        }

        return NextResponse.json({ 
          error: 'Payment verified but failed to record purchase', 
          details: insertError.message 
        }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error verifying payment:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error', 
      details: error.message || 'Unknown error occurred'
    }, { status: 500 });
  }
}
