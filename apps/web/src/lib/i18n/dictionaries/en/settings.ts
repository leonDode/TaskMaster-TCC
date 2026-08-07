import type { NamespaceDictionary } from '../../types';

const settings = {
  title: 'Settings',
  appearanceTitle: 'Appearance',
  appearanceDescription: 'Customize the visual interface of your workspace.',
  themeLabel: 'Theme',
  themeDark: 'Dark',
  themeLight: 'Light',
  languageTitle: 'Language',
  languageDescription: 'Select your preferred language for the application.',
  languageLabel: 'Language',
  languageEnglish: 'English',
  languagePtBr: 'Português (Brasil)',
  dangerZoneTitle: 'Danger Zone',
  dangerZoneDescription: 'Irreversible actions for your account and data.',
  resetTasksTitle: 'Reset All Tasks',
  resetTasksDescription:
    'Permanently delete all your tasks and their completion history. This cannot be undone.',
  resetTasksButton: 'Reset All Tasks',
  confirmTitle: 'Reset all tasks?',
  confirmDescription:
    'This will permanently delete all your tasks and their completion history. This action cannot be undone.',
  confirmButton: 'Yes, delete everything',
  resetSuccessMessage: {
    one: '{count} task deleted.',
    other: '{count} tasks deleted.',
  },
} satisfies NamespaceDictionary;

export default settings;
