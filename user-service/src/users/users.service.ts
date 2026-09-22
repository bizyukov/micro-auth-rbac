import { Injectable } from '@nestjs/common';

export interface User {
  id: number;
  username: string;
  fullName: string;
  department: string;
  role: string;
}

@Injectable()
export class UsersService {
  private readonly users: User[] = [
    { id: 1, username: 'admin', fullName: 'Администратор', department: 'it', role: 'admin' },
    { id: 2, username: 'manager', fullName: 'Менеджер Анна', department: 'it', role: 'manager' },
    { id: 3, username: 'ivan_finance', fullName: 'Иван Финансов', department: 'finance', role: 'finance' },
    { id: 4, username: 'maria_sales', fullName: 'Мария Продаж', department: 'sales', role: 'user' },
    { id: 5, username: 'petr_dev', fullName: 'Пётр Разработчик', department: 'it', role: 'user' },
    { id: 6, username: 'olga_support', fullName: 'Ольга Поддержка', department: 'support', role: 'user' },
  ];

  getAll(): User[] {
    return this.users;
  }
}