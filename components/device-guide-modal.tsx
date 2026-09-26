"use client";

import { useState } from "react";

interface DeviceGuideModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  triggerButton?: React.ReactNode;
}

export function DeviceGuideModal({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  triggerButton,
}: DeviceGuideModalProps) {
  const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"steps" | "led" | "faq" | "trouble">("steps");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  const isControlled = controlledIsOpen !== undefined;
  const open = isControlled ? controlledIsOpen : uncontrolledIsOpen;

  const handleOpen = () => {
    if (!isControlled) setUncontrolledIsOpen(true);
  };

  const handleClose = () => {
    if (isControlled) {
      controlledOnClose?.();
    } else {
      setUncontrolledIsOpen(false);
    }
  };

  const faqItems = [
    {
      q: "Зачем делать два замера (родинка и здоровая кожа)?",
      a: "У каждого человека свой индивидуальный оттенок кожи (фототип по Фитцпатрику). Замер чистой кожи рядом с родинкой выступает контрольным образцом (референсом). Система вычисляет спектральный контраст ln(родинка/кожа), исключая погрешность индивидуального тона кожи и оставляя только биологический сигнал новообразования.",
    },
    {
      q: "В течение какого времени нужно сделать второй замер?",
      a: "На второй замер отводится 5 минут. Если интервал больше, замеры не свяжутся в пару, так как оптические условия (освещение, прижим к коже) могут измениться.",
    },
    {
      q: "Безопасен ли лазерный луч на конце щупа?",
      a: "Да, на щупе установлен маломощный красный лазер 650 нм безопасного диагностического класса, предназначенный для диффузной отражательной спектроскопии кожи. Тем не менее, категорически запрещено направлять луч прямо в глаза.",
    },
    {
      q: "Почему щуп подключается по Wi-Fi, а не по Bluetooth?",
      a: "Мобильные устройства Apple (iPhone/iPad на iOS) аппаратно блокируют технологию Web Bluetooth в браузерах Safari и Chrome. Благодаря подключению по Wi-Fi, щуп отправляет данные напрямую на сервер сайта без ограничений любых телефонов и операционных систем.",
    },
    {
      q: "Заменяет ли спектральный щуп визит к дерматологу?",
      a: "Нет. Спектральный щуп и алгоритм сравнения оптических профилей — это исследовательский и скрининговый ассистент для контроля динамики. Окончательный клинический диагноз ставит исключительно врач-дерматоонколог на очном приеме (дерматоскопия, гистология).",
    },
    {
      q: "Что делать, если домашняя сеть Wi-Fi изменилась или пароль неверен?",
      a: "Удерживайте кнопку на корпусе щупа более 3 секунд. Настройки Wi-Fi сбросятся, и щуп снова создаст сеть «SkinProbe-Setup» для ввода новых данных.",
    },
  ];

  return (
    <>
      {triggerButton ? (
        <span onClick={handleOpen} className="inline-flex cursor-pointer">
          {triggerButton}
        </span>
      ) : !isControlled ? (
        <button
          type="button"
          onClick={handleOpen}
          className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 hover:bg-sky-100 transition shadow-xs"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          Как подключить зонд?
        </button>
      ) : null}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600 text-white shadow-xs">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </span>
                <div>
                  <h3 id="modal-title" className="text-base font-semibold text-slate-900">
                    Спектральный щуп: Подключение & FAQ
                  </h3>
                  <p className="text-xs text-slate-500">
                    Руководство по настройке зонда ESP32 + AS7341
                  </p>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                aria-label="Закрыть"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 bg-white px-5 gap-4 overflow-x-auto text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab("steps")}
                className={`py-3 border-b-2 transition ${
                  activeTab === "steps"
                    ? "border-sky-600 text-sky-700 font-semibold"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                🚀 Пошаговое подключение
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("led")}
                className={`py-3 border-b-2 transition ${
                  activeTab === "led"
                    ? "border-sky-600 text-sky-700 font-semibold"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                💡 Индикация LED
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("trouble")}
                className={`py-3 border-b-2 transition ${
                  activeTab === "trouble"
                    ? "border-sky-600 text-sky-700 font-semibold"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                🛠️ Решение проблем
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("faq")}
                className={`py-3 border-b-2 transition ${
                  activeTab === "faq"
                    ? "border-sky-600 text-sky-700 font-semibold"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                ❓ Вопросы и ответы (FAQ)
              </button>
            </div>

            {/* Content Area */}
            <div className="p-5 overflow-y-auto space-y-4 text-sm text-slate-700 flex-1">
              {activeTab === "steps" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-3.5 text-xs text-sky-900 flex items-start gap-2.5">
                    <span className="text-base">ℹ️</span>
                    <p>
                      Щуп связывается с сайтом через интернет по Wi-Fi. Настроить его нужно всего один раз при первом включении.
                    </p>
                  </div>

                  <ol className="space-y-3">
                    {/* Step 1 */}
                    <li className="flex gap-3.5 p-3 rounded-xl border border-slate-200/80 bg-slate-50/50">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-600 text-xs font-bold text-white">
                        1
                      </span>
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-900 text-xs sm:text-sm">
                          Включите зонд и найдите Wi-Fi «SkinProbe-Setup»
                        </p>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Подайте питание на щуп. На телефоне или ноутбуке откройте список сетей Wi-Fi и выберите сеть{" "}
                          <strong className="text-sky-700 font-mono bg-sky-100/70 px-1 py-0.5 rounded">SkinProbe-Setup</strong>.
                        </p>
                      </div>
                    </li>

                    {/* Step 2 */}
                    <li className="flex gap-3.5 p-3 rounded-xl border border-slate-200/80 bg-slate-50/50">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-600 text-xs font-bold text-white">
                        2
                      </span>
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-900 text-xs sm:text-sm">
                          Подключите щуп к вашему домашнему Wi-Fi
                        </p>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Автоматически откроется окно настройки (или перейдите в браузере на{" "}
                          <span className="font-mono font-medium text-slate-800">192.168.4.1</span>). Выберите вашу домашнюю сеть Wi-Fi, введите пароль и сохраните. Зонд подключится к интернету.
                        </p>
                      </div>
                    </li>

                    {/* Step 3 */}
                    <li className="flex gap-3.5 p-3 rounded-xl border border-slate-200/80 bg-slate-50/50">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-600 text-xs font-bold text-white">
                        3
                      </span>
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-900 text-xs sm:text-sm">
                          Замер 1: Родинка (короткое нажатие)
                        </p>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Откройте нужную родинку на сайте, нажмите на кнопку «Родинка», приложите носик щупа к родинке и сделайте{" "}
                          <strong>1 короткое нажатие</strong> кнопки на щупе. Сайт получит сигнал за пару секунд.
                        </p>
                      </div>
                    </li>

                    {/* Step 4 */}
                    <li className="flex gap-3.5 p-3 rounded-xl border border-slate-200/80 bg-slate-50/50">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                        4
                      </span>
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-900 text-xs sm:text-sm">
                          Замер 2: Здоровая кожа (калибровка)
                        </p>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Приложите щуп к чистой коже в 2–3 см рядом с родинкой и сделайте{" "}
                          <strong>второе короткое нажатие</strong>. Алгоритм нормализует оптические показатели и построит спектральный график!
                        </p>
                      </div>
                    </li>
                  </ol>
                </div>
              )}

              {activeTab === "led" && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600">
                    У спектрального щупа нет экрана — состояние устройства отображается встроенным светодиодом на корпусе:
                  </p>

                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden text-xs">
                    <div className="flex items-center gap-3 p-3">
                      <span className="h-3 w-3 rounded-full bg-emerald-500 shadow-xs animate-pulse" />
                      <div className="flex-1">
                        <span className="font-semibold text-slate-900">Горит непрерывно</span>
                        <p className="text-slate-500">
                          Зонд готов к первому замеру (исследование <strong>родинки</strong>).
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3">
                      <span className="h-3 w-3 rounded-full bg-sky-500 shadow-xs" />
                      <div className="flex-1">
                        <span className="font-semibold text-slate-900">Медленное мигание</span>
                        <p className="text-slate-500">
                          Первый замер принят. Зонд ожидает замера <strong>здоровой кожи</strong> для калибровки.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3">
                      <span className="h-3 w-3 rounded-full bg-amber-500 shadow-xs" />
                      <div className="flex-1">
                        <span className="font-semibold text-slate-900">Быстрое мигание</span>
                        <p className="text-slate-500">
                          Режим настройки Wi-Fi (точка «SkinProbe-Setup» активна) или передача данных на сервер.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3">
                      <span className="h-3 w-3 rounded-full bg-rose-500 shadow-xs" />
                      <div className="flex-1">
                        <span className="font-semibold text-slate-900">Удержание кнопки 3 секунды</span>
                        <p className="text-slate-500">
                          Полный сброс сохранённой сети Wi-Fi. Используйте, если сменился роутер или пароль.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "trouble" && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 text-xs text-amber-900 space-y-1">
                    <p className="font-semibold">⚠️ Данные не приходят на сайт (Таймаут)?</p>
                    <p className="text-amber-800 leading-relaxed">
                      1. Проверьте, подключён ли щуп к тому же Wi-Fi с доступом в интернет.<br />
                      2. Убедитесь, что лазер загорается в момент нажатия кнопки.<br />
                      3. Если не помогает — зажмите кнопку на 3 секунды и подключитесь к домашней сети заново.
                    </p>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60">
                      <strong className="text-slate-900">Сеть «SkinProbe-Setup» не появляется в списке Wi-Fi?</strong>
                      <p className="mt-1 text-slate-600">
                        Если щуп уже был настроен ранее, он сразу подключается к домашней сети и скрывает свою точку доступа. Чтобы вызвать меню настройки принудительно, зажмите кнопку на корпусе на 3+ секунды.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60">
                      <strong className="text-slate-900">Осталась отметка только одного замера?</strong>
                      <p className="mt-1 text-slate-600">
                        Оба замера (родинка и здоровая кожа) должны быть отправлены с интервалом не более 5 минут. Если прошло больше времени, сделайте оба замера заново.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "faq" && (
                <div className="space-y-2.5">
                  {faqItems.map((item, index) => {
                    const isExpanded = expandedFaq === index;
                    return (
                      <div
                        key={index}
                        className="rounded-xl border border-slate-200 bg-white transition hover:border-slate-300 overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => setExpandedFaq(isExpanded ? null : index)}
                          className="flex w-full items-center justify-between p-3.5 text-left text-xs font-semibold text-slate-900 hover:bg-slate-50/60 transition gap-2"
                        >
                          <span>{item.q}</span>
                          <span className="text-slate-400 shrink-0">
                            {isExpanded ? "▲" : "▼"}
                          </span>
                        </button>
                        {isExpanded && (
                          <div className="px-3.5 pb-3.5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/30 pt-2.5">
                            {item.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 bg-slate-50/80 px-5 py-3 flex items-center justify-between text-xs text-slate-500">
              <span>Спектроскопия диффузного отражения (400–950 нм)</span>
              <button
                type="button"
                onClick={handleClose}
                className="btn-primary py-1.5 px-4 text-xs"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
