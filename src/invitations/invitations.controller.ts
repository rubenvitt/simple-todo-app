import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Post,
    Query,
    Request,
    UseGuards
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserExistsGuard } from '../users/guards/user-exists.guard';
import { CreateInvitationDto, InvitationResponseDto } from './dto';
import { InvitationsService } from './invitations.service';

@Controller('invitations')
@UseGuards(JwtAuthGuard, UserExistsGuard)
export class InvitationsController {
    constructor(private readonly invitationsService: InvitationsService) { }

    @Post('lists/:listId')
    @HttpCode(HttpStatus.CREATED)
    async createInvitation(
        @Param('listId', ParseUUIDPipe) listId: string,
        @Body() createInvitationDto: CreateInvitationDto,
        @Request() req: any,
    ): Promise<InvitationResponseDto> {
        return this.invitationsService.createInvitation(listId, createInvitationDto, req.user.id);
    }

    @Get()
    async getPendingInvitations(
        @Request() req: any,
        @Query() query: any,
    ) {
        // If pagination parameters are provided, use paginated version
        if (query.page || query.limit || query.status || query.search) {
            return this.invitationsService.getPaginatedInvitationsForUser(req.user.email, query);
        }

        // Otherwise, use simple version for backward compatibility
        return this.invitationsService.getPendingInvitationsForUser(req.user.email);
    }

    @Get('lists/:listId')
    async getInvitationsByList(
        @Param('listId', ParseUUIDPipe) listId: string,
        @Request() req: any,
    ): Promise<InvitationResponseDto[]> {
        return this.invitationsService.getInvitationsByList(listId, req.user.id);
    }

    @Post('accept/:token')
    @HttpCode(HttpStatus.OK)
    async acceptInvitation(
        @Param('token') token: string,
        @Request() req: any,
    ): Promise<InvitationResponseDto> {
        return this.invitationsService.acceptInvitation(token, req.user.email);
    }

    @Post('decline/:token')
    @HttpCode(HttpStatus.OK)
    async declineInvitation(
        @Param('token') token: string,
        @Request() req: any,
    ): Promise<InvitationResponseDto> {
        return this.invitationsService.declineInvitation(token, req.user.email);
    }

    /**
     * Manual cleanup endpoint for expired invitations
     * Can be used by administrators or for testing purposes
     */
    @Post('cleanup-expired')
    @HttpCode(HttpStatus.OK)
    async cleanupExpiredInvitations(): Promise<{ message: string; expiredCount: number }> {
        const expiredCount = await this.invitationsService.cleanupExpiredInvitations();
        return {
            message: `Successfully processed ${expiredCount} expired invitations`,
            expiredCount,
        };
    }
} 