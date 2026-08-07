import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { IncrementProgressDto } from './increment-progress.dto';

// A restrição de "só incrementa" é estrutural: mora na forma do DTO + na
// config do pipe, não num `if` no service. Por isso o teste exercita o pipe
// com exatamente a mesma configuração do main.ts, senão não estaria testando
// a garantia real.
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

const metadata = {
  type: 'body' as const,
  metatype: IncrementProgressDto,
};

const transform = (body: unknown) => pipe.transform(body, metadata);

describe('IncrementProgressDto', () => {
  // Correção 2b: `value` absoluto é decremento funcional e some do lado de
  // grupo. Cai no forbidNonWhitelisted por a propriedade não existir.
  it('rejeita `value` absoluto', async () => {
    await expect(transform({ value: 0 })).rejects.toThrow(BadRequestException);
    await expect(transform({ delta: 1, value: 5 })).rejects.toThrow(
      BadRequestException,
    );
  });

  // A outra forma de decremento, que passava despercebida: delta negativo.
  it.each([[0], [-5], [-0.5]])('rejeita delta %p', async (delta) => {
    await expect(transform({ delta })).rejects.toThrow(BadRequestException);
  });

  it('rejeita delta ausente', async () => {
    await expect(transform({})).rejects.toThrow(BadRequestException);
  });

  it('rejeita mais de duas casas decimais', async () => {
    await expect(transform({ delta: 1.234 })).rejects.toThrow(
      BadRequestException,
    );
  });

  it.each([[1], [0.5], [1.5], [500]])('aceita delta %p', async (delta) => {
    await expect(transform({ delta })).resolves.toEqual({ delta });
  });
});
