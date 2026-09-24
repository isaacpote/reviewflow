import Stripe from "stripe";

export const isStripeMocked = process.env.STRIPE_MOCK !== "false";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Set STRIPE_MOCK=true to use mock mode, or add your Stripe test key."
    );
  }
  _stripe = new Stripe(key);
  return _stripe;
}
