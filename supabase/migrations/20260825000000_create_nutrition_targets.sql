create table public.nutrition_targets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  target_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint nutrition_targets_snapshot_object check (jsonb_typeof(target_snapshot) = 'object')
);

create or replace function public.set_nutrition_targets_updated_at()
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

create trigger nutrition_targets_set_updated_at
before update on public.nutrition_targets
for each row execute function public.set_nutrition_targets_updated_at();

alter table public.nutrition_targets enable row level security;

create policy "Users can view their own nutrition targets"
  on public.nutrition_targets for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own nutrition targets"
  on public.nutrition_targets for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own nutrition targets"
  on public.nutrition_targets for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update on table public.nutrition_targets to authenticated;
