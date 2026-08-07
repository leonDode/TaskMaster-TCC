import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import type { UploadedAvatarFile } from './avatar-validation';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

// Backstop de memória contra multipart gigante — bem acima do limite de
// negócio (2MB), que é aplicado explicitamente em validateAvatarFile e
// sempre vira 400. Isto aqui é só pra nunca bufferizar um upload absurdo
// inteiro em memória antes da validação de tamanho rodar.
const MULTER_SIZE_BACKSTOP_BYTES = 5 * 1024 * 1024;

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: User): User {
    return user;
  }

  @Patch('me')
  updateMe(
    @CurrentUser() user: User,
    @Body() dto: UpdateUserDto,
  ): Promise<User> {
    return this.usersService.updateMe(user.id, dto);
  }

  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: { fileSize: MULTER_SIZE_BACKSTOP_BYTES },
    }),
  )
  uploadAvatar(
    @CurrentUser() user: User,
    @UploadedFile() file: UploadedAvatarFile,
  ): Promise<User> {
    return this.usersService.uploadAvatar(user.id, file);
  }
}
