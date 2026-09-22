import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { CheckInput, PolicyService } from './policy.service';

export interface Account {
  username: string;
  password: string;
  sub: string;
  fullName: string;
  role: string;
  department: string;
}

@Injectable()
export class AuthService {
  private readonly accounts: Account[] = [
    { username: 'admin', password: 'admin', sub: '1', fullName: 'Администратор', role: 'admin', department: 'it' },
    { username: 'manager', password: 'manager', sub: '2', fullName: 'Менеджер Анна', role: 'manager', department: 'it' },
    { username: 'ivan', password: 'ivan', sub: '3', fullName: 'Иван Финансов', role: 'finance', department: 'finance' },
    { username: 'maria', password: 'maria', sub: '4', fullName: 'Мария Продаж', role: 'user', department: 'sales' },
  ];

  constructor(private readonly policy: PolicyService) {}

  login(username: string, password: string): { token: string } {
    const account = this.accounts.find(
      (a) => a.username === username && a.password === password,
    );
    if (!account) {
      throw new UnauthorizedException('Неверный логин или пароль');
    }

    const claims = {
      sub: account.sub,
      username: account.username,
      fullName: account.fullName,
      role: account.role,
      department: account.department,
    };

    const token = jwt.sign(
      claims,
      process.env.JWT_SECRET || 'super-secret-key',
      { expiresIn: '1h' },
    );
    return { token };
  }

  can(ctx: CheckInput): { allowed: boolean; reason: string } {
    return this.policy.evaluate(ctx);
  }

  getPolicies() {
    return {
      rbac: this.policy.getRbacMatrix(),
      abac: this.policy.getAbacRules(),
    };
  }

  addPolicy(action: string, description: string, role: string) {
    this.policy.addAbacRule(action, description, role);
    return this.getPolicies();
  }
}