import { Component, signal } from '@angular/core';

const API_BASE = 'http://localhost:3000';

interface Account {
  username: string;
  label: string;
  password: string;
  badge: string;
}

interface Doc {
  id: number;
  title: string;
  department: string;
}

interface HttpResult {
  ok: boolean;
  status: number;
  data: any;
}

const ACCOUNTS: Account[] = [
  { username: 'admin', label: 'admin / admin', password: 'admin', badge: 'admin' },
  { username: 'manager', label: 'manager / manager', password: 'manager', badge: 'manager' },
  { username: 'ivan', label: 'ivan / ivan (finance)', password: 'ivan', badge: 'finance' },
  { username: 'maria', label: 'maria / maria (sales, user)', password: 'maria', badge: 'user' },
];

const DOCS: Doc[] = [
  { id: 1, title: 'Бюджет Q1', department: 'finance' },
  { id: 3, title: 'Бюджет Q3', department: 'finance' },
  { id: 4, title: 'План продаж', department: 'sales' },
  { id: 6, title: 'Склад IT', department: 'it' },
  { id: 7, title: 'Контракт с заказчиком', department: 'sales' },
];

@Component({
  selector: 'app-root',
  imports: [],
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  readonly accounts = ACCOUNTS;
  readonly docs = DOCS;

  username = signal<string>('admin');
  token = signal<string | null>(null);
  currentUser = signal<string>('');
  loading = signal(false);

  usersResult = signal<{ ok: boolean; text: string } | null>(null);
  docResults = signal<Record<number, { ok: boolean; text: string }>>({});
  policies = signal<{ action: string; description: string }[]>([]);
  policyMsg = signal<string | null>(null);

  async selectAccount(value: string) {
    this.username.set(value);
    this.token.set(null);
    this.currentUser.set('');
    this.usersResult.set(null);
    this.docResults.set({});
    this.policies.set([]);
    this.policyMsg.set(null);
  }

  async login() {
    this.loading.set(true);
    try {
      const r = await this.do(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: this.username(), password: this.username() }),
      });
      if (r.ok) {
        this.token.set(r.data.token);
        this.currentUser.set(this.username());
        this.usersResult.set(null);
        this.docResults.set({});
      } else {
        this.usersResult.set({ ok: false, text: `${r.status} ${r.data?.message ?? 'Ошибка логина'}` });
      }
    } finally {
      this.loading.set(false);
    }
  }

  async loadUsers() {
    if (!this.token()) return;
    this.loading.set(true);
    try {
      const r = await this.do(`${API_BASE}/users`, {
        headers: { Authorization: `Bearer ${this.token()}` },
      });
      this.usersResult.set(
        r.ok
          ? { ok: true, text: JSON.stringify(r.data, null, 2) }
          : { ok: false, text: `${r.status} ${r.data?.message ?? '—'}` },
      );
    } finally {
      this.loading.set(false);
    }
  }

  async loadDocument(doc: Doc) {
    if (!this.token()) return;
    this.loading.set(true);
    try {
      const r = await this.do(`${API_BASE}/documents/${doc.id}`, {
        headers: { Authorization: `Bearer ${this.token()}` },
      });
      this.docResults.update((map) => ({
        ...map,
        [doc.id]: r.ok
          ? { ok: true, text: JSON.stringify(r.data) }
          : { ok: false, text: `${r.status} ${r.data?.message ?? '—'}` },
      }));
    } finally {
      this.loading.set(false);
    }
  }

  async addManagerPolicy() {
    this.loading.set(true);
    try {
      const r = await this.do(`${API_BASE}/auth/policies`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'document:read',
          description: 'Руководители (manager) видят документы всех отделов',
          role: 'manager',
        }),
      });
      if (r.ok && r.data?.abac) {
        this.policies.set(r.data.abac);
        this.policyMsg.set('Правило добавлено на лету без передеплоя сервисов ✔');
      } else {
        this.policyMsg.set(`Ошибка: ${r.status} ${r.data?.message ?? ''}`);
      }
    } finally {
      this.loading.set(false);
    }
  }

  private async do(url: string, init?: RequestInit): Promise<HttpResult> {
    const res = await fetch(url, init);
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { ok: res.ok, status: res.status, data };
  }
}