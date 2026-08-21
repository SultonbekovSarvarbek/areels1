/**
 * Условия использования и политика конфиденциальности — тексты, а не ссылки:
 * документы должны открываться без сети и на том языке, который выбран в
 * приложении. Сайта у сервиса пока нет, и до его появления это единственное
 * место, где они опубликованы.
 *
 * Тексты писал не юрист. Перед публикацией в App Store их стоит показать тому,
 * кто отвечает за юридическую сторону: здесь описано ровно то, как сервис
 * устроен сегодня (объявления только из бота, модерация, данные продавца).
 */

import type { Lang } from './i18n';

export interface LegalSection {
  title: string;
  text: string;
}

export interface LegalDoc {
  title: string;
  /** Дата последнего изменения — её первым делом ищет и пользователь, и ревьюер. */
  updated: string;
  intro: string;
  sections: LegalSection[];
}

export type LegalKey = 'terms' | 'privacy';

const BOT = '@avtolike_uz_bot';

const ru: Record<LegalKey, LegalDoc> = {
  terms: {
    title: 'Условия использования',
    updated: 'Обновлено 20 августа 2026',
    intro:
      'AvtoLike — витрина объявлений о продаже автомобилей в Узбекистане. Пользуясь приложением, вы соглашаетесь с этими условиями.',
    sections: [
      {
        title: 'Что делает AvtoLike',
        text: `Мы показываем объявления, которые продавцы размещают через телеграм-бот ${BOT}. Мы не продаём машины, не участвуем в сделках, не берём комиссию и не выступаем посредником. Продавец и покупатель договариваются напрямую.`,
      },
      {
        title: 'Кто может пользоваться',
        text: 'Приложение рассчитано на совершеннолетних: сделки с автомобилями заключают с 18 лет. Размещая объявление, вы подтверждаете, что вправе продавать эту машину.',
      },
      {
        title: 'Каким должно быть объявление',
        text: 'Только реально продающаяся машина, только ваши фотографии, честные пробег, год, состояние и цена. Одна машина — одно объявление. Телефон должен быть рабочим.',
      },
      {
        title: 'Что запрещено',
        text: 'Выдумывать характеристики, ставить чужие или перерисованные фотографии, указывать цену, за которую вы не готовы продать, рекламировать другие сервисы, оскорблять людей, выгружать каталог автоматическими средствами.',
      },
      {
        title: 'Нулевая терпимость к оскорбительному контенту',
        text: 'Мы не терпим оскорбительный контент и злоупотребления — ни в каком объёме и ни в каком виде. Запрещены оскорбления, угрозы, непристойности, разжигание вражды по любому признаку, мошенничество и обман покупателя, а также любое домогательство к другим пользователям. Пользуясь приложением, вы соглашаетесь не размещать такой контент и не вести себя так по отношению к другим.',
      },
      {
        title: 'Модерация',
        text: 'Каждое объявление перед публикацией проверяет модератор. Мы можем отклонить объявление или снять его с показа, если оно нарушает эти условия; причину напишем в боте. При повторных нарушениях мы вправе отказать в размещении.',
      },
      {
        title: 'Жалобы и срок реакции',
        text: 'На любое объявление можно пожаловаться прямо в приложении: кнопка «Пожаловаться» есть и на карточке в колоде, и внутри объявления. Каждую жалобу мы рассматриваем в течение 24 часов. Подтвердившееся нарушение мы удаляем, а автора отключаем от сервиса без предупреждения и без возврата к размещению. Объявление, на которое пожаловались несколько человек, скрывается из каталога автоматически, ещё до решения модератора.',
      },
      {
        title: 'Блокировка продавца',
        text: 'Вы можете заблокировать любого продавца — его объявления полностью исчезнут из вашей колоды, избранного и поиска. Блокировка действует на вашем устройстве сразу и бессрочно; снять её можно в профиле, в разделе «Заблокированные».',
      },
      {
        title: 'За что мы не отвечаем',
        text: 'Мы не проверяем юридическую чистоту автомобиля, подлинность документов и происхождение пробега. Всё, что написано в объявлении, — слова продавца. Осматривайте машину, сверяйте документы и проверяйте историю до передачи денег. Риски сделки остаются на её сторонах.',
      },
      {
        title: 'Ваши данные в объявлении',
        text: 'Имя, номер телефона и город продавца видны всем пользователям приложения — иначе объявление не работает. Размещая его, вы соглашаетесь на такой показ. Государственный номер на фотографиях мы закрываем автоматически.',
      },
      {
        title: 'Изменение условий',
        text: 'Мы можем изменить эти условия; дата последнего изменения указана вверху. Если вы продолжаете пользоваться приложением после изменения, вы с ним согласны.',
      },
      {
        title: 'Связь',
        text: `Вопросы, жалобы на объявление и просьбы удалить данные — в телеграм-бот ${BOT}.`,
      },
    ],
  },
  privacy: {
    title: 'Политика конфиденциальности',
    updated: 'Обновлено 20 августа 2026',
    intro: 'Здесь написано, какие данные собирает AvtoLike и что с ними происходит.',
    sections: [
      {
        title: 'Что мы собираем у покупателя',
        text: 'Ничего. Избранное, просмотренные машины и фильтры хранятся только на вашем устройстве и на наши серверы не уходят. Чтобы смотреть объявления, регистрация не нужна.',
      },
      {
        title: 'Что мы собираем у продавца',
        text: 'Через телеграм-бот: номер телефона, имя, город, язык общения, идентификатор и имя пользователя в телеграме, всё, что вы указали в анкете, и фотографии машины.',
      },
      {
        title: 'Зачем это нужно',
        text: 'Показать объявление покупателям, дать им возможность вам позвонить, проверить объявление модератором и сообщить вам о его судьбе.',
      },
      {
        title: 'Что видят другие',
        text: 'Имя, номер телефона, город и содержимое объявления с фотографиями. Идентификатор в телеграме, язык и служебные пометки видим только мы.',
      },
      {
        title: 'Где это хранится',
        text: 'На нашем сервере, фотографии — в объектном хранилище, доступном по прямой ссылке. Государственные номера на фотографиях закрываются до сохранения.',
      },
      {
        title: 'Сколько мы храним',
        text: 'Пока живёт объявление. Снятое или удалённое объявление перестаёт показываться сразу; данные продавца хранятся, пока вы не попросите их удалить.',
      },
      {
        title: 'Как удалить свои данные',
        text: `В боте: «Мои объявления» → «Удалить». Чтобы удалить профиль продавца целиком, напишите об этом в ${BOT}.`,
      },
      {
        title: 'Кому мы передаём данные',
        text: 'Никому. Мы не продаём данные, не отдаём их рекламным сетям и не встраиваем аналитику слежения. Исключение — законный запрос уполномоченного органа.',
      },
      {
        title: 'Изменения и связь',
        text: `Политика может измениться, дата последнего изменения указана вверху. Вопросы — в ${BOT}.`,
      },
    ],
  },
};

const uz: Record<LegalKey, LegalDoc> = {
  terms: {
    title: 'Foydalanish shartlari',
    updated: '2026-yil 20-avgustda yangilangan',
    intro:
      "AvtoLike — O'zbekistonda avtomobil sotuvi e'lonlari vitrinasi. Ilovadan foydalanar ekansiz, ushbu shartlarga rozilik bildirasiz.",
    sections: [
      {
        title: 'AvtoLike nima qiladi',
        text: `Biz sotuvchilar ${BOT} telegram boti orqali joylagan e'lonlarni ko'rsatamiz. Mashina sotmaymiz, bitimda qatnashmaymiz, komissiya olmaymiz va vositachi bo'lmaymiz. Sotuvchi bilan xaridor to'g'ridan-to'g'ri kelishadi.`,
      },
      {
        title: 'Kim foydalana oladi',
        text: "Ilova voyaga yetganlar uchun: avtomobil bitimlari 18 yoshdan tuziladi. E'lon joylash bilan siz ushbu mashinani sotishga haqli ekaningizni tasdiqlaysiz.",
      },
      {
        title: "E'lon qanday bo'lishi kerak",
        text: "Faqat haqiqatan sotilayotgan mashina, faqat o'zingiz olgan suratlar, rost yurgan masofa, yil, holat va narx. Bitta mashina — bitta e'lon. Telefon raqami ishlaydigan bo'lsin.",
      },
      {
        title: 'Nima taqiqlanadi',
        text: "Xususiyatlarni o'ylab topish, o'zganing yoki tahrirlangan suratlarini qo'yish, o'zingiz rozi bo'lmagan narxni ko'rsatish, boshqa xizmatlarni reklama qilish, odamlarni haqorat qilish, katalogni avtomatik vositalar bilan yuklab olish.",
      },
      {
        title: 'Haqoratli kontentga mutlaqo yo\'l qo\'yilmaydi',
        text: "Biz haqoratli kontentga va suiiste'molga hech qanday hajmda va hech qanday ko'rinishda toqat qilmaymiz. Haqorat, tahdid, nomaqbul so'zlar, har qanday belgi bo'yicha adovat qo'zg'atish, firibgarlik va xaridorni aldash, shuningdek boshqa foydalanuvchilarni bezovta qilish taqiqlanadi. Ilovadan foydalanish bilan siz bunday kontent joylamaslikka va boshqalarga nisbatan shunday yo'l tutmaslikka rozilik bildirasiz.",
      },
      {
        title: 'Moderatsiya',
        text: "Har bir e'lonni chop etishdan oldin moderator tekshiradi. Shartlar buzilsa, e'lonni rad etishimiz yoki ko'rsatuvdan olib qo'yishimiz mumkin; sababini botda yozamiz. Qayta-qayta buzilsa, e'lon joylashni rad etishga haqlimiz.",
      },
      {
        title: 'Shikoyatlar va javob muddati',
        text: "Istalgan e'lon ustidan to'g'ridan-to'g'ri ilovada shikoyat qilish mumkin: «Shikoyat qilish» tugmasi ham to'plamdagi kartochkada, ham e'lon ichida bor. Har bir shikoyatni 24 soat ichida ko'rib chiqamiz. Tasdiqlangan buzilishni o'chiramiz, muallifini esa ogohlantirishsiz va qayta joylash imkoniyatisiz xizmatdan chetlatamiz. Bir necha kishi shikoyat qilgan e'lon moderator qaroridan oldin ham katalogdan avtomatik yashiriladi.",
      },
      {
        title: 'Sotuvchini bloklash',
        text: "Siz istalgan sotuvchini bloklashingiz mumkin — uning e'lonlari to'plamingizdan, saralanganingizdan va qidiruvdan butunlay yo'qoladi. Blok qurilmangizda darhol va muddatsiz ishlaydi; uni profildagi «Bloklanganlar» bo'limida olib tashlash mumkin.",
      },
      {
        title: 'Biz nima uchun javob bermaymiz',
        text: "Biz avtomobilning yuridik tozaligini, hujjatlarning haqiqiyligini va yurgan masofasini tekshirmaymiz. E'londagi hamma narsa — sotuvchining so'zlari. Pul bermasdan oldin mashinani ko'ring, hujjatlarni solishtiring va tarixini tekshiring. Bitim xatarlari uning tomonlarida qoladi.",
      },
      {
        title: "E'londagi ma'lumotlaringiz",
        text: "Sotuvchining ismi, telefon raqami va shahri ilovaning barcha foydalanuvchilariga ko'rinadi — busiz e'lon ishlamaydi. E'lon joylash bilan siz shunday ko'rsatishga rozilik berasiz. Suratlardagi davlat raqamini biz avtomatik yopamiz.",
      },
      {
        title: "Shartlarning o'zgarishi",
        text: "Ushbu shartlarni o'zgartirishimiz mumkin; oxirgi o'zgarish sanasi yuqorida ko'rsatilgan. O'zgarishdan keyin ilovadan foydalanishda davom etsangiz, unga rozisiz.",
      },
      {
        title: "Bog'lanish",
        text: `Savollar, e'lon ustidan shikoyat va ma'lumotlarni o'chirish so'rovi — ${BOT} telegram botiga.`,
      },
    ],
  },
  privacy: {
    title: 'Maxfiylik siyosati',
    updated: '2026-yil 20-avgustda yangilangan',
    intro:
      "Bu yerda AvtoLike qanday ma'lumotlarni yig'ishi va ular bilan nima bo'lishi yozilgan.",
    sections: [
      {
        title: "Xaridordan nima yig'amiz",
        text: "Hech narsa. Saralangan e'lonlar, ko'rilgan mashinalar va filtrlar faqat qurilmangizda saqlanadi va serverlarimizga yuborilmaydi. E'lonlarni ko'rish uchun ro'yxatdan o'tish shart emas.",
      },
      {
        title: "Sotuvchidan nima yig'amiz",
        text: "Telegram bot orqali: telefon raqami, ism, shahar, muloqot tili, telegramdagi identifikator va foydalanuvchi nomi, anketada ko'rsatgan barcha narsalaringiz va mashina suratlari.",
      },
      {
        title: 'Bu nima uchun kerak',
        text: "E'lonni xaridorlarga ko'rsatish, ularga sizga qo'ng'iroq qilish imkonini berish, e'lonni moderator tekshirishi va uning taqdiri haqida sizga xabar berish uchun.",
      },
      {
        title: "Boshqalar nimani ko'radi",
        text: "Ism, telefon raqami, shahar va suratlari bilan e'lon mazmuni. Telegramdagi identifikator, til va xizmat belgilarini faqat biz ko'ramiz.",
      },
      {
        title: 'Qayerda saqlanadi',
        text: "Bizning serverimizda, suratlar — to'g'ridan-to'g'ri havola orqali ochiladigan obyekt xotirasida. Suratlardagi davlat raqamlari saqlashdan oldin yopiladi.",
      },
      {
        title: 'Qancha saqlaymiz',
        text: "E'lon yashaguncha. Ko'rsatuvdan olingan yoki o'chirilgan e'lon darhol ko'rinmay qoladi; sotuvchi ma'lumotlari siz o'chirishni so'ramaguningizcha saqlanadi.",
      },
      {
        title: "Ma'lumotlarni qanday o'chirish mumkin",
        text: `Botda: «Mening e'lonlarim» → «O'chirish». Sotuvchi profilini butunlay o'chirish uchun ${BOT} ga yozing.`,
      },
      {
        title: "Kimga ma'lumot beramiz",
        text: "Hech kimga. Ma'lumotlarni sotmaymiz, reklama tarmoqlariga bermaymiz va kuzatuv analitikasini o'rnatmaymiz. Istisno — vakolatli organning qonuniy so'rovi.",
      },
      {
        title: "O'zgarishlar va bog'lanish",
        text: `Siyosat o'zgarishi mumkin, oxirgi o'zgarish sanasi yuqorida. Savollar — ${BOT}.`,
      },
    ],
  },
};

const uzc: Record<LegalKey, LegalDoc> = {
  terms: {
    title: 'Фойдаланиш шартлари',
    updated: '2026 йил 20 августда янгиланган',
    intro:
      'AvtoLike — Ўзбекистонда автомобил сотуви эълонлари витринаси. Иловадан фойдаланар экансиз, ушбу шартларга розилик билдирасиз.',
    sections: [
      {
        title: 'AvtoLike нима қилади',
        text: `Биз сотувчилар ${BOT} телеграм боти орқали жойлаган эълонларни кўрсатамиз. Машина сотмаймиз, битимда қатнашмаймиз, комиссия олмаймиз ва воситачи бўлмаймиз. Сотувчи билан харидор тўғридан-тўғри келишади.`,
      },
      {
        title: 'Ким фойдалана олади',
        text: 'Илова вояга етганлар учун: автомобил битимлари 18 ёшдан тузилади. Эълон жойлаш билан сиз ушбу машинани сотишга ҳақли эканингизни тасдиқлайсиз.',
      },
      {
        title: 'Эълон қандай бўлиши керак',
        text: 'Фақат ҳақиқатан сотилаётган машина, фақат ўзингиз олган суратлар, рост юрган масофа, йил, ҳолат ва нарх. Битта машина — битта эълон. Телефон рақами ишлайдиган бўлсин.',
      },
      {
        title: 'Нима тақиқланади',
        text: 'Хусусиятларни ўйлаб топиш, ўзганинг ёки таҳрирланган суратларини қўйиш, ўзингиз рози бўлмаган нархни кўрсатиш, бошқа хизматларни реклама қилиш, одамларни ҳақорат қилиш, каталогни автоматик воситалар билан юклаб олиш.',
      },
      {
        title: 'Ҳақоратли контентга мутлақо йўл қўйилмайди',
        text: 'Биз ҳақоратли контентга ва суиистеъмолга ҳеч қандай ҳажмда ва ҳеч қандай кўринишда тоқат қилмаймиз. Ҳақорат, таҳдид, номақбул сўзлар, ҳар қандай белги бўйича адоват қўзғатиш, фирибгарлик ва харидорни алдаш, шунингдек бошқа фойдаланувчиларни безовта қилиш тақиқланади. Иловадан фойдаланиш билан сиз бундай контент жойламасликка ва бошқаларга нисбатан шундай йўл тутмасликка розилик билдирасиз.',
      },
      {
        title: 'Модерация',
        text: 'Ҳар бир эълонни чоп этишдан олдин модератор текширади. Шартлар бузилса, эълонни рад этишимиз ёки кўрсатувдан олиб қўйишимиз мумкин; сабабини ботда ёзамиз. Қайта-қайта бузилса, эълон жойлашни рад этишга ҳақлимиз.',
      },
      {
        title: 'Шикоятлар ва жавоб муддати',
        text: 'Исталган эълон устидан тўғридан-тўғри иловада шикоят қилиш мумкин: «Шикоят қилиш» тугмаси ҳам тўпламдаги карточкада, ҳам эълон ичида бор. Ҳар бир шикоятни 24 соат ичида кўриб чиқамиз. Тасдиқланган бузилишни ўчирамиз, муаллифини эса огоҳлантиришсиз ва қайта жойлаш имкониятисиз хизматдан четлатамиз. Бир неча киши шикоят қилган эълон модератор қароридан олдин ҳам каталогдан автоматик яширилади.',
      },
      {
        title: 'Сотувчини блоклаш',
        text: 'Сиз исталган сотувчини блоклашингиз мумкин — унинг эълонлари тўпламингиздан, сараланганингиздан ва қидирувдан бутунлай йўқолади. Блок қурилмангизда дарҳол ва муддатсиз ишлайди; уни профилдаги «Блокланганлар» бўлимида олиб ташлаш мумкин.',
      },
      {
        title: 'Биз нима учун жавоб бермаймиз',
        text: 'Биз автомобилнинг юридик тозалигини, ҳужжатларнинг ҳақиқийлигини ва юрган масофасини текширмаймиз. Эълондаги ҳамма нарса — сотувчининг сўзлари. Пул бермасдан олдин машинани кўринг, ҳужжатларни солиштиринг ва тарихини текширинг. Битим хатарлари унинг томонларида қолади.',
      },
      {
        title: 'Эълондаги маълумотларингиз',
        text: 'Сотувчининг исми, телефон рақами ва шаҳри илованинг барча фойдаланувчиларига кўринади — бусиз эълон ишламайди. Эълон жойлаш билан сиз шундай кўрсатишга розилик берасиз. Суратлардаги давлат рақамини биз автоматик ёпамиз.',
      },
      {
        title: 'Шартларнинг ўзгариши',
        text: 'Ушбу шартларни ўзгартиришимиз мумкин; охирги ўзгариш санаси юқорида кўрсатилган. Ўзгаришдан кейин иловадан фойдаланишда давом этсангиз, унга розисиз.',
      },
      {
        title: 'Боғланиш',
        text: `Саволлар, эълон устидан шикоят ва маълумотларни ўчириш сўрови — ${BOT} телеграм ботига.`,
      },
    ],
  },
  privacy: {
    title: 'Махфийлик сиёсати',
    updated: '2026 йил 20 августда янгиланган',
    intro: 'Бу ерда AvtoLike қандай маълумотларни йиғиши ва улар билан нима бўлиши ёзилган.',
    sections: [
      {
        title: 'Харидордан нима йиғамиз',
        text: 'Ҳеч нарса. Сараланган эълонлар, кўрилган машиналар ва филтрлар фақат қурилмангизда сақланади ва серверларимизга юборилмайди. Эълонларни кўриш учун рўйхатдан ўтиш шарт эмас.',
      },
      {
        title: 'Сотувчидан нима йиғамиз',
        text: 'Телеграм бот орқали: телефон рақами, исм, шаҳар, мулоқот тили, телеграмдаги идентификатор ва фойдаланувчи номи, анкетада кўрсатган барча нарсаларингиз ва машина суратлари.',
      },
      {
        title: 'Бу нима учун керак',
        text: 'Эълонни харидорларга кўрсатиш, уларга сизга қўнғироқ қилиш имконини бериш, эълонни модератор текшириши ва унинг тақдири ҳақида сизга хабар бериш учун.',
      },
      {
        title: 'Бошқалар нимани кўради',
        text: 'Исм, телефон рақами, шаҳар ва суратлари билан эълон мазмуни. Телеграмдаги идентификатор, тил ва хизмат белгиларини фақат биз кўрамиз.',
      },
      {
        title: 'Қаерда сақланади',
        text: 'Бизнинг серверимизда, суратлар — тўғридан-тўғри ҳавола орқали очиладиган объект хотирасида. Суратлардаги давлат рақамлари сақлашдан олдин ёпилади.',
      },
      {
        title: 'Қанча сақлаймиз',
        text: 'Эълон яшагунча. Кўрсатувдан олинган ёки ўчирилган эълон дарҳол кўринмай қолади; сотувчи маълумотлари сиз ўчиришни сўрамагунингизча сақланади.',
      },
      {
        title: 'Маълумотларни қандай ўчириш мумкин',
        text: `Ботда: «Менинг эълонларим» → «Ўчириш». Сотувчи профилини бутунлай ўчириш учун ${BOT} га ёзинг.`,
      },
      {
        title: 'Кимга маълумот берамиз',
        text: 'Ҳеч кимга. Маълумотларни сотмаймиз, реклама тармоқларига бермаймиз ва кузатув аналитикасини ўрнатмаймиз. Истисно — ваколатли органнинг қонуний сўрови.',
      },
      {
        title: 'Ўзгаришлар ва боғланиш',
        text: `Сиёсат ўзгариши мумкин, охирги ўзгариш санаси юқорида. Саволлар — ${BOT}.`,
      },
    ],
  },
};

export const legal: Record<Lang, Record<LegalKey, LegalDoc>> = { ru, uz, uzc };
