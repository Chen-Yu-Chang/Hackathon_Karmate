// Stripe integration (TDD 1 + 4.2: 0.5 USD court entry fee, cash back,
// bounty payouts). Falls back to a mock "always succeeds" charge when
// STRIPE_SECRET_KEY is unset, so the demo works without a Stripe account.

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
let stripeClient = null;
if (STRIPE_KEY) {
  // Lazy require so the app still boots if the package/key isn't configured.
  const Stripe = require("stripe");
  stripeClient = new Stripe(STRIPE_KEY);
}

async function chargeCourtEntryFee(userId, amountUsd) {
  if (stripeClient) {
    const intent = await stripeClient.paymentIntents.create({
      amount: Math.round(amountUsd * 100),
      currency: "usd",
      description: `Karmate court entry fee (user ${userId})`,
      // In a real flow you'd pass a payment method / confirm client-side.
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
    });
    return { success: true, provider: "stripe", id: intent.id };
  }
  // mock
  return {
    success: true,
    provider: "mock",
    id: `mock_pi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  };
}

async function payout(userId, amountUsd, reason) {
  if (stripeClient) {
    // Real payouts require Stripe Connect + a connected account; left as a
    // documented extension point rather than faked here.
    console.log(`[payments] TODO real payout via Stripe Connect: user=${userId} amount=${amountUsd} reason=${reason}`);
  }
  return {
    success: true,
    provider: stripeClient ? "stripe(stub)" : "mock",
    amount: amountUsd,
    reason,
  };
}

module.exports = { chargeCourtEntryFee, payout };
