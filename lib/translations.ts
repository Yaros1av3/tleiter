export const translations = {
  ru: {
    common: {
      appName: "TLite",
      teamWorkspace: "РАБОЧЕЕ ПРОСТРАНСТВО КОМАНДЫ",
      loading: "Загрузка...",
      until: "До",
      cancel: "Отмена",
      save: "Сохранить",
      delete: "Удалить",
      edit: "Изменить",
      close: "Закрыть",
      create: "Создать",
      add: "Добавить",
      back: "Назад",
      confirm: "Подтвердить",
      yes: "Да",
      no: "Нет",
      search: "Поиск",
      more: "Ещё",
      today: "Сегодня",
      tomorrow: "Завтра",
      yesterday: "Вчера",
      active: "Активно",
      inactive: "Неактивно",
      all: "Все",
      none: "Нет",
      error: "Произошла ошибка.",
      tryAgain: "Попробовать снова",
    },

    navigation: {
      dashboard: "Главная",
      goals: "Цели",
      ideas: "Идеи",
      tasks: "Задачи",
      deadlines: "Дедлайны",
      calendar: "Календарь",
      schedule: "Расписание",
      materials: "Материалы",
      team: "Команда",
      teens: "Подростки",
      settings: "Настройки",
      more: "Ещё",
      logout: "Выйти",
    },

    dashboard: {
      title: "TLite",
      subtitle: "Цели, идеи и задачи — в одном месте.",

      overview: "Обзор команды",
      overviewDescription:
        "Всё важное о текущей работе команды — с одного взгляда.",

      activeGoals: "Активные цели",
      completedGoals: "Завершённые цели",
      openTasks: "Открытые задачи",
      overdueTasks: "Просроченные задачи",
      ideas: "Идеи",

      upcomingDeadlines: "Ближайшие сроки",
      noDeadlines: "Ближайших сроков нет",

      recentIdeas: "Последние идеи",
      noIdeas: "Пока нет идей",

      quickActions: "Быстрые действия",
      newGoal: "Новая цель",
      viewTasks: "Открыть задачи",
      viewIdeas: "Открыть идеи",
      viewDeadlines: "Открыть сроки",

      viewAll: "Показать все",
      daysLeft: "дн.",
      today: "Сегодня",
      tomorrow: "Завтра",
      overdue: "Просрочено",
    },

    goals: {
      title: "Цели",
      description: "Над чем сейчас работает наша команда?",
      new: "Новая цель",
      loading: "Загрузка целей...",
      emptyTitle: "Пока нет целей",
      emptyDescription: "Создай первую цель для команды.",

      createTitle: "Создать цель",
      editTitle: "Изменить цель",
      name: "Название",
      descriptionLabel: "Описание",
      status: "Статус",
      priority: "Приоритет",
      deadline: "Дедлайн",

      deleteTitle: "Удалить цель?",
      deleteDescription:
        "Цель будет удалена вместе со связанными задачами.",
    },

    status: {
      active: "Активна",
      completed: "Завершена",
      archived: "В архиве",
    },

    priority: {
      low: "Низкий",
      medium: "Средний",
      high: "Высокий",
    },

    ideas: {
      title: "Идеи",
      description:
        "Идеи команды, которые не должны потеряться.",
      new: "Новая идея",
      loading: "Загрузка идей...",
      emptyTitle: "Пока нет идей",
      emptyDescription:
        "Добавь первую идею для команды.",

      createTitle: "Новая идея",
      editTitle: "Изменить идею",
      titleLabel: "Название",
      descriptionLabel: "Описание",
      author: "Автор",
      anonymous: "Анонимно",

      save: "Сохранить идею",
      deleteTitle: "Удалить идею?",
      deleteDescription:
        "Эта идея будет удалена.",
    },

    tasks: {
      title: "Задачи",
      description:
        "Что нужно сделать и кто за это отвечает?",
      new: "Новая задача",
      loading: "Загрузка задач...",
      emptyTitle: "Пока нет задач",
      emptyDescription:
        "Создай первую задачу для команды.",

      createTitle: "Новая задача",
      editTitle: "Изменить задачу",
      titleLabel: "Задача",
      descriptionLabel: "Описание",
      assignee: "Ответственный",
      deadline: "Дедлайн",
      goal: "Цель",
      status: "Статус",

      open: "Открыта",
      inProgress: "В работе",
      completed: "Выполнена",

      deleteTitle: "Удалить задачу?",
      deleteDescription:
        "Эта задача будет удалена.",
    },

    deadlines: {
      title: "Дедлайны",
      description:
        "Ближайшие сроки по задачам команды.",
      loading: "Загрузка дедлайнов...",
      emptyTitle: "Нет ближайших дедлайнов",
      emptyDescription:
        "Сейчас нет задач с ближайшими сроками.",

      overdue: "Просрочено",
      today: "Сегодня",
      tomorrow: "Завтра",
      daysLeft: "дн.",
    },

    calendar: {
      title: "Календарь",
      description:
        "Важные события, встречи и служения команды.",

      newEvent: "Новое событие",
      editEvent: "Изменить событие",
      deleteEvent: "Удалить событие?",

      titleLabel: "Название",
      date: "Дата",
      time: "Время",
      descriptionLabel: "Описание",

      save: "Сохранить событие",
      delete: "Удалить событие",

      noEvents: "На этот день событий нет.",
      today: "Сегодня",
    },

    schedule: {
      title: "Расписание",
      description:
        "Служения, темы и ответственные команды.",

      readOnly:
        "Ты можешь просматривать расписание. Изменять его могут только администраторы.",

      newEntry: "Добавить",
      editEntry: "Изменить",
      deleteEntry: "Удалить",

      service: "Служение",
      lesson: "Урок",
      event: "Событие",

      time: "Время",
      date: "Дата",
      titleLabel: "Название",
      bibleText: "Библейский текст",
      series: "Серия",
      notes: "Заметки",
      serving: "Служат",

      save: "Сохранить",
      create: "Создать расписание",

      deleteTitle: "Удалить запись?",
      deleteDescription:
        "Эта запись расписания будет удалена.",
    },

    materials: {
      title: "Материалы",
      description:
        "Материалы и документы команды.",

      folders: "Папки",
      files: "Файлы",
      open: "Открыть",
      download: "Скачать",

      newFolder: "Новая папка",
      newFile: "Новый файл",

      empty: "Материалов пока нет.",
      readOnly:
        "Просматривать материалы могут все участники команды. Добавлять и удалять материалы могут только администраторы.",
    },

    team: {
      title: "Команда",
      description:
        "Участники команды и их служение.",

      newMember: "Добавить участника",
      editMember: "Изменить участника",

      firstName: "Имя",
      lastName: "Фамилия",
      position: "Служение",
      status: "Статус",

      active: "Активен",
      inactive: "Неактивен",

      readOnly:
        "Просматривать команду могут все участники. Управлять участниками могут только администраторы.",

      deleteTitle: "Удалить участника?",
      deleteDescription:
        "Участник будет удалён из команды.",
    },

    teens: {
      title: "Подростки",
      description:
        "Список подростков и основная информация.",

      newTeen: "Добавить подростка",
      editTeen: "Изменить подростка",

      firstName: "Имя",
      lastName: "Фамилия",
      phone: "Телефон",
      birthDate: "Дата рождения",
      gender: "Пол",
      status: "Статус",

      active: "Активен",
      inactive: "Неактивен",

      all: "Все",
      search: "Поиск подростка",

      emptyTitle: "Пока нет подростков",
      emptyDescription:
        "Добавь первого подростка в список.",

      deleteTitle: "Удалить подростка?",
      deleteDescription:
        "Подросток будет удалён из списка.",
    },

work: {
  title: "Работа",
  sectionLabel: "Командная работа",
  description:
    "Здесь собраны общие работы, проекты и подготовки команды.",

  newWork: "Новая работа",
  createWork: "Создать работу",
  editWork: "Изменить работу",
  saveChanges: "Сохранить изменения",
  deleteWork: "Удалить работу?",
  deleteConfirm:
    "Хочешь действительно удалить эту работу?",

  noPeriod: "Период не указан",
  from: "С",
  until: "До",

  current: "Текущие",
  activeWorks: "Текущие работы",
  overview: "Обзор",
  allWorks: "Все работы",
  noOtherWorks: "Других работ нет",

  progress: "Прогресс",
  tasks: "Задачи",
  tasksCompleted: "выполнено",
  open: "Открыто",
  inProgress: "В работе",
  active: "Активно",
  completed: "Готово",
  planned: "Запланировано",
  archived: "В архиве",

  titleLabel: "Название",
  descriptionLabel: "Описание",
  start: "Начало",
  end: "Конец",
  status: "Статус",

  titlePlaceholder: "например, Рождественский вечер 2026",
  descriptionPlaceholder:
    "О чём эта работа?",

  createSaving: "Создаём...",
  saveSaving: "Сохраняем...",
  deleteSaving: "Удаляем...",

  createError:
    "Не удалось создать работу.",
  saveError:
    "Не удалось сохранить работу.",
  deleteError:
    "Не удалось удалить работу.",
  noUser:
    "Авторизованный пользователь не найден.",
  invalidDate:
    "Дата окончания не может быть раньше даты начала.",

  deleteWarning:
    "Это действие нельзя отменить.",
  deleteDescription:
    "Все задачи, чек-листы и связанные данные этой работы также будут удалены.",

  cancel: "Отмена",
  deleteForever: "Удалить навсегда",

  close: "Закрыть",
  edit: "Изменить",
  delete: "Удалить",
},


    settings: {
      title: "Настройки",
      subtitle: "Твой аккаунт TLite",

      account: "Аккаунт",
      fullName: "Полное имя",
      email: "E-Mail",
      role: "Роль",
      administrator: "Администратор",
      teamMember: "Участник команды",

      security: "Безопасность",
      securityDescription:
        "Управляй паролем своего аккаунта TLite.",
      changePassword: "Изменить пароль",
      newPassword: "Новый пароль",
      repeatPassword: "Повтори пароль",
      passwordPlaceholder: "Минимум 6 символов",
      repeatPasswordPlaceholder:
        "Введи пароль ещё раз",
      savePassword: "Сохранить пароль",
      passwordChanged:
        "Пароль успешно изменён.",
      passwordMismatch:
        "Пароли не совпадают.",
      passwordTooShort:
        "Пароль должен содержать минимум 6 символов.",
      passwordChangeError:
        "Не удалось изменить пароль.",

      language: "Язык",
      languageDescription:
        "Выбери язык всего интерфейса TLite.",
      german: "Немецкий",
      russian: "Русский",

      logout: "Выйти",
      logoutDescription:
        "Выйти из этого аккаунта",

      cancel: "Отмена",
      back: "Назад",
    },
  },

  de: {
    common: {
      appName: "TLite",
      teamWorkspace: "TEAM WORKSPACE",
      loading: "Wird geladen...",
      until: "Bis",
      cancel: "Abbrechen",
      save: "Speichern",
      delete: "Löschen",
      edit: "Bearbeiten",
      close: "Schließen",
      create: "Erstellen",
      add: "Hinzufügen",
      back: "Zurück",
      confirm: "Bestätigen",
      yes: "Ja",
      no: "Nein",
      search: "Suchen",
      more: "Mehr",
      today: "Heute",
      tomorrow: "Morgen",
      yesterday: "Gestern",
      active: "Aktiv",
      inactive: "Inaktiv",
      all: "Alle",
      none: "Keine",
      error: "Ein Fehler ist aufgetreten.",
      tryAgain: "Erneut versuchen",
    },
work: {
  title: "Arbeit",
  sectionLabel: "Team Work",
  description:
    "Hier seht ihr alle gemeinsamen Arbeiten, Projekte und Vorbereitungen des Teams.",

  newWork: "Neue Arbeit",
  createWork: "Arbeit erstellen",
  editWork: "Arbeit bearbeiten",
  saveChanges: "Änderungen speichern",
  deleteWork: "Arbeit löschen?",
  deleteConfirm:
    "Möchtest du diese Arbeit wirklich löschen?",

  noPeriod: "Kein Zeitraum festgelegt",
  from: "Ab",
  until: "Bis",

  current: "Aktuell",
  activeWorks: "Laufende Arbeiten",
  overview: "Übersicht",
  allWorks: "Alle Arbeiten",
  noOtherWorks: "Keine weiteren Arbeiten vorhanden.",

  progress: "Fortschritt",
  tasks: "Aufgaben",
  tasksCompleted: "erledigt",
  open: "Offen",
  inProgress: "In Bearbeitung",
  active: "Aktiv",
  completed: "Fertig",
  planned: "Geplant",
  archived: "Archiviert",

  titleLabel: "Titel",
  descriptionLabel: "Beschreibung",
  start: "Start",
  end: "Ende",
  status: "Status",

  titlePlaceholder: "z. B. Weihnachtsabend 2026",
  descriptionPlaceholder:
    "Worum geht es bei dieser Arbeit?",

  createSaving: "Wird erstellt...",
  saveSaving: "Wird gespeichert...",
  deleteSaving: "Wird gelöscht...",

  createError:
    "Die Arbeit konnte nicht erstellt werden.",
  saveError:
    "Die Arbeit konnte nicht gespeichert werden.",
  deleteError:
    "Die Arbeit konnte nicht gelöscht werden.",
  noUser:
    "Kein eingeloggter Benutzer gefunden.",
  invalidDate:
    "Das Enddatum darf nicht vor dem Startdatum liegen.",

  deleteWarning:
    "Diese Aktion kann nicht rückgängig gemacht werden.",
  deleteDescription:
    "Alle Aufgaben, Checklisten und zugehörigen Daten dieser Arbeit werden ebenfalls gelöscht.",

  cancel: "Abbrechen",
  deleteForever: "Endgültig löschen",

  close: "Schließen",
  edit: "Bearbeiten",
  delete: "Löschen",
},

    navigation: {
      dashboard: "Home",
      goals: "Ziele",
      ideas: "Ideen",
      tasks: "Aufgaben",
      deadlines: "Deadlines",
      calendar: "Kalender",
      schedule: "Dienstplan",
      materials: "Materialien",
      team: "Team",
      teens: "Teenager",
      settings: "Einstellungen",
      more: "Mehr",
      logout: "Abmelden",
    },

    dashboard: {
      title: "TLite",
      subtitle: "Ziele, Ideen und Aufgaben — an einem Ort.",

      overview: "Teamübersicht",
      overviewDescription:
        "Alles Wichtige über die aktuelle Arbeit des Teams auf einen Blick.",

      activeGoals: "Aktive Ziele",
      completedGoals: "Abgeschlossene Ziele",
      openTasks: "Offene Aufgaben",
      overdueTasks: "Überfällige Aufgaben",
      ideas: "Ideen",

      upcomingDeadlines: "Nächste Fristen",
      noDeadlines: "Keine anstehenden Fristen",

      recentIdeas: "Letzte Ideen",
      noIdeas: "Noch keine Ideen",

      quickActions: "Schnellaktionen",
      newGoal: "Neues Ziel",
      viewTasks: "Aufgaben öffnen",
      viewIdeas: "Ideen öffnen",
      viewDeadlines: "Fristen öffnen",

      viewAll: "Alle anzeigen",
      daysLeft: "Tage",
      today: "Heute",
      tomorrow: "Morgen",
      overdue: "Überfällig",
    },

    goals: {
      title: "Ziele",
      description: "Woran arbeitet unser Team gerade?",
      new: "Neues Ziel",
      loading: "Ziele werden geladen...",
      emptyTitle: "Noch keine Ziele",
      emptyDescription:
        "Erstelle das erste Ziel für das Team.",

      createTitle: "Ziel erstellen",
      editTitle: "Ziel bearbeiten",
      name: "Name",
      descriptionLabel: "Beschreibung",
      status: "Status",
      priority: "Priorität",
      deadline: "Deadline",

      deleteTitle: "Ziel löschen?",
      deleteDescription:
        "Das Ziel wird zusammen mit den verbundenen Aufgaben gelöscht.",
    },

    status: {
      active: "Aktiv",
      completed: "Abgeschlossen",
      archived: "Archiviert",
    },

    priority: {
      low: "Niedrig",
      medium: "Mittel",
      high: "Hoch",
    },

    ideas: {
      title: "Ideen",
      description:
        "Ideen des Teams, die nicht verloren gehen sollen.",
      new: "Neue Idee",
      loading: "Ideen werden geladen...",
      emptyTitle: "Noch keine Ideen",
      emptyDescription:
        "Füge die erste Idee für das Team hinzu.",

      createTitle: "Neue Idee",
      editTitle: "Idee bearbeiten",
      titleLabel: "Titel",
      descriptionLabel: "Beschreibung",
      author: "Autor",
      anonymous: "Anonym",

      save: "Idee speichern",
      deleteTitle: "Idee löschen?",
      deleteDescription:
        "Diese Idee wird gelöscht.",
    },

    tasks: {
      title: "Aufgaben",
      description:
        "Was muss erledigt werden und wer ist dafür verantwortlich?",
      new: "Neue Aufgabe",
      loading: "Aufgaben werden geladen...",
      emptyTitle: "Noch keine Aufgaben",
      emptyDescription:
        "Erstelle die erste Aufgabe für das Team.",

      createTitle: "Neue Aufgabe",
      editTitle: "Aufgabe bearbeiten",
      titleLabel: "Aufgabe",
      descriptionLabel: "Beschreibung",
      assignee: "Verantwortlich",
      deadline: "Deadline",
      goal: "Ziel",
      status: "Status",

      open: "Offen",
      inProgress: "In Bearbeitung",
      completed: "Erledigt",

      deleteTitle: "Aufgabe löschen?",
      deleteDescription:
        "Diese Aufgabe wird gelöscht.",
    },

    deadlines: {
      title: "Deadlines",
      description:
        "Die nächsten Fristen der Teamaufgaben.",
      loading: "Deadlines werden geladen...",
      emptyTitle: "Keine anstehenden Deadlines",
      emptyDescription:
        "Aktuell gibt es keine Aufgaben mit anstehenden Fristen.",

      overdue: "Überfällig",
      today: "Heute",
      tomorrow: "Morgen",
      daysLeft: "Tage",
    },

    calendar: {
      title: "Kalender",
      description:
        "Wichtige Termine, Treffen und Dienste des Teams.",

      newEvent: "Neues Ereignis",
      editEvent: "Ereignis bearbeiten",
      deleteEvent: "Ereignis löschen?",

      titleLabel: "Titel",
      date: "Datum",
      time: "Uhrzeit",
      descriptionLabel: "Beschreibung",

      save: "Ereignis speichern",
      delete: "Ereignis löschen",

      noEvents: "Für diesen Tag gibt es keine Ereignisse.",
      today: "Heute",
    },

    schedule: {
      title: "Dienstplan",
      description:
        "Dienste, Themen und verantwortliche Teammitglieder.",

      readOnly:
        "Du kannst den Dienstplan ansehen. Änderungen können nur Administratoren vornehmen.",

      newEntry: "Hinzufügen",
      editEntry: "Bearbeiten",
      deleteEntry: "Löschen",

      service: "Dienst",
      lesson: "Lektion",
      event: "Ereignis",

      time: "Uhrzeit",
      date: "Datum",
      titleLabel: "Titel",
      bibleText: "Bibeltext",
      series: "Serie",
      notes: "Notizen",
      serving: "Dienen",

      save: "Speichern",
      create: "Dienstplan erstellen",

      deleteTitle: "Eintrag löschen?",
      deleteDescription:
        "Dieser Dienstplan-Eintrag wird gelöscht.",
    },

    materials: {
      title: "Materialien",
      description:
        "Materialien und Dokumente des Teams.",

      folders: "Ordner",
      files: "Dateien",
      open: "Öffnen",
      download: "Herunterladen",

      newFolder: "Neuer Ordner",
      newFile: "Neue Datei",

      empty: "Noch keine Materialien vorhanden.",
      readOnly:
        "Alle Teammitglieder können Materialien ansehen. Hinzufügen und Löschen ist nur für Administratoren möglich.",
    },

    team: {
      title: "Team",
      description:
        "Teammitglieder und ihre Aufgaben.",

      newMember: "Mitglied hinzufügen",
      editMember: "Mitglied bearbeiten",

      firstName: "Vorname",
      lastName: "Nachname",
      position: "Aufgabe",
      status: "Status",

      active: "Aktiv",
      inactive: "Inaktiv",

      readOnly:
        "Alle Teammitglieder können das Team ansehen. Änderungen sind nur für Administratoren möglich.",

      deleteTitle: "Mitglied löschen?",
      deleteDescription:
        "Das Mitglied wird aus dem Team entfernt.",
    },

    teens: {
      title: "Teenager",
      description:
        "Liste der Teenager und grundlegende Informationen.",

      newTeen: "Teenager hinzufügen",
      editTeen: "Teenager bearbeiten",

      firstName: "Vorname",
      lastName: "Nachname",
      phone: "Telefon",
      birthDate: "Geburtsdatum",
      gender: "Geschlecht",
      status: "Status",

      active: "Aktiv",
      inactive: "Inaktiv",

      all: "Alle",
      search: "Teenager suchen",

      emptyTitle: "Noch keine Teenager",
      emptyDescription:
        "Füge den ersten Teenager zur Liste hinzu.",

      deleteTitle: "Teenager löschen?",
      deleteDescription:
        "Der Teenager wird aus der Liste entfernt.",
    },

    settings: {
      title: "Einstellungen",
      subtitle: "Dein TLite-Konto",

      account: "Konto",
      fullName: "Vollständiger Name",
      email: "E-Mail",
      role: "Rolle",
      administrator: "Administrator",
      teamMember: "Teammitglied",

      security: "Sicherheit",
      securityDescription:
        "Verwalte dein Passwort für dein TLite-Konto.",
      changePassword: "Passwort ändern",
      newPassword: "Neues Passwort",
      repeatPassword: "Passwort wiederholen",
      passwordPlaceholder: "Mindestens 6 Zeichen",
      repeatPasswordPlaceholder:
        "Passwort erneut eingeben",
      savePassword: "Passwort speichern",
      passwordChanged:
        "Dein Passwort wurde erfolgreich geändert.",
      passwordMismatch:
        "Die Passwörter stimmen nicht überein.",
      passwordTooShort:
        "Das Passwort muss mindestens 6 Zeichen enthalten.",
      passwordChangeError:
        "Das Passwort konnte nicht geändert werden.",

      language: "Sprache",
      languageDescription:
        "Wähle die Sprache für die gesamte TLite-Oberfläche.",
      german: "Deutsch",
      russian: "Russisch",

      logout: "Abmelden",
      logoutDescription:
        "Von diesem Konto abmelden",

      cancel: "Abbrechen",
      back: "Zurück",
    },
  },
} as const;

export type Language = keyof typeof translations;