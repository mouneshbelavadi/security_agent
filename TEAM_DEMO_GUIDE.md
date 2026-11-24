# Visitor Verification App - Team Demo Guide

Welcome! This app verifies outside visitors at the company gate in two steps: **Host Employee Approval** + **6-Digit OTP Verification**.

*(For this demo preview, real emails and SMS are simulated at `/demo/email-inbox` and `/demo/sms-inbox` so anyone on the team can test end-to-end without setting up mail or SMS gateways.)*

---

## 1. Test Login Accounts
**Password for all accounts:** `GatePass2026!`

| Role | Username | Opens |
| :--- | :--- | :--- |
| **Security Guard** | `guard1` (or `guard2`) | `/guard` — Check in visitors & verify OTP |
| **Host Employee (Finance)** | `anita.desai@example.com` | `/host` — Approve or deny incoming visitors |
| **Host Employee (HR)** | `priya.sharma@example.com` | `/host` |
| **Host Employee (IT)** | `arun.kumar@example.com` | `/host` |
| **Host Employee (Ops)** | `sunita.rao@example.com` | `/host` |
| **Admin** | `admin` | `/admin/log` — View audit timeline & ID cards |

---

## 2. How to Test in 1 Minute (5 Quick Steps)

> **Important Tip:** Use a **Normal Window** for the Guard and an **Incognito / Private Window** (`Ctrl+Shift+N`) for the Host Employee so both logins don't overwrite each other.

1. **Create a Visitor (Normal Window — Guard):**
   - Go to `/login`, sign in as `guard1` / `GatePass2026!`.
   - Tap **New Visitor** &rarr; enter any visitor name, email, and a 10-digit Indian mobile starting with 6-9 (e.g. `9876543210`).
   - Select **Anita Desai**, pick an ID type (e.g. Aadhaar), upload any sample image as the ID card, and tap **Send Request to Host**.
2. **See the Notification Email (New Tab):**
   - Open `/demo/email-inbox` (no login required) to view the simulated email sent to Anita.
3. **Approve as Employee (Incognito Window — Host):**
   - Go to `/login` in Incognito, sign in as `anita.desai@example.com` / `GatePass2026!`.
   - On `/host`, notice the visitor's ID photo is hidden for privacy. Click **Approve Visitor** *(or test **Deny Entry**)*.
4. **Verify OTP at the Gate (Visitor Phone + Guard Window):**
   - Open `/demo/sms-inbox` (no login required, auto-refreshes every 3s) to read the visitor's **6-digit code**.
   - Return to the Guard window, enter the 6-digit code *(3 wrong tries locks the request)*, and see the green **"Accepted. Please send the visitor in."** banner. Tap **Visitor Left** when done.
5. **Audit Log (Admin):**
   - Sign in as `admin` / `GatePass2026!` to open `/admin/log` and click any row to inspect the full timeline and captured ID document.
