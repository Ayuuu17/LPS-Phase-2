# Lottery Purchase System (LPS) - Requirements-Final Web App

This is the Vercel-ready browser web application version of the Lottery Purchase System for Phase 2.

## What is included

- Login / Registration screen with full name, email, home address, phone number, password, Login button, Register link, and inline red field errors
- Customer registration with email verification
- Customer login with two-step verification
- One fixed administrator account only
- Home screen with links to Browse Lottery Tickets, Search, Order History, Profile Page, and Previous Winning Numbers
- Browse tickets page with ticket cards showing name, cost, drawing date, prize amount, and winning numbers
- Ticket detail screen with drawing date, price, winning amount structure, and a Buy button
- Purchase screen with ticket quantity selection, five numbers per ticket, manual number entry, Auto-Select, and Proceed to Checkout
- Cart system with a 10-ticket maximum per checkout transaction
- Checkout/payment screen with order summary, radio buttons for PayPal/Venmo/Bank Account only, masked sensitive payment account field, and Confirm Purchase
- Electronic ticket generation with unique ticket number and confirmation number
- Printable/mobile-displayable ticket details
- Order history and order detail pages with winning indicators, drawn winning numbers, pending label where applicable, and prize amount
- Claim winnings screen for prizes of $599 or less with PayPal/Venmo/Bank Account direct deposit form
- $600+ claiming-center instruction message
- Claiming Center verification for prizes of $600 or more
- Regulatory/IRS reporting records for $600+ verified claims
- Admin dashboard with total tickets sold and total revenue metrics
- Admin ticket management: add, edit, deactivate/remove, update cost, update prize amount, update winning numbers
- Internal Email Service log for verification, purchase, winner, and claim messages
- Optional real email sending through a Vercel serverless API using Resend

## Fixed admin account

There is no customer demo account. Customers must register themselves.

Admin login:

```text
Email: admin@lps.local
Password: Admin@2026!
```

After entering the admin password, LPS sends a two-step verification code. Because the fixed admin email uses a local prototype address, the admin code is always available in the **Email Service Preview / Verification Codes** dropdown on the login page. Customer verification emails can send through Resend when your Vercel environment variables are configured correctly.

## Run locally

```bash
cd LPS_Web_App_Requirements_Final
python3 -m http.server 3000
```

Open:

```text
http://localhost:3000
```

You can also double-click `index.html`, but the email API route only works when hosted on Vercel.

## Host on Vercel

Put these files at the root of your GitHub repo:

```text
index.html
styles.css
app.js
vercel.json
package.json
api/send-email.js
```

Recommended Vercel settings:

```text
Framework Preset: Other
Build Command: leave blank
Output Directory: leave blank
Install Command: leave blank
Root Directory: leave blank, unless files are inside a subfolder
```

## Email service with Resend

In Vercel, add these environment variables:

```text
RESEND_API_KEY=re_your_actual_token_key_here
RESEND_FROM_EMAIL=LPS <onboarding@resend.dev>
```

Use the Resend **token** that starts with `re_`, not the API key ID. After saving the variables, redeploy the Vercel project.

For a production-style sender, verify a domain in Resend and use:

```text
RESEND_FROM_EMAIL=LPS <noreply@yourdomain.com>
```

If Resend is not configured or rejects a message, the app still stores the message in the internal LPS Email Service table so the project demo remains functional.

## Important note for grading

This is a working academic prototype. It uses browser localStorage for persistence so it can run immediately on Vercel without requiring a database setup. For a real production lottery system, authentication, payment processing, email, and storage would need to be moved to secure backend services and a real database.
