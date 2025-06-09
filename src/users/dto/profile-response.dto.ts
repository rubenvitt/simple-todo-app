export class ProfileResponseDto {
  id!: string;
  email!: string;
  name!: string;
  avatar?: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}
