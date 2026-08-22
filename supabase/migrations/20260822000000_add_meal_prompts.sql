alter table public.meals
  add column meal_prompt text;

alter table public.meals
  add constraint meals_prompt_length check (
    meal_prompt is null or (char_length(btrim(meal_prompt)) between 1 and 2000)
  );
