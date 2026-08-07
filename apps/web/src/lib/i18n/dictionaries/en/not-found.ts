import type { NamespaceDictionary } from '../../types';

const notFound = {
  code: '404',
  message: "This page doesn't exist.",
  backLink: 'Back to Task Master',
} satisfies NamespaceDictionary;

export default notFound;
