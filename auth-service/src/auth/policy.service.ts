import { Injectable } from '@nestjs/common';

export interface CheckInput {
  subjectId: string;
  role: string;
  department: string;
  action: string;
  resourceType: string;
  resourceOwnerDepartment?: string;
}

export interface AbacRule {
  action: string;
  description: string;
  evaluate: (ctx: CheckInput) => boolean;
}

@Injectable()
export class PolicyService {
  // RBAC: роль -> набор разрешений
  private readonly rbac: Record<string, string[]> = {
    admin: ['user:read', 'user:write', 'user:delete', 'order:read', 'order:write', 'document:read'],
    manager: ['order:read', 'order:write', 'user:read', 'document:read'],
    user: ['order:read'],
    finance: ['document:read'],
  };

  // ABAC: динамические правила, можно менять на лету
  private abacRules: AbacRule[] = [
    {
      action: 'document:read',
      description: 'Отдел субъекта совпадает с отделом ресурса',
      evaluate: (ctx) =>
        ctx.resourceOwnerDepartment !== undefined &&
        ctx.resourceOwnerDepartment !== '' &&
        ctx.department === ctx.resourceOwnerDepartment,
    },
  ];

  evaluate(ctx: CheckInput): { allowed: boolean; reason: string } {
    // 1) RBAC-часть: есть ли у роли разрешение на действие?
    const permissions = this.rbac[ctx.role] ?? [];
    if (!permissions.includes(ctx.action)) {
      return {
        allowed: false,
        reason: `RBAC: роль '${ctx.role}' не имеет разрешения '${ctx.action}'`,
      };
    }

    // 2) ABAC-часть: если для действия есть правила — проверяем все
    const rules = this.abacRules.filter((r) => r.action === ctx.action);
    if (rules.length > 0) {
      const matched = rules.some((r) => r.evaluate(ctx));
      if (!matched) {
        return { allowed: false, reason: 'ABAC: ни одно правило не выполнено' };
      }
    }

    return { allowed: true, reason: 'allow' };
  }

  getRbacMatrix(): Record<string, string[]> {
    return this.rbac;
  }

  getAbacRules(): { action: string; description: string }[] {
    return this.abacRules.map((r) => ({ action: r.action, description: r.description }));
  }

  addAbacRule(action: string, description: string, role: string) {
    this.abacRules.push({
      action,
      description,
      evaluate: (ctx) => ctx.role === role,
    });
  }
}