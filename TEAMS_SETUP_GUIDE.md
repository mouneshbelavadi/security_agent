# Microsoft Teams 1-Click Approval Setup (Microsoft 365)

Follow these steps once to send **zero arrival emails to HR or host employees** and let them click **Approve Entry / Deny Entry** directly inside Microsoft Teams (while still emailing the 6-digit OTP to the visitor upon approval).

---

## Step 1: Create the Power Automate Flow (3 Minutes)

1. Open **Power Automate** (`https://make.powerautomate.com`) signed into your company **Microsoft 365** account (or open the **Workflows** app inside Microsoft Teams).
2. Click **Create** -> **Automated / Instant cloud flow** -> select **When an HTTP request is received** as the trigger.
3. Click **Use sample payload to generate schema** and paste this JSON:

```json
{
  "requestId": "cmww0exampleid",
  "callbackUrl": "https://your-app.vercel.app/api/integrations/teams/decision",
  "callbackSecret": "secret",
  "approveUrl": "https://your-app.vercel.app/host/requests/cmww0exampleid",
  "hostEmail": "hr@yourcompany.com",
  "hostName": "Sunita Rao",
  "hostDepartment": "Human Resources",
  "visitorName": "Ramesh Sharma",
  "visitorPhoneMasked": "******3210",
  "purpose": "Interview",
  "arrivalTime": "10:30 AM",
  "expiryMinutes": 10
}
```

4. Add **Action 1**: Search **Microsoft Teams** -> select **Post adaptive card in a chat or channel and wait for a response**:
   - **Post as**: `Flow bot`
   - **Post in**: `Chat with Flow bot` *(sends a private 1-on-1 DM directly to that specific HR/host employee without cluttering channels or emails)*
   - **Recipient**: Select dynamic content **`hostEmail`**
   - **Update message**: `Decision recorded. Thank you!`
   - **Message** (Adaptive Card JSON):

```json
{
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "type": "AdaptiveCard",
  "version": "1.4",
  "body": [
    {
      "type": "TextBlock",
      "text": "VS Techsol - Gate Visitor Approval",
      "weight": "Bolder",
      "size": "Medium",
      "color": "Accent"
    },
    {
      "type": "TextBlock",
      "text": "A visitor is waiting at the gate. Approving will email a 6-digit OTP to the visitor.",
      "wrap": true
    },
    {
      "type": "FactSet",
      "facts": [
        { "title": "Visitor", "value": "@{triggerBody()?['visitorName']}" },
        { "title": "Mobile", "value": "@{triggerBody()?['visitorPhoneMasked']}" },
        { "title": "Purpose", "value": "@{triggerBody()?['purpose']}" },
        { "title": "Arrived", "value": "@{triggerBody()?['arrivalTime']}" }
      ]
    }
  ],
  "actions": [
    {
      "type": "Action.Submit",
      "id": "APPROVE",
      "title": "Approve Entry",
      "style": "positive",
      "data": {
        "decision": "APPROVE",
        "requestId": "@{triggerBody()?['requestId']}"
      }
    },
    {
      "type": "Action.Submit",
      "id": "DENY",
      "title": "Deny Entry",
      "style": "destructive",
      "data": {
        "decision": "DENY",
        "requestId": "@{triggerBody()?['requestId']}"
      }
    }
  ]
}
```

5. Add **Action 2**: Search **HTTP** -> select **HTTP** request:
   - **Method**: `POST`
   - **URI**: Select dynamic content **`callbackUrl`**
   - **Headers**:
     - `Content-Type`: `application/json`
     - `x-teams-secret`: Select dynamic content **`callbackSecret`**
   - **Body**:

```json
{
  "requestId": "@{triggerBody()?['requestId']}",
  "decision": "@{outputs('Post_adaptive_card_in_a_chat_or_channel_and_wait_for_a_response')?['body/submitActionId']}",
  "responderEmail": "@{outputs('Post_adaptive_card_in_a_chat_or_channel_and_wait_for_a_response')?['body/responder/email']}",
  "responderName": "@{outputs('Post_adaptive_card_in_a_chat_or_channel_and_wait_for_a_response')?['body/responder/displayName']}"
}
```

6. Click **Save**. Expand **When an HTTP request is received** and copy the generated **HTTP POST URL**.

> Note: Your Vercel deployment URL must be publicly reachable by Microsoft Power Automate so the **HTTP** callback step can reach `callbackUrl`. If testing locally, expose port 3000 via `ngrok` or VS Code Dev Tunnels and set `APP_BASE_URL` to that tunnel URL.

---

## Step 2: Configure Environment Variables

Add these variables to your local `.env` (for local testing) **and** in **Vercel -> Project Settings -> Environment Variables**:

```env
HOST_NOTIFICATION_MODE="teams"
TEAMS_WORKFLOW_URL="https://prod-xx.centralindia.logic.azure.com:443/workflows/..."
TEAMS_WEBHOOK_SECRET="replace_with_a_strong_shared_secret"
```

- While `TEAMS_WORKFLOW_URL` is set (`HOST_NOTIFICATION_MODE="auto"` or `"teams"`):
  - **Employees / HR receive zero arrival emails** — only their Teams DM card.
  - Once they click **Approve Entry**, the backend generates the 6-digit OTP, emails the OTP **only to the visitor**, and updates the guard's gate screen live.
