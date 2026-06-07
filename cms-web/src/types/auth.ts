export interface LoginDTO {
  username: string;
  password: string;
}

export interface LoginVO {
  token: string;
  username: string;
  role: string;
}

export interface UserVO {
  username: string;
  role: string;
  status: number;
  createdAt: string;
}

export interface UserCreateDTO {
  username: string;
  password: string;
  role?: string;
}

export interface UserUpdateDTO {
  username: string;
  role?: string;
  status?: number;
}

export interface UserPasswordDTO {
  oldPassword?: string;
  newPassword: string;
}
