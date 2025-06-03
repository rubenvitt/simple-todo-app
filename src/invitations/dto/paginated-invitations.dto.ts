import { InvitationResponseDto } from './invitation-response.dto';

export class PaginatedInvitationsDto {
    data!: InvitationResponseDto[];

    pagination!: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
} 