export const translations = {
  ru: {
    common: {
      appName: "TLeiter",
      teamWorkspace: "РАБОЧЕЕ ПРОСТРАНСТВО КОМАНДЫ",
      loading: "Загрузка...",
      until: "До",
    },

    dashboard: {
      title: "TLeiter",
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
      emptyDescription: "Создайте первую цель для команды.",
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

    navigation: {
      dashboard: "Главная",
      goals: "Цели",
      ideas: "Идеи",
      tasks: "Задачи",
      deadlines: "Сроки",
      calendar: "Календарь",
      knowledge: "Знания",
      team: "Команда",
    },
  },

  de: {
    common: {
      appName: "TLeiter",
      teamWorkspace: "TEAM WORKSPACE",
      loading: "Wird geladen...",
      until: "Bis",
    },

    dashboard: {
      title: "TLeiter",
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
      emptyDescription: "Erstelle das erste Ziel für das Team.",
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

    navigation: {
      dashboard: "Dashboard",
      goals: "Ziele",
      ideas: "Ideen",
      tasks: "Aufgaben",
      deadlines: "Termine",
      calendar: "Kalender",
      knowledge: "Wissen",
      team: "Team",
    },
  },
} as const;

export type Language = keyof typeof translations;