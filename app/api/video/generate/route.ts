import { NextResponse } from 'next/server';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';
import fs from 'fs';
import Groq from 'groq-sdk';
import * as googleTTS from 'google-tts-api';
import axios from 'axios';
import ffmpeg from 'ffmpeg-static';
import Tesseract from 'tesseract.js';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
    try {
        let { content, imageUrl } = await req.json();

        // 1. OCR if image is provided
        if (imageUrl && !content) {
            console.log("Performing OCR on image...");
            const { data: { text } } = await Tesseract.recognize(imageUrl, 'eng');
            content = text;
        }

        if (!content) {
            return NextResponse.json({ error: 'Content or Image is required' }, { status: 400 });
        }

        // 2. Classify Question Type
        const classifierPrompt = `Classify this educational question into one category: 
1. "concept" (Conceptual explanation, definitions, history, etc.)
2. "math" (Step-by-step mathematical solving, equations, calculus, etc.)

Return ONLY a JSON object: {"type": "concept" | "math"}`;

        const classification = await groq.chat.completions.create({
            messages: [{ role: "system", content: classifierPrompt }, { role: "user", content }],
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" }
        });

        const videoType = JSON.parse(classification.choices[0]?.message?.content || '{"type": "concept"}').type;
        console.log(`Detected video type: ${videoType}`);

        // 3. Generate Appropriate Script
        let systemPrompt = "";
        if (videoType === 'math') {
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
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content }],
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" }
        });

        const script = JSON.parse(scriptCompletion.choices[0]?.message?.content || "{}");
        const rawScenes = videoType === 'math' ? script.steps : script.scenes;

        if (!rawScenes || rawScenes.length === 0) {
            throw new Error("Failed to generate script scenes.");
        }

        // 4. Generate Audio (Free Google TTS)
        const tempDir = path.resolve('./public/temp-assets');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const protocol = req.headers.get('x-forwarded-proto') || 'http';
        const host = req.headers.get('host');
        const baseUrl = `${protocol}://${host}`;

        const scenes = await Promise.all(rawScenes.map(async (scene: any, i: number) => {
            const audioPath = path.join(tempDir, `audio-${Date.now()}-${i}.mp3`);
            const narrationText = scene.text || scene.title || "Next step";
            
            const url = googleTTS.getAudioUrl(narrationText, { lang: 'en', slow: false, host: 'https://translate.google.com' });
            const response = await axios({ method: 'get', url, responseType: 'arraybuffer' });
            await fs.promises.writeFile(audioPath, Buffer.from(response.data));
            
            return { ...scene, audioUrl: `${baseUrl}/temp-assets/${path.basename(audioPath)}` };
        }));

        // 5. Render Video
        const entryPoint = path.resolve('./lib/video/remotion/index.tsx');
        const outputLocation = path.resolve(`./public/videos/video-${Date.now()}.mp4`);
        if (!fs.existsSync(path.resolve('./public/videos'))) fs.mkdirSync(path.resolve('./public/videos'), { recursive: true });

        const { bundle } = await import('@remotion/bundler');
        const bundleLocation = await bundle({ entryPoint });

        const compositionId = 'DoubtVideo';
        const inputProps = { type: videoType, scenes };

        const composition = await selectComposition({ serveUrl: bundleLocation, id: compositionId, inputProps });
        await renderMedia({ composition, serveUrl: bundleLocation, codec: 'h264', outputLocation, inputProps });

        // Clean up temporary audio files asynchronously after rendering is successful
        Promise.all(
            scenes.map(async (scene: any) => {
                try {
                    const fileName = path.basename(scene.audioUrl);
                    const localPath = path.join(tempDir, fileName);
                    if (fs.existsSync(localPath)) {
                        await fs.promises.unlink(localPath);
                    }
                } catch (err) {
                    console.error("Failed to delete temp audio file:", err);
                }
            })
        ).catch((err) => console.error("Error during temp audio cleanup:", err));

        return NextResponse.json({ videoUrl: `/videos/${path.basename(outputLocation)}`, type: videoType });

    } catch (error: any) {
        console.error('Video generation failed:', error);
        return NextResponse.json({ error: error.message || 'Rendering failed' }, { status: 500 });
    }
}
