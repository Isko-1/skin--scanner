# skin-scanner (P0)

## Setup
1. Создать проект Supabase, выполнить `supabase/schema.sql` в SQL editor.
2. Создать Next.js app (App Router) и скопировать сюда `app/`, `lib/`.
3. Установить зависимости: `@supabase/supabase-js`. Tailwind должен быть настроен (страницы используют utility-классы).
4. Заполнить `.env.local` по образцу `.env.example`.
5. Модель: найти готовые веса под HAM10000/ISIC на Hugging Face (image-classification task), указать `HF_MODEL_ID` и `HF_TOKEN` — см. комментарий в `lib/classifier.ts`.

## Что уже готово (P0)
- `supabase/schema.sql` — moles, photo_analyses, spectral_readings, RLS, storage bucket.
- `/capture` — камера, оверлей-гид, отсечение смазанных кадров (Laplacian variance) до загрузки.
- `/api/classify` — принимает `{mole_id, image_path, sharpness_score}`, гоняет через модель, пишет `photo_analyses`.
- `/mole/[id]` — история сканов родинки.
- `/dashboard` — случаи с risk_score выше порога, по убыванию.

## Дизайн-пасс (ui-ux-pro-max + MagicUI)
- Светлая медицинская тема (Soft UI, `#2563EB` акцент, Figtree) везде — токены в `app/globals.css`. `/capture` намеренно остаётся тёмным: это функциональный выбор ради видимости кадра камеры, не стиль.
- `components/risk-gauge.tsx` — круговой gauge (MagicUI `animated-circular-progress-bar`) вместо текстового бейджа: показывает величину risk_score, а не только категорию.
- Исправлен N+1: `/mole/[id]` раньше делал последовательные `await` за подписанными URL в цикле — теперь `Promise.all`.
- `/dashboard` — карточки на мобильном вместо широкой таблицы (была бы горизонтальная прокрутка).
- Тач-таргеты кнопок подняты до 44px, добавлен спиннер на этапе загрузки/классификации вместо голого текста.

## Фикс 404 на / (Vercel)
Не было `app/page.tsx` — только вложенные роуты (`/capture`, `/dashboard`, `/mole/[id]`), поэтому корень домена отдавал 404. Добавлено:
- `app/page.tsx` — список родинок пользователя, точка входа.
- `app/mole/new/page.tsx` — форма создания родинки → сразу в `/capture?mole_id=...` (без неё кнопка "Добавить" тоже вела бы в 404).

## Дальше (P1, не реализовано)
- `/api/spectral` — приём JSON от щупа, запись в `spectral_readings`, пересчёт risk_score по правилу `photo_primary` (спектр может только повысить risk_score, не понизить).
- Service worker для офлайн-кэша статики.

## Авторизация и приватность данных (закрыто)
Ранее `/`, `/mole/[id]` и `/dashboard` ходили в базу через `supabaseAdmin` (service-role ключ) без проверки владельца — главная страница показывала родинки всех пользователей всем подряд, а `/mole/[id]` открывался по любому UUID независимо от того, чей он (IDOR). `ensureSession()` создавал только анонимные сессии, реальной регистрации не было.

Добавлено:
- `/login`, `/register`, `/logout` — email/password через Supabase Auth (`@supabase/ssr`).
- `middleware.ts` — обновляет сессионную cookie на каждом запросе, редиректит неавторизованных на `/login`, и отдельно гейтит `/dashboard` по `app_metadata.doctor === true` (это и был пункт "добавить серверный guard перед демо" ниже).
- `lib/supabase/server.ts` и `lib/supabase/client.ts` — сессионные клиенты вместо `supabaseAdmin` на страницах; RLS-политики `own moles` / `own photo_analyses` из `supabase/schema.sql` сами фильтруют данные по `auth.uid()`.
- `/api/classify` — проверяет, что `mole_id` в запросе принадлежит авторизованному пользователю (раньше это можно было обойти, зная чужой `mole_id`).
- Главная страница (`/`) — карточки личной статистики: кол-во родинок, всего сканов, средний/макс. risk score.

`supabaseAdmin` (`lib/supabase.ts`) теперь используется только внутри `/api/classify` (доверенный серверный код с собственной проверкой владельца) — доктор-дашборд переведён на сессионный клиент и уже готовые RLS-политики `doctors see all ...`.

## Мобильная вёрстка `/capture` (закрыто)
В `app/layout.tsx` отсутствовал `<meta name="viewport">` — мобильные браузеры рендерили страницу в масштабе ~980px и зумили её, из-за чего кнопка съёмки уменьшалась и требовала скролла/зума, чтобы попасть по ней. Добавлен `viewport` export в `app/layout.tsx`. На `/capture` `min-h-screen` заменён на `h-dvh overflow-hidden`, чтобы плавающая адресная строка мобильного браузера не могла увести нижнюю панель с кнопкой за пределы экрана.
