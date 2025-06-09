export interface ValidateTokenResponseDto {
  valid: boolean;
  user: {
    id: string;
    email: string;
    name: string;
  };
  expiresAt: Date;
}
