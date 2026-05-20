# YotoKi

YotoKi бол Монгол хэрэглэгчдэд зориулсан хөнгөн, хурдан, минимал anime болон кино үзэх web platform юм.

Энэ project нь том streaming platform хуулбарлах зорилготой биш. Гол зорилго нь цэвэр UI, хурдан ачаалалт, Монгол хадмал, энгийн admin удирдлага, бага зардлаар production deploy хийх боломж юм.

## Үндсэн боломжууд

- Нүүр хуудас
- Anime жагсаалт
- Кино жагсаалт
- Anime/кино detail хуудас
- Episode watch хуудас
- Custom lightweight video player
- Монгол хадмал ON/OFF
- `.srt`, `.ass`, `.vtt` subtitle support
- Continue watching
- Search
- Admin upload
- Admin content manage
- Хэрэглэгч удирдах хэсэг
- 30 хоногийн үзэх эрх нэмэх/хасах
- Төлбөрийн мэдээлэл засах admin хэсэг

## Tech stack

- Next.js App Router
- TypeScript
- TailwindCSS
- Framer Motion
- Supabase Auth болон Database
- Cloudflare R2 media storage
- Vercel deployment

## Local ажиллуулах

```bash
npm install
npm run dev
```

Дараа нь browser дээр:

```text
http://localhost:3000
```

## Environment тохиргоо

`.env.example` файлыг `.env.local` болгож хуулж аваад өөрийн key, URL утгуудыг бөглөнө.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_VIDEO_BUCKET=
NEXT_PUBLIC_SUPABASE_SUBTITLE_BUCKET=
NEXT_PUBLIC_SUPABASE_IMAGE_BUCKET=
NEXT_PUBLIC_SUPABASE_TITLES_TABLE=
NEXT_PUBLIC_SUPABASE_EPISODES_TABLE=
NEXT_PUBLIC_SUPABASE_PROFILE_TABLE=
NEXT_PUBLIC_SUPABASE_PAYMENT_SETTINGS_TABLE=
NEXT_PUBLIC_ADMIN_EMAILS=

R2_ACCOUNT_ID=
R2_BUCKET_NAME=
R2_ENDPOINT=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
```

Анхаарах зүйл: `.env.local` файлыг GitHub руу commit хийж болохгүй. Энэ repo дээр `.env.local` ignore хийгдсэн байгаа.

## Supabase setup

Supabase SQL Editor дээр дараах SQL файлуудыг ажиллуулна.

```text
supabase/profiles.sql
supabase/media_content.sql
supabase/payment_settings.sql
```

Эдгээр нь profile, user role, watch access, media title, episode, payment settings зэрэг table болон policy үүсгэнэ.

## Admin role тохируулах

Supabase SQL Editor дээр өөрийн email-ийг admin болгоно.

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where lower(email) = lower('your-email@example.com');

update public.profiles
set role = 'admin'
where lower(email) = lower('your-email@example.com');
```

Хэрэв `public.profiles` table байхгүй байвал эхлээд `supabase/profiles.sql` файлыг ажиллуулна.

## Cloudflare R2

Video болон subtitle файлууд Cloudflare R2 дээр хадгалагдана. Vercel video file дамжуулахгүй, зөвхөн frontend болон API route ажиллуулна.

R2 bucket дээр CORS тохиргоо хэрэгтэй.

Local development:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Production дээр `AllowedOrigins` дотор өөрийн domain-оо нэмнэ.

Жишээ:

```json
[
  {
    "AllowedOrigins": ["https://yourdomain.mn"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

## Vercel deploy

1. GitHub repo-г Vercel дээр import хийнэ.
2. Environment Variables дээр `.env.local`-д байгаа production утгуудыг нэмнэ.
3. Deploy хийнэ.
4. Domain холбосны дараа R2 CORS дээр production domain-оо нэмнэ.

## Media upload

Admin upload хэсгээс:

- Шинэ anime/кино title үүсгэнэ
- Poster, title, year, genres, synopsis нэмнэ
- Дараа нь episode number сонгож video болон subtitle upload хийнэ

Subtitle файл:

- `.srt`
- `.ass`
- `.vtt`

Subtitle буруу орсон бол `Admin tools -> Content manage` дээрээс тухайн episode-ийн subtitle-г сольж болно.

## Төслийн бүтэц

```text
app/          Next.js routes
components/   UI болон feature components
lib/          Supabase, R2, auth, subtitles, storage helpers
public/       Demo image болон subtitle assets
supabase/     Database SQL setup files
```

## Production checklist

- R2 key rotation хийсэн байх
- `.env.local` GitHub дээр ороогүй байх
- Supabase RLS policy зөв ажиллаж байх
- Admin role зөв тохирсон байх
- Vercel env variables бүрэн байх
- R2 CORS дээр production domain нэмсэн байх
- Mobile watch page шалгасан байх
- Subtitle ON/OFF шалгасан байх
- Upload, delete, subtitle replace flow шалгасан байх

## License

Private project.
