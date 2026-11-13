/*
 * История обновлений для служителей (окошко «Что нового» на главной + push-уведомление).
 *
 * Как добавить новое обновление: допиши новую запись В НАЧАЛО списка.
 * id должен быть больше предыдущего (дата, а если в один день два обновления — добавь букву: "2026-11-12b").
 * Окошко само покажет её каждому служителю один раз.
 * push: true — всем служителям, у кого включены уведомления, придёт push (его отправит ежедневный cron).
 */

export type UpdateItem = {
  title: { ru: string; de: string };
  text: { ru: string; de: string };
  soon?: boolean; // «в разработке»
};

export type UpdateEntry = {
  id: string;
  date: string; // ГГГГ-ММ-ДД
  push?: boolean;
  title: { ru: string; de: string };
  pushBody: { ru: string; de: string };
  items: UpdateItem[];
};

export const UPDATES: UpdateEntry[] = [
  {
    id: "2026-11-13",
    date: "2026-11-13",
    push: true,
    title: {
      ru: "Роли и права в команде",
      de: "Rollen und Rechte im Team",
    },
    pushBody: {
      ru: "На странице «Команда» появились роли с цветами и правами. Загляни.",
      de: "Auf der Seite „Team“ gibt es jetzt Rollen mit Farben und Rechten. Schau rein.",
    },
    items: [
      {
        title: { ru: "Свои роли", de: "Eigene Rollen" },
        text: {
          ru: "Админ может создать роль со своим названием и цветом и назначить её человеку. Роль видна цветной плашкой в карточке человека.",
          de: "Admins können eine Rolle mit eigenem Namen und eigener Farbe erstellen und einer Person zuweisen. Die Rolle erscheint als farbiges Label in der Karte.",
        },
      },
      {
        title: { ru: "Права для ролей", de: "Rechte für Rollen" },
        text: {
          ru: "Роли можно дать дополнительные права, например управлять поездками или удалять идеи. Так не нужно делать каждого админом.",
          de: "Rollen können zusätzliche Rechte bekommen, z. B. Fahrten verwalten oder Ideen löschen. So muss nicht jeder Admin werden.",
        },
      },
      {
        title: { ru: "Страница подростков", de: "Seite für Jugendliche" },
        text: {
          ru: "Если в воскресенье нет урока (например, подростки в зале), подростки теперь видят это с причиной.",
          de: "Wenn an einem Sonntag kein Unterricht ist (z. B. Jugendliche im Saal), sehen die Jugendlichen das jetzt mit Begründung.",
        },
      },
    ],
  },
  {
    id: "2026-11-10",
    date: "2026-11-10",
    push: true,
    title: {
      ru: "Новые разделы в TLight",
      de: "Neue Bereiche in TLight",
    },
    pushBody: {
      ru: "Появились страница подростков и Bibel-Challenge. Загляни, что нового.",
      de: "Neu: Jugendseite und Bibel-Challenge. Schau rein, was es Neues gibt.",
    },
    items: [
      {
        title: { ru: "Страница подростков", de: "Seite für Jugendliche" },
        text: {
          ru: "Отдельная страница для наших подростков: ближайшие уроки и события, отметка «буду на уроке» и уведомления. Сделали её, чтобы подростки сами видели, что и когда проходит, а нам не приходилось каждый раз писать это в чатах.",
          de: "Eine eigene Seite für unsere Jugendlichen: kommende Unterrichte und Termine, die Anmeldung „Ich komme“ und Benachrichtigungen. So sehen die Jugendlichen selbst, was wann stattfindet, und wir müssen es nicht jedes Mal in Chats schreiben.",
        },
      },
      {
        title: { ru: "Bibel-Challenge", de: "Bibel-Challenge" },
        text: {
          ru: "Теперь наш библейский челлендж живёт здесь, в TLight. Каждый день подросток получает задание, сдаёт ответ, зарабатывает баллы и звания и соревнуется в рейтинге, а за большой результат получает подарок. Служители создают сезоны и задания, проверяют ответы и видят своих подростков: раздел «Ещё» → Bibel-Challenge. Цель: приучить подростков к ежедневному чтению Библии и поддерживать их в этом.",
          de: "Unsere Bibel-Challenge läuft jetzt hier in TLight. Jeden Tag bekommt der Jugendliche eine Aufgabe, gibt seine Antwort ab, sammelt Punkte und Ränge und tritt im Ranking an, für ein großes Ergebnis gibt es ein Geschenk. Mitarbeiter erstellen Saisons und Aufgaben, prüfen Antworten und sehen ihre Jugendlichen: Bereich „Mehr“ → Bibel-Challenge. Ziel: Jugendliche zum täglichen Bibellesen ermutigen und sie dabei begleiten.",
        },
      },
      {
        soon: true,
        title: { ru: "Дни рождения", de: "Geburtstage" },
        text: {
          ru: "Страница ещё в разработке. Как только наша база подростков будет полностью обновлена, мы распределим их между служителями, чтобы каждый знал, кого поздравлять.",
          de: "Die Seite ist noch in Arbeit. Sobald unsere Datenbank der Jugendlichen vollständig aktualisiert ist, verteilen wir sie auf die Mitarbeiter, damit jeder weiß, wem er gratulieren darf.",
        },
      },
    ],
  },
];