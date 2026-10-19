import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createUpdateTaskHandler } from '../src/controllers/task.controller.js';

const makeResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(value) {
    this.body = value;
    return this;
  },
});

const completedTask = {
  id: 'task-1',
  projectId: 'project-1',
  title: 'Ship the prototype',
  description: 'First version',
  status: 'done',
  column: 'Done',
  completedAt: new Date('2026-10-01T00:00:00.000Z'),
  assigneeId: null,
  project: { id: 'project-1', ownerId: 'owner-1' },
};

const makeDb = (foundTask) => {
  const calls = { findFirst: [], update: [] };
  const db = {
    task: {
      async findFirst(args) {
        calls.findFirst.push(args);
        return foundTask;
      },
      async update(args) {
        calls.update.push(args);
        return { ...foundTask, ...args.data };
      },
    },
    activity: { async create() { return {}; } },
    notification: { async create() { return {}; } },
    projectMember: { async findUnique() { return null; } },
  };
  return { db, calls };
};

test('editing a completed task preserves completion time', async () => {
  const { db, calls } = makeDb(completedTask);

  const response = makeResponse();
  await createUpdateTaskHandler(db)({
    params: { id: completedTask.id },
    user: { id: 'owner-1' },
    body: { description: 'Ready for demo' },
  }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.description, 'Ready for demo');
  assert.equal(calls.update[0].data.completedAt, undefined);
  assert.equal(calls.update[0].data.status, undefined);
});

test('moving a completed task back to work clears completion time and aligns its column', async () => {
  const { db } = makeDb(completedTask);

  const response = makeResponse();
  await createUpdateTaskHandler(db)({
    params: { id: completedTask.id },
    user: { id: 'owner-1' },
    body: { status: 'in_progress' },
  }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.status, 'in_progress');
  assert.equal(response.body.column, 'In Progress');
  assert.equal(response.body.completedAt, null);
});

test('task updates only query projects where the user can write', async () => {
  const { db, calls } = makeDb(null);

  const response = makeResponse();
  await createUpdateTaskHandler(db)({
    params: { id: completedTask.id },
    user: { id: 'viewer-1' },
    body: { title: 'Not allowed' },
  }, response);

  assert.equal(response.statusCode, 404);
  const access = calls.findFirst[0].where.project;
  assert.deepEqual(access.OR[1].members.some.role.in, ['owner', 'admin', 'member']);
});

test('a task cannot be assigned to someone outside the project', async () => {
  const { db, calls } = makeDb(completedTask);
  const response = makeResponse();
  await createUpdateTaskHandler(db)({
    params: { id: completedTask.id },
    user: { id: 'owner-1' },
    body: { assigneeId: 'outsider-1' },
  }, response);

  assert.equal(response.statusCode, 400);
  assert.match(response.body.error, /project teammate/);
  assert.equal(calls.update.length, 0);
});
