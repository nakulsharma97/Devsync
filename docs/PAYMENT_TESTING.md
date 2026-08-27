# Payment Gateway Sandbox Testing Guide

This guide covers how to perform **real sandbox testing** of the Stripe and Razorpay payment integrations in the DevSync project. These are manual verification steps using test/sandbox credentials — **not** automated tests.

> **Important:** These tests require real (sandbox) credentials for Stripe or Razorpay.
> Never use production credentials for testing. Never commit credentials to version control.

---

## Prerequisites

1. DevSync backend running locally (or in a test environment)
2. DevSync frontend running locally
3. A Stripe test account (https://dashboard.stripe.com/test/dashboard)
4. OR a Razorpay test account (https://dashboard.razorpay.com/app/keys/test)

---

## Stripe Test Flow

### 1. Configure Stripe Test Credentials

Set the following environment variables:

```bash
export STRIPE_SECRET_KEY=sk_test_...        # Stripe test secret key
export STRIPE_PUBLISHABLE_KEY=pk_test_...   # Stripe test publishable key
export STRIPE_WEBHOOK_SECRET=whsec_...      # Stripe webhook signing secret
export STRIPE_SUCCESS_URL=http://localhost:5173/settings/billing?payment=success
export STRIPE_CANCEL_URL=http://localhost:5173/settings/billing?payment=cancelled
```

### 2. Configure Stripe Price IDs

For RECURRING plans (PRO, ENTERPRISE), Stripe Price IDs are created automatically on first checkout if not set. Alternatively, create them manually:

1. Go to Stripe Dashboard → Products → Create product
2. Add a recurring price (monthly)
3. Copy the `price_...` ID
4. Update the plan in the database:
   ```sql
   UPDATE plans SET stripe_price_id = 'price_...' WHERE code = 'PRO';
   ```

### 3. Start Backend and Frontend

```bash
# Backend
cd backend && mvn spring-boot:run

# Frontend
cd frontend && npm run dev
```

### 4. Forward Webhooks Locally

Use the Stripe CLI to forward webhooks to your local backend:

```bash
# Install Stripe CLI (https://stripe.com/docs/stripe-cli)
stripe login
stripe listen --forward-to localhost:8080/api/billing/webhook/stripe
```

The CLI will output a webhook signing secret (`whsec_...`). Set this as `STRIPE_WEBHOOK_SECRET`.

### 5. Purchase a Recurring Plan

1. Open http://localhost:5173/settings/billing
2. Select the PRO or ENTERPRISE plan
3. Choose "Stripe" as the payment provider
4. Complete checkout using Stripe test card: `4242 4242 4242 4242`
   - Expiry: any future date
   - CVC: any 3 digits
   - Name: any name

### 6. Verify Checkout Session

1. Check the Stripe Dashboard → Payments → Checkout Sessions
2. Confirm the session has `mode=subscription` for recurring plans
3. Verify the session shows the correct plan metadata

### 7. Verify Stripe Subscription

1. Stripe Dashboard → Subscriptions
2. Confirm a new subscription exists
3. Verify the subscription status is `active`
4. Verify the price matches your plan

### 8. Verify DevSync Database Subscription

```sql
SELECT * FROM subscriptions WHERE user_id = '<your_user_id>';
```

- `status` should be `ACTIVE`
- `provider` should be `STRIPE`
- `provider_subscription_id` should start with `sub_`
- `provider_customer_id` should start with `cus_`
- `current_period_end` should be ~30 days in the future

### 9. Verify User Benefits

1. Log in as the test user
2. Verify you can access PRO features:
   - Create more than 2 private projects
   - Access advanced analytics
   - See increased storage limits

### 10. Verify invoice.paid Renewal

Stripe test subscriptions renew monthly. To test renewal:

1. Wait for the subscription period to end (or use Stripe CLI to trigger):
   ```bash
   stripe trigger invoice.paid
   ```
2. Check that `current_period_end` extends by 30 days
3. Check that a new payment record is created in the `payments` table

### 11. Verify Cancellation

1. Click "Cancel Subscription" in the billing UI
2. Verify the subscription shows `cancel_at_period_end = true`
3. Verify access is maintained until period end
4. When the period ends, verify `customer.subscription.deleted` fires
5. Verify the DevSync subscription status becomes `EXPIRED`
6. Verify the user is downgraded to FREE plan

### 12. Verify customer.subscription.deleted

```bash
stripe trigger customer.subscription.deleted
```

1. Verify the DevSync subscription status becomes `EXPIRED`
2. Verify the user is downgraded to FREE plan
3. Verify the user receives an email notification

### 13. Verify Downgrade

1. After cancellation, verify:
   - Private project limit returns to 2
   - Storage limit returns to 1 GiB
   - Advanced analytics is no longer accessible
   - Member limit per project returns to 5

---

## Razorpay Test Flow

### 1. Configure Razorpay Test Credentials

Set the following environment variables:

```bash
export RAZORPAY_KEY_ID=rzp_test_...         # Razorpay test key ID
export RAZORPAY_KEY_SECRET=...              # Razorpay test key secret
export RAZORPAY_WEBHOOK_SECRET=...          # Razorpay webhook secret
```

### 2. Configure Webhook

1. Go to Razorpay Dashboard → Settings → Webhooks
2. Add a webhook endpoint: `https://your-domain.com/api/billing/webhook/razorpay`
   - For local testing, use ngrok: `ngrok http 8080`
3. Subscribe to events: `payment.captured`, `payment.failed`, `refund.processed`

### 3. Start Backend and Frontend

```bash
# Backend
cd backend && mvn spring-boot:run

# Frontend
cd frontend && npm run dev
```

### 4. Create Test Payment

1. Open http://localhost:5173/settings/billing
2. Select the PRO or ENTERPRISE plan
3. Choose "Razorpay" as the payment provider
4. Complete checkout using Razorpay test card: `4111 1111 1111 1111`
   - Expiry: any future date
   - CVC: any 3 digits

### 5. Verify Payment Signature

1. Check Razorpay Dashboard → Payments
2. Confirm the payment shows as "captured"
3. Verify the payment ID matches the `provider_payment_id` in DevSync

### 6. Verify Webhook Delivery

1. Check Razorpay Dashboard → Webhooks → Logs
2. Confirm `payment.captured` event was delivered
3. Confirm the event was processed successfully (HTTP 200 response)

### 7. Verify Payment Record

```sql
SELECT * FROM payments WHERE user_id = '<your_user_id>' ORDER BY created_at DESC LIMIT 1;
```

- `status` should be `SUCCESS`
- `provider` should be `RAZORPAY`
- `provider_payment_id` should be set
- `paid_at` should be set

### 8. Verify Subscription Activation

```sql
SELECT * FROM subscriptions WHERE user_id = '<your_user_id>';
```

- `status` should be `ACTIVE`
- `plan_code` should be `PRO` or `ENTERPRISE`
- `current_period_end` should be ~30 days in the future

### 9. Verify User Benefits

1. Log in as the test user
2. Verify PRO/ENTERPRISE features are accessible
3. Verify entitlements match the purchased plan

### 10. Verify Renewal/Expiry Behavior

**Renewal:**
1. Create a new payment for the same plan
2. Verify the subscription period extends
3. Verify the payment is recorded

**Expiry:**
1. Manually set `current_period_end` in the database to a past date:
   ```sql
   UPDATE subscriptions SET current_period_end = DATE_SUB(NOW(), INTERVAL 1 DAY)
   WHERE user_id = '<your_user_id>';
   ```
2. Trigger an entitlement check (e.g., navigate to billing page)
3. Verify the subscription status becomes `EXPIRED`
4. Verify the user is downgraded to FREE plan

---

## Never Include Real Secrets

- Never commit API keys, webhook secrets, or credentials to version control
- Never include real secrets in documentation or test files
- Always use environment variables for sensitive configuration
- Use test/sandbox credentials for all testing

---

## Verification Checklist

### Stripe

- [ ] Test credentials configured
- [ ] Webhook forwarding working
- [ ] Checkout creates subscription-mode session
- [ ] Subscription activated after payment
- [ ] User benefits match purchased plan
- [ ] invoice.paid renewal extends period
- [ ] Cancellation sets cancel_at_period_end
- [ ] customer.subscription.deleted expires subscription
- [ ] User downgraded to FREE after expiry

### Razorpay

- [ ] Test credentials configured
- [ ] Webhook endpoint registered
- [ ] Order creation works
- [ ] Payment verification works
- [ ] Webhook delivery confirmed
- [ ] Subscription activated after payment
- [ ] User benefits match purchased plan
- [ ] Renewal extends subscription period
- [ ] Expiry reverts to FREE plan
