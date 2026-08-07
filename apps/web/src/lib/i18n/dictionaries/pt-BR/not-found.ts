import type { NamespaceDictionary } from '../../types';

const notFound = {
  code: '404',
  message: 'Essa página não existe.',
  backLink: 'Voltar ao Task Master',
} satisfies NamespaceDictionary;

export default notFound;
