import { SystemLanguage } from '../types';

export const TRANSLATIONS: Record<SystemLanguage, {
  name: string;
  flag: string;
  thisPc: string;
  recycleBin: string;
  terminal: string;
  settings: string;
  notes: string;
  paint: string;
  taskManager: string;
  graphicsEngine: string;
  searchPlaceholder: string;
  pinnedApps: string;
  quickSettings: string;
  notifications: string;
  clearAll: string;
  noNotifications: string;
  restart: string;
  shutDown: string;
  systemReady: string;
  copy: string;
  paste: string;
  delete: string;
  properties: string;
  emptyTrash: string;
  restore: string;
  newFile: string;
  newFolder: string;
  refresh: string;
}> = {
  en: {
    name: 'English',
    flag: '🇺🇸',
    thisPc: 'This PC',
    recycleBin: 'Recycle Bin',
    terminal: 'Terminal',
    settings: 'Settings',
    notes: 'Notes & To-Do',
    paint: 'Paint Studio',
    taskManager: 'Task Manager',
    graphicsEngine: 'Raylib 2D Engine',
    searchPlaceholder: 'Type to search apps, files, settings...',
    pinnedApps: 'Pinned Applications',
    quickSettings: 'Quick Settings',
    notifications: 'Notifications',
    clearAll: 'Clear all',
    noNotifications: 'No new notifications',
    restart: 'Reboot System',
    shutDown: 'Shut Down',
    systemReady: 'All Systems Operational',
    copy: 'Copy',
    paste: 'Paste',
    delete: 'Delete',
    properties: 'Properties',
    emptyTrash: 'Empty Recycle Bin',
    restore: 'Restore',
    newFile: 'New File',
    newFolder: 'New Folder',
    refresh: 'Refresh',
  },
  es: {
    name: 'Español',
    flag: '🇪🇸',
    thisPc: 'Este Equipo',
    recycleBin: 'Papelera de reciclaje',
    terminal: 'Terminal',
    settings: 'Configuración',
    notes: 'Notas y Tareas',
    paint: 'Estudio de Dibujo',
    taskManager: 'Administrador de tareas',
    graphicsEngine: 'Motor Gráfico 2D',
    searchPlaceholder: 'Buscar aplicaciones, archivos...',
    pinnedApps: 'Aplicaciones ancladas',
    quickSettings: 'Ajustes rápidos',
    notifications: 'Notificaciones',
    clearAll: 'Borrar todo',
    noNotifications: 'Sin notificaciones nuevas',
    restart: 'Reiniciar Sistema',
    shutDown: 'Apagar',
    systemReady: 'Sistemas operativos',
    copy: 'Copiar',
    paste: 'Pegar',
    delete: 'Eliminar',
    properties: 'Propiedades',
    emptyTrash: 'Vaciar papelera',
    restore: 'Restaurar',
    newFile: 'Nuevo archivo',
    newFolder: 'Nueva carpeta',
    refresh: 'Actualizar',
  },
  fr: {
    name: 'Français',
    flag: '🇫🇷',
    thisPc: 'Ce PC',
    recycleBin: 'Corbeille',
    terminal: 'Terminal',
    settings: 'Paramètres',
    notes: 'Notes & Tâches',
    paint: 'Atelier de Peinture',
    taskManager: 'Gestionnaire des tâches',
    graphicsEngine: 'Moteur Graphique 2D',
    searchPlaceholder: 'Rechercher des applications, fichiers...',
    pinnedApps: 'Applications épinglées',
    quickSettings: 'Réglages rapides',
    notifications: 'Notifications',
    clearAll: 'Tout effacer',
    noNotifications: 'Aucune notification',
    restart: 'Redémarrer',
    shutDown: 'Éteindre',
    systemReady: 'Système opérationnel',
    copy: 'Copier',
    paste: 'Coller',
    delete: 'Supprimer',
    properties: 'Propriétés',
    emptyTrash: 'Vider la corbeille',
    restore: 'Restaurer',
    newFile: 'Nouveau fichier',
    newFolder: 'Nouveau dossier',
    refresh: 'Actualiser',
  },
  de: {
    name: 'Deutsch',
    flag: '🇩🇪',
    thisPc: 'Dieser PC',
    recycleBin: 'Papierkorb',
    terminal: 'Terminal',
    settings: 'Einstellungen',
    notes: 'Notizen & Aufgaben',
    paint: 'Zeichenstudio',
    taskManager: 'Task-Manager',
    graphicsEngine: 'Raylib 2D Grafik-Engine',
    searchPlaceholder: 'Apps, Dateien und Einstellungen suchen...',
    pinnedApps: 'Angeheftete Apps',
    quickSettings: 'Schnelleinstellungen',
    notifications: 'Benachrichtigungen',
    clearAll: 'Alle löschen',
    noNotifications: 'Keine Benachrichtigungen',
    restart: 'Neu starten',
    shutDown: 'Herunterfahren',
    systemReady: 'System bereit',
    copy: 'Kopieren',
    paste: 'Einfügen',
    delete: 'Löschen',
    properties: 'Eigenschaften',
    emptyTrash: 'Papierkorb leeren',
    restore: 'Wiederherstellen',
    newFile: 'Neue Datei',
    newFolder: 'Neuer Ordner',
    refresh: 'Aktualisieren',
  },
  ja: {
    name: '日本語',
    flag: '🇯🇵',
    thisPc: 'PC (コンピューター)',
    recycleBin: 'ごみ箱',
    terminal: 'ターミナル',
    settings: '設定',
    notes: 'メモとToDo',
    paint: 'ペイントスタジオ',
    taskManager: 'タスクマネージャー',
    graphicsEngine: 'Raylib 2Dグラフィックエンジン',
    searchPlaceholder: 'アプリ、ファイル、設定を検索...',
    pinnedApps: 'ピン留めされたアプリ',
    quickSettings: 'クイック設定',
    notifications: '通知',
    clearAll: 'すべてクリア',
    noNotifications: '新しい通知はありません',
    restart: '再起動',
    shutDown: 'シャットダウン',
    systemReady: 'システム正常稼働中',
    copy: 'コピー',
    paste: '貼り付け',
    delete: '削除',
    properties: 'プロパティ',
    emptyTrash: 'ごみ箱を空にする',
    restore: '復元',
    newFile: '新規ファイル',
    newFolder: '新規フォルダー',
    refresh: '更新',
  },
};

export const getLocaleCode = (lang: SystemLanguage): string => {
  switch (lang) {
    case 'es': return 'es-ES';
    case 'fr': return 'fr-FR';
    case 'de': return 'de-DE';
    case 'ja': return 'ja-JP';
    case 'en':
    default: return 'en-US';
  }
};
