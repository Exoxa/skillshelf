# SkillShelf

An online course shop for one trainer in Lagos. Students pay in naira, and only
paid students can open the lesson videos.

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


## Where things live

| Path | What it is |
|---|---|
| `src/app/page.tsx` | Home page |
| `src/app/layout.tsx` | Shared shell: header, footer, fonts |
| `src/app/globals.css` | Colours and base styles (Tailwind 4) |
| `src/app/api/health/route.ts` | Service wiring check |
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

## House rules

- Only paid students can open lessons. The check happens on the server, every
  time a video is requested.
- Prices are stored as whole numbers of kobo. Never as decimals.
- The service role key and the Paystack secret key stay on the server.
- No videos in git. Ever.
