# PluggArena

React + Vite-app för skolquiz, Battle Mode, AI Study Buddy och uppladdade skoluppgifter.

## Lokal start

```bash
npm install
npm run dev
```

Skapa `.env.local` från `.env.example`:

```bash
VITE_SUPABASE_URL=din_supabase_url
VITE_SUPABASE_ANON_KEY=din_supabase_anon_key
OPENAI_API_KEY=din_openai_api_nyckel
OPENAI_MODEL=gpt-4.1-mini
```

Utan Supabase används localStorage-fallback. Utan OpenAI-nyckel returnerar AI-rutterna pedagogiska fallback-ledtrådar.

## Assignment Upload v1

Vyn **Uppgifter** låter en inloggad användare:

- ladda upp PDF, JPG, PNG eller WEBP
- förhandsvisa filen
- spara uppgiften till sitt konto
- analysera filen med AI Study Buddy
- identifiera ämne och uppgiftstyp från det synliga innehållet
- visa ledtrådarna ett steg i taget

Med Supabase sparas filen i den privata Storage-bucketen `assignments` och metadata i tabellen `assignments`. Lokalt sparas fil och metadata i localStorage.

## Supabase: assignments

Skapa en privat Storage-bucket med namnet `assignments`. Kör sedan följande i Supabase SQL Editor:

```sql
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  file_name text not null,
  file_path text not null,
  file_type text not null,
  file_size bigint not null,
  analysis jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.assignments enable row level security;

create policy "Users can read own assignments"
on public.assignments for select
using (auth.uid() = user_id);

create policy "Users can insert own assignments"
on public.assignments for insert
with check (auth.uid() = user_id);

create policy "Users can update own assignments"
on public.assignments for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own assignments"
on public.assignments for delete
using (auth.uid() = user_id);

create policy "Users can upload own assignment files"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'assignments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can read own assignment files"
on storage.objects for select
to authenticated
using (
  bucket_id = 'assignments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete own assignment files"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'assignments'
  and (storage.foldername(name))[1] = auth.uid()::text
);
```

Appens befintliga Supabase-tabeller för profiler, quiz och battles behöver också vara installerade i projektet.

## AI-rutter

```text
POST /api/study-buddy
POST /api/analyze-assignment
```

`analyze-assignment` använder bildinput för bilder och filinput för PDF. Vision-modellen läser uppgiftens synliga text, tal och symboler, identifierar ämne/uppgiftstyp och returnerar 3-6 konkreta ledtrådar utan att avslöja hela svaret.

## Verifiering

```bash
npm run lint
npm run build
```
