import { NextResponse } from "next/server";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join, resolve, basename } from "path";

interface PinnedDir {
  path: string;
  alias: string;
  topped?: boolean;
}

function configPath(): string {
  const dir = process.env.PI_CODING_AGENT_DIR || join(homedir(), ".pi", "agent");
  return join(dir, "pi-web-dirs.json");
}

function readPinnedDirs(): PinnedDir[] {
  const file = configPath();
  if (!existsSync(file)) return [];
  try {
    const raw = readFileSync(file, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Migrate old format (string[]) to new format ({ path, alias, topped }[])
      const migrated = parsed.map((entry: unknown): PinnedDir | null => {
        if (typeof entry === "string") {
          return { path: entry, alias: basename(entry) };
        }
        if (typeof entry === "object" && entry !== null) {
          const e = entry as Record<string, unknown>;
          if (typeof e.path === "string") {
            return {
              path: e.path,
              alias: typeof e.alias === "string" ? e.alias : basename(e.path),
              topped: typeof e.topped === "boolean" ? e.topped : undefined,
            };
          }
        }
        return null;
      }).filter((d): d is PinnedDir => d !== null);
      // Deduplicate by path
      const seen = new Set<string>();
      const deduped = migrated.filter((d) => {
        if (seen.has(d.path)) return false;
        seen.add(d.path);
        return true;
      });
      // If format changed, write back
      if (deduped.length !== parsed.length || (parsed.length > 0 && typeof parsed[0] === "string")) {
        writePinnedDirs(deduped);
      }
      return deduped;
    }
    return [];
  } catch {
    return [];
  }
}

function writePinnedDirs(dirs: PinnedDir[]): void {
  const file = configPath();
  const dir = file.substring(0, file.lastIndexOf("/"));
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(file, JSON.stringify(dirs, null, 2), "utf-8");
}

// GET /api/pinned-dirs — returns the list of pinned directories
export async function GET() {
  try {
    const dirs = readPinnedDirs();
    return NextResponse.json({ dirs });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// POST /api/pinned-dirs — add or update a pinned directory
// Body: { cwd: string, alias?: string, topped?: boolean }
// If cwd already exists, updates its alias. Otherwise adds a new entry.
export async function POST(req: Request) {
  try {
    const body = await req.json() as { cwd?: unknown; alias?: unknown; topped?: unknown };
    const cwd = typeof body.cwd === "string" ? body.cwd.trim() : "";
    if (!cwd) {
      return NextResponse.json({ error: "cwd is required" }, { status: 400 });
    }
    const resolved = resolve(cwd);
    const alias = typeof body.alias === "string" && body.alias.trim()
      ? body.alias.trim()
      : basename(resolved);
    const topped = typeof body.topped === "boolean" ? body.topped : undefined;

    let dirs = readPinnedDirs();
    const existingIndex = dirs.findIndex((d) => d.path === resolved);
    if (existingIndex >= 0) {
      // Update alias and topped
      dirs[existingIndex] = { ...dirs[existingIndex], alias };
      if (topped !== undefined) {
        dirs[existingIndex].topped = topped;
      }
    } else {
      dirs.push({ path: resolved, alias, topped });
    }
    writePinnedDirs(dirs);
    return NextResponse.json({ success: true, dirs });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// PATCH /api/pinned-dirs — toggle topped status (only one can be topped)
// Body: { cwd: string, topped: boolean }
export async function PATCH(req: Request) {
  try {
    const body = await req.json() as { cwd?: unknown; topped?: unknown };
    const cwd = typeof body.cwd === "string" ? body.cwd.trim() : "";
    if (!cwd) {
      return NextResponse.json({ error: "cwd is required" }, { status: 400 });
    }
    const resolved = resolve(cwd);
    const topped = typeof body.topped === "boolean" ? body.topped : false;

    let dirs = readPinnedDirs();
    if (topped) {
      // Only one can be topped — clear all, then set this one
      dirs = dirs.map((d) => ({ ...d, topped: d.path === resolved }));
    } else {
      // Un-topped this one
      dirs = dirs.map((d) => d.path === resolved ? { ...d, topped: false } : d);
    }
    writePinnedDirs(dirs);
    return NextResponse.json({ success: true, dirs });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// DELETE /api/pinned-dirs — remove a directory from pinned list
// Body: { cwd: string }
export async function DELETE(req: Request) {
  try {
    const body = await req.json() as { cwd?: unknown };
    const cwd = typeof body.cwd === "string" ? body.cwd.trim() : "";
    if (!cwd) {
      return NextResponse.json({ error: "cwd is required" }, { status: 400 });
    }
    const resolved = resolve(cwd);
    const dirs = readPinnedDirs().filter((d) => d.path !== resolved);
    writePinnedDirs(dirs);
    return NextResponse.json({ success: true, dirs });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
