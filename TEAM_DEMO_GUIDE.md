# VS Techsol — Visitor Verification Team Demo Guide

Welcome! This internal tool for **VS Techsol** verifies outside visitors at the gate in two steps: **Host Employee Approval** + **6-Digit Email OTP Verification**.

- **Host Arrival Emails:** Sent via Gmail SMTP directly to the host employee's email (and also visible at `/demo/email-inbox` for seeded `@example.com` demo accounts).
- **Visitor OTP Passcodes:** Sent **exclusively via email** directly to the visitor's email address entered at check-in.

---

## 1. Demo Sign-In Accounts
**Password for all accounts:** `GatePass2026!`

| Role | Username | Opens |
| :--- | :--- | :--- |
| **Security Guard** | `guard1` (or `guard2`) | `/guard` — Register visitors & verify OTP |
| **Host Employee (Finance)** | `anita.desai@example.com` | `/host` — Approve or deny incoming visitors |
| **Host Employee (HR)** | `priya.sharma@example.com` | `/host` |
| **Host Employee (IT)** | `arun.kumar@example.com` | `/host` |
| **Host Employee (Ops)** | `sunita.rao@example.com` | `/host` |
| **Admin** | `admin` | `/admin/log` — View audit timeline & ID records |

---

## 2. How to Test in 1 Minute (5 Quick Steps)

> **Important Tip:** Use a **Normal Window** for the Guard and an **Incognito / Private Window** (`Ctrl+Shift+N`) for the Host Employee so both logins don't overwrite each other. *(For real email testing, enter your own email address as the Visitor Email in Step 1, and optionally add a teammate's real email under `/admin/employees`!)*

1. **Create a Visitor (Normal Window — Guard):**
   - Go to `/login`, sign in as `guard1` / `GatePass2026!`.
   - Tap **New Visitor** &rarr; enter visitor name, **your real email** (to receive the OTP!), and a 10-digit Indian mobile (e.g. `9876543210`).
   - Select **Anita Desai**, pick an ID type (e.g. Aadhaar), and choose **either** **Upload / Take ID Photo** **or** **Enter ID Number**, then tap **Send Request to Host**.
2. **Host Notification:**
   - Real employee emails arrive in their inbox; for seeded `@example.com` accounts, you can also view the arrival link at `/demo/email-inbox`.
3. **Approve as Employee (Incognito Window — Host):**
   - Go to `/login` in Incognito, sign in as `anita.desai@example.com` / `GatePass2026!`.
   - On `/host` (ID photos and ID numbers stay hidden from hosts), tap **Approve Visitor** *(or test **Deny Entry**)*.
4. **Read Email OTP & Verify at Gate:**
   - Check the **visitor's real email inbox** for `"Your VS Techsol Gate Pass Verification Code"` containing the **6-digit code**.
   - Return to the Guard window, enter the 6-digit code *(3 wrong tries locks the pass)*, and see the green **"Accepted. Please send the visitor in."** banner. Tap **Visitor Left** when done.
5. **Audit Log (Admin):**
   - Sign in as `admin` / `GatePass2026!` to open `/admin/log` and inspect the full audit timeline plus the recorded ID photo or ID number.
