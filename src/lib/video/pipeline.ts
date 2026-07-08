import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import fs from "fs";
import Groq from "groq-sdk";
import axios from "axios";
import Tesseract from "tesseract.js";
import { uploadVideo } from "./storage";

export interface SceneData {
  text?: string;
  title?: string;
  duration?: number;
  [key: string]: unknown;
}

export interface EnrichedScene extends SceneData {
  audioUrl: string;
}

export interface VideoPipelineInput {
  content?: string | null;
  imageUrl?: string | null;
  /** Absolute base URL (e.g. https://host) used to reference generated audio assets. */
  baseUrl: string;
}

export interface VideoPipelineResult {
  videoUrl: string;
  videoType: string;
}

export interface VideoProgress {
  progress: number;
  step: string;
}

export type ProgressReporter = (update: VideoProgress) => Promise<void> | void;

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "dummy_key",
});

function splitTextIntoChunks(text: string, maxLen: number = 200): string[] {
  const rawWords = text.split(/\s+/);
  const words: string[] = [];
  for (const word of rawWords) {
    if (word.length > maxLen) {
      for (let i = 0; i < word.length; i += maxLen) {
        words.push(word.slice(i, i + maxLen));
      }
    } else {
      words.push(word);
    }
  }

  const chunks: string[] = [];
  let currentChunk = "";
  for (const word of words) {
    if ((currentChunk + " " + word).trim().length > maxLen) {
      if (currentChunk.trim().length > 0) chunks.push(currentChunk.trim());
      currentChunk = word;
    } else {
      currentChunk = (currentChunk + " " + word).trim();
    }
  }
  if (currentChunk.trim().length > 0) chunks.push(currentChunk.trim());
  return chunks;
}

function getGoogleTtsUrls(text: string, lang: string = "en", speed: number = 1): string[] {
  const chunks = splitTextIntoChunks(text, 200);
  return chunks.map((chunk) => {
    const queryParams = new URLSearchParams({
      ie: "UTF-8",
      q: chunk,
      tl: lang,
      total: "1",
      idx: "0",
      textlen: chunk.length.toString(),
      client: "tw-ob",
      prev: "input",
      ttsspeed: speed.toString(),
    });
    return `https://translate.google.com/translate_tts?${queryParams.toString()}`;
  });
}

/**
 * Run the full video generation pipeline: OCR (optional) -> classify -> script ->
 * TTS -> Remotion render. Reports progress through `onProgress` between stages so a
 * background job can persist it. Returns the public video URL and detected type.
 *
 * This is the same logic that previously ran inline in POST /api/video/generate;
 * extracting it lets the Inngest background job own the long-running work.
 */
export async function runVideoPipeline(
  input: VideoPipelineInput,
  onProgress: ProgressReporter = () => {},
): Promise<VideoPipelineResult> {
  let content = input.content ?? undefined;
  const { imageUrl, baseUrl } = input;

  // 1. OCR if an image is provided and no text content was supplied.
  if (imageUrl && !content) {
    await onProgress({ progress: 10, step: "Reading image (OCR)…" });
    const {
      data: { text },
    } = await Tesseract.recognize(imageUrl, "eng");
    content = text;
  }

  if (!content) {
    throw new Error("Content or Image is required");
  }

  // 2. Classify question type.
  await onProgress({ progress: 30, step: "Analyzing question…" });
  const classifierPrompt = `Classify this educational question into one category:
1. "concept" (Conceptual explanation, definitions, history, etc.)
2. "math" (Step-by-step mathematical solving, equations, calculus, etc.)

Return ONLY a JSON object: {"type": "concept" | "math"}`;

  const classification = await groq.chat.completions.create({
    messages: [
      { role: "system", content: classifierPrompt },
      { role: "user", content },
    ],
    model: "llama-3.3-70b-versatile",
    response_format: { type: "json_object" },
  });

  const classificationPayload = JSON.parse(
    classification.choices[0]?.message?.content || '{"type": "concept"}',
  ) as { type?: unknown };
  // Only "math" and "concept" are supported; anything else (e.g. "MATH",
  // "other") falls back to "concept" so we never persist/render an unknown type.
  const videoType = classificationPayload.type === "math" ? "math" : "concept";

  // 3. Generate the appropriate script.
  await onProgress({ progress: 45, step: "Writing script…" });
  let systemPrompt = "";
  if (videoType === "math") {
    systemPrompt = `Solve this mathematical problem step-by-step. Break it into 5-10 clear, granular equations for complex problems.
Explain every logical transition carefully.
Each step must have:
1. "equation": The LaTeX string for the step (e.g., "2x + 5 = 15"). Do NOT include $ signs.
2. "text": A detailed spoken explanation for this step.
3. "duration": 5-7 seconds per step.

Return ONLY a JSON object with a "steps" array.`;
  } else {
    systemPrompt = `Explain this concept comprehensively. Break it into 5-8 informative slides.
Cover the definition, key principles, examples, and conclusion.
Each slide must have:
1. "title": A descriptive title.
2. "text": The explanation text to be narrated.
3. "duration": 6-10 seconds per slide.

Return ONLY a JSON object with a "scenes" array.`;
  }

  const scriptCompletion = await groq.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content },
    ],
    model: "llama-3.3-70b-versatile",
    response_format: { type: "json_object" },
  });

  const script = JSON.parse(scriptCompletion.choices[0]?.message?.content || "{}");
  const rawScenes = videoType === "math" ? script.steps : script.scenes;

  if (!Array.isArray(rawScenes) || rawScenes.length === 0) {
    throw new Error("Failed to generate script scenes.");
  }

  // 4. Generate audio (free Google TTS).
  await onProgress({ progress: 65, step: "Generating audio…" });
  const tempDir = path.resolve("./public/temp-assets");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const scenes: EnrichedScene[] = await Promise.all(
    rawScenes.map(async (scene: SceneData, i: number): Promise<EnrichedScene> => {
      const audioPath = path.join(tempDir, `audio-${Date.now()}-${i}.mp3`);
      const narrationText = scene.text || scene.title || "Next step";

      const urls = getGoogleTtsUrls(narrationText, "en", 1);
      const audioBuffers = await Promise.all(
        urls.map(async (url) => {
          const response = await axios({
            method: "get",
            url,
            responseType: "arraybuffer",
            timeout: 15_000,
          });
          return Buffer.from(response.data);
        }),
      );
      const combinedBuffer = Buffer.concat(audioBuffers);
      await fs.promises.writeFile(audioPath, combinedBuffer);

      return { ...scene, audioUrl: `${baseUrl}/temp-assets/${path.basename(audioPath)}` };
    }),
  );

  // 5. Render the video with Remotion.
  await onProgress({ progress: 90, step: "Rendering video…" });
  const entryPoint = path.resolve(process.cwd(), "src/lib/video/remotion/index.tsx");
  const outputLocation = path.resolve(`./public/videos/video-${Date.now()}.mp4`);
  if (!fs.existsSync(path.resolve("./public/videos"))) {
    fs.mkdirSync(path.resolve("./public/videos"), { recursive: true });
  }

  const { bundle } = await import("@remotion/bundler");
  const bundleLocation = await bundle({ entryPoint });

  const compositionId = "DoubtVideo";
  const inputProps = { type: videoType, scenes };

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: compositionId,
    inputProps,
  });
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation,
    inputProps,
  });

  // Clean up temporary audio files after a successful render.
  await Promise.all(
    scenes.map(async (scene: EnrichedScene) => {
      try {
        const fileName = path.basename(scene.audioUrl);
        const localPath = path.join(tempDir, fileName);
        if (fs.existsSync(localPath)) await fs.promises.unlink(localPath);
      } catch (err) {
        console.error("Failed to delete temp audio file:", err);
      }
    }),
  ).catch((err) => console.error("Error during temp audio cleanup:", err));

  // Persist the render to durable object storage (issue #321). The local
  // public/videos path is ephemeral in serverless/Inngest execution and isn't
  // guaranteed to be served by the instance handling playback, so upload to
  // Supabase Storage and return that URL. Falls back to the local path only when
  // storage is not configured (e.g. local dev).
  const objectName = `renders/${path.basename(outputLocation)}`;
  const uploadedUrl = await uploadVideo(outputLocation, objectName);
  if (uploadedUrl) {
    await fs.promises.unlink(outputLocation).catch(() => {});
    return { videoUrl: uploadedUrl, videoType };
  }

  console.warn(
    "[video] durable storage not configured; returning ephemeral local path. Set " +
      "NEXT_PUBLIC_SUPABASE_URL and a Supabase key (SUPABASE_SERVICE_ROLE_KEY " +
      "recommended) to persist renders in production.",
  );
  return { videoUrl: `/videos/${path.basename(outputLocation)}`, videoType };
}