import sanitizeHtml from "sanitize-html";

const STRIP_ALL: sanitizeHtml.IOptions = {
  allowedTags: [],
  allowedAttributes: {},
  disallowedTagsMode: "discard",
};

/** Strips all HTML/markup and collapses whitespace — used for names + comment text. */
export function sanitizePlainText(input: string, maxLength: number): string {
  const stripped = sanitizeHtml(input, STRIP_ALL).replace(/\s+/g, " ").trim();
  return stripped.slice(0, maxLength);
}

export interface CommentInputResult {
  ok: true;
  name: string;
  text: string;
}

export interface CommentInputError {
  ok: false;
  error: string;
}

export function validateCommentInput(
  rawName: unknown,
  rawText: unknown,
): CommentInputResult | CommentInputError {
  if (typeof rawName !== "string" || typeof rawText !== "string") {
    return { ok: false, error: "Name and comment are required." };
  }

  const name = sanitizePlainText(rawName, 60);
  const text = sanitizePlainText(rawText, 1000);

  if (!name) return { ok: false, error: "Please enter a display name." };
  if (!text) return { ok: false, error: "Comment can't be empty." };
  if (text.length < 2) return { ok: false, error: "Comment is too short." };

  return { ok: true, name, text };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ContactInputResult {
  ok: true;
  name: string;
  email: string;
  message: string;
}

export interface ContactInputError {
  ok: false;
  error: string;
}

export function validateContactInput(
  rawName: unknown,
  rawEmail: unknown,
  rawMessage: unknown,
): ContactInputResult | ContactInputError {
  if (
    typeof rawName !== "string" ||
    typeof rawEmail !== "string" ||
    typeof rawMessage !== "string"
  ) {
    return { ok: false, error: "Name, email, and message are required." };
  }

  const name = sanitizePlainText(rawName, 100);
  const email = sanitizePlainText(rawEmail, 200).toLowerCase();
  const message = sanitizePlainText(rawMessage, 4000);

  if (!name) return { ok: false, error: "Please enter your name." };
  if (!email || !EMAIL_RE.test(email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  if (!message || message.length < 10) {
    return { ok: false, error: "Message is too short." };
  }

  return { ok: true, name, email, message };
}
