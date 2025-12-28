"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { spray } from "./layout"; // ✅ Adjust path if needed (eg: "../layout")

export default function Page() {
  // Upload reference file
  const [file, setFile] = useState<File | null>(null);

  // Saved references
  const [savedRefs, setSavedRefs] = useState<string[]>([]);
  const [selectedRef, setSelectedRef] = useState<string>("");

  // Text & settings
  const [text, setText] = useState("Hola, una prueba desde la UI.");
  const [lang, setLang] = useState("es");

  // Output
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingRef, setSavingRef] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mic recording
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const fileMeta = useMemo(() => {
    if (!file) return null;
    return {
      name: file.name,
      sizeKB: Math.round(file.size / 1024),
      type: file.type || "audio/*",
    };
  }, [file]);

  async function refreshReferences() {
    try {
      const res = await fetch("/api/reference", { cache: "no-store" });
      const json = await res.json();
      setSavedRefs(json.references || []);
    } catch (e) {
      console.error("Failed to fetch references", e);
    }
  }

  useEffect(() => {
    refreshReferences();
  }, []);

  // ✅ Save reference file into storage/references as WAV
  async function handleSaveReference(uploaded: File) {
    setError(null);
    setSavingRef(true);

    try {
      const form = new FormData();
      form.append("file", uploaded);

      const res = await fetch("/api/reference", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || `Server Error (${res.status})`);
      }

      const json = await res.json();
      await refreshReferences();

      setSelectedRef(json.filename);
      setFile(null);
    } catch (e: any) {
      setError(e?.message || "Unknown error while saving reference");
    } finally {
      setSavingRef(false);
    }
  }

  // 🎙 Start mic recording
  async function startRecording() {
    setError(null);

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);

    chunksRef.current = [];

    recorder.ondataavailable = (e) => chunksRef.current.push(e.data);

    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());

      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const recordedFile = new File([blob], "mic.webm", { type: blob.type });

      // ✅ auto-save recording as reference
      await handleSaveReference(recordedFile);
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
    setRecording(true);
  }

  // 🛑 Stop mic recording
  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function handleGenerate() {
    setError(null);
    setAudioUrl(null);

    if (!selectedRef && !file) {
      setError("Upload or select a saved reference first.");
      return;
    }
    if (!text.trim()) {
      setError("Please enter some text to synthesize.");
      return;
    }

    setLoading(true);

    try {
      const form = new FormData();
      form.append("text", text);
      form.append("lang", lang);

      if (selectedRef) {
        form.append("referenceId", selectedRef);
      } else if (file) {
        form.append("file", file);
      }

      const res = await fetch("/api/local-tts", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || `Server Error (${res.status})`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
    } catch (e: any) {
      setError(e?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-purple-100 px-6 py-12 text-black">
      <div className="mx-auto max-w-4xl">
        {/* ✅ HEADER UPDATED */}
        <header className="mb-10">
          <h1 className={`text-5xl md:text-6xl leading-none ${spray.className}`}>
            <span className="bg-gradient-to-r from-purple-600 via-fuchsia-500 to-indigo-500 bg-clip-text text-transparent drop-shadow-[0_6px_16px_rgba(168,85,247,0.45)]">
              Voice Studio
            </span>
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-relaxed text-black">
            Upload or record a reference, save it, and generate voice-cloned speech.
            Powered by XTTS v2.
          </p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-100/70 px-3 py-1 text-xs font-semibold text-purple-800">
            🎧 Developerd • by • Ed
          </div>
        </header>

        <section className="rounded-2xl border border-purple-200 bg-white shadow-sm">
          <div className="p-8 space-y-10">

            {/* Reference Section */}
            <div className="grid gap-8 md:grid-cols-2">
              {/* Upload */}
              <div>
                <h2 className="text-lg font-semibold text-black">
                  Upload Reference (OGG/WAV/MP3)
                </h2>

                <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-purple-200 bg-purple-50 px-6 py-10 text-center transition hover:border-purple-300 hover:bg-purple-100">
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  <div className="text-sm font-medium text-black">
                    {fileMeta ? "File selected" : "Click to upload"}
                  </div>
                  <div className="mt-2 text-xs text-black">
                    {fileMeta ? (
                      <>
                        <span className="font-semibold">{fileMeta.name}</span>{" "}
                        • {fileMeta.sizeKB} KB
                      </>
                    ) : (
                      "OGG / WAV / MP3 — recommended 10–30 seconds"
                    )}
                  </div>
                </label>

                {file && (
                  <div className="mt-3 flex gap-3">
                    <button
                      onClick={() => handleSaveReference(file)}
                      disabled={savingRef}
                      className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-700 disabled:opacity-60"
                    >
                      {savingRef ? "Saving..." : "Save as Reference"}
                    </button>

                    <button
                      onClick={() => setFile(null)}
                      className="rounded-xl border border-purple-200 bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-purple-50"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Mic */}
              <div>
                <h2 className="text-lg font-semibold text-black">
                  Record Reference from Microphone
                </h2>
                <p className="mt-1 text-sm text-black">
                  Record a short clean clip (10–30 seconds). It will auto-save as a reference.
                </p>

                <div className="mt-4 flex gap-3">
                  {!recording ? (
                    <button
                      onClick={startRecording}
                      className="rounded-xl bg-fuchsia-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-fuchsia-700"
                    >
                      🎙 Start Recording
                    </button>
                  ) : (
                    <button
                      onClick={stopRecording}
                      className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
                    >
                      ⏹ Stop Recording
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Saved refs */}
            <div>
              <h2 className="text-lg font-semibold text-black">
                Select Saved Reference
              </h2>

              <select
                className="mt-3 w-full rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm text-black shadow-sm outline-none transition focus:ring-2 focus:ring-purple-200"
                value={selectedRef}
                onChange={(e) => setSelectedRef(e.target.value)}
                onFocus={refreshReferences}
              >
                <option value="">-- Select a saved reference --</option>
                {savedRefs.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              <p className="mt-2 text-xs text-black">
                References are stored in <code>storage/references</code>.
              </p>
            </div>

            {/* Text + Lang */}
            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-black">
                  Language
                </label>
                <select
                  className="mt-2 w-full rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm text-black shadow-sm focus:ring-2 focus:ring-purple-200"
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                >
                  <option value="es">Spanish (es)</option>
                  <option value="en">English (en)</option>
                  <option value="fr">French (fr)</option>
                  <option value="de">German (de)</option>
                  <option value="it">Italian (it)</option>
                  <option value="pt">Portuguese (pt)</option>
                  <option value="pl">Polish (pl)</option>
                  <option value="tr">Turkish (tr)</option>
                  <option value="ru">Russian (ru)</option>
                  <option value="nl">Dutch (nl)</option>
                  <option value="cs">Czech (cs)</option>
                  <option value="ar">Arabic (ar)</option>
                  <option value="zh-cn">Chinese (zh-cn)</option>
                  <option value="hu">Hungarian (hu)</option>
                  <option value="ko">Korean (ko)</option>
                  <option value="ja">Japanese (ja)</option>
                  <option value="hi">Hindi (hi)</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-black">
                  Text
                </label>
                <textarea
                  className="mt-2 w-full rounded-lg border border-purple-200 px-3 py-2 text-sm text-black shadow-sm focus:ring-2 focus:ring-purple-200"
                  rows={6}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </div>
            </div>

            {/* Generate */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="rounded-xl bg-purple-700 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-purple-800 disabled:opacity-60"
              >
                {loading ? "Generating..." : "Generate Audio"}
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <div className="font-semibold">Error</div>
                <div className="mt-1">{error}</div>
              </div>
            )}

            {/* Output */}
            {audioUrl && (
              <div className="rounded-2xl border border-purple-200 bg-purple-50 p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-black">
                      Output Ready
                    </h3>
                    <p className="mt-1 text-sm text-black">
                      Listen or download the generated WAV file.
                    </p>
                  </div>

                  <a
                    href={audioUrl}
                    download="generated.wav"
                    className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black shadow-sm ring-1 ring-purple-200 hover:bg-purple-100"
                  >
                    Download WAV
                  </a>
                </div>

                <audio controls className="mt-5 w-full" src={audioUrl} />
              </div>
            )}
          </div>
        </section>

        <footer className="mt-10 text-center text-xs font-semibold text-black font-mono tracking-wide">
          Designed & Developed by Ed • All rights reserved.
        </footer>
      </div>
    </main>
  );
}
