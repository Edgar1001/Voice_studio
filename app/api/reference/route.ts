export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { mkdir, writeFile, readdir, stat, rm } from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { randomUUID } from "crypto";

const STORAGE_DIR = path.join(process.cwd(), "storage");
const REF_DIR = path.join(STORAGE_DIR, "references");

function run(cmd: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const p = spawn(cmd, args);

    let stderr = "";
    p.stderr.on("data", (d) => (stderr += d.toString()));

    p.on("error", reject);
    p.on("close", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${cmd} exited ${code}\n${stderr}`))
    );
  });
}

/**
 * POST -> upload reference + convert to WAV
 */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file)
      return NextResponse.json({ error: "Missing file" }, { status: 400 });

    await mkdir(REF_DIR, { recursive: true });

    const id = randomUUID();

    const inputPath = path.join(REF_DIR, `${id}.input`);
    const wavPath = path.join(REF_DIR, `${id}.wav`);

    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(inputPath, bytes);

    // Convert to wav (mono, 44.1k, pcm_s16le)
    await run("/usr/bin/ffmpeg", [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      inputPath,
      "-ar",
      "44100",
      "-ac",
      "1",
      "-c:a",
      "pcm_s16le",
      wavPath,
    ]);

    // remove raw input for privacy/cleanliness
    await rm(inputPath, { force: true });

    return NextResponse.json({
      id,
      filename: `${id}.wav`,
      path: `/storage/references/${id}.wav`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}

/**
 * GET -> list saved references (sorted newest first)
 */
export async function GET() {
  try {
    await mkdir(REF_DIR, { recursive: true });

    const files = await readdir(REF_DIR);
    const wavs = files.filter((f) => f.endsWith(".wav"));

    const refs = await Promise.all(
      wavs.map(async (f) => {
        const p = path.join(REF_DIR, f);
        const s = await stat(p);
        return { name: f, mtime: s.mtimeMs };
      })
    );

    refs.sort((a, b) => b.mtime - a.mtime);

    return NextResponse.json({ references: refs.map((r) => r.name) });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
