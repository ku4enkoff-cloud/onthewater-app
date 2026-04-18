/** ID счётчика Яндекс.Метрики (совпадает с index.html). */
export const YANDEX_METRIKA_ID = 101036660;

/**
 * SPA: при смене маршрута React Router отправляем виртуальный просмотр,
 * иначе Метрика видит только первую загрузку.
 */
export function metrikaHit(url, title) {
  if (typeof window === 'undefined' || typeof window.ym !== 'function') return;
  try {
    window.ym(YANDEX_METRIKA_ID, 'hit', url, { title: title || document.title });
  } catch (_) {
    /* ignore */
  }
}
