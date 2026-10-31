-- Stage 4: one private bucket for lesson videos.
-- Nothing here is public. The trainer uploads with a one-off signed link, and
-- the app only hands out a short-lived link after it has checked who is asking.
-- Re-running is safe.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lesson-videos',
  'lesson-videos',
  false,
  52428800,
  array['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Deliberately no policies on storage.objects for this bucket:
-- the browser never lists or reads it directly. Uploads use a signed URL made
-- on the server, and playback uses a signed URL made after an access check.
