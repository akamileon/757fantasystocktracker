# 757 Fantasy Football — Stock Tracker

Live leaderboard of each league member's stock pick, ranked by percent gain
since July 1st. Prices come from Yahoo Finance's public chart API (no API key)
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

## Running locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.
