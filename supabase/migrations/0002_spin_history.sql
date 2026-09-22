-- spin_history: one row per completed spin, for the shop owner's history page.
create table if not exists public.spin_history (
  id bigint generated always as identity primary key,
  label text not null,
  description text not null default '',
  spun_at timestamptz not null default now()
);

create index if not exists spin_history_spun_at_idx on public.spin_history (spun_at desc);

alter table public.spin_history enable row level security;

-- No policies at all: both reads and writes go exclusively through the
-- Next.js API routes (app/api/spins), which use the service_role key that
-- bypasses RLS. This keeps the anon key from being able to read or forge
-- spin history directly.
