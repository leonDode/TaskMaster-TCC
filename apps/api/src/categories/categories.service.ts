import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Category } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  async create(userId: string, dto: CreateCategoryDto): Promise<Category> {
    try {
      return await this.prisma.category.create({
        data: { userId, name: dto.name, type: dto.type, color: dto.color },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('Já existe uma categoria com esse nome');
      }
      throw error;
    }
  }

  // 404 (não 403) se a categoria existe mas é de outro usuário — mesmo
  // padrão de autorização usado em todo o resto da API (ver Tasks/Groups).
  private async findOwnedOrThrow(
    userId: string,
    id: string,
  ): Promise<Category> {
    const category = await this.prisma.category.findFirst({
      where: { id, userId },
    });
    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }
    return category;
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<Category> {
    await this.findOwnedOrThrow(userId, id);
    try {
      return await this.prisma.category.update({
        where: { id },
        data: { name: dto.name, type: dto.type, color: dto.color },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('Já existe uma categoria com esse nome');
      }
      throw error;
    }
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOwnedOrThrow(userId, id);
    // onDelete: SetNull na FK de Task.categoryId — as tasks ficam "sem
    // categoria", nunca são apagadas.
    await this.prisma.category.delete({ where: { id } });
  }
}
