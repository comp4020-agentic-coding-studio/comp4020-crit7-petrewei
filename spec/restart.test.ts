import { type ChildProcess, spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync } from "node:fs";
import { type AddressInfo, createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { LAB, page, record } from "./app";

// Fly keeps the database on a volume, so every restart and deploy boots the
// app against data that is already there. The shared test server always gets a
// fresh database, so this boots the built server twice on one database file and
// checks that the second boot keeps a recorded allocation and neither
// duplicates nor loses the seeded groups.
let server: ChildProcess | undefined;

const stop = async () => {
  if (server && server.exitCode === null) {
    server.kill();
    await once(server, "exit");
  }
  server = undefined;
};

afterEach(stop);

const freePort = () =>
  new Promise<number>((resolve) => {
    const probe = createServer();
    probe.listen(0, () => {
      const { port } = probe.address() as AddressInfo;
      probe.close(() => resolve(port));
    });
  });

const boot = async (databasePath: string): Promise<string> => {
  const port = await freePort();
  server = spawn("node", ["./dist/server/entry.mjs"], {
    env: { ...process.env, HOST: "127.0.0.1", PORT: String(port), DATABASE_PATH: databasePath },
    stdio: "ignore",
  });
  const baseUrl = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      if ((await fetch(baseUrl)).ok) return baseUrl;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`server did not come up at ${baseUrl}`);
};

const groupsOnPage = async (baseUrl: string): Promise<string[]> =>
  [...(await page("/", baseUrl)).querySelectorAll("[data-group]")].map(
    (el) => `${el.getAttribute("data-group")}${el.hasAttribute("data-allocated") ? " allocated" : ""}`,
  );

it("keeps the seeded groups and a recorded allocation across a restart", async () => {
  const databasePath = join(mkdtempSync(join(tmpdir(), "restart-db-")), "app.db");

  const baseUrl = await boot(databasePath);
  // A fresh database shows the allocation copied from MyTimetable.
  expect(await groupsOnPage(baseUrl)).toContain(`${LAB}-04 allocated`);
  await record(LAB, "02", baseUrl);
  const first = await groupsOnPage(baseUrl);
  expect(first).toContain(`${LAB}-02 allocated`);
  expect(first).toContain(`${LAB}-04`);
  await stop();

  const second = await groupsOnPage(await boot(databasePath));
  expect(second).toEqual(first);
}, 30_000);
