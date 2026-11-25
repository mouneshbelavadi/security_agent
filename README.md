# VS Techsol - Internal Visitor Verification System

An internal gate pass and visitor verification web application built for **VS Techsol** security guards, administrators, and employee hosts, powered by PostgreSQL and Gmail SMTP.

---

## 1. Quick Start

### Reset Demo Environment
```bash
npm run demo:reset
```

### Start Application
```bash
npm run build
npm start
# Or for local development:
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 2. Verification Flow

1. **Guard Check-In (`/guard/new`)**: Guard enters visitor Name, Email (where OTP will be sent), Mobile (10-digit Indian), optional Purpose, selects Host Employee, picks an ID Type (`AADHAAR`, `DRIVING_LICENCE`, `VOTER_ID`, `PASSPORT`, `PAN`, `OTHER`), and provides **either** an **ID Photo** **or** an **ID Number**.
2. **Host Notification (Gmail SMTP)**: Nodemailer sends `"A visitor has arrived to meet you"` via Gmail SMTP to the host's email with a button linking to `/host/requests/[id]` (also mirrored in `/demo/email-inbox` for seeded `@example.com` demo hosts).
3. **Host Review (`/host` / `/host/requests/[id]`)**: Host signs in and reviews masked phone, purpose, and optional face photo (ID photo and ID number are strictly hidden from hosts). Clicks **Approve Visitor** or **Deny Entry**.
4. **Visitor OTP via Email**: On approval, a 6-digit OTP is generated, stored only as an HMAC-SHA256 hash (valid 5 minutes), and emailed directly to the visitor's email via Gmail SMTP.
5. **Gate Entry (`/guard/request/[id]`)**: Guard enters the 6-digit code shown by the visitor (max 3 wrong attempts before lockout) to see the green **"Accepted. Please send the visitor in."** banner, then marks **Visitor Left** upon departure.
6. **Admin Audit (`/admin/log`, `/admin/employees`, `/admin/guards`)**: Admin views real-time counters, full audit timelines, ID photos/ID numbers, adds employees with login accounts, and manages guards.

---

## 3. Demo User Accounts & Credentials

All demo accounts share the default demo password (`mustChangePassword: false`):

**Default Demo Password:** `GatePass2026!`

| Role | Username (Login) | Full Name / Department | Initial Route |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | System Administrator | `/admin` |
| **Guard 1** | `guard1` | Gate Guard Alpha | `/guard` |
| **Guard 2** | `guard2` | Gate Guard Bravo | `/guard` |
| **Employee (HR)** | `priya.sharma@example.com` | Priya Sharma (Human Resources) | `/host` |
| **Employee (Finance)** | `anita.desai@example.com` | Anita Desai (Finance) | `/host` |
| **Employee (IT)** | `arun.kumar@example.com` | Arun Kumar (IT & Systems) | `/host` |
| **Employee (Operations)** | `sunita.rao@example.com` | Sunita Rao (Operations & Facilities) | `/host` |

---

## 4. Environment Variables for Vercel Deployment

Set these in **Vercel Project Settings &rarr; Environment Variables**:
- `DATABASE_URL` — PostgreSQL connection string (e.g. Neon Postgres)
- `SESSION_SECRET` — Random 32+ character secret
- `COMPANY_NAME` — `VS Techsol`
- `SMTP_HOST` — `smtp.gmail.com`
- `SMTP_PORT` — `465`
- `SMTP_USER` — Gmail address for SMTP
- `SMTP_PASS` — 16-character Gmail App Password
- `MAIL_FROM` — `"VS Techsol Gate Security <your-gmail@gmail.com>"`
