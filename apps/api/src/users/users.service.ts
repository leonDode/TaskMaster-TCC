import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CategoryType, Prisma, type User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtClaims } from '../auth/token-verifier.interface';
import {
  AVATAR_STORAGE,
  type AvatarStorage,
} from '../storage/avatar-storage.interface';
import { UpdateUserDto } from './dto/update-user.dto';
import { validateAvatarFile } from './avatar-validation';

// Semeadas só na criação do usuário — linhas normais de Category, sem flag
// especial; o usuário pode renomear/apagar livremente como qualquer outra.
// `type` é obrigatório no schema (sem default), então precisa vir daqui.
// Estes são os mesmos pares usados no backfill da migration
// 20260727000000_task_kind_units_category_type.
const DEFAULT_CATEGORIES = [
  { name: 'Trabalho', type: CategoryType.WORK },
  { name: 'Estudos', type: CategoryType.STUDY },
  { name: 'Saúde', type: CategoryType.HEALTH },
  { name: 'Pessoal', type: CategoryType.OTHER },
];

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AVATAR_STORAGE) private readonly avatarStorage: AvatarStorage,
  ) {}

  // Chamado pela JwtAuthGuard em toda request autenticada. Idempotente por
  // PK: garante que nenhum insert com FK para User (Task, GroupMember)
  // jamais falhe por perfil ausente, e auto-cura nome desatualizado.
  // Para <100 usuários o custo é irrelevante — não cachear agora (YAGNI).
  //
  // Não é um upsert simples porque só queremos semear as categorias padrão
  // na PRIMEIRA vez que o usuário aparece (não em toda request).
  //
  // avatarUrl deliberadamente NÃO é ressincronizado aqui: só é setado na
  // criação do usuário (abaixo). Se resincronizássemos a cada request, um
  // avatar enviado via POST /users/me/avatar seria sobrescrito pela foto do
  // provider OAuth (claims.user_metadata.avatar_url) na próxima chamada de
  // qualquer usuário logado via Google/GitHub/etc.
  async syncFromClaims(claims: JwtClaims): Promise<User> {
    const displayName =
      claims.user_metadata?.full_name ?? claims.user_metadata?.name ?? null;
    const avatarUrl = claims.user_metadata?.avatar_url ?? null;

    const existing = await this.prisma.user.findUnique({
      where: { id: claims.sub },
    });

    if (existing) {
      return this.prisma.user.update({
        where: { id: claims.sub },
        data: {
          email: claims.email ?? undefined,
          displayName: displayName ?? undefined,
        },
      });
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            id: claims.sub,
            email: claims.email ?? '',
            displayName,
            avatarUrl,
          },
        });
        await tx.category.createMany({
          data: DEFAULT_CATEGORIES.map((category) => ({
            userId: user.id,
            ...category,
          })),
        });
        return user;
      });
    } catch (error) {
      // Corrida rara: duas requests concorrentes do mesmo usuário novo
      // (praticamente só no instante do primeiro login). Quem perder a
      // corrida de criação cai para update — nunca falha a request.
      if (isUniqueConstraintError(error)) {
        return this.prisma.user.update({
          where: { id: claims.sub },
          data: {
            email: claims.email ?? undefined,
            displayName: displayName ?? undefined,
          },
        });
      }
      throw error;
    }
  }

  async updateMe(userId: string, dto: UpdateUserDto): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
    });
  }

  // Valida -> grava no Storage -> só então atualiza o Prisma, nessa ordem,
  // pra nunca deixar avatarUrl apontando pra um objeto que não existe (se o
  // Storage falhar, a exception propaga antes de qualquer write no banco).
  async uploadAvatar(
    userId: string,
    file: { buffer: Buffer; size: number } | undefined,
  ): Promise<User> {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }
    const { ext, contentType } = validateAvatarFile(file);

    const { publicUrl } = await this.avatarStorage.upload({
      userId,
      ext,
      buffer: file.buffer,
      contentType,
    });

    // Bucket público sem signed URL + upsert reaproveita a mesma URL a cada
    // re-upload -> sem isso, browser/CDN poderiam continuar servindo a
    // imagem antiga cacheada pela mesma URL.
    const avatarUrl = `${publicUrl}?v=${Date.now()}`;
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });

    // Best-effort: limpa extensões antigas se o usuário trocou de formato.
    // .catch aqui também (não só na implementação) pra nunca virar uma
    // unhandled rejection e nunca atrasar/derrubar a resposta principal.
    this.avatarStorage.removeOtherExtensions(userId, ext).catch(() => {});

    return user;
  }
}
