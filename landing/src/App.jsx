import React from 'react';
import { motion } from 'framer-motion';
import { Anchor, Calendar, ShieldCheck, Star, Smartphone, Ship, MessageCircle, ArrowRight, CircleCheck } from 'lucide-react';

const FadeIn = ({ children, delay = 0, className = '' }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-100px' }}
    transition={{ duration: 0.55, delay }}
    className={className}
  >
    {children}
  </motion.div>
);

function App() {
  const howItWorks = [
    { n: '1', title: 'Выберите точку на карте', desc: 'Находите доступные катера рядом с вами и смотрите цены сразу в приложении.' },
    { n: '2', title: 'Выберите тариф', desc: 'Сравнивайте условия и выбирайте лучший вариант по времени и бюджету.' },
    { n: '3', title: 'Подтвердите бронирование', desc: 'Бронирование в пару касаний без звонков и долгих переписок.' },
    { n: '4', title: 'Выходите в плавание', desc: 'Получайте уведомления, инструкции и поддержку прямо во время аренды.' },
  ];

  const transportCards = [
    {
      title: 'Яхты',
      seats: 'до 12 мест',
      price: 'от 9000 ₽',
      image: 'https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?auto=format&fit=crop&w=1200&q=80',
    },
    {
      title: 'Катера',
      seats: 'до 8 мест',
      price: 'от 5000 ₽',
      image: 'https://images.unsplash.com/photo-1530554764233-e79e16c91d08?auto=format&fit=crop&w=1200&q=80',
    },
    {
      title: 'Вейкбуксировщики',
      seats: 'до 6 мест',
      price: 'от 7000 ₽',
      image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    },
    {
      title: 'Парусные яхты',
      seats: 'до 10 мест',
      price: 'от 8000 ₽',
      image: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=80',
    },
    {
      title: 'Гидроциклы',
      seats: '1-2 места',
      price: 'от 2500 ₽',
      image: 'https://images.unsplash.com/photo-1625038293144-1d562f0f0d8b?auto=format&fit=crop&w=1200&q=80',
    },
    {
      title: 'Хаусботы',
      seats: 'до 10 мест',
      price: 'от 12000 ₽',
      image: 'https://images.unsplash.com/photo-1516939884455-1445c8652f83?auto=format&fit=crop&w=1200&q=80',
    },
  ];

  const faq = [
    'Как зарегистрироваться и начать бронирование?',
    'Можно ли завершить аренду в другом месте?',
    'Как работает оплата и возвраты?',
    'Есть ли страховка и поддержка на воде?',
  ];

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100">
        <nav className="max-w-7xl mx-auto h-20 px-6 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2 text-slate-900 font-semibold">
            <Anchor className="w-5 h-5 text-navy" />
            <span className="tracking-wide">ONTHEWATER</span>
          </a>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-600">
            <a href="#transport" className="hover:text-slate-900">Водный транспорт</a>
            <a href="#features" className="hover:text-slate-900">Преимущества</a>
            <a href="#how" className="hover:text-slate-900">Как пользоваться</a>
            <a href="#faq" className="hover:text-slate-900">FAQ</a>
          </div>
          <button className="rounded-full bg-navy text-white px-5 py-2.5 text-sm font-medium hover:opacity-90">
            Скачать
          </button>
        </nav>
      </header>

      <main>
        <section className="px-6 pt-16 lg:pt-20 pb-20">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-14 items-center">
            <FadeIn>
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 bg-cyan-50 text-cyan-700 text-sm mb-5 border border-cyan-100">
                <MessageCircle className="w-4 h-4" />
                Первый шеринг на воде
              </div>
              <h1 className="text-5xl lg:text-6xl leading-[1.05] font-extrabold text-slate-900">
                Арендуй <span className="text-gradient">катер</span> <br />
                за 2 минуты.
              </h1>
              <p className="mt-6 text-lg text-slate-500 max-w-xl">
                ONTHEWATER объединяет клиентов и владельцев водного транспорта:
                быстрый поиск на карте, прозрачные тарифы, безопасная оплата и поддержка в приложении.
              </p>
              <div className="mt-9 flex flex-col sm:flex-row gap-4">
                <button className="rounded-full bg-navy text-white px-7 py-3.5 font-medium flex items-center justify-center gap-2">
                  Найти катер рядом <ArrowRight className="w-4 h-4" />
                </button>
                <button className="rounded-full border border-slate-200 px-7 py-3.5 font-medium text-slate-700 hover:bg-slate-50">
                  Для владельцев флота
                </button>
              </div>
              <div className="mt-9 flex items-center gap-5 text-sm text-slate-500">
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                </div>
                <span>4.9 в сторах, 10 000+ пользователей</span>
              </div>
            </FadeIn>

            <FadeIn delay={0.1}>
              <div className="relative">
                <div className="absolute -inset-8 bg-gradient-to-br from-cyan-100 to-teal-100 rounded-[32px] blur-2xl opacity-60" />
                <div className="relative glass-card p-6 md:p-8 rounded-[28px]">
                  <div className="grid grid-cols-5 gap-4">
                    <div className="col-span-3 rounded-2xl bg-slate-900 p-3 shadow-xl">
                      <div className="rounded-xl bg-slate-100 h-[360px] overflow-hidden border border-slate-200">
                        <img
                          src="/client-app-preview.png"
                          alt="Клиентское приложение ONTHEWATER"
                          className="w-full h-full object-cover object-top"
                          loading="lazy"
                        />
                      </div>
                    </div>
                    <div className="col-span-2 rounded-2xl bg-slate-900 p-3 shadow-xl mt-8">
                      <div className="rounded-xl bg-slate-100 h-[360px] overflow-hidden border border-slate-200">
                        <img
                          src="/owner-app-preview.png"
                          alt="Приложение владельца ONTHEWATER"
                          className="w-full h-full object-cover object-top"
                          loading="lazy"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        <section id="transport" className="px-6 pb-16">
          <div className="max-w-7xl mx-auto">
            <FadeIn>
              <h2 className="text-4xl font-bold text-slate-900">Водный транспорт для вас</h2>
              <p className="mt-3 text-slate-500">Выбирайте формат отдыха: с капитаном, без капитана или активный формат.</p>
            </FadeIn>
            <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {transportCards.map((item, idx) => (
                <FadeIn key={item.title} delay={0.05 * idx} className="rounded-3xl border border-slate-200 p-4 bg-white shadow-sm">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-40 rounded-2xl object-cover"
                    loading="lazy"
                  />
                  <h3 className="mt-4 text-xl font-bold text-slate-900 px-2">{item.title}</h3>
                  <div className="mt-3 text-sm text-slate-500 space-y-1 px-2 pb-2">
                    <p>Вместимость: {item.seats}</p>
                    <p>Тариф: {item.price}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="px-6 py-16 bg-slate-50 border-y border-slate-100">
          <div className="max-w-7xl mx-auto">
            <FadeIn>
              <h2 className="text-4xl font-bold text-slate-900">Ключевые возможности</h2>
            </FadeIn>
            <div className="mt-10 grid md:grid-cols-3 gap-5">
              <FadeIn delay={0.05} className="rounded-2xl bg-white border border-slate-200 p-6">
                <Calendar className="w-6 h-6 text-cyan-600" />
                <h4 className="mt-4 text-lg font-semibold text-slate-900">Календарь и слоты</h4>
                <p className="mt-2 text-slate-500 text-sm">Автоматическое управление доступностью и занятостью.</p>
              </FadeIn>
              <FadeIn delay={0.1} className="rounded-2xl bg-white border border-slate-200 p-6">
                <MessageCircle className="w-6 h-6 text-cyan-600" />
                <h4 className="mt-4 text-lg font-semibold text-slate-900">Чат в приложении</h4>
                <p className="mt-2 text-slate-500 text-sm">Уточняйте детали поездки прямо в платформе.</p>
              </FadeIn>
              <FadeIn delay={0.15} className="rounded-2xl bg-white border border-slate-200 p-6">
                <ShieldCheck className="w-6 h-6 text-cyan-600" />
                <h4 className="mt-4 text-lg font-semibold text-slate-900">Безопасные платежи</h4>
                <p className="mt-2 text-slate-500 text-sm">Прозрачные условия и защита обеих сторон.</p>
              </FadeIn>
            </div>
          </div>
        </section>

        <section id="how" className="px-6 py-16">
          <div className="max-w-7xl mx-auto">
            <FadeIn>
              <h2 className="text-4xl font-bold text-slate-900">Как пользоваться</h2>
              <p className="mt-3 text-slate-500">Простой сценарий аренды, как в лучших сервисах шеринга.</p>
            </FadeIn>
            <div className="mt-8 grid md:grid-cols-2 gap-5">
              {howItWorks.map((step, idx) => (
                <FadeIn key={step.n} delay={0.05 * idx} className="rounded-2xl border border-slate-200 bg-white p-6">
                  <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-700 text-sm font-semibold flex items-center justify-center">
                    {step.n}
                  </div>
                  <h4 className="mt-4 text-lg font-semibold text-slate-900">{step.title}</h4>
                  <p className="mt-2 text-slate-500 text-sm">{step.desc}</p>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="px-6 py-16">
          <div className="max-w-5xl mx-auto">
            <FadeIn>
              <h2 className="text-4xl font-bold text-slate-900">Ответы на вопросы</h2>
              <div className="mt-8 space-y-3">
                {faq.map((q) => (
                  <div key={q} className="rounded-2xl border border-slate-200 bg-white px-5 py-4 flex items-center justify-between">
                    <span className="text-slate-700">{q}</span>
                    <CircleCheck className="w-5 h-5 text-cyan-600" />
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </section>

        <section className="px-6 pb-20">
          <div className="max-w-7xl mx-auto rounded-[28px] bg-navy text-white p-10 md:p-14">
            <h3 className="text-3xl md:text-4xl font-bold max-w-3xl">Еще нет приложения?</h3>
            <p className="mt-3 text-slate-300 max-w-2xl">
              ONTHEWATER доступен на iOS и Android для клиентов и владельцев.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row gap-4">
              <button className="rounded-full bg-white text-slate-900 px-6 py-3 font-medium">Скачать для клиента</button>
              <button className="rounded-full border border-white/30 px-6 py-3 font-medium">Скачать для владельца</button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-100 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <Anchor className="w-4 h-4 text-navy" />
            ONTHEWATER
          </div>
          <div>© 2026 ONTHEWATER. Все права защищены.</div>
        </div>
      </footer>
    </div>
  );
}

export default App;