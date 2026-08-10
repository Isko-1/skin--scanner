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
- Доступ к `/dashboard` сейчас не защищён ролью `doctor` на уровне страницы — на схеме БД это заложено (`app_metadata.doctor` в RLS-политике), но серверный guard на самой странице нужно добавить перед демо, если время останется.
