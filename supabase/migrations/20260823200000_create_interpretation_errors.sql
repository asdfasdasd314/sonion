create table public.interpretation_errors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  source text not null,
  prompt text not null,
  meal_date date,
  meal_time time without time zone,
  error_code text not null,
  error_message text not null,
  diagnostics jsonb,
  dismissed_at timestamptz,
  constraint interpretation_errors_source_nonempty check (char_length(trim(source)) > 0),
  constraint interpretation_errors_prompt_nonempty check (char_length(trim(prompt)) > 0),
  constraint interpretation_errors_code_nonempty check (char_length(trim(error_code)) > 0),
  constraint interpretation_errors_message_nonempty check (char_length(trim(error_message)) > 0),
  constraint interpretation_errors_diagnostics_object check (
    diagnostics is null or jsonb_typeof(diagnostics) = 'object'
  )
);

create index interpretation_errors_user_created_idx
  on public.interpretation_errors (user_id, created_at desc);

alter table public.interpretation_errors enable row level security;

create policy "Users can view their own interpretation errors"
  on public.interpretation_errors for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own interpretation errors"
  on public.interpretation_errors for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own interpretation errors"
  on public.interpretation_errors for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own interpretation errors"
  on public.interpretation_errors for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on table public.interpretation_errors to authenticated;
