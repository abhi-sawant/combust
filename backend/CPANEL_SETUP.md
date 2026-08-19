# Deploying the Combust backend on MilesWeb cPanel

This guide assumes zero backend experience. Follow it top to bottom. It covers:

1. [Check your PHP version](#1-check-your-php-version)
2. [Create the MySQL database](#2-create-the-mysql-database)
3. [Import the database schema](#3-import-the-database-schema)
4. [Create the `api.combust.slowatcoding.com` subdomain](#4-create-the-apicombustslowatcodingcom-subdomain)
5. [Upload the backend code](#5-upload-the-backend-code)
6. [Create your `.env` file](#6-create-your-env-file)
7. [Set up the mailbox that sends OTP emails](#7-set-up-the-mailbox-that-sends-otp-emails)
8. [Enable HTTPS](#8-enable-https)
9. [Test the API](#9-test-the-api)
10. [Deploy the frontend to `combust.slowatcoding.com`](#10-deploy-the-frontend-to-combustslowatcodingcom)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Check your PHP version

The backend needs **PHP 8.1 or newer**.

1. In cPanel, open **MultiPHP Manager** (search for it in the top search bar if you don't see it).
2. Find your domain (`slowatcoding.com`) in the list.
3. If the PHP version shown is lower than 8.1, select the domain's checkbox, pick **PHP 8.1** (or the highest 8.x available) from the version dropdown, and click **Apply**.

You'll set this again for the `api.` subdomain specifically once you create it in step 4 — MultiPHP Manager lets you set a PHP version per (sub)domain.

## 2. Create the MySQL database

1. Open **MySQL® Databases** in cPanel.
2. Under **Create New Database**, enter a name, e.g. `combust`, and click **Create Database**. cPanel will prefix it with your account username, e.g. `yourcpaneluser_combust` — that's normal, and you'll use the _full_ prefixed name everywhere below.
3. Under **MySQL Users → Add New User**, create a user (e.g. `combust_app`) with a strong password. **Write the password down somewhere safe** — you'll need it in step 6. cPanel will similarly prefix the username, e.g. `yourcpaneluser_combust_app`.
4. Under **Add User to Database**, select the user and the database you just created, click **Add**, then on the privileges screen check **ALL PRIVILEGES** and click **Make Changes**.

You should now have three pieces of information noted down: the full database name, the full username, and the password.

## 3. Import the database schema

1. Open **phpMyAdmin** in cPanel.
2. In the left sidebar, click the database you created (e.g. `yourcpaneluser_combust`).
3. Click the **Import** tab at the top.
4. Click **Choose File** and select [`backend/database/schema.sql`](database/schema.sql) from this project.
5. Scroll down and click **Go**.
6. You should see a success message and 4 new tables listed in the sidebar: `users`, `otp_codes`, `vehicles`, `fuel_entries`.

## 4. Create the `api.combust.slowatcoding.com` subdomain

1. Open **Subdomains** in cPanel (under Domains).
2. For **Subdomain**, enter `api`, and pick `combust.slowatcoding.com` as the domain (if `combust.slowatcoding.com` isn't already set up as its own domain/subdomain, set that up first the same way — it's the frontend's home).
3. For **Document Root**, use whatever cPanel suggests (typically `api.combust.slowatcoding.com`, directly under your home directory) — this project's `backend/` folder is uploaded **directly into that document root**, no `/public` subfolder needed. `index.php` and `.htaccess` sit at the top level of `backend/` for exactly this reason; the `.htaccess` rules block direct access to the `src/`, `database/`, and `.env` that sit alongside them.
4. Click **Create**.
5. Back in **MultiPHP Manager**, find the new `api.combust.slowatcoding.com` subdomain and set it to PHP 8.1+ too, same as step 1.

## 5. Upload the backend code

Pick whichever of these you're more comfortable with. Either way, the **contents** of the `backend` folder (not the `backend` folder itself) go directly into the document root from step 4.

**Option A — File Manager (simplest):**

1. On your computer, select everything *inside* the `backend` folder (`index.php`, `.htaccess`, `src/`, `database/`, `.env.example`, etc.) and zip just those — not the enclosing `backend` folder itself.
2. Open **File Manager** in cPanel and navigate into the document root you set in step 4 (e.g. `api.combust.slowatcoding.com`).
3. Click **Upload**, upload the zip, then go back, right-click it, and choose **Extract**.
4. You should end up with `index.php`, `.htaccess`, `src/`, `database/`, and `.env.example` sitting directly in that folder — not nested inside another folder. In File Manager's **Settings** (gear icon, top right), enable **"Show Hidden Files (dotfiles)"** so you can actually see `.htaccess`.

**Option B — cPanel Terminal + git:**

1. Open **Terminal** in cPanel.
2. `cd` into the document root from step 4, e.g. `cd ~/api.combust.slowatcoding.com`.
3. `git clone <your repo URL> tmp-checkout`, then move just the backend contents up and clean up:
   ```bash
   mv tmp-checkout/backend/* tmp-checkout/backend/.htaccess .
   rm -rf tmp-checkout
   ```

## 6. Create your `.env` file

The `.env.example` file lists every setting the backend needs, but the real `.env` (with your actual database password and secrets) must never be committed to git — you create it directly on the server.

1. In **File Manager**, navigate into the document root (the one containing `index.php`, `src/`, `.env.example`).
2. Select `.env.example`, click **Copy**, and name the copy `.env` (same folder).
3. Right-click `.env` → **Edit**, and fill in:
   - `DB_HOST=localhost`
   - `DB_NAME=` the full prefixed database name from step 2
   - `DB_USER=` the full prefixed username from step 2
   - `DB_PASS=` the password from step 2
   - `JWT_SECRET=` a long random string — open **Terminal** and run the command below, then paste the output here
   - `FRONTEND_URL=https://combust.slowatcoding.com`
   - `MAIL_FROM=` the mailbox you'll create in step 7, e.g. `noreply@combust.slowatcoding.com`
4. Save the file.

Generate a random `JWT_SECRET` by running this in cPanel's **Terminal**:

```bash
php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"
```

If Terminal isn't available for some reason, any long random string works too (e.g. mash your keyboard for 40+ characters) — it just needs to be unpredictable and kept secret.

## 7. Set up the mailbox that sends OTP emails

Signup and password-reset codes are sent with PHP's built-in `mail()` function, which cPanel wires up automatically for addresses on your own domain — no SMTP setup required to start.

1. Open **Email Accounts** in cPanel.
2. Create an account matching `MAIL_FROM` from step 6, e.g. `noreply@combust.slowatcoding.com` (create it under the `combust.slowatcoding.com` domain — if that's not listed as a mail domain yet, `noreply@slowatcoding.com` works too, just keep `.env` consistent with whatever you create).
3. You don't need the mailbox's password for anything — `mail()` sends _as_ that address without logging in, it just needs to exist so the domain's mail setup treats it as legitimate.

## 8. Enable HTTPS

1. Open **SSL/TLS Status** (or **Domains**) in cPanel and confirm AutoSSL has already issued a certificate for `api.combust.slowatcoding.com` (MilesWeb typically runs AutoSSL automatically for new subdomains within a few minutes to an hour).
2. If it hasn't, open **SSL/TLS Status**, select the subdomain, and click **Run AutoSSL**.
3. Once issued, `https://api.combust.slowatcoding.com` should load without a certificate warning.

## 9. Test the API

From your own computer's terminal, run:

```bash
curl -i -X POST https://api.combust.slowatcoding.com/auth/signup/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com"}'
```

You should get back `HTTP/1.1 200` and `{"message":"OTP sent"}`, and an email should land in your inbox within a minute or two (check spam — see [Troubleshooting](#11-troubleshooting) if it doesn't arrive). If instead you get a 500 error, see Troubleshooting below before moving on.

Since `.env` and `src/` sit in the same folder as `index.php` on this setup, also confirm they're actually blocked from direct access:

```bash
curl -i https://api.combust.slowatcoding.com/.env
curl -i https://api.combust.slowatcoding.com/src/Config.php
```

Both should return `403 Forbidden` (from our own `.htaccess` rules), never a `200` with file contents. If either returns `200`, stop and fix this before going further — see [Troubleshooting](#11-troubleshooting).

## 10. Deploy the frontend to `combust.slowatcoding.com`

1. On your computer, in the project root, set the API URL and build:

   ```bash
   echo "VITE_API_URL=https://api.combust.slowatcoding.com" >> .env
   npm run build
   ```

   This produces a `dist/` folder containing static HTML/JS/CSS.

2. In cPanel, make sure `combust.slowatcoding.com` exists as a domain/subdomain (Domains) with its own document root, e.g. `combust_frontend`.
3. Upload the **contents** of `dist/` (not the `dist` folder itself) into that document root, via File Manager (zip + extract, as in step 5) or `git`.
4. Visit `https://combust.slowatcoding.com` — you should see the Combust sign-in screen.

## 11. Troubleshooting

**500 Internal Server Error on any API request**
Open cPanel's **Errors** tool (or File Manager → look for an `error_log` file in the document root) to see the actual PHP error. Common causes: `.env` missing or has a typo in `DB_NAME`/`DB_USER`/`DB_PASS`.

**404 Not Found for every request, including the bare domain**
`index.php` isn't directly inside the document root. In File Manager, navigate to the exact path shown for the subdomain in **Domains**, and confirm `index.php` sits right there — not nested inside an extra folder (a very common zip/extract mistake). If it's one level too deep, move its contents up.

**404 Not Found only for sub-paths (the bare domain loads something, but e.g. `/auth/login` 404s)**
`.htaccess` isn't being read. Confirm `AllowOverride All` is in effect for your account (it is by default on virtually all cPanel/MilesWeb shared plans) and that `.htaccess` uploaded correctly — it's a hidden file, so enable "Show Hidden Files" in File Manager's Settings to confirm it's actually there.

**`curl .../.env` or `curl .../src/Config.php` returns 200 instead of 403**
`.htaccess` isn't being applied (same root cause as the sub-path 404 case above — check `AllowOverride All` and that `.htaccess` actually uploaded). Treat this as urgent: until it's fixed, your database password and JWT secret are publicly downloadable. As an immediate mitigation you can also add empty `index.html` files with no content to `src/` and `database/`, but fixing `.htaccess` is the real fix.

**Sign-in/sign-up requests fail with "Unauthorized" even right after logging in**
Some Apache configs strip the `Authorization` header before PHP ever sees it. The `.htaccess` included here works around this automatically, but if it still doesn't work, check with MilesWeb support whether `mod_rewrite` and header passthrough are enabled for your account.

**OTP emails don't arrive / land in spam**
Open cPanel's **Track Delivery** (or **Email Deliverability**) tool and check the SPF/DKIM status for your domain — MilesWeb usually sets these up by default, but "Email Deliverability" in cPanel will flag anything missing and offer a one-click fix. If delivery is still unreliable after fixing SPF/DKIM, the next step up is sending through a real SMTP provider (e.g. Brevo, Mailgun's free tier) instead of `mail()` — that's a bigger change to `backend/src/Mail/Mailer.php`, worth doing only if `mail()` proves unreliable in practice.

**CORS errors in the browser console** (`No 'Access-Control-Allow-Origin' header...`)
Double check `FRONTEND_URL` in `.env` exactly matches the frontend's real URL, including `https://` and no trailing slash.

**"Invalid or expired code" when verifying an OTP**
Codes expire after 10 minutes and can only be used once — request a new one with "Resend".
