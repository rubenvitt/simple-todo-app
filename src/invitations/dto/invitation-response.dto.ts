import { InvitationStatus } from '../../../generated/prisma';

export class InvitationResponseDto {
  id!: string;
  listId!: string;
  inviterUserId!: string;
  inviteeEmail!: string;
  status!: InvitationStatus;
  token!: string;
  expiresAt!: Date;
  createdAt!: Date;
  updatedAt!: Date;

  // Optional relations
  list?: {
    id: string;
    name: string;
    description: string | null;
  };

  inviter?: {
    id: string;
    name: string;
    email: string;
  };
}
