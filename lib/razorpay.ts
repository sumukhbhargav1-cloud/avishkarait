import crypto from 'crypto';
import Razorpay from 'razorpay';

const keyId = process.env.RAZORPAY_KEY_ID || '';
const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

export const isRazorpayLive =
  Boolean(keyId) &&
  !keyId.includes('placeholder') &&
  Boolean(keySecret) &&
  !keySecret.includes('placeholder');

export const razorpayClient = isRazorpayLive
  ? new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    })
  : null;

export async function createRazorpayOrder(params: {
  teamUid: string;
  teamName: string;
  amountInr: number;
}) {
  const { teamUid, teamName, amountInr } = params;
  const amountInPaise = Math.round(amountInr * 100);

  if (isRazorpayLive && razorpayClient) {
    const order = await razorpayClient.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: teamUid,
      notes: {
        teamUid,
        teamName,
      },
    });

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
    };
  }

  // Sandbox / Test fallback order
  const simulatedOrderId = `order_${teamUid.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
  return {
    orderId: simulatedOrderId,
    amount: amountInPaise,
    currency: 'INR',
    keyId: keyId || 'rzp_test_placeholder',
  };
}

export function verifyPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const { orderId, paymentId, signature } = params;

  if (!isRazorpayLive) {
    // In local sandbox environment without live credentials
    return Boolean(paymentId && orderId);
  }

  try {
    const text = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(text)
      .digest('hex');

    return expectedSignature === signature;
  } catch (err) {
    console.error('Signature verification error:', err);
    return false;
  }
}

export function verifyWebhookSignature(payload: string, signature: string): boolean {
  if (!webhookSecret) return false;

  try {
    const expected = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    return expected === signature;
  } catch {
    return false;
  }
}

