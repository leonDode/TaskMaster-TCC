import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type { Task, User } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpsertProgressDto } from './dto/upsert-progress.dto';
import { FindTasksQueryDto } from './dto/find-tasks-query.dto';
import { GetOccurrencesQueryDto } from './dto/get-occurrences-query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import {
  TaskOccurrence,
  TaskProgressResult,
  TasksService,
} from './tasks.service';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateTaskDto): Promise<Task> {
    return this.tasksService.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: User, @Query() query: FindTasksQueryDto) {
    return this.tasksService.findAll(user.id, query);
  }

  // Precisa vir antes de GET /tasks/:id (rota estática vs. dinâmica).
  @Get('occurrences')
  getOccurrences(
    @CurrentUser() user: User,
    @Query() query: GetOccurrencesQueryDto,
  ): Promise<TaskOccurrence[]> {
    return this.tasksService.getOccurrences(user.id, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id') id: string): Promise<Task> {
    return this.tasksService.findOwnedOrThrow(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ): Promise<Task> {
    return this.tasksService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: User, @Param('id') id: string): Promise<void> {
    return this.tasksService.remove(user.id, id);
  }

  @Delete()
  removeAll(@CurrentUser() user: User): Promise<{ deletedCount: number }> {
    return this.tasksService.removeAll(user.id);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.NO_CONTENT)
  completeOneOff(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<void> {
    return this.tasksService.completeOneOff(user.id, id);
  }

  @Delete(':id/complete')
  @HttpCode(HttpStatus.NO_CONTENT)
  uncompleteOneOff(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<void> {
    return this.tasksService.uncompleteOneOff(user.id, id);
  }

  @Post(':id/occurrences/:date/complete')
  @HttpCode(HttpStatus.NO_CONTENT)
  completeOccurrence(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('date') date: string,
  ): Promise<void> {
    return this.tasksService.completeOccurrence(user.id, id, date);
  }

  @Delete(':id/occurrences/:date/complete')
  @HttpCode(HttpStatus.NO_CONTENT)
  uncompleteOccurrence(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('date') date: string,
  ): Promise<void> {
    return this.tasksService.uncompleteOccurrence(user.id, id, date);
  }

  // Progresso de task QUANTITATIVE. Devolve o estado resultante (não 204):
  // o valor pode ter sido clampado no alvo, então o cliente precisa saber
  // onde de fato parou.
  @Post(':id/progress')
  upsertOneOffProgress(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpsertProgressDto,
  ): Promise<TaskProgressResult> {
    return this.tasksService.upsertOneOffProgress(user.id, id, dto);
  }

  @Post(':id/occurrences/:date/progress')
  upsertOccurrenceProgress(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('date') date: string,
    @Body() dto: UpsertProgressDto,
  ): Promise<TaskProgressResult> {
    return this.tasksService.upsertOccurrenceProgress(user.id, id, date, dto);
  }
}
