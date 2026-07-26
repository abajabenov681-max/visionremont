-- Добавление специализации «Мебельщик» рядом с Сантехник / Ремонтник / Плиточник
insert into public.specializations (name) values ('Мебельщик')
on conflict (name) do nothing;
