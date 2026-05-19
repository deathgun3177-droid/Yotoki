create table if not exists public.media_titles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  original_title text,
  kind text not null default 'anime' check (kind in ('anime', 'movie')),
  year integer not null default extract(year from now())::integer,
  rating text not null default '13+',
  quality text not null default '1080p' check (quality in ('720p', '1080p')),
  poster_path text,
  banner_path text,
  synopsis text not null default 'Тайлбар удахгүй нэмэгдэнэ.',
  genres text[] not null default array['Anime'],
  status text not null default 'ongoing' check (status in ('ongoing', 'completed')),
  featured boolean not null default false,
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.media_episodes (
  id uuid primary key default gen_random_uuid(),
  media_id uuid not null references public.media_titles(id) on delete cascade,
  number integer not null check (number > 0),
  title text not null default 'Анги',
  runtime text not null default '24 мин',
  quality text not null default '1080p' check (quality in ('720p', '1080p')),
  video_path text not null,
  subtitle_path text,
  thumbnail_path text,
  is_free boolean not null default false,
  released_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (media_id, number)
);

alter table public.media_episodes
add column if not exists is_free boolean not null default false;

create index if not exists media_titles_added_at_idx on public.media_titles (added_at desc);
create index if not exists media_titles_kind_idx on public.media_titles (kind);
create index if not exists media_episodes_media_number_idx on public.media_episodes (media_id, number);

alter table public.media_titles enable row level security;
alter table public.media_episodes enable row level security;

drop policy if exists "Anyone can read media titles" on public.media_titles;
create policy "Anyone can read media titles"
on public.media_titles
for select
using (true);

drop policy if exists "Anyone can read media episodes" on public.media_episodes;
create policy "Anyone can read media episodes"
on public.media_episodes
for select
using (true);

drop policy if exists "Admins can manage media titles" on public.media_titles;
create policy "Admins can manage media titles"
on public.media_titles
for all
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can manage media episodes" on public.media_episodes;
create policy "Admins can manage media episodes"
on public.media_episodes
for all
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

insert into storage.buckets (id, name, public)
values
  ('videos', 'videos', true),
  ('subtitles', 'subtitles', true),
  ('images', 'images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Public can read YotoKi media files" on storage.objects;
create policy "Public can read YotoKi media files"
on storage.objects
for select
using (bucket_id in ('videos', 'subtitles', 'images'));

drop policy if exists "Admins can upload YotoKi media files" on storage.objects;
create policy "Admins can upload YotoKi media files"
on storage.objects
for insert
with check (
  bucket_id in ('videos', 'subtitles', 'images')
  and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

drop policy if exists "Admins can update YotoKi media files" on storage.objects;
create policy "Admins can update YotoKi media files"
on storage.objects
for update
using (
  bucket_id in ('videos', 'subtitles', 'images')
  and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
)
with check (
  bucket_id in ('videos', 'subtitles', 'images')
  and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

drop policy if exists "Admins can delete YotoKi media files" on storage.objects;
create policy "Admins can delete YotoKi media files"
on storage.objects
for delete
using (
  bucket_id in ('videos', 'subtitles', 'images')
  and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);
