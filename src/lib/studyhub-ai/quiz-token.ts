import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export type QuizAnswerKey = {
  owner: string;
  expiresAt: number;
  questions: Array<{
    id: string;
    correctIndex: number;
    explanation: string;
  }>;
};

function encryptionKey(): Buffer {
  const secret = process.env.AI_QUIZ_SECRET;
  if (!secret || secret.length < 32) throw new Error("Missing AI_QUIZ_SECRET (minimum 32 characters)");
  return createHash("sha256").update(secret, "utf8").digest();
}

/** AEAD: correct answers are encrypted, not merely base64-encoded or signed. */
export function sealQuizKey(data: QuizAnswerKey): string {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), nonce);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(data), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([nonce, tag, ciphertext]).toString("base64url");
}

export function readQuizKey(token: string): QuizAnswerKey {
  if (!token || token.length > 25000) throw new Error("Invalid quiz token");
  const raw = Buffer.from(token, "base64url");
  if (raw.length < 29) throw new Error("Invalid quiz token");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  const json = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
  const value: unknown = JSON.parse(json);
  if (!value || typeof value !== "object") throw new Error("Invalid quiz token");
  const data = value as QuizAnswerKey;
  if (
    typeof data.owner !== "string" ||
    typeof data.expiresAt !== "number" ||
    !Array.isArray(data.questions) ||
    data.questions.length < 1 ||
    data.questions.length > 15 ||
    data.questions.some((q) => !q || typeof q.id !== "string" || !Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 3 || typeof q.explanation !== "string")
  ) throw new Error("Invalid quiz token");
  return data;
}
