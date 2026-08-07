import type { NamespaceDictionary } from '../../types';

const settings = {
  title: 'Configurações',
  appearanceTitle: 'Aparência',
  appearanceDescription:
    'Personalize a interface visual do seu espaço de trabalho.',
  themeLabel: 'Tema',
  themeDark: 'Escuro',
  themeLight: 'Claro',
  languageTitle: 'Idioma',
  languageDescription: 'Selecione o idioma preferido para o aplicativo.',
  languageLabel: 'Idioma',
  languageEnglish: 'English',
  languagePtBr: 'Português (Brasil)',
  dangerZoneTitle: 'Zona de Perigo',
  dangerZoneDescription: 'Ações irreversíveis para sua conta e seus dados.',
  resetTasksTitle: 'Resetar Todas as Tarefas',
  resetTasksDescription:
    'Exclui permanentemente todas as suas tarefas e o histórico de conclusões. Isso não pode ser desfeito.',
  resetTasksButton: 'Resetar Todas as Tarefas',
  confirmTitle: 'Resetar todas as tarefas?',
  confirmDescription:
    'Isso vai excluir permanentemente todas as suas tarefas e o histórico de conclusões. Essa ação não pode ser desfeita.',
  confirmButton: 'Sim, apagar tudo',
  resetSuccessMessage: {
    one: '{count} tarefa excluída.',
    other: '{count} tarefas excluídas.',
  },
} satisfies NamespaceDictionary;

export default settings;
