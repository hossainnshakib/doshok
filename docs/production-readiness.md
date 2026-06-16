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
| `CRON_SECRET` | Yes | | Shared secret for cron job authentication |
| `NEXTAUTH_URL` | Yes | | Must match production deployment URL |

## Payment Credentials

| Variable | Required | Status | Notes |
|----------|----------|--------|-------|
| `BKASH_APP_KEY` | If bKash enabled | | Set only when bKash is ready for production |
| `BKASH_APP_SECRET` | If bKash enabled | | Set only when bKash is ready for production |
| `BKASH_USERNAME` | If bKash enabled | | |
| `BKASH_PASSWORD` | If bKash enabled | | |
| `BKASH_BASE_URL` | If bKash enabled | | Use production URL when live |

> **Note:** bKash/Nagad gateways should remain paused/disabled in PaymentMethodSetting until fully tested and ready.

## Firebase / OTP

If OTP verification is enabled, ensure Firebase project is configured for production:

- Firebase project created and enabled
- Service account credentials set (server-side)
- OTP templates approved (if applicable)

## Deployment Checklist

- [ ] All environment variables configured in production
- [ ] Database migrations applied
- [ ] Payment methods reviewed (COD/bKash enabled/disabled as needed)
- [ ] Cron jobs configured (order cleanup, stock release, etc.)
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
```

> **Do not store real secrets in code or commit them to version control.**
