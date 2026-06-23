/**
 * Lightweight SQLite-backed job store. Avoids a Redis dependency on the
 * operator machine; swap for BullMQ + Redis when output exceeds one machine.
 */
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

import Database from "better-sqlite3";

import { OUTPUT_DIR } from "./paths.js";

export type JobStatus = "queued" | "running" | "done" | "error";

export interface JobRow {
  id: string;
  recipe: string;
  templateId: string;
  status: JobStatus;
  total: number;
  done: number;
  outputDir: string;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

const DB_PATH = join(OUTPUT_DIR, ".jobs", "genposter.db");

export class JobStore {
  private db: Database.Database;

  constructor(path: string = DB_PATH) {
    mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        recipe TEXT,
        templateId TEXT,
        status TEXT,
        total INTEGER DEFAULT 0,
        done INTEGER DEFAULT 0,
        outputDir TEXT,
        error TEXT,
        createdAt TEXT,
        updatedAt TEXT
      );
      CREATE TABLE IF NOT EXISTS job_items (
        jobId TEXT,
        idx INTEGER,
        file TEXT,
        createdAt TEXT
      );
      CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        name TEXT,
        archetype TEXT,
        version INTEGER DEFAULT 1,
        updatedAt TEXT
      );
    `);
  }

  create(job: { id: string; recipe: string; templateId: string; total: number; outputDir: string }): void {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO jobs (id, recipe, templateId, status, total, done, outputDir, error, createdAt, updatedAt)
         VALUES (@id, @recipe, @templateId, 'queued', @total, 0, @outputDir, NULL, @now, @now)`,
      )
      .run({ ...job, now });
  }

  setStatus(id: string, status: JobStatus, error?: string): void {
    this.db
      .prepare(`UPDATE jobs SET status=@status, error=@error, updatedAt=@now WHERE id=@id`)
      .run({ id, status, error: error ?? null, now: new Date().toISOString() });
  }

  addItem(id: string, idx: number, file: string): void {
    const now = new Date().toISOString();
    this.db
      .prepare(`INSERT INTO job_items (jobId, idx, file, createdAt) VALUES (?, ?, ?, ?)`)
      .run(id, idx, file, now);
    this.db.prepare(`UPDATE jobs SET done=done+1, updatedAt=? WHERE id=?`).run(now, id);
  }

  get(id: string): JobRow | undefined {
    return this.db.prepare(`SELECT * FROM jobs WHERE id=?`).get(id) as JobRow | undefined;
  }

  list(limit = 50): JobRow[] {
    return this.db
      .prepare(`SELECT * FROM jobs ORDER BY createdAt DESC LIMIT ?`)
      .all(limit) as JobRow[];
  }

  items(id: string): { idx: number; file: string }[] {
    return this.db
      .prepare(`SELECT idx, file FROM job_items WHERE jobId=? ORDER BY idx`)
      .all(id) as { idx: number; file: string }[];
  }

  upsertTemplate(t: { id: string; name?: string; archetype?: string; version?: number }): void {
    this.db
      .prepare(
        `INSERT INTO templates (id, name, archetype, version, updatedAt)
         VALUES (@id, @name, @archetype, @version, @now)
         ON CONFLICT(id) DO UPDATE SET name=@name, archetype=@archetype, version=@version, updatedAt=@now`,
      )
      .run({
        id: t.id,
        name: t.name ?? null,
        archetype: t.archetype ?? null,
        version: t.version ?? 1,
        now: new Date().toISOString(),
      });
  }
}
