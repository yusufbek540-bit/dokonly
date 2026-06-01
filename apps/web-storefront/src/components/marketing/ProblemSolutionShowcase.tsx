'use client'

import { useState } from 'react'
import type { Locale } from '@/content/marketing/types'

interface ProblemSolutionShowcaseProps {
  locale: Locale
  trustItems: string[]
  problems: string[]
  solutions: string[]
}

const copy = {
  ru: {
    eyebrow: 'Диагностика продаж',
    title: 'Из хаоса в переписке в управляемый сценарий покупки',
    body: 'Выберите часть воронки и посмотрите, как Dokonly превращает разрозненные сообщения в понятный процесс для покупателя и продавца.',
    selectorLabel: 'Нажмите на этап, чтобы сменить сценарий',
    before: 'Как сейчас',
    engine: 'Dokonly',
    after: 'Что получает продавец',
    problemsTitle: 'Где теряется контроль',
    solutionsTitle: 'Что берет на себя Dokonly',
    stageLabel: 'Сценарий в Telegram',
    liveTitle: 'Путь заказа',
    sellerTitle: 'Панель продавца',
    insightTitle: 'Результат',
    stages: [
      {
        title: 'Каталог',
        tag: 'Витрина',
        metric: '1 экран',
        metricLabel: 'для выбора товара',
        before: 'Покупатель спрашивает цену, наличие и фото в личных сообщениях.',
        engine: 'Карточки товаров, категории, фото и следующий шаг собраны в одном Telegram-сценарии.',
        after: 'Меньше повторных вопросов и быстрее переход к оформлению заказа.',
        buyerMessage: 'Есть это платье? Какие размеры и цена?',
        botReply: 'Каталог показывает фото, цену, размер и кнопку следующего шага.',
        signal: 'Вопросы о цене уходят из лички',
        note: 'Карточка товара ведет покупателя дальше без ручного ответа.',
        sellerItems: ['Категория выбрана', 'Размер сохранен', 'Товар добавлен в заказ'],
      },
      {
        title: 'Заказ',
        tag: 'Оформление',
        metric: '6 шагов',
        metricLabel: 'до заявки',
        before: 'Адрес, телефон, доставка и комментарий собираются вручную.',
        engine: 'Форма заказа ведет покупателя по одному маршруту и сохраняет данные.',
        after: 'Продавец получает структурированный заказ вместо длинной переписки.',
        buyerMessage: 'Хочу заказать, куда отправить адрес?',
        botReply: 'Бот собирает телефон, адрес, доставку и комментарий по шагам.',
        signal: 'Заказ приходит одной карточкой',
        note: 'Команда видит понятную заявку без пересборки переписки.',
        sellerItems: ['Телефон получен', 'Адрес указан', 'Статус: новый заказ'],
      },
      {
        title: 'Возврат',
        tag: 'Повторный касание',
        metric: '24/7',
        metricLabel: 'напоминания',
        before: 'Корзины забываются, а повторные касания зависят от памяти продавца.',
        engine: 'Промокоды, напоминания и сценарии бота возвращают клиента в покупку.',
        after: 'Повторные продажи становятся частью процесса, а не ручной задачей.',
        buyerMessage: 'Я подумаю и вернусь позже.',
        botReply: 'Сценарий сохраняет корзину и напоминает о покупке с промокодом.',
        signal: 'Сават не пропадает после ухода',
        note: 'Возврат клиента работает даже когда продавец занят.',
        sellerItems: ['Корзина сохранена', 'Промокод готов', 'Напоминание запланировано'],
      },
      {
        title: 'CRM',
        tag: 'Клиентская база',
        metric: '1 база',
        metricLabel: 'клиентов',
        before: 'История клиента разбросана по чатам и быстро теряется.',
        engine: 'Заметки, теги и история заказов помогают продолжать разговор с контекстом.',
        after: 'Команда видит, кто покупал, что важно и какой следующий шаг предложить.',
        buyerMessage: 'Мне снова нужен тот же оттенок.',
        botReply: 'Dokonly показывает историю, теги и заметки по клиенту.',
        signal: 'Повторная продажа идет с контекстом',
        note: 'Продавец продолжает диалог не с нуля, а с историей покупателя.',
        sellerItems: ['История заказов', 'Тег интереса', 'Следующий шаг'],
      },
    ],
  },
  uz: {
    eyebrow: 'Savdoni tahlil qilish',
    title: 'Tartibsiz yozishmadan boshqariladigan xarid ssenariysiga',
    body: 'Voronka qismini tanlang va Dokonly alohida xabarlarni mijoz va sotuvchi uchun tushunarli jarayonga qanday aylantirishini ko‘ring.',
    selectorLabel: 'Ssenariyni almashtirish uchun bosqichni bosing',
    before: 'Hozir qanday',
    engine: 'Dokonly',
    after: 'Sotuvchi nima oladi',
    problemsTitle: 'Nazorat qayerda yo‘qoladi',
    solutionsTitle: 'Dokonly nimani o‘ziga oladi',
    stageLabel: 'Telegram ssenariysi',
    liveTitle: 'Buyurtma yo‘li',
    sellerTitle: 'Sotuvchi paneli',
    insightTitle: 'Natija',
    stages: [
      {
        title: 'Katalog',
        tag: 'Vitrina',
        metric: '1 ekran',
        metricLabel: 'mahsulot tanlash',
        before: 'Mijoz narx, mavjudlik va suratlarni shaxsiy xabarda so‘raydi.',
        engine: 'Mahsulot kartalari, kategoriyalar, suratlar va keyingi qadam Telegram ssenariysida jamlanadi.',
        after: 'Takroriy savollar kamayadi va buyurtmaga o‘tish tezlashadi.',
        buyerMessage: 'Shu ko‘ylak bormi? O‘lchami va narxi qanday?',
        botReply: 'Katalog surat, narx, o‘lcham va keyingi qadam tugmasini ko‘rsatadi.',
        signal: 'Narx haqidagi savollar shaxsiy yozishmadan chiqadi',
        note: 'Mahsulot kartasi mijozni qo‘l javobisiz keyingi qadamga olib boradi.',
        sellerItems: ['Kategoriya tanlandi', 'O‘lcham saqlandi', 'Mahsulot buyurtmaga qo‘shildi'],
      },
      {
        title: 'Buyurtma',
        tag: 'Rasmiylashtirish',
        metric: '6 qadam',
        metricLabel: 'arizagacha',
        before: 'Manzil, telefon, yetkazish va izoh qo‘lda yig‘iladi.',
        engine: 'Buyurtma formasi mijozni bitta yo‘l bo‘yicha olib boradi va ma’lumotlarni saqlaydi.',
        after: 'Sotuvchi uzun yozishma o‘rniga tartibli buyurtma oladi.',
        buyerMessage: 'Buyurtma bermoqchiman, manzilni qayerga yozaman?',
        botReply: 'Bot telefon, manzil, yetkazish va izohni bosqichma-bosqich yig‘adi.',
        signal: 'Buyurtma bitta karta bo‘lib keladi',
        note: 'Jamoa yozishmani qayta yig‘masdan aniq arizani ko‘radi.',
        sellerItems: ['Telefon olindi', 'Manzil ko‘rsatildi', 'Status: yangi buyurtma'],
      },
      {
        title: 'Qaytarish',
        tag: 'Qayta aloqa',
        metric: '24/7',
        metricLabel: 'eslatmalar',
        before: 'Savatlar unutiladi, takroriy aloqa sotuvchining esida qolishiga bog‘liq.',
        engine: 'Promokodlar, eslatmalar va bot ssenariylari mijozni xaridga qaytaradi.',
        after: 'Takroriy savdo qo‘l vazifasi emas, jarayonning bir qismiga aylanadi.',
        buyerMessage: 'O‘ylab ko‘raman, keyinroq qaytaman.',
        botReply: 'Ssenariy savatni saqlaydi va promokod bilan xaridni eslatadi.',
        signal: 'Savat mijoz chiqqandan keyin ham yo‘qolmaydi',
        note: 'Sotuvchi band bo‘lsa ham mijozni qaytarish jarayoni ishlaydi.',
        sellerItems: ['Savat saqlandi', 'Promokod tayyor', 'Eslatma rejalandi'],
      },
      {
        title: 'CRM',
        tag: 'Mijozlar bazasi',
        metric: '1 baza',
        metricLabel: 'mijozlar',
        before: 'Mijoz tarixi chatlarda tarqalib ketadi va tez yo‘qoladi.',
        engine: 'Izohlar, teglar va buyurtma tarixi suhbatni kontekst bilan davom ettirishga yordam beradi.',
        after: 'Jamoa kim nima olganini, nima muhimligini va keyingi qadamni ko‘radi.',
        buyerMessage: 'Menga o‘sha oldingi rang yana kerak.',
        botReply: 'Dokonly mijoz tarixi, teglari va izohlarini sotuvchiga ko‘rsatadi.',
        signal: 'Takroriy savdo kontekst bilan davom etadi',
        note: 'Sotuvchi suhbatni noldan emas, xaridor tarixi bilan boshlaydi.',
        sellerItems: ['Buyurtma tarixi', 'Qiziqish tegi', 'Keyingi qadam'],
      },
    ],
  },
} as const

const iconPaths = [
  'M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Zm3 1h10M7 12h4m-4 3h7',
  'M6 5h12l-1 10H7L6 5Zm0 0L5 3H3m6 16.5h.01M16 19.5h.01M8 8h8',
  'M5 12a7 7 0 0 1 12-4.9M19 12a7 7 0 0 1-12 4.9M17 3v4h-4M7 21v-4h4',
  'M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11ZM8 9h8M8 12h5M8 15h7',
] as const

function ShowcaseIcon({ index }: { index: number }) {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={iconPaths[index % iconPaths.length]} />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" className="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  )
}

export function ProblemSolutionShowcase({ locale, trustItems, problems, solutions }: ProblemSolutionShowcaseProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const text = copy[locale]
  const activeStage = text.stages[activeIndex]

  return (
    <section className="relative overflow-hidden border-y border-slate-200 bg-[#f6faf7]">
      <div className="showcase-grid pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="marketing-shell relative pt-10 pb-5 md:pt-14 md:pb-6 lg:pt-16 lg:pb-6">
        <div className="showcase-reveal">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">{text.eyebrow}</p>
              <h2 className="mt-4 max-w-2xl text-3xl font-black leading-tight text-slate-950 md:text-4xl">{text.title}</h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">{text.body}</p>
            </div>
            <div className="flex items-center gap-2 pt-1 text-sm font-bold text-slate-600 lg:pt-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              <span>{activeStage.title}</span>
              <span className="text-slate-300" aria-hidden="true">/</span>
              <span className="text-slate-500">{activeStage.tag}</span>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="tablist" aria-label={text.selectorLabel}>
            {trustItems.map((item, index) => {
              const selected = activeIndex === index
              const stage = text.stages[index] ?? activeStage
              return (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-label={`${stage.title}. ${text.selectorLabel}`}
                  onClick={() => setActiveIndex(index)}
                  className={`group relative flex min-h-[92px] cursor-pointer flex-col justify-between overflow-hidden rounded-lg border p-3.5 text-left transition duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 active:scale-[0.99] ${
                    selected
                      ? 'border-emerald-500 bg-white text-emerald-950 shadow-[0_18px_44px_rgba(0,121,92,0.16)]'
                      : 'border-slate-200 bg-white/80 text-slate-700 shadow-sm hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-white hover:text-slate-950 hover:shadow-[0_14px_34px_rgba(15,23,42,0.10)]'
                  }`}
                  aria-pressed={selected}
                >
                  <span className={`absolute inset-x-0 top-0 h-1 ${selected ? 'bg-emerald-500' : 'bg-transparent group-hover:bg-emerald-200'}`} aria-hidden="true" />
                  <span className="flex items-start justify-between gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition ${selected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 group-hover:bg-emerald-50 group-hover:text-emerald-700'}`}>
                      <ShowcaseIcon index={index} />
                    </span>
                    <span className="text-xs font-black text-slate-400">0{index + 1}</span>
                  </span>
                  <span>
                    <span className="block text-sm font-black leading-5 text-slate-950">{stage.title}</span>
                    <span className="mt-1 block text-sm font-semibold leading-5 text-slate-600">{item}</span>
                  </span>
                  <span className="flex items-center gap-3" aria-hidden="true">
                    <span className={`h-1.5 flex-1 overflow-hidden rounded-full transition ${selected ? 'bg-emerald-100' : 'bg-slate-100 group-hover:bg-emerald-50'}`}>
                      <span className={`block h-full rounded-full bg-emerald-500 transition-all duration-200 ${selected ? 'w-full' : 'w-0 group-hover:w-1/2'}`} />
                    </span>
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition ${selected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-700 group-hover:translate-x-0.5'}`}>
                      <ArrowIcon />
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[0.74fr_1.26fr] lg:items-stretch">
          <div className="showcase-reveal flex h-full flex-col gap-4">
            <div className="rounded-lg border border-rose-100 bg-white/90 p-3.5 shadow-sm">
              <h3 className="text-sm font-black text-slate-950">{text.problemsTitle}</h3>
              <ul className="mt-3 grid gap-2">
                {problems.slice(0, 4).map((problem) => (
                  <li key={problem} className="flex gap-3 rounded-lg border border-slate-100 bg-slate-50/90 px-3 py-2 text-sm leading-6 text-slate-700">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-rose-400" aria-hidden="true" />
                    <span>{problem}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-emerald-100 bg-white/90 p-3.5 shadow-sm">
              <h3 className="text-sm font-black text-slate-950">{text.solutionsTitle}</h3>
              <ul className="mt-3 grid gap-2">
                {solutions.slice(0, 4).map((solution) => (
                  <li key={solution} className="flex gap-3 rounded-lg border border-slate-100 bg-slate-50/90 px-3 py-2 text-sm font-semibold leading-6 text-slate-800">
                    <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white" aria-hidden="true">
                      <CheckIcon />
                    </span>
                    <span>{solution}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="showcase-reveal rounded-lg border border-slate-200 bg-white/95 p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)] md:p-6" style={{ animationDelay: '90ms' }}>
            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-5 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{text.stageLabel}</p>
                <h3 className="mt-1 text-3xl font-black text-slate-950">{activeStage.title}</h3>
              </div>
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                <span>{activeStage.signal}</span>
              </div>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
              <div className="grid gap-3">
                <div className="rounded-lg border border-rose-100 bg-rose-50/80 p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-7 w-1.5 shrink-0 rounded-full bg-rose-500" aria-hidden="true" />
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-rose-700">{text.before}</p>
                  </div>
                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-800">{activeStage.before}</p>
                </div>

                <div className="rounded-lg border border-emerald-500 bg-emerald-600 p-4 text-white shadow-[0_16px_34px_rgba(0,121,92,0.18)]">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-emerald-700" aria-hidden="true">
                      <ShowcaseIcon index={activeIndex} />
                    </span>
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-50">{text.engine}</p>
                  </div>
                  <p className="mt-3 text-sm font-bold leading-6 text-white">{activeStage.engine}</p>
                </div>

                <div className="rounded-lg border border-emerald-100 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" aria-hidden="true">
                      <CheckIcon />
                    </span>
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-600">{text.after}</p>
                  </div>
                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-800">{activeStage.after}</p>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-[#f7faf8] p-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{text.liveTitle}</p>
                    <p className="mt-1 text-sm font-bold text-slate-950">Telegram</p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-emerald-700 shadow-sm">{activeStage.tag}</span>
                </div>

                <div className="mt-4 grid gap-3">
                  <div className="max-w-[82%] rounded-lg rounded-bl-sm bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-800 shadow-sm">
                    {activeStage.buyerMessage}
                  </div>
                  <div className="ml-auto max-w-[88%] rounded-lg rounded-br-sm bg-emerald-600 px-4 py-3 text-sm font-semibold leading-6 text-white shadow-sm">
                    {activeStage.botReply}
                  </div>
                </div>

                <div className="mt-5 border-t border-slate-200 pt-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <p className="max-w-md text-sm font-semibold leading-6 text-slate-700">{activeStage.note}</p>
                    <div className="shrink-0 text-left sm:text-right">
                      <p className="text-2xl font-black text-slate-950">{activeStage.metric}</p>
                      <p className="text-xs font-bold text-slate-500">{activeStage.metricLabel}</p>
                    </div>
                  </div>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${((activeIndex + 1) / text.stages.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
