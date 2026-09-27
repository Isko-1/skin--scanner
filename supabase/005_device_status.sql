-- Добавляем колонку status в таблицу devices
-- Возможные значения:
--   'idle'       — зонд включён, ожидает нажатия кнопки
--   'sending'    — идёт отправка замера на сервер
--   'cooldown'   — кнопка нажата слишком быстро, зонд блокирует повторный замер
--   'wifi_reset' — длинное нажатие, зонд сбрасывает настройки Wi-Fi и перезагружается
alter table devices
  add column if not exists status text default 'idle'
  check (status in ('idle', 'sending', 'cooldown', 'wifi_reset'));
