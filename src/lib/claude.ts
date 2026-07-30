import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-4-6";

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
winner with a one-line verdict.

Respond with ONLY a single JSON object, no markdown code fences, no
commentary before or after, matching exactly this shape:

{
  "photoA": { "score": <integer 0-100>, "critique": "<2-3 sentences>" },
  "photoB": { "score": <integer 0-100>, "critique": "<2-3 sentences>" },
  "winner": "A" | "B" | "tie",
  "verdict": "<one punchy sentence announcing the winner and why>"
}`;

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new JudgeError(
      "The AI judge isn't configured yet — ANTHROPIC_API_KEY is missing on the server.",
      "config",
    );
  }
  return new Anthropic({ apiKey });
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        // fall through
      }
    }
  }
  throw new JudgeError("The judge's response wasn't valid JSON.", "parse");
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
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: JUDGE_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: `Photo A (${photoA.label}):` },
            {
              type: "image",
              source: { type: "base64", media_type: photoA.mediaType, data: photoA.base64 },
            },
            { type: "text", text: `Photo B (${photoB.label}):` },
            {
              type: "image",
              source: { type: "base64", media_type: photoB.mediaType, data: photoB.base64 },
            },
            {
              type: "text",
              text: "Judge these two photographs now. Respond with only the JSON object described in your instructions.",
            },
          ],
        },
      ],
    });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      throw new JudgeError(`The judge is unavailable right now (${err.message}).`, "api");
    }
    throw new JudgeError("The judge is unavailable right now.", "api");
  }

  if (response.stop_reason === "refusal") {
    throw new JudgeError(
      "The judge declined to evaluate these images. Try a different pair.",
      "refusal",
    );
  }

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new JudgeError("The judge returned an empty response.", "parse");
  }

  const parsed = extractJson(textBlock.text);
  if (!isValidVerdict(parsed)) {
    throw new JudgeError("The judge's response was malformed.", "parse");
  }

  parsed.photoA.score = clampScore(parsed.photoA.score);
  parsed.photoB.score = clampScore(parsed.photoB.score);

  return parsed;
}
