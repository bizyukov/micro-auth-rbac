# ТЗ на демонстрационные сервисы

**Проект:** micro-auth-rbac
**Назначение:** live-демонстрация централизованной авторизации (RBAC + ABAC) для видео.

## Состав и порты

| Сервис | Назначение | REST | gRPC | Web |
|--------|-----------|------|------|-----|
| auth-service | JWT-выпуск + PDP: роли, политики (RBAC+ABAC) | 3001 | 50050 | — |
| user-service | Пользователи и их атрибуты (отдел, роль) | 3002 | 50051 | — |
| bff | BFF (PEP): единственная точка входа | 3000 | — | — |
| frontend | Angular 22 SPA: UI для live-демо | — | — | 4200 (nginx) |

## Внутренний транспорт

- Frontend → BFF: HTTP (CORS включён в BFF), все вызовы идут через `http://localhost:3000`.
- BFF → auth-service: gRPC `pdp.PDPService.CheckAccess` (proto в `auth-service/src/proto/pdp.proto`)
- BFF → user-service: gRPC `user.UserService.GetUsers` (proto в `user-service/src/proto/user.proto`)
- BFF → auth-service (прокси политик): HTTP REST, `POST http://auth-service:3001/policies`.
- auth-service → user-service: отсутствует (атрибуты субъекта приходят в запросе как claims).

## Эндпоинты BFF (:3000)

| Метод/путь | Описание | Пример |
|-----------|----------|--------|
| POST /auth/login | Логин, возвращает JWT | body: { username, password } |
| GET /users | Список пользователей (RBAC: user:read) | header: Authorization: Bearer |
| GET /documents/:id | Документ (ABAC: отдел) | header: Authorization: Bearer |
| POST /auth/policies | Прокси обновления ABAC-политики → auth-service | body: { action, description, role } |

## Эндпоинты auth-service REST (:3001)

| Метод/путь | Описание |
|-----------|----------|
| POST /auth/login | Выпуск JWT (используется BFF, прозрачно для пользователя) |
| GET /policies | Список политик |
| POST /policies/:action | Обновить политику «на лету» (демо ABAC) |

## Модель политик

- **RBAC-часть:** static-матрица `role → permissions[]`.
- **ABAC-часть:** массив правил вида `{ action, rule }`, где rule — функция над
  субъектом (claims) и ресурсом (атрибуты). Демонстрационное правило:
  `document:read`: разрешено, если `subject.department == resource.department`
  ИЛИ `subject.role == 'manager'`.

## Данные (in-memory, генерируются при старте)

### user-service
- 6 пользователей: admin, manager, ivan_finance (finance), maria_sales (sales),
  petr_dev (it), olga_support (support).
- Поля: id, username, fullName, department, role.

### auth-service
- Учётные записи для логина (username/password).
- JWT claims: sub, username, role, department.

## Тестовые сценарии (для видео, выполняются через фронт http://localhost:4200)

1. **RBAC:** login admin → кнопка «Запросить список пользователей» 200; login maria → то же 403.
2. **ABAC:** ivan (finance) кликает документ sales → 403; документ finance → 200.
3. **Динамика политик:** кнопка «Добавить правило» (POST /auth/policies) → manager
   получает документ sales без передеплоя.

Альтернатива ручных запросов — Insomnia (эндпоинты BFF выше, ответы идентичны).

## Стек

- Node.js 22, NestJS 10, TypeScript.
- Angular 22 (frontend SPA, отдельный Docker-контейнер, раздаётся nginx).
- @nestjs/microservices + @grpc/grpc-js для gRPC.
- Все сервисы в Docker Compose, данные in-memory.