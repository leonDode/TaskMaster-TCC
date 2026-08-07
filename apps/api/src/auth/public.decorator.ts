import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Marca uma rota como isenta da JwtAuthGuard global (ex: health check).
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
