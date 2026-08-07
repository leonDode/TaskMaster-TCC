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
  UseGuards,
} from '@nestjs/common';
import type { Challenge, ChallengeTask, GroupMember } from '@prisma/client';
import { CurrentGroupMember } from '../groups/current-group-member.decorator';
import { GroupMemberGuard } from '../groups/guards/group-member.guard';
import { Roles } from '../groups/guards/roles.decorator';
import { RolesGuard } from '../groups/guards/roles.guard';
import {
  ChallengeProgressResult,
  ChallengeTaskProgress,
  ChallengesService,
} from './challenges.service';
import { CurrentChallenge } from './current-challenge.decorator';
import { CreateChallengeDto } from './dto/create-challenge.dto';
import { CreateChallengeTaskDto } from './dto/create-challenge-task.dto';
import { FindChallengesQueryDto } from './dto/find-challenges-query.dto';
import { IncrementProgressDto } from './dto/increment-progress.dto';
import { UpdateChallengeDto } from './dto/update-challenge.dto';
import { UpdateChallengeTaskDto } from './dto/update-challenge-task.dto';
import { ChallengeAccessGuard } from './guards/challenge-access.guard';
import {
  LeaderboardService,
  TaskLeaderboard,
} from '../leaderboard/leaderboard.service';

@Controller('groups/:groupId/challenges')
@UseGuards(GroupMemberGuard)
export class ChallengesController {
  constructor(
    private readonly challengesService: ChallengesService,
    private readonly leaderboardService: LeaderboardService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('OWNER')
  create(
    @Param('groupId') groupId: string,
    @CurrentGroupMember() member: GroupMember,
    @Body() dto: CreateChallengeDto,
  ): Promise<Challenge> {
    return this.challengesService.create(groupId, member.id, dto);
  }

  @Get()
  findAll(
    @Param('groupId') groupId: string,
    @Query() query: FindChallengesQueryDto,
  ): Promise<Challenge[]> {
    return this.challengesService.findAllForGroup(groupId, query.status);
  }

  @Get(':id')
  @UseGuards(ChallengeAccessGuard)
  findOne(@CurrentChallenge() challenge: Challenge) {
    return this.challengesService.findWithTasks(challenge.id);
  }

  @Patch(':id')
  @UseGuards(ChallengeAccessGuard, RolesGuard)
  @Roles('OWNER')
  update(
    @CurrentChallenge() challenge: Challenge,
    @Body() dto: UpdateChallengeDto,
  ): Promise<Challenge> {
    return this.challengesService.update(challenge, dto);
  }

  @Delete(':id')
  @UseGuards(ChallengeAccessGuard, RolesGuard)
  @Roles('OWNER')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentChallenge() challenge: Challenge): Promise<void> {
    return this.challengesService.remove(challenge.id);
  }

  @Post(':id/tasks')
  @UseGuards(ChallengeAccessGuard, RolesGuard)
  @Roles('OWNER')
  addTask(
    @CurrentChallenge() challenge: Challenge,
    @Body() dto: CreateChallengeTaskDto,
  ): Promise<ChallengeTask> {
    return this.challengesService.addTask(challenge.id, dto);
  }

  @Patch(':id/tasks/:taskId')
  @UseGuards(ChallengeAccessGuard, RolesGuard)
  @Roles('OWNER')
  updateTask(
    @CurrentChallenge() challenge: Challenge,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateChallengeTaskDto,
  ): Promise<ChallengeTask> {
    return this.challengesService.updateTask(challenge.id, taskId, dto);
  }

  @Delete(':id/tasks/:taskId')
  @UseGuards(ChallengeAccessGuard, RolesGuard)
  @Roles('OWNER')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeTask(
    @CurrentChallenge() challenge: Challenge,
    @Param('taskId') taskId: string,
  ): Promise<void> {
    return this.challengesService.removeTask(challenge.id, taskId);
  }

  @Post(':id/tasks/:taskId/complete')
  @UseGuards(ChallengeAccessGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  complete(
    @CurrentChallenge() challenge: Challenge,
    @Param('taskId') taskId: string,
    @CurrentGroupMember() member: GroupMember,
  ): Promise<void> {
    return this.challengesService.complete(challenge, taskId, member.id);
  }

  @Delete(':id/tasks/:taskId/complete')
  @UseGuards(ChallengeAccessGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  uncomplete(
    @CurrentChallenge() challenge: Challenge,
    @Param('taskId') taskId: string,
    @CurrentGroupMember() member: GroupMember,
  ): Promise<void> {
    return this.challengesService.uncomplete(challenge, taskId, member.id);
  }

  // Progresso de ChallengeTask QUANTITATIVE. Qualquer membro (não só OWNER),
  // igual às rotas de conclusão. Devolve o estado resultante — o valor pode
  // ter sido clampado no alvo.
  @Post(':id/tasks/:taskId/progress')
  @UseGuards(ChallengeAccessGuard)
  upsertProgress(
    @CurrentChallenge() challenge: Challenge,
    @Param('taskId') taskId: string,
    @CurrentGroupMember() member: GroupMember,
    @Body() dto: IncrementProgressDto,
  ): Promise<ChallengeProgressResult> {
    return this.challengesService.upsertProgress(
      challenge,
      taskId,
      member.id,
      dto,
    );
  }

  @Get(':id/my-progress')
  @UseGuards(ChallengeAccessGuard)
  myProgress(
    @CurrentChallenge() challenge: Challenge,
    @CurrentGroupMember() member: GroupMember,
  ): Promise<ChallengeTaskProgress[]> {
    return this.challengesService.myProgress(challenge.id, member.id);
  }

  @Get(':id/leaderboard')
  @UseGuards(ChallengeAccessGuard)
  getLeaderboard(
    @CurrentChallenge() challenge: Challenge,
  ): Promise<TaskLeaderboard[]> {
    return this.leaderboardService.getLeaderboard(challenge);
  }
}
