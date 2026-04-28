# Lottery Purchase System (LPS) - Web App

This is the updated Phase 2 LPS program as a polished web app instead of the earlier Tkinter desktop GUI.

## What changed

- Runs in the browser as a real web app UI.
- Ready to host on Vercel as a static site.
- No demo user/password is preloaded.
- Users can register and immediately log in with the credentials they created.
- The first admin account is created through the Admin Setup tab, so there is no hardcoded admin password.
- Customer features, admin features, Claiming Center verification, and Regulatory Agency reporting are implemented in the UI.

## Files

- `index.html` - app entry page
- `styles.css` - visual design and layout
- `app.js` - all app logic and localStorage persistence
- `vercel.json` - small Vercel config

## Run locally

Open `index.html` in your browser.

For the best local test, use VS Code Live Server or run this from the folder:

```bash
python3 -m http.server 3000
```

Then open:

```text
http://localhost:3000
```

## Deploy to Vercel

1. Create a new GitHub repository.
2. Upload these files to the repository root:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `vercel.json`
3. Go to Vercel.
4. Click **Add New Project**.
5. Import the GitHub repository.
6. For framework preset, choose **Other** or leave it as static.
7. Click **Deploy**.

## How to demo for Phase 2

1. Open the web app.
2. Register a customer account.
3. Log out and log back in to prove login persistence works.
4. Browse tickets and purchase a ticket.
5. Show Order History and the generated e-ticket/confirmation number.
6. Create the first admin account from Admin Setup.
7. Admin: update a ticket's winning numbers.
8. Customer: return to Order History and show winning status/online claim if under $600.
9. Admin: verify $600+ claim through Claiming Center.
10. Admin: show Regulatory Reports and mark a report as sent to the Regulatory Agency.

## Important note

This is a front-end web app prototype for the class project. It stores data in browser localStorage so it works immediately on Vercel without a backend database. A real lottery system would require server-side authentication, a database, secure payment integrations, and compliance review.
