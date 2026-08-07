import type { NamespaceDictionary } from '../../types';

const forgotPassword = {
  title: 'Redefina sua senha',
  subtitle: 'Enviaremos um link por e-mail para você definir uma nova senha.',
  emailLabel: 'Endereço de e-mail',
  emailPlaceholder: 'voce@exemplo.com',
  submitButton: 'Enviar link de redefinição',
  successMessage:
    'Verifique sua caixa de entrada para o link de redefinição de senha.',
  backToSignIn: 'Voltar para o login',
} satisfies NamespaceDictionary;

export default forgotPassword;
