# Production Readiness Checklist

## Environment Variables

| Variable | Required | Status | Notes |
|----------|----------|--------|-------|
| `NEXTAUTH_SECRET` | Yes | | Must be a strong, unique production value (not dev default). Generate with: `openssl rand -base64 32` |
| `NEXT_PUBLIC_SITE_URL` | Yes | | Set to https://doshok.com (or your production domain) |
| `DATABASE_URL` | Yes | | Production PostgreSQL connection string with SSL |
| `RESEND_API_KEY` | Yes | | Production Resend API key for transactional emails |
| `CLOUDINARY_CLOUD_NAME` | Yes | | Cloudinary cloud name for image uploads |
| `CLOUDINARY_API_KEY` | Yes | | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes | | Cloudinary API secret — do not expose client-side |
| `FROM_EMAIL` | Yes | | Sender address; must match a verified Resend domain. E.g. `Doshok <noreply@doshok.com>` |
| `ADMIN_EMAIL` | Yes | | Recipient for contact form & admin notifications |
| `OTP_FROM_EMAIL` | Yes | | Sender for OTP emails; must match a verified Resend domain |
| `CRON_SECRET` | Yes | | Shared secret for cron job authentication |
| `NEXTAUTH_URL` | Yes | | Must match production deployment URL |

## Payment Credentials

| Variable | Required | Status | Notes |
|----------|----------|--------|-------|
> **Note:** Only Cash on Delivery (COD) is currently supported. Online payment and advance-payment settings are paused until a clean bKash/Nagad rebuild is planned and implemented.

## Email (Resend-only — no SMTP/nodemailer)

All transactional emails are sent via Resend. No SMTP or nodemailer setup is needed.

- **Domain verification:** Resend requires you to verify a sending domain (`doshok.com`) before you can send from addresses like `noreply@doshok.com` or `otp@doshok.com`. Add the provided DNS TXT records to your domain.
- **From addresses** must use the format `"Display Name <address@verified.domain>"` — e.g. `FROM_EMAIL="Doshok <noreply@doshok.com>"`.
- **API key:** Set `RESEND_API_KEY` in your production environment variables.

## Firebase / OTP

If OTP verification is enabled, ensure Firebase project is configured for production:

- Firebase project created and enabled
- Service account credentials set (server-side)
- OTP templates approved (if applicable)

## Deployment Checklist

- [ ] All environment variables configured in production
- [ ] Database migrations applied
- [ ] Payment methods reviewed (COD enabled; online payment settings paused)
- [ ] Cron jobs configured (`/api/cron/release-reservations` active for reservation stock release)
- [ ] Rate limiting enabled and tuned
- [ ] SSL/TLS enforced
- [ ] CORS configured if needed
- [ ] Logging/monitoring set up
- [ ] Error tracking (Sentry, etc.) configured
- [ ] CDN/caching configured for static assets
- [ ] Sitemap and robots.txt verified

## Post-Deployment Verification

```bash
# Sitemap
curl -i https://doshok.com/sitemap.xml

# Robots
curl -i https://doshok.com/robots.txt

# Order API data leak test
curl -i "https://doshok.com/api/orders?phone=01300000000"

# Stories draft leak test
curl -i "https://doshok.com/api/stories?status=all"

# Checkout with disabled COD (if COD disabled)
# Should reject with error

# Checkout with COD enabled
# Should create paymentMethod=cod, paidAmount=0, paymentStatus=pending, payNow=0, dueAmount=total

# Cron: release expired reservations
curl -i -X POST https://doshok.com/api/cron/release-reservations \
  -H "Authorization: Bearer $CRON_SECRET"

# Cron: expired online payment cancellation
# Do not schedule /api/cron/cancel-expired-payments in COD-only V1.1.
# The protected route remains available as a paused no-op until online payments are rebuilt.
```

> **Do not store real secrets in code or commit them to version control.**
