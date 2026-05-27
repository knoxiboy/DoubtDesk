import { NextResponse } from 'next/server';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';
import fs from 'fs';
import Groq from 'groq-sdk';
import axios from 'axios';
import ffmpeg from 'ffmpeg-static';
import Tesseract from 'tesseract.js';
import { parseAndValidateRequest } from '@/lib/validations/validate';
import { generateVideoSchema } from '@/lib/validations/video';
import { currentUser } from '@clerk/nextjs/server';
import { checkUserBlock } from '@/lib/auth-utils';
import { redisClient } from '@/lib/ratelimit';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || 'dummy_key',
});

function splitTextIntoChunks(text: string, maxLen: number = 200): string[] {
    const rawWords = text.split(/\s+/);
    const words: string[] = [];
    for (const word of rawWords) {
        if (word.length > maxLen) {
            // Split overlong word into <=maxLen pieces
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
            if (currentChunk.trim().length > 0) {
                chunks.push(currentChunk.trim());
            }
            currentChunk = word;
        } else {
            currentChunk = (currentChunk + " " + word).trim();
        }
    }
    if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
    }
    return chunks;
}

function getGoogleTtsUrls(text: string, lang: string = 'en', speed: number = 1): string[] {
    const chunks = splitTextIntoChunks(text, 200);
    return chunks.map(chunk => {
        const queryParams = new URLSearchParams({
            ie: 'UTF-8',
            q: chunk,
            tl: lang,
            total: '1',
            idx: '0',
            textlen: chunk.length.toString(),
            client: 'tw-ob',
            prev: 'input',
            ttsspeed: speed.toString()
        });
        return `https://translate.google.com/translate_tts?${queryParams.toString()}`;
    });
}

export async function POST(req: Request) {
    const user = await currentUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = user.primaryEmailAddress?.emailAddress;
    if (!email) {
        return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const { isBlocked, errorResponse: blockResponse } = await checkUserBlock(email);
    if (isBlocked) return blockResponse;

    let lockKey = null;
    try {
        const { errorResponse, data } = await parseAndValidateRequest(req, generateVideoSchema);
        if (errorResponse) return errorResponse;

        lockKey = `video_lock:${user.id}`;
        const lockAcquired = await redisClient.setnx(lockKey, "1");

        if (!lockAcquired || lockAcquired === 0) {
            return NextResponse.json({
                error: 'A video generation is already in progress for your account. Please wait for it to finish.'
            }, { status: 429 });
        }

        if (redisClient.expire) {
            await redisClient.expire(lockKey, 300);
        }

        let { content, imageUrl } = data;

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
            
            const urls = getGoogleTtsUrls(narrationText, 'en', 1);
            const audioBuffers = await Promise.all(urls.map(async (url) => {
                const response = await axios({ method: 'get', url, responseType: 'arraybuffer' });
                return Buffer.from(response.data);
            }));
            const combinedBuffer = Buffer.concat(audioBuffers);
            await fs.promises.writeFile(audioPath, combinedBuffer);
            
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
    } finally {
        if (lockKey) {
            await redisClient.del(lockKey).catch(console.error);
        }
    }
}
