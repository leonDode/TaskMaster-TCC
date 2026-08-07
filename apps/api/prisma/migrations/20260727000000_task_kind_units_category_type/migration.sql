-- CreateEnum
CREATE TYPE "task_kind" AS ENUM ('BOOLEAN', 'QUANTITATIVE');

-- CreateEnum
CREATE TYPE "unit_type" AS ENUM ('ML', 'LITERS', 'GRAMS', 'KG', 'KM', 'METERS', 'STEPS', 'MINUTES', 'HOURS', 'REPS', 'PAGES', 'GLASSES', 'CALORIES', 'GENERIC_UNIT');

-- CreateEnum
CREATE TYPE "category_type" AS ENUM ('FITNESS', 'HEALTH', 'HYGIENE', 'NUTRITION', 'STUDY', 'WORK', 'HOME', 'OTHER');

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "kind" "task_kind" NOT NULL DEFAULT 'BOOLEAN',
ADD COLUMN     "target_value" DECIMAL(12,2),
ADD COLUMN     "unit" "unit_type";

-- AlterTable
ALTER TABLE "challenge_tasks" ADD COLUMN     "kind" "task_kind" NOT NULL DEFAULT 'BOOLEAN',
ADD COLUMN     "target_value" DECIMAL(12,2),
ADD COLUMN     "unit" "unit_type";

-- AlterTable
-- `categories.type` é obrigatório e NÃO tem default (categoria sem tipo
-- quebraria a sugestão de unidades da UI). Como já existem linhas, o passo é
-- feito em três tempos — adicionar nullable, backfillar, travar — em vez do
-- `ADD COLUMN ... NOT NULL` que o Prisma geraria sozinho e que falharia.
-- Nenhuma tabela é recriada.
ALTER TABLE "categories" ADD COLUMN     "type" "category_type";

-- Backfill: as categorias semeadas no primeiro login (ver
-- UsersService.syncFromClaims) têm nome conhecido e mapeiam 1:1. Qualquer
-- categoria criada à mão pelo usuário cai em OTHER e pode ser reclassificada
-- depois via PATCH /categories/:id.
UPDATE "categories" SET "type" = CASE
    WHEN "name" = 'Trabalho' THEN 'WORK'
    WHEN "name" = 'Estudos'  THEN 'STUDY'
    WHEN "name" = 'Saúde'    THEN 'HEALTH'
    ELSE 'OTHER'
END::"category_type";

ALTER TABLE "categories" ALTER COLUMN "type" SET NOT NULL;

-- CreateTable
CREATE TABLE "task_progress" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "occurrence_date" DATE NOT NULL,
    "value" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_progress" (
    "id" UUID NOT NULL,
    "challenge_task_id" UUID NOT NULL,
    "group_member_id" UUID NOT NULL,
    "progress_on" DATE NOT NULL,
    "value" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenge_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "task_progress_task_id_occurrence_date_key" ON "task_progress"("task_id", "occurrence_date");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_progress_challenge_task_id_group_member_id_progre_key" ON "challenge_progress"("challenge_task_id", "group_member_id", "progress_on");

-- AddForeignKey
ALTER TABLE "task_progress" ADD CONSTRAINT "task_progress_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_progress" ADD CONSTRAINT "challenge_progress_challenge_task_id_fkey" FOREIGN KEY ("challenge_task_id") REFERENCES "challenge_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_progress" ADD CONSTRAINT "challenge_progress_group_member_id_fkey" FOREIGN KEY ("group_member_id") REFERENCES "group_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
