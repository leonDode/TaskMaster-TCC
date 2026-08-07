-- AlterTable
-- `challenge_id` é denormalizado (derivável via challenge_task_id) para a
-- agregação do leaderboard não precisar de join com challenge_tasks no caminho
-- quente — mesma decisão já aplicada em challenge_completions.
--
-- Padrão de 3 tempos em vez do `ADD COLUMN ... NOT NULL` que o Prisma geraria
-- sozinho, que falha se a tabela tiver linhas. Nenhuma tabela é recriada.
ALTER TABLE "challenge_progress" ADD COLUMN     "challenge_id" UUID;

-- Backfill: o valor é derivável da FK que já existe.
UPDATE "challenge_progress" cp
SET "challenge_id" = ct."challenge_id"
FROM "challenge_tasks" ct
WHERE ct."id" = cp."challenge_task_id";

ALTER TABLE "challenge_progress" ALTER COLUMN "challenge_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "challenge_progress_challenge_id_challenge_task_id_group_mem_idx" ON "challenge_progress"("challenge_id", "challenge_task_id", "group_member_id");

-- AddForeignKey
ALTER TABLE "challenge_progress" ADD CONSTRAINT "challenge_progress_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
