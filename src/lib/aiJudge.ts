import { GoogleGenAI } from "@google/genai";

// "gemini-flash-latest" is a Google-maintained alias that always resolves to
// their current recommended flash model — pinning a specific version (e.g.
// "gemini-2.5-flash") is risky, since Google rotates which versions are
// available to new API keys/projects quite aggressively. Free tier, no
// billing required. See https://ai.google.dev/gemini-api/docs/models.
const MODEL = "gemini-flash-latest";

export interface JudgeImageInput {
  base64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  label: string; // e.g. photo title, used only in the critique text
}

export interface JudgeVerdict {
  photoA: { score: number; critique: string };
  photoB: { score: number; critique: string };
  winner: "A" | "B" | "tie";
  verdict: string;
}

export class JudgeError extends Error {
  constructor(
    message: string,
    public readonly kind: "config" | "refusal" | "parse" | "api" = "api",
  ) {
    super(message);
    this.name = "JudgeError";
  }
}

const JUDGE_SYSTEM_PROMPT = `You are a world-class professional photography judge with decades of experience
judging international photography competitions. You evaluate photographs on:
composition, lighting, subject matter, emotional impact, technical execution
(focus, exposure, noise, dynamic range), and creativity/originality.

You will be shown two photographs, Photo A and Photo B. Score each out of 100,
write a 2-3 sentence critique for each explaining the score, and declare a
winner with a one-line verdict.`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    photoA: {
      type: "object",
      properties: {
        score: { type: "integer" },
        critique: { type: "string" },
      },
      required: ["score", "critique"],
    },
    photoB: {
      type: "object",
      properties: {
        score: { type: "integer" },
        critique: { type: "string" },
      },
      required: ["score", "critique"],
    },
    winner: { type: "string", enum: ["A", "B", "tie"] },
    verdict: { type: "string" },
  },
  required: ["photoA", "photoB", "winner", "verdict"],
} as const;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new JudgeError(
      "The AI judge isn't configured yet — GEMINI_API_KEY is missing on the server.",
      "config",
    );
  }
  return new GoogleGenAI({ apiKey });
}

function isValidVerdict(value: unknown): value is JudgeVerdict {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const a = v.photoA as Record<string, unknown> | undefined;
  const b = v.photoB as Record<string, unknown> | undefined;
  return (
    !!a &&
    !!b &&
    typeof a.score === "number" &&
    typeof a.critique === "string" &&
    typeof b.score === "number" &&
    typeof b.critique === "string" &&
    (v.winner === "A" || v.winner === "B" || v.winner === "tie") &&
    typeof v.verdict === "string"
  );
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export async function judgePhotoPair(
  photoA: JudgeImageInput,
  photoB: JudgeImageInput,
): Promise<JudgeVerdict> {
  const client = getClient();

  let response;
  try {
    response = await client.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { text: `Photo A (${photoA.label}):` },
            { inlineData: { mimeType: photoA.mediaType, data: photoA.base64 } },
            { text: `Photo B (${photoB.label}):` },
            { inlineData: { mimeType: photoB.mediaType, data: photoB.base64 } },
            { text: "Judge these two photographs now." },
          ],
        },
      ],
      config: {
        systemInstruction: JUDGE_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    });
  } catch (err) {
    throw new JudgeError(
      `The judge is unavailable right now (${err instanceof Error ? err.message : "unknown error"}).`,
      "api",
    );
  }

  const candidate = response.candidates?.[0];
  const blockReason = response.promptFeedback?.blockReason;
  if (blockReason || (candidate && candidate.finishReason === "SAFETY")) {
    throw new JudgeError(
      "The judge declined to evaluate these images. Try a different pair.",
      "refusal",
    );
  }

  const text = response.text;
  if (!text) {
    throw new JudgeError("The judge returned an empty response.", "parse");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new JudgeError("The judge's response wasn't valid JSON.", "parse");
  }

  if (!isValidVerdict(parsed)) {
    throw new JudgeError("The judge's response was malformed.", "parse");
  }

  parsed.photoA.score = clampScore(parsed.photoA.score);
  parsed.photoB.score = clampScore(parsed.photoB.score);

  return parsed;
}
