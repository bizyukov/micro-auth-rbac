# Сервисы проекта micro-auth-rbac

Набор демонстрационных микросервисов для live-демонстрации **централизованной авторизации (authorization)** — RBAC + ABAC — в видео SkillUp.

Сервисы показывают паттерн **PDP / PEP**:

- **PEP (Policy Enforcement Point)** — BFF: единственная точка входа, перехватывает запросы и спрашивает разрешение у PDP.
- **PDP (Policy Decision Point)** — auth-service: принимает решение «разрешено / запрещено» на основе RBAC-матрицы и ABAC-правил.

## Состав и порты

| Сервис | Назначение | REST | gRPC | Web |
|--------|-----------|------|------|-----|
| [auth-service](./auth-service) | Выпуск JWT + PDP: роли, политики (RBAC + ABAC) | 3001 | 50050 | — |
| [user-service](./user-service) | Пользователи и их атрибуты (отдел, роль) | 3002 | 50051 | — |
| [bff](./bff) | BFF (PEP): единственная точка входа для фронтенда | 3000 | — | — |
| [frontend](./frontend) | Angular 22 SPA: UI для live-демо | — | — | 4200 (nginx) |

## Архитектура

```
                    ┌────────────────────────────┐
                    │         Frontend           │
                    │       Angular SPA :4200     │
                    └─────────────┬──────────────┘
                                  │ HTTP (REST) localhost:3000
                    ┌─────────────▼──────────────┐
                    │      BFF (PEP) :3000       │
                    │  проверка токена + решение │
                    └──┬───────────────┬─────────┘
                       │ gRPC         │ gRPC
             ┌─────────▼───────┐  ┌───▼─────────────┐
             │  auth-service   │  │  user-service   │
             │  PDP :50050     │  │  данные :50051  │
             │  REST :3001     │  └─────────────────┘
             └─────────────────┘
```

### Внутренний транспорт

- **Frontend → BFF**: HTTP (REST), CORS включён в BFF. Все вызовы идут через `http://localhost:3000`.
- **BFF → auth-service (PDP)**: gRPC `pdp.PDPService.CheckAccess` — proto: `auth-service/src/proto/pdp.proto`.
- **BFF → user-service**: gRPC `user.UserService.GetUsers` — proto: `user-service/src/proto/user.proto`.
- **BFF → auth-service (обновление политик)**: HTTP REST, `POST http://auth-service:3001/policies`.
- **auth-service → user-service**: нет прямых связей — атрибуты субъекта (role, department) приходят в запросе как JWT-claims.

## Эндпоинты

### BFF (:3000) — единая точка входа для фронтенда

| Метод / путь | Описание |
|--------------|----------|
| `POST /auth/login` | Логин: `{ username, password }` → возвращает JWT |
| `GET /users` | Список пользователей — RBAC: требуется разрешение `user:read` |
| `GET /documents/:id` | Документ — ABAC: требуется совпадение отдела субъекта и ресурса |
| `POST /auth/policies` | Прокси добавления ABAC-правила «на лету» → auth-service |

### auth-service REST (:3001) — внутренний API сервиса

| Метод / путь | Описание |
|--------------|----------|
| `POST /auth/login` | Выпуск JWT (используется BFF, для пользователя прозрачно) |
| `GET /policies` | Текущая RBAC-матрица и ABAC-правила |
| `POST /policies` | Добавить ABAC-правило динамически (демо «горячего» обновления) |

### auth-service gRPC (:50050)

| Сервис / метод | Описание |
|----------------|----------|
| `pdp.PDPService.CheckAccess` | Решение по доступу: `{ allowed, reason }` |

### user-service

| Транспорт | Метод | Описание |
|-----------|-------|----------|
| gRPC (:50051) | `user.UserService.GetUsers` | Список пользователей |
| REST (:3002) | `GET /users` | Список пользователей (для отладки) |

## Модель политик

- **RBAC-часть**: статическая матрица «роль → набор разрешений» (`policy.service.ts`).
  Пример: `admin → user:read, user:write, document:read, ...`, `user → order:read`.
- **ABAC-часть**: массив правил вида `{ action, rule }`, где `rule` — функция над субъектом (claims) и ресурсом. Демонстрационное правило: `document:read` разрешён, если `subject.department == resource.department`.

Добавление правила через `POST /auth/policies` срабатывает **без передеплоя** — это ключевой момент live-демо.

## Быстрый старт

Требования: Docker + Docker Compose.

```bash
cd services
docker compose up --build
```

После запуска:

- Фронтенд: http://localhost:4200
- BFF: http://localhost:3000
- Данные генерируются при старте in-memory (перезапуск контейнера сбрасывает состояние).

Отключить всё:

```bash
docker compose down
```

## Тестовые учётные записи

Логин = пароль (для удобства демонстрации):

| Username | Роль | Отдел | Что может |
|----------|------|-------|-----------|
| `admin` | admin | it | всё: пользователи, заказы, документы |
| `manager` | manager | it | пользователи, заказы, документы |
| `ivan` | finance | finance | документы своего отдела (+ role `finance` имеет `document:read`) |
| `maria` | user | sales | только чтение заказов (`order:read`) |

Все учётки: username / password — одинаковые, например `admin` / `admin`.

## Тестовые сценарии (для видео)

Выполняются через фронтенд http://localhost:4200 (эндпоинты BFF):

1. **RBAC**: login `admin` → «Запросить список пользователей» → **200**; login `maria` → та же операция → **403**.
2. **ABAC**: `ivan` (finance) открывает документ отдела sales → **403**; документ отдела finance → **200**.
3. **Динамика политик**: кнопка «Добавить правило» (`POST /auth/policies`) → `manager` получает документ sales **без передеплоя**.

Альтернатива ручных запросов — Insomnia/Postman: эндпоинты BFF указаны выше, ответы идентичны.

## Структура репозитория

```
services/
├── docker-compose.yml      # оркестрация всех контейнеров
├── TZ.md                   # техническое задание
├── auth-service/           # JWT + PDP (RBAC/ABAC), NestJS
│   └── src/proto/pdp.proto # gRPC-контракт PDP
├── user-service/           # пользователи и атрибуты, NestJS
│   └── src/proto/user.proto
├── bff/                    # PEP: единая точка входа, NestJS
└── frontend/               # Angular 22 SPA (nginx, порт 4200)
```

## Стек

- Node.js 22, NestJS 10, TypeScript.
- Angular 22 (SPA, раздаётся nginx в отдельном контейнере).
- `@nestjs/microservices` + `@grpc/grpc-js` — gRPC между сервисами.
- `jsonwebtoken` — выпуск и проверка JWT.
- Docker Compose — локальная оркестрация; данные in-memory (без СУБД).

## Ссылки

- Проект: SkillUp «Аутентификация и авторизация в микросервисах»
- Telegram-канал: https://t.me/skillup_code