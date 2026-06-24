import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join, basename, extname } from "path";
import { execSync } from "child_process";
import { homedir } from "os";

// Maximum file size: 200MB
const MAX_SIZE = 200 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const cwd = formData.get("cwd")?.toString();
    const files = formData.getAll("files") as File[];

    if (!cwd) {
      return NextResponse.json({ error: "cwd is required" }, { status: 400 });
    }
    if (!existsSync(cwd)) {
      return NextResponse.json({ error: `Directory does not exist: ${cwd}` }, { status: 400 });
    }
    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const results: { name: string; status: string; error?: string; path?: string }[] = [];

    for (const file of files) {
      const name = file.name;
      const size = file.size;

      if (size > MAX_SIZE) {
        results.push({ name, status: "skipped", error: "File too large (max 200MB)" });
        continue;
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = extname(name).toLowerCase();

      try {
        if (ext === ".zip") {
          // Save zip to temp file, then extract
          const zipPath = join(cwd, `.upload-${Date.now()}.zip`);
          await writeFile(zipPath, buffer);
          try {
            execSync(`unzip -o "${zipPath}" -d "${cwd}"`, { stdio: "pipe", timeout: 30000 });
            results.push({ name, status: "extracted" });
          } finally {
            // Clean up zip file
            try { await import("fs/promises").then(m => m.unlink(zipPath)); } catch {}
          }
        } else if (ext === ".tar" || ext === ".tar.gz" || ext === ".tgz") {
          const tarPath = join(cwd, `.upload-${Date.now()}.tar`);
          await writeFile(tarPath, buffer);
          try {
            const flag = ext === ".tar" ? "-xf" : "-xzf";
            execSync(`tar ${flag} "${tarPath}" -C "${cwd}"`, { stdio: "pipe", timeout: 30000 });
            results.push({ name, status: "extracted" });
          } finally {
            try { await import("fs/promises").then(m => m.unlink(tarPath)); } catch {}
          }
        } else {
          // Regular file: save directly
          // Avoid overwriting: if file exists, add suffix
          let targetPath = join(cwd, name);
          if (existsSync(targetPath)) {
            const base = name.replace(ext, "");
            targetPath = join(cwd, `${base}_${Date.now()}${ext}`);
          }
          await writeFile(targetPath, buffer);
          results.push({ name, status: "uploaded", path: targetPath });
        }
      } catch (e) {
        results.push({ name, status: "error", error: String(e) });
      }
    }

    const successCount = results.filter((r) => r.status !== "error").length;
    const errorCount = results.filter((r) => r.status === "error").length;

    return NextResponse.json({
      success: errorCount === 0,
      results,
      summary: `${successCount} succeeded, ${errorCount} failed`,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
