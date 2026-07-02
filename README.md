# 757 Fantasy Football — Stock Tracker

Live leaderboard of each league member's stock pick, ranked by percent gain
since July 1st. Prices come from Yahoo Finance's public chart API
and refresh every 5 minutes.

## Editing picks

Edit [lib/league.js](lib/league.js) — the member list, tickers, and the
baseline date all live there. Push to `main` and Vercel redeploys
automatically.

## League chat

The sidebar chat is powered by Supabase Realtime. It needs two environment
variables (in Vercel and/or a local `.env.local`):

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon public key>
```

And this table, created in the Supabase SQL editor:

```sql
create table messages (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 30),
  text text not null check (char_length(text) between 1 and 500),
  created_at timestamptz not null default now()
);

alter table messages enable row level security;
create policy "anyone can read" on messages for select using (true);
create policy "anyone can post" on messages for insert with check (true);

alter publication supabase_realtime add table messages;
```

If the env vars are missing, the page still works — the chat panel just shows
a "not set up yet" note.

### Voice memos

Chat voice memos need a storage bucket and an `audio_url` column, added with
this one-time SQL:

```sql
alter table messages add column audio_url text;
alter table messages alter column text drop not null;
alter table messages drop constraint messages_text_check;
alter table messages add constraint messages_text_check
  check (text is null or char_length(text) <= 500);
alter table messages add constraint messages_content_check
  check ((text is not null and char_length(text) > 0) or audio_url is not null);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('voice-memos', 'voice-memos', true, 2097152,
        array['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg']);

create policy "anyone can upload voice memos" on storage.objects
  for insert with check (bucket_id = 'voice-memos');
create policy "anyone can read voice memos" on storage.objects
  for select using (bucket_id = 'voice-memos');
```

Memos are capped at 60 seconds and 2 MB.

## Running locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.
