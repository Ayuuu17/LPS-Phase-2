# Quick Vercel Deployment Steps

## Option A: GitHub + Vercel

1. Create a new GitHub repository named something like `lps-web-app`.
2. Upload these four files to the root of the repo:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `vercel.json`
3. Open Vercel.
4. Click **Add New... > Project**.
5. Import the GitHub repo.
6. Keep framework as **Other** or static/default.
7. Click **Deploy**.

## Option B: Vercel CLI

From inside the app folder:

```bash
npm i -g vercel
vercel
```

Follow the prompts. Use the current folder as the project root.

## Local Test Before Hosting

```bash
cd LPS_Web_App_Vercel_Ready
python3 -m http.server 3000
```

Then open:

```text
http://localhost:3000
```
