import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Client } from "pg";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel max

function escapeValue(val: unknown): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  if (typeof val === "number") return String(val);
  if (val instanceof Date) return `'${val.toISOString()}'`;
  if (typeof val === "object") {
    // JSON fields
    const str = JSON.stringify(val).replace(/'/g, "''");
    return `'${str}'`;
  }
  // String — escape single quotes
  const str = String(val).replace(/'/g, "''");
  return `'${str}'`;
}

function escapeIdentifier(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  try {
    // ── Auth guard: super admin only ────────────────────────────────────────
    const session = await auth();
    const isSuperAdmin = (session?.user as any)?.isSuperAdmin;
    if (!isSuperAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Resolve target DB ───────────────────────────────────────────────────
    const { searchParams } = new URL(req.url);
    const target = searchParams.get("target") ?? "local";

    let connectionString: string | undefined;
    if (target === "prod") {
      // Use DIRECT_URL for production (bypasses PgBouncer for raw queries)
      connectionString =
        process.env.DIRECT_URL || process.env.DATABASE_URL;
    } else {
      connectionString = process.env.DATABASE_URL;
    }

    if (!connectionString) {
      return NextResponse.json(
        { error: "Database connection string not configured" },
        { status: 500 }
      );
    }

    // ── Connect ─────────────────────────────────────────────────────────────
    const client = new Client({ connectionString });
    await client.connect();

    try {
      // ── Discover public tables (exclude Prisma migrations) ───────────────
      const tablesRes = await client.query<{ table_name: string }>(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
          AND table_name != '_prisma_migrations'
        ORDER BY table_name
      `);

      const tables = tablesRes.rows.map((r) => r.table_name);

      // ── Build SQL dump ───────────────────────────────────────────────────
      const timestamp = new Date().toISOString();
      const lines: string[] = [
        `-- ============================================================`,
        `-- Database Backup`,
        `-- Target   : ${target === "prod" ? "Production (Supabase)" : "Local PostgreSQL"}`,
        `-- Generated: ${timestamp}`,
        `-- Tables   : ${tables.length}`,
        `-- ============================================================`,
        ``,
        `SET client_encoding = 'UTF8';`,
        `SET standard_conforming_strings = on;`,
        ``,
      ];

      for (const tableName of tables) {
        const quoted = escapeIdentifier(tableName);

        // Column definitions for CREATE TABLE
        const colsRes = await client.query<{
          column_name: string;
          data_type: string;
          is_nullable: string;
          column_default: string | null;
          character_maximum_length: number | null;
        }>(`
          SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1
          ORDER BY ordinal_position
        `, [tableName]);

        lines.push(`-- ── Table: ${tableName} ──────────────────────────────────────────`);
        lines.push(`TRUNCATE TABLE ${quoted} CASCADE;`);
        lines.push(``);

        // ── Fetch all rows ─────────────────────────────────────────────────
        const rowsRes = await client.query(`SELECT * FROM ${quoted}`);

        if (rowsRes.rows.length === 0) {
          lines.push(`-- (no rows)`);
          lines.push(``);
          continue;
        }

        const columnNames = rowsRes.fields.map((f) => escapeIdentifier(f.name));
        const colList = columnNames.join(", ");

        // Batch inserts in groups of 500
        const BATCH = 500;
        for (let i = 0; i < rowsRes.rows.length; i += BATCH) {
          const batch = rowsRes.rows.slice(i, i + BATCH);
          const valuesList = batch.map((row) => {
            const vals = rowsRes.fields.map((f) => escapeValue(row[f.name]));
            return `  (${vals.join(", ")})`;
          });
          lines.push(
            `INSERT INTO ${quoted} (${colList}) VALUES\n${valuesList.join(",\n")}\nON CONFLICT DO NOTHING;`
          );
        }

        lines.push(``);
      }

      lines.push(`-- ── End of backup ──────────────────────────────────────────────────`);

      const sql = lines.join("\n");

      // ── Stream as downloadable file ──────────────────────────────────────
      const dateStr = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, 19);
      const filename = `backup_${target}_${dateStr}.sql`;

      return new NextResponse(sql, {
        status: 200,
        headers: {
          "Content-Type": "application/sql",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
        },
      });
    } finally {
      await client.end();
    }
  } catch (error: any) {
    console.error("[BACKUP_GET]", error);
    return NextResponse.json(
      { error: error.message || "Backup failed" },
      { status: 500 }
    );
  }
}
