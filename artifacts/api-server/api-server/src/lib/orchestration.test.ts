import assert from "node:assert/strict";
import test from "node:test";
import { buildTasks } from "./demo-state";

test("approval graph has valid dependency references and remains acyclic", () => {
  const tasks = buildTasks("approval");
  const ids = new Set(tasks.map((task) => task.id));
  for (const task of tasks) {
    for (const dependency of task.dependencies) {
      assert.ok(ids.has(dependency), `${task.id} depends on unknown ${dependency}`);
    }
  }

  const visited = new Set<string>();
  const active = new Set<string>();
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const visit = (id: string) => {
    assert.ok(!active.has(id), `cycle detected at ${id}`);
    if (visited.has(id)) return;
    active.add(id);
    for (const dependency of byId.get(id)?.dependencies ?? []) visit(dependency);
    active.delete(id);
    visited.add(id);
  };
  for (const task of tasks) visit(task.id);
  assert.equal(visited.size, tasks.length);
});

test("parallel implementation paths synchronize before security", () => {
  const tasks = buildTasks("approval");
  const security = tasks.find((task) => task.id === "security");
  assert.deepEqual(security?.dependencies.sort(), [
    "implement-api",
    "implement-tests",
  ]);
  assert.equal(
    tasks.find((task) => task.id === "implement-api")?.status,
    "queued",
  );
  assert.equal(
    tasks.find((task) => task.id === "implement-tests")?.status,
    "queued",
  );
});

test("completed graph passes all gates", () => {
  const tasks = buildTasks("completed");
  assert.equal(tasks.every((task) => task.status === "completed" || task.status === "approved"), true);
  assert.equal(tasks.find((task) => task.id === "approval")?.status, "approved");
});