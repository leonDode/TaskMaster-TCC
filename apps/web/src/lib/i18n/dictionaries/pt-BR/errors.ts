import type { NamespaceDictionary } from '../../types';

const errors = {
  fallback: 'Algo deu errado. Tente novamente.',
  taskOccurrenceNotAvailable: 'Essa ação não está disponível para essa tarefa.',
  groupMemberRemoveOwner:
    'O dono não pode ser removido — exclua o grupo em vez disso.',
  sessionExpired: 'Sua sessão expirou. Saindo da sua conta.',
  groupLeaveTransferOwnership:
    'Transfira a propriedade ou exclua o grupo antes de sair dele.',
  noPermission: 'Você não tem permissão para fazer isso.',
  invalidInviteCode: 'Código de convite inválido.',
  groupOrChallengeNotFound: 'Grupo ou desafio não encontrado.',
  notFound: 'Não encontrado.',
  categoryDuplicate: 'Já existe uma categoria com esse nome.',
  alreadyMember: 'Você já é membro desse grupo.',
  alreadyCompleted: 'Já concluído.',
  conflict: 'Isso conflita com dados existentes.',
  rateLimited:
    'Você está fazendo isso com muita frequência — espere um minuto e tente de novo.',
  tooManyRequests: 'Muitas requisições. Desacelere um pouco.',
  outsideChallengeWindow: 'Esse desafio ainda não começou ou já terminou.',
} satisfies NamespaceDictionary;

export default errors;
