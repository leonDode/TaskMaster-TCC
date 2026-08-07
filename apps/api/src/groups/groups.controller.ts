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
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Group, GroupMember, User } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateGroupDto } from './dto/create-group.dto';
import { JoinGroupDto } from './dto/join-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupMemberGuard } from './guards/group-member.guard';
import { Roles } from './guards/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { GroupMemberWithProfile, GroupsService } from './groups.service';

@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  // Mais restritivo que o default global: evita spam de criação de grupos.
  @Post()
  @Throttle({ medium: { limit: 10, ttl: 60_000 } })
  create(
    @CurrentUser() user: User,
    @Body() dto: CreateGroupDto,
  ): Promise<Group> {
    return this.groupsService.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: User): Promise<Group[]> {
    return this.groupsService.findAllForUser(user.id);
  }

  // Mais restritivo que o default global: dificulta brute-force do código
  // de convite (8 chars, ~32^8 combinações, mas ainda vale limitar tentativas).
  @Post('join')
  @Throttle({ medium: { limit: 10, ttl: 60_000 } })
  join(
    @CurrentUser() user: User,
    @Body() dto: JoinGroupDto,
  ): Promise<GroupMember> {
    return this.groupsService.join(user.id, dto);
  }

  @Get(':id')
  @UseGuards(GroupMemberGuard)
  findOne(@Param('id') id: string): Promise<Group | null> {
    return this.groupsService.findById(id);
  }

  @Patch(':id')
  @UseGuards(GroupMemberGuard, RolesGuard)
  @Roles('OWNER')
  update(@Param('id') id: string, @Body() dto: UpdateGroupDto): Promise<Group> {
    return this.groupsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(GroupMemberGuard, RolesGuard)
  @Roles('OWNER')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.groupsService.remove(id);
  }

  @Post(':id/invite-code/regenerate')
  @UseGuards(GroupMemberGuard, RolesGuard)
  @Roles('OWNER')
  regenerateInviteCode(@Param('id') id: string): Promise<Group> {
    return this.groupsService.regenerateInviteCode(id);
  }

  @Get(':id/members')
  @UseGuards(GroupMemberGuard)
  listMembers(@Param('id') id: string): Promise<GroupMemberWithProfile[]> {
    return this.groupsService.listMembers(id);
  }

  @Delete(':id/members/:memberId')
  @UseGuards(GroupMemberGuard, RolesGuard)
  @Roles('OWNER')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ): Promise<void> {
    return this.groupsService.removeMember(id, memberId);
  }

  @Post(':id/leave')
  @UseGuards(GroupMemberGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  leave(@CurrentUser() user: User, @Param('id') id: string): Promise<void> {
    return this.groupsService.leave(id, user.id);
  }
}
