import client from './client';
import type { UserVO, UserCreateDTO, UserUpdateDTO, UserPasswordDTO } from '@/types/auth';

export const listUsers = () => client.get<UserVO[]>('/users');

export const createUser = (data: UserCreateDTO) => client.post<UserVO>('/users', data);

export const updateUser = (data: UserUpdateDTO) => client.put<UserVO>('/users', data);

export const deleteUser = (username: string) => client.delete(`/users/${username}`);

export const resetPassword = (username: string, data: UserPasswordDTO) =>
  client.put(`/users/${username}/password`, data);
