"use client";

import { useState } from "react";
import Link from "next/link";

export default function DeviceGuidePage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  const steps = [
    {
      step: 1,
      title: "Включение и поиск сети щупа",
      desc: "Подключите спектральный зонд к питанию (USB-C или встроенный аккумулятор). На телефоне или компьютере откройте список доступных Wi-Fi сетей и выберите точку «SkinProbe-Setup».",
      badge: "Точка доступа",
      badgeColor: "bg-sky-50 text-sky-700 border-sky-200",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 12.55a11 11 0 0 1 14.08 0" />
          <path d="M1.42 9a16 16 0 0 1 21.16 0" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" strokeWidth="3" />
        </svg>
      ),
    },
    {
      step: 2,
      title: "Настройка домашнего Wi-Fi",
      desc: "В браузере автоматически откроется страница авторизации (или перейдите по адресу 192.168.4.1). Выберите вашу домашнюю сеть Wi-Fi из списка, введите пароль и нажмите «Save». Щуп подключится к интернету.",
      badge: "Портал настройки",
      badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      ),
    },
    {
      step: 3,
      title: "Замер 1: Родинка (короткое нажатие)",
      desc: "Откройте страницу исследуемой родинки на сайте. Нажмите кнопку «Родинка» на сайте, плотно приложите носик щупа к родинке и сделайте 1 короткое нажатие кнопки на зонде. Данные мгновенно отобразятся.",
      badge: "Замер невуса",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="3" fill="currentColor" />
        </svg>
      ),
    },
    {
      step: 4,
      title: "Замер 2: Здоровая кожа (калибровка)",
      desc: "Приложите щуп к чистой коже в 2–3 см от родинки и нажмите кнопку на щупе повторно. Алгоритм нормализует спектральный контраст ln(родинка/кожа), исключая влияние фототипа.",
      badge: "Калибровка нормы",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
    },
  ];

  const ledSignals = [
    {
      status: "Горит постоянно (зеленый)",
      meaning: "Щуп готов к первому замеру (исследование родинки).",
      action: "Приложите к родинке и нажмите кнопку.",
      color: "bg-emerald-500",
    },
    {
      status: "Медленное мигание (синий)",
      meaning: "Первый замер принят. Ожидается контрольный замер соседней здоровой кожи.",
      action: "Приложите к чистой коже рядом и нажмите кнопку.",
      color: "bg-sky-500 animate-pulse",
    },
    {
      status: "Быстрое мерцание (желтый)",
      meaning: "Идет отправка данных на сервер или активен режим первой настройки Wi-Fi.",
      action: "Подождите 2-3 секунды.",
      color: "bg-amber-500",
    },
    {
      status: "Удержание кнопки 3 секунды",
      meaning: "Команда сброса настроек сети.",
      action: "Сеть сбросится, и зонд снова создаст «SkinProbe-Setup».",
      color: "bg-rose-500",
    },
  ];

  const faqs = [
    {
      q: "Зачем обязательно делать два замера (родинка + кожа рядом)?",
      a: "В соответствии с современной медицинской литературой по спектроскопии диффузного отражения (DRS), абсолютные значения отражения света очень сильно зависят от индивидуального оттенка кожи человека (фототипа по Фитцпатрику). Замер чистой кожи рядом служит индивидуальным «нулём». Система рассчитывает контраст логарифмического отношения ln(родинка/кожа), исключая искажения из-за загара или тона кожи и выделяя только патологический компонент.",
    },
    {
      q: "Сколько времени есть на второй замер?",
      a: "На второй контрольный замер отводится 5 минут. Если в течение 5 минут второй замер не поступит, сессия сбрасывается для предотвращения ошибок, связанных с изменением температуры сенсора или внешнего освещения.",
    },
    {
      q: "Безопасен ли лазерный луч спектрального щупа?",
      a: "Да, зонд использует маломощный полупроводниковый лазер 650 нм (красный спектр), предназначенный исключительно для подсветки микроучастка кожи при работе сенсора AS7341. Он не нагревает ткани и безопасен для кожи. Однако категорически запрещается направлять лазерный луч в глаза.",
    },
    {
      q: "Почему устройство работает по Wi-Fi, а не через Bluetooth?",
      a: "Устройства на базе iOS (iPhone и iPad) на аппаратном уровне операционной системы не поддерживают стандарт Web Bluetooth в мобильных веб-браузерах (Safari, Chrome, Firefox). Использование прямого Wi-Fi подключения через ESP32 позволило сделать прибор полностью независимым от модели телефона, планшета или компьютера.",
    },
    {
      q: "Что делать, если замер не появляется на экране сайта?",
      a: "1. Убедитесь, что домашний Wi-Fi имеет стабильный доступ в интернет.\n2. Проверьте, что вы находитесь на странице конкретной родинки, а не в общем списке.\n3. Если зонд не выходит в сеть, зажмите кнопку на 3 секунды для сброса и настройте Wi-Fi заново через «SkinProbe-Setup».",
    },
    {
      q: "Заменяет ли спектральный анализ консультацию онкодерматолога?",
      a: "Категорически нет. Наш сервис и спектральный зонд являются вспомогательным скрининговым комплексом для объективного динамического наблюдения. Точный диагноз устанавливается врачом на очном приеме на основании дерматоскопии и гистологического исследования.",
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-10">
      {/* Breadcrumb / Back button */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/" className="hover:text-slate-900 transition flex items-center gap-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Главная
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-medium">Руководство пользователя</span>
      </div>

      {/* Hero Header */}
      <header className="rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-blue-50/40 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold text-sky-800 shadow-2xs">
          <span className="flex h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
          Аппаратный модуль ESP32 + AS7341
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Подключение спектрального щупа к сайту
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed">
            Пошаговая инструкция по беспроводной настройке оптического зонда, проведению двухэтапного спектрального сканирования и ответы на частые вопросы.
          </p>
        </div>
      </header>

      {/* 4 Steps Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-600 text-white text-xs font-bold">
              1
            </span>
            Как подключить и выполнить замер
          </h2>
          <span className="text-xs text-slate-500">4 простых шага</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {steps.map((item) => (
            <div
              key={item.step}
              className="panel flex flex-col justify-between p-5 hover:border-sky-300 transition group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 border border-slate-200 group-hover:bg-sky-600 group-hover:text-white group-hover:border-sky-600 transition">
                    {item.icon}
                  </span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                    <span className="text-sky-600 font-bold">Шаг {item.step}.</span> {item.title}
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* LED Diagnostics Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600 text-white text-xs font-bold">
              2
            </span>
            Значение световых сигналов светодиода
          </h2>
          <span className="text-xs text-slate-500">Индикаторы щупа</span>
        </div>

        <div className="panel overflow-hidden border border-slate-200 p-0">
          <div className="divide-y divide-slate-100">
            {ledSignals.map((sig, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-2 sm:gap-4 hover:bg-slate-50/60 transition">
                <div className="flex items-center gap-3">
                  <span className={`h-3.5 w-3.5 rounded-full shrink-0 ${sig.color} shadow-xs`} />
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-900">{sig.status}</p>
                    <p className="text-xs text-slate-500">{sig.meaning}</p>
                  </div>
                </div>
                <div className="text-xs font-medium text-slate-700 bg-slate-100 sm:bg-transparent rounded-lg px-2.5 py-1 sm:p-0">
                  {sig.action}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-600 text-white text-xs font-bold">
              3
            </span>
            Часто задаваемые вопросы (FAQ)
          </h2>
          <span className="text-xs text-slate-500">База знаний</span>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div
                key={idx}
                className="panel border border-slate-200 overflow-hidden transition hover:border-slate-300"
              >
                <button
                  type="button"
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between p-4 text-left text-sm font-semibold text-slate-900 hover:bg-slate-50/60 transition gap-4"
                >
                  <span>{faq.q}</span>
                  <span className="text-slate-400 shrink-0 text-xs">
                    {isOpen ? "▲" : "▼"}
                  </span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/30 whitespace-pre-line">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Clinical Disclaimer */}
      <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 sm:p-5 text-xs text-rose-900 space-y-1.5">
        <p className="font-bold flex items-center gap-1.5 text-rose-800">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          Важная медицинская информация
        </p>
        <p className="text-rose-800/90 leading-relaxed">
          Система SkinScanner не является медицинским прибором для постановки окончательного диагноза. Любые подозрительные изменения формы, цвета, границ или размера родинки требуют очного осмотра квалифицированным врачом-дерматологом или онкологом.
        </p>
      </div>

      {/* Call to Action */}
      <div className="flex justify-center pt-2">
        <Link href="/" className="btn-primary px-6 py-2.5 text-xs sm:text-sm">
          Вернуться к моим родинкам
        </Link>
      </div>
    </div>
  );
}
