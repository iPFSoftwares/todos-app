import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const base = process.env.SMOKE_API_URL || 'http://localhost:8080';
const mode = process.argv[2] || 'local';
const email = `smoke-${randomUUID()}@example.com`;
const password = randomUUID();
let cookie = '';

async function request(path, status, body, method = 'GET', session = cookie) {
  const response = await fetch(`${base}/api/v1${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Cookie: session },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10000)
  });
  assert.equal(response.status, status, `${method} ${path}`);
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  return status === 204 ? undefined : response.json();
}

await request('/todos', 401);
await request('/auth/register', 201, { email, password }, 'POST');
await request('/auth/logout', 204, undefined, 'POST');
await request('/todos', 401);
await request('/auth/login', 401, { email, password: 'wrong' }, 'POST');
await request('/auth/login', 200, { email, password }, 'POST');
assert.equal((await request('/auth/me', 200)).email, email);
await request('/todos', 400, { title: ' ' }, 'POST');
const todo = await request('/todos', 201, { title: `${mode} smoke todo` }, 'POST');
assert.equal(todo.status, 'in_progress');
assert.ok((await request('/todos', 200)).some(item => item.id === todo.id));
assert.equal((await request(`/todos/${todo.id}`, 200)).title, todo.title);
assert.equal((await request(`/todos/${todo.id}`, 200, { status: 'completed' }, 'PATCH')).status, 'completed');
const ownerCookie = cookie;
await request('/auth/register', 201, { email: `other-${email}`, password }, 'POST', '');
assert.deepEqual(await request('/todos', 200), []);
await request(`/todos/${todo.id}`, 404);
await request(`/todos/${todo.id}`, 404, { title: 'foreign edit' }, 'PATCH');
await request(`/todos/${todo.id}`, 404, undefined, 'DELETE');
cookie = ownerCookie;
await request(`/todos/${todo.id}`, 204, undefined, 'DELETE');
await request(`/todos/${todo.id}`, 404);
await request('/auth/logout', 204, undefined, 'POST');
await request('/auth/me', 401);
console.log(`${mode}: PASS login, cookies, validation, CRUD, isolation, logout (${base})`);
