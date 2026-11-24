# Visitor Verification System

A production-grade, internal gate pass web application for company security guards, administrators, and employee hosts powered by PostgreSQL.

---

## 1. Quick Start for Client Demo

### Reset Demo Environment
Run the demo reset script to wipe any prior visitor passes, clear the SMS outbox, and re-seed clean accounts:
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

## 2. 10-Line Demo Script

1. Open Mailpit at `http://localhost:8025` and the simulated SMS inbox at `http://localhost:3000/demo/sms-inbox` in a second browser window (acts as the visitor's phone).
2. Sign in as a security guard at `http://localhost:3000/login` with username `guard1` and password `GatePass2026!`.
3. Click "New Visitor" and enter visitor details: Name "Sunil Gowda", Email "sunil.gowda@example.com", and Mobile "9876543210".
4. Search for host employee "Priya Sharma" (Human Resources) and select her.
5. Choose ID type "Aadhaar Card", capture an ID photo, and click "Send Request to Host".
6. Open a new incognito window, navigate to `http://localhost:3000/login`, and sign in as the employee (`priya.sharma@example.com` / `GatePass2026!`).
7. On the employee dashboard at `/host` (or via the email button in Mailpit), review the visitor details and press the green "Approve Visitor" button.
8. Switch to the second window (`/demo/sms-inbox`) to see the incoming SMS passcode (e.g. `123456`) valid for 5 minutes.
9. On the guard screen (`/guard/request/[id]`), enter the 6-digit code to immediately see the large green banner: "Accepted. Please send the visitor in."
10. Sign in as admin (`admin` / `GatePass2026!`) and open `/admin/log` to view the real-time summary strip, full audit timeline, and captured ID card.

---

## 3. Demo User Accounts & Credentials

All demo accounts share the same default demo password (`mustChangePassword: false`):

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

## 4. Key Demo Pages & Endpoints

- **Guard Intake & Verification Terminal**:
  - Home: `http://localhost:3000/guard`
  - New Visitor Check-In: `http://localhost:3000/guard/new`
  - Live Verification Status: `http://localhost:3000/guard/request/[id]`
  - Today's Gate Visitors: `http://localhost:3000/guard/today`
- **Employee Host Portal**:
  - Host Dashboard (pending requests & decisions): `http://localhost:3000/host`
  - Dedicated Request Review: `http://localhost:3000/host/requests/[id]`
- **Visitor Simulated Handset**:
  - Live Auto-Refreshing SMS Inbox (3s): `http://localhost:3000/demo/sms-inbox`
- **Admin Management Portal**:
  - Visitor Log & Audit Review: `http://localhost:3000/admin/log`
  - Employee Directory & Login Creation: `http://localhost:3000/admin/employees`
  - Security Guard Account Management: `http://localhost:3000/admin/guards`
- **Local Mailpit Email UI**:
  - Web Inbox: `http://localhost:8025` (SMTP port `1025`)

---

## 5. Security & Privacy Invariants

- **On-Premise & Air-Gapped**: Fully local. Zero external CDNs, fonts, or analytics; bundled Inter Variable font and Lucide icons.
- **Privacy Enforcement**: ID card photos and ID types are strictly restricted to authenticated guard and admin sessions. Host employees never receive or see visitor ID cards.
- **Server-Enforced Host Isolation**: Host endpoints verify on every query that `hostId === employee.id`. Cross-employee access returns `403 Forbidden`.
- **OTP Security**: 6-digit OTP is hashed using SHA-256 in the database. Guard terminal locks permanently after 3 incorrect attempts.
