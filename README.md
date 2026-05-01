# Lottery Purchase System (LPS) - Requirements-Final Web App

This is the browser web application of the Lottery Purchase System for Phase 2.

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
- Real email sending through a Vercel serverless API using Resend

## Fixed admin account

There is no customer demo account. Customers must register themselves.

Admin login:
Email: admin@lps.local
Password: Admin@2026!


The admin account logs in directly with the fixed credentials. No admin registration or admin setup screen exists. Customer registration and customer login still use email verification/two-step codes, which can send through Resend when your Vercel environment variables are configured correctly.

If Resend is not configured or rejects a message, the app still stores the message in the internal LPS Email Service table so the project demo remains functional.
