// Global state to share rate limit across ALL instances of TTSManager (and React re-renders)
// This prevents hitting the 10 RPM limit if the component remounts or multiple instances are created.
const MIN_REQUEST_INTERVAL = 6200; // 6.2s (Limit is 6s/10RPM). Optimized to be as fast as safely possible.
const STORAGE_KEY = 'tts_last_request_time';
const LOCK_NAME = 'tts_rate_limit_lock';

export class TTSManager {
    private apiKey: string;
    private audioQueue: Promise<{ audio: HTMLAudioElement, url: string } | null>[] = [];
    private isPlaying = false;
    private currentAudio: HTMLAudioElement | null = null;
    private stopRequested = false;
    private onStateChange: ((isSpeaking: boolean) => void) | null = null;
    private onPlaybackStart: (() => void) | null = null;
    private abortController: AbortController | null = null;
    private hasInitialPlaybackStarted = false;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    public setOnStateChange(callback: (isSpeaking: boolean) => void) {
        this.onStateChange = callback;
    }

    public setOnPlaybackStart(callback: () => void) {
        this.onPlaybackStart = callback;
    }

    private updateState(speaking: boolean) {
        if (this.onStateChange) {
            this.onStateChange(speaking);
        }
    }

    public async speak(text: string) {
        this.stop(); // Stop any current playback and abort requests
        this.stopRequested = false;
        this.hasInitialPlaybackStarted = false;
        this.abortController = new AbortController(); // New controller for this session
        this.updateState(true);

        // 1. Sanitize text (remove emojis that cause "graph" pronunciation)
        const cleanText = this.sanitizeText(text);

        // 2. Chunk by basic structure
        let rawChunks = cleanText.split(/\n\n+/).filter(c => /[a-zA-Z0-9\u00C0-\u00FF]/.test(c));

        // 3. Merge chunks to optimize request count (progressive chunking)
        // Start small for fast playback, then increase size
        const mergedChunks = this.mergeChunks(rawChunks);

        console.log(`[TTS] Starting playback for ${mergedChunks.length} merged chunks (orig: ${rawChunks.length})`);

        // Pipelining: Create promises for ALL chunks immediately.
        // The rate limiter inside fetchAudioWithRetry will ensure they are spaced out by 8s.
        // But we won't wait for Chunk 1 to FINISH downloading before starting the timer for Chunk 2.
        this.audioQueue = mergedChunks.map((chunk, index) => {
            return this.fetchAudioWithRetry(chunk, this.abortController!.signal)
                .then(url => {
                    if (this.stopRequested || !url) return null;

                    // Pre-create and Load Audio immediately
                    const audio = new Audio(url);
                    audio.preload = 'auto'; // Hint to browser to buffer
                    audio.load();           // Force load

                    return { audio, url };
                })
                .catch(err => {
                    if (err.name === 'AbortError') return null;
                    console.warn(`[TTS] Chunk ${index} failed`, err);
                    return null;
                });
        });

        if (!this.isPlaying) {
            this.processQueue();
        }
    }

    private sanitizeText(text: string): string {
        // Remove emojis and other non-text symbols that might cause TTS artifacts
        // This regex matches most emoji ranges
        return text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
            // Also remove loose markdown like ** or ## if they aren't handled well, 
            // though Gemini usually handles them. Let's stick to emojis for now.
            .replace(/[ \t]+/g, ' ') // normalize horizontal whitespace
            .replace(/\n{2,}/g, '\n\n') // normalize multiple newlines to double
            .trim();
    }

    private mergeChunks(chunks: string[]): string[] {
        const merged: string[] = [];
        let current = "";

        // Progressive chunking strategy:
        // 1st chunk: ~500 chars (approx 30s audio) -> Good buffer, decent start time
        // 2nd chunk: ~500 chars (approx 30s audio) -> Maintain buffer
        // 3rd+ chunk: ~1000 chars (approx 1m+ audio) -> High throughput
        let currentLimit = 500;

        for (const chunk of chunks) {
            if (current.length + chunk.length + 2 <= currentLimit) {
                current += (current ? "\n\n" : "") + chunk;
            } else {
                if (current) {
                    merged.push(current);

                    // Increase limit for subsequent chunks
                    if (merged.length < 2) {
                        currentLimit = 500; // Keep medium size for 2nd chunk too
                    } else {
                        currentLimit = 1000;
                    }
                }
                current = chunk;
            }
        }
        if (current) merged.push(current);
        return merged;
    }

    public stop() {
        this.stopRequested = true;
        this.hasInitialPlaybackStarted = false;

        // Abort any pending fetches
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }

        this.audioQueue = []; // Clear queue
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
        this.isPlaying = false;
        this.updateState(false);
    }

    private async processQueue() {
        if (this.audioQueue.length === 0) {
            this.isPlaying = false;
            this.updateState(false); // Finished
            return;
        }

        this.isPlaying = true;
        const nextPromise = this.audioQueue.shift();

        if (nextPromise) {
            try {
                // Wait for the audio to be ready (downloaded AND buffered)
                const item = await nextPromise;

                if (item && !this.stopRequested) {
                    await this.playAudio(item.audio);
                    // Revoke object URL to free memory
                    URL.revokeObjectURL(item.url);
                }
            } catch (e) {
                console.warn("[TTS] Error playing chunk", e);
            }

            if (!this.stopRequested) {
                this.processQueue();
            }
        }
    }

    private playAudio(audio: HTMLAudioElement): Promise<void> {
        return new Promise((resolve) => {
            this.currentAudio = audio;

            if (!this.hasInitialPlaybackStarted) {
                // This is the first audio of the sequence starting to play
                this.hasInitialPlaybackStarted = true;
                if (this.onPlaybackStart) {
                    this.onPlaybackStart();
                }
            }

            audio.onended = () => {
                this.currentAudio = null;
                resolve();
            };

            audio.onerror = (e) => {
                console.error("[TTS] Audio playback error", e);
                this.currentAudio = null;
                resolve(); // resolve anyway to continue to next
            };

            audio.play().catch(e => {
                console.error("[TTS] Play failed", e);
                resolve();
            });
        });
    }

    private async waitRateLimit(signal: AbortSignal) {
        if (signal.aborted) return;

        // Use Web Locks API to ensure cross-tab synchronization
        // This holds a system-wide lock so only ONE tab/request can check/update the timer at a time.
        await navigator.locks.request(LOCK_NAME, async () => {
            if (signal.aborted) return;

            const now = Date.now();
            const lastStr = localStorage.getItem(STORAGE_KEY);
            const lastTime = lastStr ? parseInt(lastStr, 10) : 0;
            const elapsed = now - lastTime;

            if (elapsed < MIN_REQUEST_INTERVAL) {
                const wait = MIN_REQUEST_INTERVAL - elapsed;
                console.log(`[TTS] Global Rate Limit (Locked): Waiting ${wait}ms...`);
                // We hold the lock while waiting to prevent others from sneaking in
                await new Promise(r => setTimeout(r, wait));
            }

            if (!signal.aborted) {
                localStorage.setItem(STORAGE_KEY, Date.now().toString());
            }
        });
    }

    private async fetchAudioWithRetry(text: string, signal: AbortSignal, retries = 3): Promise<string | null> {
        // Reverting to 2.5 flash preview as requested by user
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${this.apiKey}`;

        // Note: system_instruction might cause 500 errors on the TTS endpoint, so we omit it.
        // We rely on the model's default behavior for language detection (usually good for French text).
        const payload = {
            contents: [{
                parts: [{ text: text }]
            }],
            generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: {
                            voiceName: "Kore"
                        }
                    }
                }
            }
        };

        for (let i = 0; i <= retries; i++) {
            if (signal.aborted) throw new DOMException("Aborted", "AbortError");

            // Enforce global rate limit before EVERY attempt (including retries)
            await this.waitRateLimit(signal);

            if (signal.aborted) throw new DOMException("Aborted", "AbortError");

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    signal // Pass abort signal
                });

                if (response.status === 429 || response.status >= 500) {
                    // Check if it's a Daily Quota issue (unrecoverable today)
                    let isDailyQuota = false;
                    try {
                        const errJson = await response.clone().json();
                        const msg = errJson?.error?.message || "";
                        if (msg.includes("per_day") || msg.includes("daily") || msg.includes("quota exceeded")) {
                            console.error("[TTS] Daily Quota Exceeded:", msg);
                            isDailyQuota = true;
                        }
                    } catch (e) { /* ignore parse error */ }

                    if (isDailyQuota) {
                        return null; // Stop trying immediately
                    }

                    const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
                    console.warn(`[TTS] Rate limit or Server Error (${response.status}). Retrying in ${Math.round(delay)}ms...`);
                    if (i < retries) {
                        await new Promise(res => setTimeout(res, delay));
                        continue;
                    }
                }

                if (!response.ok) {
                    const errText = await response.text();
                    console.warn(`Gemini TTS API Warning: ${response.status} - ${errText}`);
                    return null;
                }

                const data = await response.json();
                const base64Audio = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

                if (!base64Audio) {
                    // This happens if the model generated nothing (filtered text etc)
                    return null;
                }

                // Convert to Blob URL
                const binaryString = window.atob(base64Audio);
                const bytes = new Uint8Array(binaryString.length);
                for (let j = 0; j < binaryString.length; j++) {
                    bytes[j] = binaryString.charCodeAt(j);
                }

                const wavBytes = this.addWavHeader(bytes, 24000, 1, 16);
                const blob = new Blob([wavBytes], { type: 'audio/wav' });
                return URL.createObjectURL(blob);

            } catch (e: any) {
                if (e.name === 'AbortError') throw e; // Propagate abort
                console.warn(`[TTS] Fetch attempt ${i + 1} failed`, e);
                if (i < retries) {
                    await new Promise(res => setTimeout(res, 1000));
                } else {
                    return null;
                }
            }
        }
        return null;
    }

    private addWavHeader(samples: Uint8Array, sampleRate: number, numChannels: number, bitDepth: number): ArrayBuffer {
        const buffer = new ArrayBuffer(44 + samples.length);
        const view = new DataView(buffer);

        /* RIFF identifier */
        this.writeString(view, 0, 'RIFF');
        /* RIFF chunk length */
        view.setUint32(4, 36 + samples.length, true);
        /* RIFF type */
        this.writeString(view, 8, 'WAVE');
        /* format chunk identifier */
        this.writeString(view, 12, 'fmt ');
        /* format chunk length */
        view.setUint32(16, 16, true);
        /* sample format (raw) */
        view.setUint16(20, 1, true);
        /* channel count */
        view.setUint16(22, numChannels, true);
        /* sample rate */
        view.setUint32(24, sampleRate, true);
        /* byte rate (sample rate * block align) */
        view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
        /* block align (channel count * bytes per sample) */
        view.setUint16(32, numChannels * (bitDepth / 8), true);
        /* bits per sample */
        view.setUint16(34, bitDepth, true);
        /* data chunk identifier */
        this.writeString(view, 36, 'data');
        /* data chunk length */
        view.setUint32(40, samples.length, true);

        // Write the PCM samples
        const sampleView = new Uint8Array(buffer, 44);
        sampleView.set(samples);

        return buffer;
    }

    private writeString(view: DataView, offset: number, string: string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }
}
