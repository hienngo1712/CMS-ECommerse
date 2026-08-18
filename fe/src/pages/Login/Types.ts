export type AuthUser = {
  id: number;
  username: string;
  email: string;
  role: string;
  isActive?: boolean;
}

export type LoginPayload = {
  username: string;
  password: string;
}

export type LoginResponse = {
  token: string;
  user: AuthUser;
}
