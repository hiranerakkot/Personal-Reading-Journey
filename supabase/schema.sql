create table if not exists public.user_books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  external_id text not null,
  title text not null,
  authors text[] default '{}',
  cover_url text,
  description text default '',
  status text not null check (status in ('favourite','currently_reading','list','read')),
  created_at timestamptz not null default now(),
  unique (user_id, external_id, status)
);

alter table public.user_books enable row level security;

create policy "Users can view their own books" on public.user_books
  for select using (auth.uid() = user_id);
create policy "Users can insert their own books" on public.user_books
  for insert with check (auth.uid() = user_id);
create policy "Users can update their own books" on public.user_books
  for update using (auth.uid() = user_id);
create policy "Users can delete their own books" on public.user_books
  for delete using (auth.uid() = user_id);
