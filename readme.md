# How to Contribute (Beginner Friendly)

Hi! This guide shows you how to add your work to this project.
No Git experience needed. Just follow the steps in order.

---

## What you'll do

1. Make your own copy of this project (called a "fork")
2. Download it to your computer
3. Make your changes
4. Upload your changes
5. Ask the owner to add them

That's it. Let's go.

---

## Step 1 — Make your own copy (Fork)

1. Open this project on GitHub.
2. Click the **Fork** button at the top right.
3. Wait a few seconds. GitHub makes a copy under your name.

✅ You now have your own copy.

---

## Step 2 — Download your copy (Clone)

Open your terminal (Command Prompt, PowerShell, or Terminal).

Type this and press Enter:

```bash
git clone https://github.com/YOUR-USERNAME/REPO-NAME.git
```

⚠️ Replace:
- `YOUR-USERNAME` with your GitHub username
- `REPO-NAME` with the project name

Then go into the folder:

```bash
cd REPO-NAME
```

---

## Step 3 — Tell Git where the original project is

Copy this and press Enter:

```bash
git remote add upstream https://github.com/OWNER-USERNAME/REPO-NAME.git
```

⚠️ Replace `OWNER-USERNAME` with the project owner's GitHub username.

Check it worked:

```bash
git remote -v
```

You should see two lines: `origin` and `upstream`. Good.

---

## Step 4 — Make a new branch

**Never work on `main`.** Always make a new branch.

```bash
git checkout -b my-work
```

You can name it anything, like `my-work` or `login-page`.

---

## Step 5 — Make your changes

Open the files and edit them like normal. Save your work.

---

## Step 6 — Save your changes (Commit)

Type these one at a time:

```bash
git add .
git commit -m "Describe what you did"
```

Example messages:
- `Add login page`
- `Fix button color`
- `Update README`

---

## Step 7 — Upload your changes (Push)

```bash
git push origin my-work
```

⚠️ Use the same branch name you made in Step 4.

If it asks for a password, use a **Personal Access Token** (not your GitHub password).
👉 [How to make one](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)

---

## Step 8 — Ask the owner to add your work (Pull Request)

1. Go to the **original project** on GitHub (not your fork).
2. You'll see a green button: **Compare & pull request**. Click it.
3. Write a short title and description.
4. Click **Create pull request**.

✅ Done! Now wait for the owner to review.

## Backend configuration and deployment

The application uses MySQL for accounts, service catalog, orders, order files, and
payment records; MongoDB for message threads, audit events, and rate limits; Google
OAuth for customer sign-in; and a private Backblaze B2 bucket for uploaded artwork.
Customers pay online through PayMongo Hosted Checkout using GCash. A signed PayMongo
webhook confirms successful payments; browser redirects alone never mark an order as
paid. Walk-in cash and manually recorded GCash references remain pending until an
authorized staff member reviews them. A verified partial payment is recorded against
the balance but does not permit staff to confirm the order; the verified payments
must cover the full order total first. Payment and order changes are then refreshed
for the customer and relevant staff through realtime updates.

### Local setup

1. Copy `.env.example` to `.env` and replace the placeholder credentials. Keep `.env`
   out of source control. `JWT_SECRET` must contain at least 32 random bytes.
2. Create the MySQL database and import `database.sql` into it. The SQL file creates
   missing tables and seeds the service catalog; it does not alter an existing
   schema. Back up and apply reviewed migrations before changing an existing database.
3. Create a least-privilege MySQL application user with access only to this database
   and the `SELECT`, `INSERT`, `UPDATE`, and `DELETE` privileges used by the app.
   Use TLS and a non-empty password outside local development.
4. Create a MongoDB database user and URI-encode special characters in its password.
   Allow the deployment host in the Atlas network access list. The app creates its
   message, audit, and rate-limit indexes on first connection; the MongoDB user must
   be permitted to create indexes in those collections.
   If the local DNS resolver refuses Atlas SRV lookups, set
   `MONGODB_DNS_SERVERS=8.8.8.8,1.1.1.1` in `.env` to use those resolvers for Node.js
   DNS requests made by the app.
5. Create a Google OAuth web client. Add
   `http://localhost:3000/api/auth/google/callback` as an authorized redirect URI
   locally. OAuth is configured using `GOOGLE_CLIENT_ID` and
   `GOOGLE_CLIENT_SECRET`.
6. Create a **private** Backblaze B2 bucket and an application key scoped to that
   bucket with file read and write permissions. Set `B2_REGION`, `B2_KEY_ID`,
   `B2_APPLICATION_KEY`, and `B2_BUCKET_NAME` from the bucket and key details.
   Configure bucket CORS to allow `PUT` from the local app origin and production app
   origin, with the `Content-Type` and `x-amz-meta-order-number` request headers. Do
   not expose the bucket publicly; the app issues short-lived signed upload and
   download URLs.
7. Create a PayMongo account and set its secret API key as `PAYMONGO_SECRET_KEY`.
   In PayMongo's Developers/Webhooks settings, register
   `https://your-domain/api/webhooks/paymongo` (or
   `http://localhost:3000/api/webhooks/paymongo` for local forwarding) and subscribe
   to `checkout_session.payment.paid`. Set that webhook's signing secret as
   `PAYMONGO_WEBHOOK_SECRET`. Use test-mode credentials while developing, and enable
   GCash for the PayMongo account before accepting live payments. After correcting a
   webhook configuration or handler issue, retry its failed delivery from PayMongo;
   a successfully processed event returns HTTP 200 and updates the payment ledger.
8. Register the first account through the app, then provision it as the first lead
   administrator using an administrative database connection:

   ```sql
   START TRANSACTION;
   UPDATE tbl_user SET role = 'lead_admin' WHERE email = 'admin@example.com';
   INSERT INTO tbl_staff_profile (user_id, staff_code, work_status)
   SELECT UID, 'ADMIN001', 'off_duty'
   FROM tbl_user WHERE email = 'admin@example.com';
   COMMIT;
   ```

   Replace both example values with the registered account's email and a unique
   staff code. Afterwards, create staff accounts in the protected Staff Management
   screen. Customers, staff, and administrators all use the same email-and-password
   login form; staff codes remain roster identifiers and are not used to sign in.

### Render deployment

Set the Render build command to `npm run build` and start command to `npm run start`.
Configure the MySQL, MongoDB, Google OAuth, B2, and PayMongo variables from
`.env.example` as Render environment secrets. Set `APP_URL` to the final HTTPS origin and register
`https://your-domain/api/auth/google/callback` as a Google OAuth redirect URI. Set
`MYSQL_SSL=true` and `MONGODB_TLS=true`; production startup rejects disabled TLS,
and the session cookie is Secure in production. Use managed database endpoints
reachable from Render and allow Render's outbound IPs in database access controls.

Never prefix database, OAuth client-secret, JWT, or B2 credentials with
`NEXT_PUBLIC_`; those values must remain server-only.

### Railway deployment

The app uses a custom Node.js entry point (`server.mjs`) to serve both Next.js and
the authenticated WebSocket endpoint at `/realtime` on the same Railway-assigned
`PORT`. Set the Railway build command to `npm run build` and the start command to
`npm start`. Configure the environment variables above, including `APP_URL` as the
public HTTPS origin, and use one running replica while realtime events are held in
process memory. Running multiple replicas requires adding a shared event broker
before scaling; otherwise a client connected to one replica will not receive events
published by another.

The development command (`npm run dev`) also launches this combined server. Do not
replace the start command with `next start`, because that would omit the WebSocket
endpoint.

---

## Step 9 — If the owner asks for changes

Just edit your files again, then:

```bash
git add .
git commit -m "Fix based on feedback"
git push origin my-work
```

Your Pull Request updates automatically. No need to make a new one.

---

## Step 10 — After your work is added (Merged)

Once the owner merges your work, update your copy:

```bash
git checkout main
git pull upstream main
git push origin main
```

---

## Starting your next task

Every time you want to add something new, do this:

```bash
git checkout main
git pull upstream main
git checkout -b new-task-name
```

Then repeat Steps 5 to 8.

---

## Common Problems

**"Permission denied" or "403"**
You're trying to upload to the owner's project. Upload to **your fork** instead:
```bash
git push origin my-work
```

**"Not a git repository"**
You're in the wrong folder. Go into the project folder:
```bash
cd REPO-NAME
```

**"Updates were rejected"**
Get the latest first:
```bash
git pull upstream main
```

**It keeps asking for a password**
Use a Personal Access Token instead of your password.

---

## The Rules

1. **Never work on `main`** — always make a new branch.
2. **One task per branch.**
3. **Write clear commit messages.**
4. **Don't upload `node_modules` or `venv` folders.**
5. **Test your work before asking for a Pull Request.**

---

## All Commands in One Place

Copy-paste ready. Replace the CAPITAL words with your info.

### First time only

```bash
git clone https://github.com/YOUR-USERNAME/REPO-NAME.git
cd REPO-NAME
git remote add upstream https://github.com/OWNER-USERNAME/REPO-NAME.git
git remote -v
```

### Every time you contribute

```bash
git checkout main
git pull upstream main
git checkout -b my-work
# ...edit your files...
git add .
git commit -m "Describe what you did"
git push origin my-work
# ...then open a Pull Request on GitHub...
```

### If the owner asks for changes

```bash
git add .
git commit -m "Fix based on feedback"
git push origin my-work
```

### After your work is merged

```bash
git checkout main
git pull upstream main
git push origin main
```

### Install project dependencies

Ask the owner which one to use:

```bash
npm install                       # for JavaScript projects
pip install -r requirements.txt   # for Python projects
composer install                  # for PHP projects
bundle install                    # for Ruby projects
```

---

## Still stuck?

Ask in the group chat. Don't struggle alone. 🙂