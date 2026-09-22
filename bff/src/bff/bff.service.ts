import {
  ForbiddenException,
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { Client, ClientGrpc, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { firstValueFrom, Observable } from 'rxjs';
import * as jwt from 'jsonwebtoken';

interface PdpClient {
  CheckAccess(data: Record<string, unknown>): Observable<{ allowed: boolean; reason: string }>;
}

interface UserClient {
  GetUsers(data: Record<string, unknown>): Observable<{ users: unknown[] }>;
}

interface JwtClaims {
  sub: string;
  username: string;
  fullName: string;
  role: string;
  department: string;
}

interface Document {
  id: number;
  title: string;
  department: string;
}

@Injectable()
export class BffService implements OnModuleInit {
  @Client({
    transport: Transport.GRPC,
    options: {
      package: 'pdp',
      protoPath: join(__dirname, '../proto/pdp.proto'),
      url: process.env.AUTH_SERVICE_URL || 'localhost:50050',
    },
  })
  private readonly pdpClient: ClientGrpc;

  @Client({
    transport: Transport.GRPC,
    options: {
      package: 'user',
      protoPath: join(__dirname, '../proto/user.proto'),
      url: process.env.USER_SERVICE_URL || 'localhost:50051',
    },
  })
  private readonly userClient: ClientGrpc;

  private pdp: PdpClient;
  private users: UserClient;

  private readonly documents: Document[] = [
    { id: 1, title: 'Бюджет Q1', department: 'finance' },
    { id: 2, title: 'Бюджет Q2', department: 'finance' },
    { id: 3, title: 'Бюджет Q3', department: 'finance' },
    { id: 4, title: 'План продаж', department: 'sales' },
    { id: 5, title: 'Отчёт по сделкам', department: 'sales' },
    { id: 6, title: 'Склад IT', department: 'it' },
    { id: 7, title: 'Контракт с заказчиком', department: 'sales' },
  ];

  onModuleInit() {
    this.pdp = this.pdpClient.getService<PdpClient>('PDPService');
    this.users = this.userClient.getService<UserClient>('UserService');
  }

  async login(username: string, password: string) {
    const loginUrl = process.env.AUTH_HTTP_URL || 'http://localhost:3001';
    const res = await fetch(`${loginUrl}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      throw new UnauthorizedException('Неверный логин или пароль');
    }
    return res.json();
  }

  private verifyToken(authHeader?: string): JwtClaims {
    if (!authHeader) throw new UnauthorizedException('Требуется Authorization header');
    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Требуется Bearer-токен');
    }
    try {
      return jwt.verify(token, process.env.JWT_SECRET || 'super-secret-key') as JwtClaims;
    } catch {
      throw new UnauthorizedException('Невалидный токен');
    }
  }

  async getUsers(authHeader?: string) {
    const claims = this.verifyToken(authHeader);
    const decision = await firstValueFrom(
      this.pdp.CheckAccess({
        subjectId: claims.sub,
        role: claims.role,
        department: claims.department,
        action: 'user:read',
        resourceType: 'users',
      }),
    );
    if (!decision.allowed) {
      throw new ForbiddenException('Недостаточно прав');
    }
    const result = await firstValueFrom(this.users.GetUsers({}));
    return result.users;
  }

  async getDocument(id: number, authHeader?: string) {
    const claims = this.verifyToken(authHeader);
    const doc = this.documents.find((d) => d.id === id);
    if (!doc) throw new ForbiddenException('Документ не найден');
    const decision = await firstValueFrom(
      this.pdp.CheckAccess({
        subjectId: claims.sub,
        role: claims.role,
        department: claims.department,
        action: 'document:read',
        resourceType: 'documents',
        resourceOwnerDepartment: doc.department,
      }),
    );
    if (!decision.allowed) {
      throw new ForbiddenException('Отдел не совпадает');
    }
    return doc;
  }

  async addPolicy(action: string, description: string, role: string) {
    const loginUrl = process.env.AUTH_HTTP_URL || 'http://localhost:3001';
    const res = await fetch(`${loginUrl}/policies`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, description, role }),
    });
    if (!res.ok) {
      throw new Error(`auth-service вернул ${res.status}`);
    }
    return res.json();
  }
}