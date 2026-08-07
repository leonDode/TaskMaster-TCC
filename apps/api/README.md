<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

API do Task Master — NestJS + Prisma. Decisões de arquitetura em
`.claude/docs/design.md`.

---

## Contrato dos endpoints de progresso

Aplica-se a tasks `QUANTITATIVE` (as `BOOLEAN` continuam usando
`POST/DELETE .../complete`). Escrito para a fase Web implementar a
reconciliação otimista corretamente.

### Rotas

| Rota                                              | Corpo aceito                                   |
| ------------------------------------------------- | ---------------------------------------------- |
| `POST /tasks/:id/progress`                        | `{ delta }` **ou** `{ value }` — exatamente um |
| `POST /tasks/:id/occurrences/:date/progress`      | idem                                           |
| `POST /groups/:g/challenges/:c/tasks/:t/progress` | **só** `{ delta }`, e `delta > 0`              |

### A resposta é autoritativa

As três rotas devolvem o estado **resultante** da escrita:

```jsonc
// POST /tasks/:id/progress  { "delta": 1 }
{
  "taskId": "…",
  "occurrenceDate": "2026-07-27",
  "currentValue": "2.00", // Decimal -> string, converter no cliente
  "targetValue": "2.00",
  "completed": true,
}
```

O cliente **substitui** o estado otimista local por esse retorno. Nunca assuma
que o próprio cálculo local venceu: o servidor pode ter clampado o valor
(lado pessoal) ou aplicado um incremento concorrente.

### Concorrência: last-write-wins, sem versionamento

Não há coluna `version` nem idempotency key. `delta` usa `increment` no banco
e `value` usa `set` — as duas escritas são atômicas, então **o dado nunca
corrompe**; só o resultado final depende da ordem de chegada. Chegando em
ordem, "+500 depois corrigir para 300" resulta em 300, que é o desejado.

Consequência prática para updates otimistas: reconciliar **sempre** pela
resposta, nunca por diff local acumulado. Isso converge em qualquer ordem.

Note que `delta` não é idempotente — um POST reenviado conta duas vezes. Em
retry após timeout, prefira reconsultar o estado a repetir o `delta`.

### Lado pessoal: `completed` pode regredir

`{ "value": 0 }` zera o progresso e **apaga a `TaskCompletion`** como efeito
colateral — `completed` vai de `true` para `false`. O padrão de rollback
otimista não pode assumir monotonicidade aqui. Correção e reset são legítimos
neste lado porque o impacto é restrito ao próprio usuário.

O valor é clampado em `[0, targetValue]`: o alvo é uma meta pessoal e a barra
da UI não deve passar de 100%.

### Lado de desafio: monotônico, e por quê

O leaderboard é o núcleo do produto, então progresso já contabilizado é
imutável — poder editar ou desfazer abriria brecha para manipular ranking.

- Só `{ delta }`, com `delta > 0`. `{ "value": … }` retorna **400**
  (a propriedade não existe no DTO e o `ValidationPipe` global roda com
  `forbidNonWhitelisted`). `delta` zero ou negativo também retorna 400.
- `currentValue` nunca diminui e uma `ChallengeCompletion` **nunca**
  desaparece. O rollback otimista pode assumir monotonicidade deste lado.
- **Sem teto no alvo.** Uma `ChallengeTask` quantitativa é rankeada por
  `SUM(value)` no período; limitar no alvo empataria todo mundo que bate a
  meta e descartaria o excedente que decide "quem bebeu mais". `targetValue`
  aqui só marca quando a conclusão nasce.
- `DELETE .../complete` numa task quantitativa retorna 400.
- **Fora da janela `startAt..endAt` do desafio, tudo retorna 400** — escrita de
  progresso, `complete` e `uncomplete`. A restrição de "só hoje UTC" sozinha
  não bastaria: num desafio encerrado ontem, "hoje" ainda seria uma data
  formalmente válida. É a checagem contra `endAt` que fecha isso, e ela vale
  também para desfazer, senão o placar final de um desafio recém-encerrado
  ainda seria editável.

### Leaderboard: um ranking por task

`GET /groups/:g/challenges/:c/leaderboard` devolve **uma lista por
`ChallengeTask`**, não um agregado do desafio. Somar grandezas diferentes não
faz sentido — nem entre `BOOLEAN` e `QUANTITATIVE`, nem entre duas
quantitativas com unidades diferentes (km e litros).

```jsonc
[
  {
    "challengeTaskId": "…",
    "title": "Beber água",
    "kind": "QUANTITATIVE",
    "unit": "LITERS",
    "targetValue": "2.00",
    "entries": [
      { "groupMemberId": "…", "displayName": "Alice", "score": "9", "rank": 1 },
    ], // SUM(value) no período
  },
  {
    "challengeTaskId": "…",
    "title": "Academia",
    "kind": "BOOLEAN",
    "unit": null,
    "targetValue": null,
    "entries": [
      { "groupMemberId": "…", "displayName": "Bob", "score": "4", "rank": 1 },
    ], // contagem de conclusões
  },
]
```

`score` é `Decimal` (string) nos dois casos. Empate usa "competition ranking"
(1, 2, 2, 4). Membro sem atividade aparece com `score: "0"` no último rank.
Cache de 90s com invalidação ativa na própria ação do usuário.

### Timezone — a distinção é deliberada, não generalizar

|                                             | Referência de dia        | Origem               |
| ------------------------------------------- | ------------------------ | -------------------- |
| `Task` / `TaskProgress`                     | **dia local do usuário** | data vem do cliente  |
| `ChallengeProgress` / `ChallengeCompletion` | **dia calendário UTC**   | derivado no servidor |

No lado pessoal a referência é a rotina de quem usa, então o dia local é o
certo. No lado de grupo a janela de escrita precisa ser **idêntica para todos
os membros** por justiça competitiva — se cada um virasse o dia no próprio
fuso, a mesma ação contaria em dias diferentes no mesmo placar. UTC é o
critério neutro.

A decisão de timezone do usuário (emenda de recorrência) **não se estende ao
lado de grupo**. As rotas de progresso de desafio não aceitam parâmetro de
data justamente por isso: `progressOn` é sempre "hoje em UTC", derivado no
servidor, e ocorrências passadas são inalcançáveis por construção.

---

## Project setup

```bash
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ pnpm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
