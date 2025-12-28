export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { mkdir, writeFile, readFile, rm } from "fs/promises";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";
import { spawn } from "child_process";

const STORAGE_DIR = path.join(process.cwd(), "storage");
const REF_DIR = path.join(STORAGE_DIR, "references");
const OUT_DIR = path.join(STORAGE_DIR, "outputs");

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
 * POST -> Generate cloned audio (WAV)
 * Accepts:
 * - referenceId: string (stored wav filename)
 * - OR file: uploaded audio
 * - text: string
 * - lang: string
 */
export async function POST(req: Request) {
  let tmpDir = "";

  try {
    const form = await req.formData();

    const text = (form.get("text") as string) || "";
    const lang = (form.get("lang") as string) || "en";

    const file = form.get("file") as File | null;
    const referenceId = (form.get("referenceId") as string) || "";

    if (!text.trim())
      return NextResponse.json({ error: "Missing text" }, { status: 400 });

    await mkdir(OUT_DIR, { recursive: true });

    tmpDir = path.join(os.tmpdir(), "xtts-" + randomUUID());
    await mkdir(tmpDir, { recursive: true });

    const wavPath = path.join(tmpDir, "reference.wav");

    // ✅ Use stored reference
    if (referenceId) {
      const refPath = path.join(REF_DIR, referenceId);

      await run("cp", [refPath, wavPath]);
    }
    // ✅ Otherwise use uploaded file
    else if (file) {
      const inputPath = path.join(tmpDir, "input");
      const bytes = Buffer.from(await file.arrayBuffer());
      await writeFile(inputPath, bytes);

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
    } else {
      return NextResponse.json(
        { error: "Missing file or referenceId" },
        { status: 400 }
      );
    }

    const outName = `out_${Date.now()}.wav`;
    const outPath = path.join(OUT_DIR, outName);

    const python =
      process.env.XTTS_PYTHON || path.join(process.cwd(), ".venv/bin/python");

    await run(python, ["scripts/xtts_generate.py", wavPath, text, lang, outPath]);

    const out = await readFile(outPath);

    return new Response(new Uint8Array(out), {
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "no-store",
        "X-Output-File": outName,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  } finally {
    if (tmpDir) {
      await rm(tmpDir, { recursive: true, force: true });
    }
  }
}
