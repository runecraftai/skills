---
name: typescript-patterns
description: >
  TypeScript best practices and patterns for type-safe, maintainable code.
  Covers discriminated unions, generics, const assertions, type narrowing,
  and common anti-patterns. Extends (does not override) project tsconfig.
  EN triggers: /typescript, TypeScript patterns, TS best practices, type safety, discriminated unions, generics, type narrowing.
  PT triggers: /typescript, padrões TypeScript, boas práticas TS, segurança de tipos, unions discriminadas, genéricos.
  Do NOT use for: JavaScript-only projects, runtime performance, or replacing project tsconfig rules.
license: CC-BY-4.0
---

# TypeScript Patterns

## Overview

This skill provides TypeScript patterns that produce type-safe, maintainable code. It extends your project's tsconfig — not overrides it. When in conflict, the project tsconfig wins.

All patterns assume strict mode is enabled (`strict: true` in tsconfig) and that `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and other strict-family flags are on when available. The patterns work with the strictest reasonable settings — they never rely on lax compiler options.

## When to Use

- Writing new TypeScript code
- Refactoring existing code for stronger type safety
- Reviewing code for type-level issues
- Eliminating `any` and `as` casts from a codebase
- Designing shared types, APIs, or generic utilities
- Deciding between structurally equivalent alternatives (union vs enum, optional vs `| undefined`)

## Core Patterns

### 1. Discriminated Unions

Use a `kind` (or `type`) field to create a union that the compiler can exhaustively narrow.

```typescript
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'rectangle'; width: number; height: number }
  | { kind: 'triangle'; base: number; height: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2;
    case 'rectangle':
      return shape.width * shape.height;
    case 'triangle':
      return (shape.base * shape.height) / 2;
  }
}
```

**Exhaustiveness check** — add a `never`-asserting helper so adding a new variant produces a compile error, not a silent fallthrough:

```typescript
function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
}

function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2;
    case 'rectangle':
      return shape.width * shape.height;
    case 'triangle':
      return (shape.base * shape.height) / 2;
    default:
      return assertNever(shape);
  }
}
```

Prefer string literal unions over boolean flags for mutually exclusive states. `{ status: 'loading' } | { status: 'success'; data: T } | { status: 'error'; error: Error }` is clearer than `{ loading: boolean; data?: T; error?: Error }` and eliminates impossible states.

### 2. Generics with Constraints

Always constrain generic parameters to the shape you actually depend on. A bare `<T>` gives no information to the caller or the compiler.

```typescript
// BAD: T could be anything — no way to access .id
function first<T>(items: T[]): T {
  return items[0];
}

// GOOD: constraint communicates intent and enables property access
function first<T extends { id: string }>(items: T[]): T {
  return items[0];
}
```

Keep generics shallow. If you need four or more type parameters, reconsider the abstraction — it may be too general or the responsibilities should be split.

```typescript
// BAD: too many unconstrained params
function map<S, T, U, V>(a: S[], b: T[], fn: (a: S, b: T) => [U, V]): [U[], V[]] { /* ... */ }

// GOOD: compose simpler functions instead
```

Use `extends` to narrow, `infer` to extract (in conditional types), and defaults (`<T = unknown>`) to make call sites ergonomic.

### 3. Const Assertions

`as const` tells the compiler to infer the narrowest possible type — literal values and `readonly` tuples/objects.

```typescript
// Without as const: widened to string[]
const COLORS = ['red', 'green', 'blue'];
// type: string[]

// With as const: narrowed to readonly tuple of literals
const COLORS = ['red', 'green', 'blue'] as const;
// type: readonly ["red", "green", "blue"]

type Color = (typeof COLORS)[number];
// type Color = "red" | "green" | "blue"
```

Use `as const` for:
- Enumerations (prefer over `enum`)
- Configuration objects that drive conditional types
- Literal-tuple derived union types
- `const` objects used as lookup tables

```typescript
const STATUS_MAP = {
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived',
} as const;

type Status = keyof typeof STATUS_MAP; // "draft" | "published" | "archived"
```

### 4. Type Narrowing

Narrow types explicitly. The compiler can follow `typeof`, `instanceof`, `in`, and custom type guards — use them instead of casting.

```typescript
function process(input: string | number | Date) {
  if (typeof input === 'string') {
    return input.toUpperCase();       // input: string
  }
  if (typeof input === 'number') {
    return input.toFixed(2);          // input: number
  }
  return input.toISOString();         // input: Date (by elimination)
}
```

**Custom type guards** make complex narrowing reusable:

```typescript
function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'email' in obj
  );
}

function process(input: unknown) {
  if (isUser(input)) {
    console.log(input.email); // input: User
  }
}
```

**`in` operator** for discriminated properties when you don't control the union:

```typescript
type Response = SuccessResponse | ErrorResponse;

if ('data' in response) {
  console.log(response.data); // response: SuccessResponse
}
```

Use `unknown` at system boundaries (API responses, parsed JSON, message queues). Narrow to a known type before use — never cast.

```typescript
function parseApiResponse(raw: unknown): User[] {
  if (!Array.isArray(raw)) throw new Error('Expected array');
  return raw.map((item) => {
    if (!isUser(item)) throw new Error('Invalid user shape');
    return item; // item: User
  });
}
```

### 5. Template Literal Types

Use template literal types for string pattern matching — route params, event names, CSS-in-JS, and more.

```typescript
type EventName = `${string}:${string}`;
// "click:button", "key:enter", "submit:form"

type CSSUnit = `${number}${'px' | 'rem' | 'em' | '%'}`;
// "16px", "1.5rem", "80%"

type RouteParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? Param | RouteParams<Rest>
    : T extends `${string}:${infer Param}`
      ? Param
      : never;

type Params = RouteParams<'/users/:userId/posts/:postId'>;
// "userId" | "postId"
```

Combine with `Capitalize`, `Uncapitalize`, `Uppercase`, and `Lowercase` intrinsic types for string transformation:

```typescript
type Getters<T extends string> = `get${Capitalize<T>}`;
type UserGetters = Getters<'name' | 'email'>; // "getName" | "getEmail"
```

### 6. Utility Types

Know the standard library before writing custom mapped types.

| Utility | Use when |
|---------|----------|
| `Partial<T>` | All properties optional — e.g., update DTOs |
| `Required<T>` | All properties required — remove optionality |
| `Pick<T, K>` | Select a subset of keys — API response shaping |
| `Omit<T, K>` | Exclude specific keys — public vs internal types |
| `Record<K, V>` | Map a union of keys to a single value type |
| `Readonly<T>` | Prevent mutation — function parameters, config |
| `NonNullable<T>` | Strip `null` and `undefined` from a union |
| `ReturnType<T>` | Extract the return type of a function type |
| `Awaited<T>` | Unwrap a Promise type recursively |

```typescript
interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

type PublicUser = Omit<User, 'passwordHash'>;
type UpdateUserDTO = Partial<Pick<User, 'email'>>;

type Status = 'active' | 'inactive';
const statusLabels: Record<Status, string> = {
  active: 'Active',
  inactive: 'Inactive',
};
```

## Anti-Patterns to Avoid

### `any` — Use `unknown` Then Narrow

`any` disables type checking entirely. Use `unknown` at boundaries and narrow before use.

```typescript
// BAD
function handle(data: any) {
  console.log(data.email); // no error, no safety
}

// GOOD
function handle(data: unknown) {
  if (isUser(data)) {
    console.log(data.email); // safe
  }
}
```

### Type Assertions (`as Type`) — Prefer Type Guards

Assertions silence the compiler but don't validate at runtime. A type guard narrows through actual checks.

```typescript
// BAD: assertion — no runtime check
const user = response.data as User;

// GOOD: type guard — validates at runtime
if (!isUser(response.data)) throw new Error('Unexpected shape');
const user = response.data; // user: User
```

The one acceptable use of `as` is `as const` for literal inference (see Core Pattern 3).

### Overly Complex Generics

If a generic has four or more type parameters, or if the conditional types are three levels deep, it's probably over-designed. Prefer simpler, more concrete types unless the abstraction pays for itself across at least three call sites.

### `enum` — Prefer `as const` Objects or String Literal Unions

TypeScript's `enum` is a runtime construct with surprising behavior (reverse mapping, numeric auto-increment, const-enum pitfalls). String literal unions and `as const` objects are simpler and more predictable.

```typescript
// BAD: enum
enum Status {
  Active = 'active',
  Inactive = 'inactive',
}

// GOOD: string literal union
type Status = 'active' | 'inactive';

// GOOD: as const object (when you need runtime access to values)
const Status = {
  Active: 'active',
  Inactive: 'inactive',
} as const;
type Status = (typeof Status)[keyof typeof Status];
```

### Optional Chaining Abuse

`?.` everywhere makes error sources invisible. Use it intentionally at boundaries where `null`/`undefined` is expected, and prefer early returns with explicit null checks inside function bodies.

```typescript
// BAD: silent failure — if anything is missing, result is undefined with no trace
const result = data?.nested?.deeply?.value?.toString()?.toUpperCase();

// GOOD: explicit null checks with clear error boundaries
function format(data: Data): string {
  if (!data.nested?.deeply?.value) {
    throw new Error('Missing deeply nested value');
  }
  return data.nested.deeply.value.toString().toUpperCase();
}
```

## Verification

After applying TypeScript patterns to new or refactored code:

- [ ] Zero `any` in new code (or every `any` is justified by a comment explaining why `unknown`+narrowing wasn't feasible)
- [ ] Type assertions (`as Type`) are replaced by type guards or explicit validation
- [ ] Discriminated unions have an exhaustiveness check (`assertNever` in `default` branch)
- [ ] Generics have meaningful constraints (`extends ...`) — no bare `<T>`
- [ ] `enum` declarations are avoided in favor of string unions or `as const` objects
- [ ] `unknown` is used at system boundaries (API responses, parsed JSON, message queues) and narrowed before use
- [ ] Optional chaining is used intentionally at boundaries, not as a blanket pattern throughout functions
- [ ] The code compiles with `strict: true` and no `@ts-ignore` or `@ts-expect-error` suppression comments
