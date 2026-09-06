# BID-CHAIN — Login, Register & Quote Upload

This package adds real accounts and file-upload quote requests to the BID-CHAIN site, backed by Supabase (database + auth + file storage).

## Files

```
bid-chain/
├── login.html          Login page
├── register.html       Register page (name, email, phone, company, password)
├── quote.html           Updated Request Quote page (CAD/photo upload + job details)
├── css/style.css        Shared styling, matched to the BID-CHAIN brand
├── js/
│   ├── supabase-config.js   <- put your Project URL + anon key here
│   ├── auth.js               Shared login/register/session helpers
│   └── quote.js              Upload + submit logic for the quote page
└── sql/schema.sql        Run this once in Supabase to create the database
```

## Setup (10 minutes)

**1. Create your Supabase project** (if you haven't already) at supabase.com — free tier is enough to start.

**2. Run the database schema.**
In your Supabase project: **SQL Editor → New query** → paste the entire contents of `sql/schema.sql` → Run.

**3. Create the storage bucket** (if the SQL script didn't already create it):
**Storage → New bucket** → name it exactly `quote-files` → set it to **Private** (not public) → Create.

**4. Connect your credentials.**
Go to **Project Settings → API**, copy:
- **Project URL**
- **anon public** key (NOT the `service_role` key — never expose that one)

Paste them into `js/supabase-config.js`:
```js
const SUPABASE_URL = "https://your-project-ref.supabase.co";
const SUPABASE_ANON_KEY = "your-anon-public-key";
```

**5. (Optional) Turn off email confirmation for testing.**
By default, Supabase requires users to click a confirmation link in their email before they can log in. To test faster during development:
**Authentication → Providers → Email → toggle off "Confirm email"**.
Turn it back on before going live, so real accounts are verified.

**6. Host the files.**
Upload this folder to any static host — Vercel, Netlify, GitHub Pages, or Hostinger's file manager (not the AI Builder) all work, since these are plain HTML/CSS/JS files with no server required.

## How it works

- **Register** creates a Supabase Auth user (email + password, hashed automatically) and a matching row in the `profiles` table with name, phone, and company.
- **Login** authenticates against Supabase Auth and starts a session (stored in the browser).
- **Quote page** checks for a session on load. Logged-out visitors see a banner prompting login and can't submit. Logged-in users can attach DXF/DWG/PDF/image files, which upload to a private Supabase Storage bucket, then a row is added to `quote_requests` linking their account, job details, and the uploaded file paths.
- **Security:** Row Level Security is enabled on every table and the storage bucket, so each user can only ever see their own profile and their own quote requests — enforced by the database itself, not just the frontend.

## Still needed before this can go live

- **Staff/admin view.** Right now nobody but the customer who submitted a quote can see it — there's no dashboard yet for whoever at BID-CHAIN needs to review incoming requests and respond with pricing. The schema file has a commented-out starting point for this (an `is_staff` flag) — let me know who needs that access and I'll build the admin view.
- **Linking the nav.** The existing `home.html` / `Capabilities.html` / `Process.html` pages should point their "Request Quote" links to the new `quote.html`, and probably gain a "Log In" link in the header too.
- **Email confirmation copy/branding** — Supabase's default confirmation email is plain; you can customize it under Authentication → Email Templates.
