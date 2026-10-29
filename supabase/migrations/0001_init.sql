-- SkillShelf schema, stage 1.
-- Run this once in the Supabase SQL editor (or `supabase db push`).
-- Safe to re-run: every statement is idempotent.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text not null default '',
  role        text not null default 'student' check (role in ('student', 'trainer')),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- courses
create table if not exists public.courses (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  title             text not null,
  short_description text not null default '',
  description       text not null default '',
  cover_image_path  text,
  price_kobo        integer not null check (price_kobo >= 0),
  is_published      boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------- lessons
-- Public lesson info only. The video location lives in lesson_assets.
create table if not exists public.lessons (
  id               uuid primary key default gen_random_uuid(),
  course_id        uuid not null references public.courses (id) on delete cascade,
  title            text not null,
  position         integer not null default 0,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  is_published     boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists lessons_course_position_idx
  on public.lessons (course_id, position);

-- ---------------------------------------------------------------- lesson_assets
-- Private. Students must never be able to read this table.
create table if not exists public.lesson_assets (
  lesson_id    uuid primary key references public.lessons (id) on delete cascade,
  storage_path text not null,
  provider     text not null default 'supabase' check (provider in ('supabase', 'cloudflare')),
  mime_type    text,
  size_bytes   bigint,
  uploaded_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- payments
create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  student_id          uuid not null references public.profiles (id) on delete restrict,
  course_id           uuid not null references public.courses (id) on delete restrict,
  reference           text not null unique,
  amount_kobo         integer not null check (amount_kobo >= 0),
  currency            text not null default 'NGN',
  status              text not null default 'pending'
                        check (status in ('pending', 'success', 'failed')),
  paystack_reference  text,
  channel             text,
  paid_at             timestamptz,
  raw_payload         jsonb,
  created_at          timestamptz not null default now()
);

create index if not exists payments_student_idx on public.payments (student_id);
create index if not exists payments_course_idx  on public.payments (course_id);
create index if not exists payments_status_idx  on public.payments (status);

-- ---------------------------------------------------------------- enrolments
-- The one table the paid-only check reads. Written by the server only.
create table if not exists public.enrolments (
  id                      uuid primary key default gen_random_uuid(),
  student_id              uuid not null references public.profiles (id) on delete cascade,
  course_id               uuid not null references public.courses (id) on delete restrict,
  payment_id              uuid references public.payments (id) on delete set null,
  welcome_email_sent_at   timestamptz,
  created_at              timestamptz not null default now(),
  unique (student_id, course_id)
);

create index if not exists enrolments_student_idx on public.enrolments (student_id);
create index if not exists enrolments_course_idx  on public.enrolments (course_id);

-- ---------------------------------------------------------------- lesson_progress
create table if not exists public.lesson_progress (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.profiles (id) on delete cascade,
  lesson_id    uuid not null references public.lessons (id) on delete cascade,
  is_completed boolean not null default false,
  completed_at timestamptz,
  updated_at   timestamptz not null default now(),
  unique (student_id, lesson_id)
);

create index if not exists lesson_progress_student_idx
  on public.lesson_progress (student_id);

-- ---------------------------------------------------------------- updated_at
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists courses_touch_updated_at on public.courses;
create trigger courses_touch_updated_at
  before update on public.courses
  for each row execute function public.touch_updated_at();

drop trigger if exists lessons_touch_updated_at on public.lessons;
create trigger lessons_touch_updated_at
  before update on public.lessons
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- new user -> profile
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- helpers
-- security definer so policies can read these tables without recursive RLS.
create or replace function public.is_trainer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'trainer'
  );
$$;

create or replace function public.has_course_access(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.enrolments e
    where e.student_id = auth.uid() and e.course_id = p_course_id
  );
$$;

create or replace function public.has_lesson_access(p_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.lessons l
    join public.enrolments e on e.course_id = l.course_id
    where l.id = p_lesson_id and e.student_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------- row level security
alter table public.profiles        enable row level security;
alter table public.courses         enable row level security;
alter table public.lessons         enable row level security;
alter table public.lesson_assets   enable row level security;
alter table public.payments        enable row level security;
alter table public.enrolments      enable row level security;
alter table public.lesson_progress enable row level security;

-- profiles -------------------------------------------------------
drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own"
  on public.profiles for select
  using (id = auth.uid());

drop policy if exists "profiles: trainer reads all" on public.profiles;
create policy "profiles: trainer reads all"
  on public.profiles for select
  using (public.is_trainer());

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Users may edit their name and nothing else. Role changes only by hand in SQL.
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

-- courses --------------------------------------------------------
drop policy if exists "courses: public published" on public.courses;
create policy "courses: public published"
  on public.courses for select
  using (is_published or public.is_trainer());

drop policy if exists "courses: trainer insert" on public.courses;
create policy "courses: trainer insert"
  on public.courses for insert
  with check (public.is_trainer());

drop policy if exists "courses: trainer update" on public.courses;
create policy "courses: trainer update"
  on public.courses for update
  using (public.is_trainer())
  with check (public.is_trainer());

drop policy if exists "courses: trainer delete" on public.courses;
create policy "courses: trainer delete"
  on public.courses for delete
  using (public.is_trainer());

-- lessons --------------------------------------------------------
drop policy if exists "lessons: visible on published course" on public.lessons;
create policy "lessons: visible on published course"
  on public.lessons for select
  using (
    public.is_trainer()
    or (
      is_published
      and exists (
        select 1 from public.courses c
        where c.id = course_id and c.is_published
      )
    )
  );

drop policy if exists "lessons: trainer insert" on public.lessons;
create policy "lessons: trainer insert"
  on public.lessons for insert
  with check (public.is_trainer());

drop policy if exists "lessons: trainer update" on public.lessons;
create policy "lessons: trainer update"
  on public.lessons for update
  using (public.is_trainer())
  with check (public.is_trainer());

drop policy if exists "lessons: trainer delete" on public.lessons;
create policy "lessons: trainer delete"
  on public.lessons for delete
  using (public.is_trainer());

-- lesson_assets --------------------------------------------------
-- Trainer only. There is deliberately no student policy.
drop policy if exists "assets: trainer only" on public.lesson_assets;
create policy "assets: trainer only"
  on public.lesson_assets for all
  using (public.is_trainer())
  with check (public.is_trainer());

-- payments -------------------------------------------------------
drop policy if exists "payments: read own" on public.payments;
create policy "payments: read own"
  on public.payments for select
  using (student_id = auth.uid() or public.is_trainer());

-- No insert/update/delete policy: only the server (service role) writes these.

-- enrolments -----------------------------------------------------
drop policy if exists "enrolments: read own" on public.enrolments;
create policy "enrolments: read own"
  on public.enrolments for select
  using (student_id = auth.uid() or public.is_trainer());

-- Trainer may revoke access by hand (refund, abuse). Nobody may grant from the client.
drop policy if exists "enrolments: trainer revoke" on public.enrolments;
create policy "enrolments: trainer revoke"
  on public.enrolments for delete
  using (public.is_trainer());

-- lesson_progress ------------------------------------------------
drop policy if exists "progress: read own" on public.lesson_progress;
create policy "progress: read own"
  on public.lesson_progress for select
  using (student_id = auth.uid() and public.has_lesson_access(lesson_id));

drop policy if exists "progress: insert own paid" on public.lesson_progress;
create policy "progress: insert own paid"
  on public.lesson_progress for insert
  with check (student_id = auth.uid() and public.has_lesson_access(lesson_id));

drop policy if exists "progress: update own paid" on public.lesson_progress;
create policy "progress: update own paid"
  on public.lesson_progress for update
  using (student_id = auth.uid() and public.has_lesson_access(lesson_id))
  with check (student_id = auth.uid() and public.has_lesson_access(lesson_id));
