import client from './client';
import type { LoginDTO, LoginVO, UserVO } from '@/types/auth';

export const login = (data: LoginDTO) => client.post<LoginVO>('/auth/login', data);

export const getMe = () => client.get<UserVO>('/auth/me');
