<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# SkillShelf — the whole plan (agent.md)

This file is the single source of truth for what we are building and in what
order. It is named `agent.md`; on this Mac the disk is case-insensitive, so it
is the same file as `AGENTS.md`. The Next.js rules above stay untouched.

Live site: **https://skillshelf-six.vercel.app**
Health check: **https://skillshelf-six.vercel.app/api/health**
GitHub: **github.com/Exoxa/skillshelf** (push to `main` deploys on Vercel)

---

## 1. What we are building

A small online course shop for **one trainer in Lagos, Nigeria**.

- The trainer writes courses with video lessons.
- A student creates an account, pays in naira by card, and then opens the
  lessons.
- Only a student who has paid can open a lesson video. The check happens on the
  server, every single time.
- The design is phone-first. Most students arrive on a phone over mobile data.
- Language is simple everyday English, not marketing filler.
- No coupons, reviews, certificates, subscriptions, live chat or multi-trainer
  features. One trainer, one shop.

### Fixed rules

1. **Paid-only access.** Every lesson video request is checked against the
   student's enrolment on the server. Hiding buttons is never the protection.
2. **Prices are whole naira in the interface, kobo in the database.** `₦15,000`
   is stored as `1500000`. Never a decimal.
3. **Secrets stay on the server.** The Supabase service-role key and the
   Paystack secret key never reach the browser or git.
4. **Lifetime access.** One payment unlocks a course forever. Refunds are done
   by hand in Paystack, and access is removed by hand if needed.
5. **"Delete" means unpublish once anyone has paid.** A course with sales cannot
   be destroyed, because students paid for it.
6. **Progress is manual.** The student ticks a lesson when she finishes it. No
   automatic tracking that can lie.
7. **No videos in git. Ever.**
8. **The site must work on a phone first.** Buttons are thumb-sized, text is
   readable without zooming, pages are short.

---

## 2. Stack and why

| Piece | Choice | Why |
|---|---|---|
| Framework | Next.js 16 App Router, TypeScript, Tailwind 4 | One codebase for pages and server code; server checks are natural |
| Hosting | Vercel | Free while building, push-to-deploy from GitHub |
| Database, login, storage | Supabase | Postgres + auth + private file storage in one free project |
| Payments | Paystack (test first, then live) | Naira cards, bank transfer and USSD for Nigerian students |
| Email | Resend | Simple transactional email for the welcome message |
| Repo | GitHub `Exoxa/skillshelf` | Required deliverable: code on GitHub |
| Video later | Cloudflare Stream | Replaces Supabase Storage when videos get longer or playback must be fast on mobile data |

### Cost notes

- Vercel Hobby is **non-commercial**. Before real students pay, move to Pro
  (~$20/month).
- Supabase free plan is fine to start: 500 MB database and 1 GB file storage.
  The 50 MB per-video cap comes from this plan.
- Cloudflare Stream is about $5/month when we switch.
- Paystack charges per successful transaction; test mode is free.
- A domain is needed before real money. The free `vercel.app` address is fine
  while testing.

---

## 3. Stages, beginning to end

Each stage is approved before the next one starts. A stage is done only when it
works locally, works on the live site, and the checks below pass.

### Stage 0 — Skeleton
**Goal:** a real, deployed starting point.

- Next.js app with header, footer, fonts, colours, home page.
- `/api/health` reports which services have keys, without printing keys.
- Deployed to Vercel from GitHub.

**Done when:** the live URL opens on a phone and the health check says
`"ready": true` once Supabase keys exist.

### Stage 1 — Accounts
**Goal:** students and the one trainer can sign in safely.

- Email/password signup, login, sign out, forgot password, reset password.
- `profiles` table with `student` / `trainer` role; a database trigger creates a
  profile for every new user.
- Row Level Security on every table.
- The first account is promoted to trainer by hand in SQL. Only one trainer.
- `/trainer`, `/my-courses`, `/learn`, `/checkout` require a signed-in user.
- Trainer pages also check the role on the server; a student gets `/no-access`.

**Done when:** signup and login work, a student cannot open `/trainer`, and
password reset returns to the live site.

### Stage 2 — Courses and lessons
**Goal:** the trainer can build a course without touching SQL.

- Trainer dashboard lists courses.
- Create, edit, publish, unpublish and delete courses.
- Slugs are fixed after creation so shared links never break.
- Add, edit, reorder, hide and delete lesson titles.
- A course with sales cannot be deleted (unpublish instead).

**Done when:** the trainer can create a course with lessons from a phone and see
them listed.

### Stage 3 — Public pages
**Goal:** a visitor can understand the shop and what is locked.

- Home page shows published course cards: title, short description, price in
  naira, lesson count.
- Course page shows the full description and every lesson title with a lock
  icon and a Buy button.
- Drafts are visible only to the trainer.
- Guests are invited to sign in; signed-in students see an honest note until
  payments are switched on.

**Done when:** the public shop looks right on a phone and no lesson opens for a
student who has not paid.

### Stage 4 — Video
**Goal:** private lesson videos with server-checked playback.

- One private Supabase Storage bucket, `lesson-videos`. No public file URLs.
- Upload from the browser straight to storage using a one-off signed link, so
  large files never pass through Vercel's 4.5 MB request limit.
- `lesson_assets` records the file; replaced files are deleted.
- Deleting a lesson or course deletes its files.
- Playback only through `/api/lessons/[lessonId]/video`, which checks login,
  course, lesson visibility and enrolment, then redirects to a signed URL that
  expires after one hour.
- Trainer can preview exactly what a student sees.

**Done when:** trainer watches a lesson; a student who has not paid is sent back
to the course page; a guest is sent to login.

### Stage 5 — Payments (current)
**Goal:** a real test-mode Paystack payment unlocks the course.

**Flow, step by step:**

1. Student taps **Buy this course** and lands on `/checkout/[slug]`.
2. The server creates a `payments` row with status `pending`, a unique
   reference (ours), the course, the student, and the exact amount in kobo.
3. The server calls Paystack `transaction/initialize` with that reference, the
   student's email, the amount, the callback URL and metadata.
4. The student pays on Paystack's own secure page (card, bank, USSD or
   transfer). Nothing sensitive touches our pages.
5. Paystack sends the browser back to `/checkout/callback`.
6. Our server calls `transaction/verify` with the secret key. Only if the
   status is `success`, the currency is `NGN`, and the amount matches the order
   do we update the payment to `success` and insert the `enrolment` row.
7. The student is sent to the course page with a welcome note, and every lesson
   is now open because `hasCourseAccess` reads that enrolment.
8. Paystack also calls `/api/paystack/webhook`. The signature is checked with
   HMAC SHA-512, and the same fulfilment runs **idempotently**. This is the
   safety net if the student closes the browser before the callback.
9. A failed payment marks the order `failed` and shows a clear retry message.
   It never unlocks anything.

**Rules:**

- The browser never decides that a payment succeeded.
- The amount and currency are checked again on the server.
- Verification is idempotent: callback and webhook may both run.
- A student can only see and confirm their own payment reference.
- The Buy button is hidden and replaced by an honest "not open yet" note while
  Paystack keys are missing.
- Free courses (price `0`) are enrolled directly, with a zero-value success
  payment row for the record.

**Done when:** a test card unlocks the course, refresh keeps it unlocked, a
second account stays locked, the webhook alone also unlocks it, and the database
shows a successful payment plus one enrolment.

### Stage 6 — My courses and progress
**Goal:** paid students have a home for their learning.

- `/my-courses` lists only courses the student has paid for (or free ones she
  joined).
- Each card has a progress bar: completed lessons ÷ total visible lessons.
- A tick box on every lesson saves progress to `lesson_progress`.
- Course page shows "Continue" at the first unfinished lesson.
- Resume-where-you-stopped is stored in the database, not just the browser.
- Students with no courses see a friendly link back to the shop.

**Done when:** ticking a lesson survives a refresh and a different device, and
the progress bar matches the ticks.

### Stage 7 — Welcome email
**Goal:** every paid student gets one clear email.

- Sent through Resend after a successful payment, once per enrolment.
- Subject and body: course name, a link to the course, what to do next, how to
  reply for help.
- `enrolments.welcome_email_sent_at` stops duplicates. A failure never blocks
  access; it is logged and can be retried.
- Plain text and simple HTML. No tracking pixels.

**Done when:** a test payment produces exactly one email, and re-running the
callback or webhook does not send a second.

### Stage 8 — Trainer dashboard
**Goal:** the trainer can see the business at a glance.

- Total sales in naira and number of payments.
- Payments table: date, student email, course, amount, status, Paystack
  reference.
- Students per course, with enrolment date.
- Add/edit/delete courses and lessons (already built in Stage 2) plus video
  upload (Stage 4) in one place.
- Guardrails: deleting a course with sales is refused; refunds stay manual in
  Paystack.

**Done when:** the trainer can answer "how much have I sold, and who bought
what?" without opening Paystack or Supabase.

### Stage 9 — Hardening and launch
**Goal:** safe to take real money.

- Bypass tests: guest, unpaid student, paid student, second account, guessed
  video URL, copied signed URL, edited request.
- Mobile pass on a real phone over mobile data.
- Paystack **live** keys, business approval, and a live low-value test.
- Domain bought and connected; Supabase Site URL and redirect URLs updated;
  `NEXT_PUBLIC_SITE_URL` updated on Vercel.
- Vercel Pro (commercial use).
- Backups: Supabase database backup and a simple export of payments.
- A short "what to do when something breaks" note for the trainer.
- README and this plan updated.

**Done when:** a real card payment on the real domain unlocks the course, the
email arrives, and a non-payer still cannot open a video.

---

## 4. Data model

| Table | What it holds | Who writes |
|---|---|---|
| `profiles` | One row per account: email, name, role | Trigger on signup; name by owner |
| `courses` | Slug, title, descriptions, price in kobo, published flag | Trainer |
| `lessons` | Title, order, hidden flag, course | Trainer |
| `lesson_assets` | Where the private video file lives | Server only |
| `payments` | Order: student, course, reference, amount, status, raw Paystack reply | Server only |
| `enrolments` | The paid-only switch: student + course | Server only |
| `lesson_progress` | Tick boxes: student + lesson + completed | Student, only for a course she can access |

Key database helpers:

- `is_trainer()` — used by RLS.
- `has_course_access(course_id)` — enrolment exists for the signed-in student.
- `has_lesson_access(lesson_id)` — same, through the lesson's course.

The client can read only its own payments, enrolments and progress. It can
never insert a payment or an enrolment.

---

## 5. Access rules (the part that matters)

- `src/lib/access.ts` → `hasCourseAccess(profile, courseId)`.
- Used by the course page (locks), the lesson page (redirect), and the video
  route (the real gate).
- The video route re-reads the lesson and course from the database, so a hidden
  or draft lesson stays closed even if a URL is guessed.
- Signed video URLs expire after one hour. A copied link dies quickly.
- Trainer bypasses payment only because the trainer owns the shop.

---

## 6. Money rules

- Price typed in naira, stored in kobo.
- The payment row is the order: amount, course and student are fixed when the
  order is created.
- Paystack verification must match status, currency and amount. Anything else
  grants nothing.
- Test mode is clearly labelled on the checkout page. Real money is not taken
  until live keys and a domain are in place.
- Refunds are manual in Paystack; access is revoked by deleting the enrolment
  row (trainer policy, SQL by hand for now).

---

## 7. Operations

### Environment variables

| Name | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | local + Vercel | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | local + Vercel | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | local + Vercel | Secret, server only |
| `PAYSTACK_SECRET_KEY` | local + Vercel | Secret, server only; also verifies webhooks |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | optional | Only needed if we later use the inline popup |
| `RESEND_API_KEY` | local + Vercel | Secret |
| `EMAIL_FROM` | local + Vercel | Example: `SkillShelf <hello@domain>` |
| `NEXT_PUBLIC_SITE_URL` | local + Vercel | `http://localhost:3100` locally, the real domain in production |

Vercel variables are added from the terminal (`npx vercel env add NAME
production`) so values are never typed into a web form.

### Dashboard steps that code cannot do

1. Supabase → Authentication → URL Configuration: Site URL and
   `<site>/auth/confirm` redirect.
2. Supabase → SQL Editor: run migrations `0001`, `0002` (and any later file).
3. Paystack → Settings → API Keys: copy the **test** secret key.
4. Paystack → Settings → Webhooks: set
   `https://<domain>/api/paystack/webhook`.
5. Before launch: Paystack business approval, live keys, domain, Vercel Pro.

### Paystack test cards

- Success: `4084 0840 8408 4081`, any future expiry, CVV `408`, PIN `0000`,
  OTP `123456`.
- Failed payment: `4084 0840 8408 4089` (or any declined test card shown in
  Paystack docs).

---

## 8. Decisions already made

- **Redirect checkout, not a popup.** Paystack's hosted page is more reliable on
  Nigerian mobile browsers, avoids popup blockers, and keeps card data off our
  pages. It also works with JavaScript disabled.
- **Signed uploads straight to storage.** Vercel rejects request bodies over
  4.5 MB, so videos never pass through the app server.
- **50 MB per video for now.** Supabase free plan. Cloudflare Stream later.
- **One-hour playback links.** Long enough for a lesson, short enough to limit
  sharing.
- **Enrolment is the only key.** No "is paid" flag on courses; the presence of an
  enrolment row is the truth.
- **Callback plus webhook.** Callback gives the student an instant result;
  webhook makes sure the enrolment lands even if the browser closes.
- **Manual tick boxes.** Simple, honest, and respects that people watch on
  different devices.
- **Delete means unpublish after sales.** Paid students keep what they paid for.
- **Accounts before payment.** The student's email is needed for the receipt and
  the welcome message, and it ties access to one person.
- **Honest empty states.** When a service is not connected, the page says so
  instead of showing a button that fails.

---

## 9. Status

| Stage | Status |
|---|---|
| 0 Skeleton | Done |
| 1 Accounts | Done |
| 2 Courses and lessons | Done |
| 3 Public pages | Done |
| 4 Video | Done (`0fca0a6`, live) |
| 5 Payments | Done |
| 6 My courses | Done |
| 7 Welcome email | Done |
| 8 Trainer dashboard | Done |
| 9 Launch | In progress |

Demo course: **Phone Photography for Beginners**, ₦15,000, three lessons (one
hidden), first lesson holds a small CC0 test clip.

Test accounts:

- Trainer: `trainer@skillshelf.test` / `TrainerPass123!`
- Student: `test.student@skillshelf.test` / `StudentPass123!` (not enrolled)

---

## 10. Testing checklist (run at the end of every stage)

- [ ] `npm run build` is clean.
- [ ] `npm run lint` is clean.
- [ ] Works signed out, as a student, and as the trainer.
- [ ] Works on a phone-sized screen (375 px wide).
- [ ] No secret appears in the browser bundle.
- [ ] A guessed or copied lesson/video URL does not work for a non-payer.
- [ ] Live deployment answers `/api/health` with the new commit.
- [ ] README and this plan match what was actually built.
