-- Web Push subscriptions for support-circle notifications.
-- Run this in the Supabase SQL Editor.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamp with time zone default now()
);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

-- Users can manage their own subscription rows. The send-side API uses the
-- service role key and bypasses RLS to fan out notifications.
drop policy if exists "Users manage their own push subscriptions" on public.push_subscriptions;
create policy "Users manage their own push subscriptions"
on public.push_subscriptions
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());
