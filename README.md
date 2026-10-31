# SkillShelf

An online course shop for one trainer in Lagos. Students pay in naira, and only
paid students can open the lesson videos.

Live site: **https://skillshelf-six.vercel.app**
Health check: **https://skillshelf-six.vercel.app/api/health** (should say `"ready": true`)

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. The app runs without any keys until Stage 1.

```bash
npm run build   # production build check
npm run lint    # code check
```

## Environment

Copy `.env.example` to `.env.local` and fill in the services you have. Keys are
never committed. `.env.local` is ignored by git, and so are video files.

## Check what is connected

`GET /api/health` returns which services have keys set. It never returns a key.

## Stage 1 setup (once, in the Supabase dashboard)

1. Create a project. Copy the **Project URL**, **anon public key** and
   **service_role key** (Settings → API) into `.env.local`.
2. Authentication → Sign In / Providers → turn **Confirm email** off, so a new
   account is usable straight away.
3. SQL Editor → paste and run `supabase/migrations/0001_init.sql`.
4. Sign up in the app, then make that account the trainer:
   ```sql
   update public.profiles set role = 'trainer' where email = 'you@example.com';
   ```
   Only one trainer account. Never add a second by mistake.
5. Sign out and back in. `/trainer` should open; a student account should be
   sent to `/no-access`.


## Deploy

The Vercel project (`osazuwa778-7022/skillshelf`) is already set up and connected
to GitHub, so pushing to `main` deploys automatically.

To deploy by hand:

```bash
npx vercel --prod
```

Environment variables live in Vercel, not in git. Set or replace them from the
terminal so a value never has to be typed into a web form:

```bash
npx vercel env add NAME production    # reads the value from stdin
npx vercel env ls
```

Variables needed: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`. Keep the `NEXT_PUBLIC_`
prefix on the public ones and the type **Config**; store the service role key as
**Secret**. Vercel locks a saved Secret, so a wrong value must be deleted, not
edited.

Paystack and Resend keys are added the same way when those stages land.

One dashboard step cannot be done from code: in Supabase → Authentication →
URL Configuration, set **Site URL** to the production address and add
`<site>/auth/confirm` to **Redirect URLs**. Without this, password reset links
point at localhost.

## Where things live

| Path | What it is |
|---|---|
| `src/app/page.tsx` | Home page: published course cards |
| `src/app/courses/[slug]/page.tsx` | Public course page with locked lessons |
| `src/app/layout.tsx` | Shared shell: header, footer, fonts |
| `src/app/globals.css` | Colours and base styles (Tailwind 4) |
| `src/app/api/health/route.ts` | Service wiring check |
| `src/app/trainer/page.tsx` | Trainer course list: publish, unpublish, delete |
| `src/app/trainer/courses/[id]/page.tsx` | Edit one course and order its lessons |
| `src/app/trainer/actions.ts` | Course and lesson server actions |
| `src/lib/courses.ts` | Course and lesson reads, naira formatting |
| `supabase/migrations/` | Database structure, added in Stage 1 |

## Build stages

| Stage | Goal | Done when |
|---|---|---|
| 0 | Skeleton | Live URL opens on a phone |
| 1 | Accounts | Signup, login, trainer role, protected routes |
| 2 | Courses and lessons | Trainer adds courses and lesson titles |
| 3 | Public pages | Home cards and locked course page |
| 4 | Video | Private upload and server-checked playback |
| 5 | Payments | Paystack test mode unlocks a course |
| 6 | My courses | Paid list, progress bar, saving tick boxes |
| 7 | Welcome email | Email arrives once after payment |
| 8 | Trainer dashboard | Sales, payments, students per course |
| 9 | Hardening | Bypass tests, mobile pass, go live |

Stages 2 and 3 are built. The trainer area at `/trainer` adds, edits,
reorders, publishes and deletes courses and lessons. The public shop shows
published courses on `/` and a locked lesson list at `/courses/[slug]`. Video
upload (Stage 4) and card payment (Stage 5) are not wired yet, and the pages
say so instead of pretending.

## House rules

- Only paid students can open lessons. The check happens on the server, every
  time a video is requested.
- Prices are stored as whole numbers of kobo. Never as decimals.
- The service role key and the Paystack secret key stay on the server.
- No videos in git. Ever.
