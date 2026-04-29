# Deploy LPS to Vercel

## 1. Make sure GitHub has the correct structure

Your repo should look like this at the first page/root:

```text
index.html
styles.css
app.js
vercel.json
package.json
api/
  send-email.js
README.md
```

Do not upload a folder that contains these files unless you set that folder as Vercel's Root Directory.

## 2. Import into Vercel

1. Go to Vercel.
2. Add New Project.
3. Import your GitHub repo.
4. Use these settings:

```text
Framework Preset: Other
Build Command: leave blank
Output Directory: leave blank
Install Command: leave blank
Root Directory: leave blank, unless your files are inside a subfolder
```

5. Deploy.

## 3. Fixing the 404 error

If you see:

```text
404: NOT_FOUND
```

The most common issue is that `index.html` is not at the deployment root. Move the files to the root of the repo or set the Root Directory to the folder that contains `index.html`.

The included `vercel.json` rewrites non-API routes to `index.html` so the single-page app will load correctly.

## 4. Real email setup with Resend

The app works without Resend because it has a simulated internal mail queue. For real email, add environment variables in Vercel:

```text
RESEND_API_KEY=re_your_actual_token_key_here
RESEND_FROM_EMAIL=LPS <onboarding@resend.dev>
```

Important:
- Use the Resend **token** that starts with `re_`.
- Do not use the API key ID.
- Do not paste `const resend = new Resend(...)` into frontend files.
- Do not put the token in `app.js`, `index.html`, or `styles.css`.

After adding or editing environment variables, go to **Deployments** and click **Redeploy**.

## 5. Testing email

1. Register a customer with an email address Resend is allowed to send to.
2. Check your inbox for the verification code.
3. Also check the app's **Email Service Preview** on the login screen or the admin **Email Service** page.
4. If status says `failed`, read the provider message in the Email Service table.
