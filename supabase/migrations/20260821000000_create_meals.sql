create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_date date not null,
  meal_time time without time zone not null,
  meal_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meals_snapshot_object check (jsonb_typeof(meal_snapshot) = 'object'),
  constraint meals_snapshot_items check (
    case
      when jsonb_typeof(meal_snapshot -> 'items') = 'array'
        then jsonb_array_length(meal_snapshot -> 'items') > 0
      else false
    end
  ),
  constraint meals_snapshot_totals check (jsonb_typeof(meal_snapshot -> 'totals') = 'object')
);

create index meals_user_local_time_idx
  on public.meals (user_id, meal_date desc, meal_time desc);

create or replace function public.set_meals_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger meals_set_updated_at
before update on public.meals
for each row execute function public.set_meals_updated_at();

alter table public.meals enable row level security;

create policy "Users can view their own meals"
  on public.meals for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own meals"
  on public.meals for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own meals"
  on public.meals for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own meals"
  on public.meals for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on table public.meals to authenticated;
