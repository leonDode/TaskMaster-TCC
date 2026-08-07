import type { NamespaceDictionary } from '../../types';

const profile = {
  title: 'Perfil',
  accountSettings: 'Configurações da conta',
  displayNameLabel: 'Nome de exibição',
  timezoneLabel: 'Fuso horário',
  changeAvatar: 'Trocar foto',
  uploadingAvatar: 'Enviando…',
  avatarUpdated: 'Foto atualizada.',
  avatarTooLarge: 'A imagem excede o limite de 2MB.',
  avatarInvalidType: 'Formato inválido — use JPEG, PNG ou WEBP.',
  timezoneRequired: 'Escolha um fuso horário.',
  saveButton: 'Salvar alterações',
  signOut: 'Sair',
  loadingLabel: 'Carregando perfil…',
} satisfies NamespaceDictionary;

export default profile;
