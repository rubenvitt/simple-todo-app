export class ListResponseDto {
    id!: string;
    name!: string;
    description?: string | null;
    color!: string;
    userId!: string;
    createdAt!: Date;
    updatedAt!: Date;
} 