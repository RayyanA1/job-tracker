import { z } from 'zod';
import { CvError } from '../cv.errors.ts';

export type Generate = <T>(
  instruction: string,
  input: unknown,
  schema: z.ZodType<T>,
) => Promise<T>;

export const generateWithGemini: Generate = async (
  instruction,
  input,
  schema,
) => {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key)
    throw new CvError(
      'provider-unavailable',
      'Set GEMINI_API_KEY in .env and restart the tracker.',
    );
  const model = process.env.GEMINI_MODEL?.trim() || 'gemini-3.8-flash';
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        signal: AbortSignal.timeout(40_000),
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: instruction }] },
          contents: [
            { role: 'user', parts: [{ text: JSON.stringify(input) }] },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseJsonSchema: z.toJSONSchema(schema, {
              override: ({ jsonSchema }) => {
                delete jsonSchema.$schema;
                delete jsonSchema.minLength;
                delete jsonSchema.maxLength;
              },
            }),
          },
        }),
      },
    );
    if (response.status === 429)
      throw new CvError(
        'provider-rate-limited',
        'Gemini is rate limited. Try again shortly.',
      );
    if (!response.ok)
      throw new CvError(
        'provider-failed',
        `Gemini returned an error (${response.status}). Check your key and model settings.`,
      );
    const payload = (await response.json()) as {
      candidates?: {
        content?: { parts?: { text?: string; thought?: boolean }[] };
      }[];
    };
    const answer = payload.candidates?.[0]?.content?.parts
      ?.filter((part) => !part.thought)
      .map((part) => part.text ?? '')
      .join('');
    return schema.parse(JSON.parse(answer || 'null'));
  } catch (error) {
    if (error instanceof CvError) throw error;
    throw new CvError(
      'provider-failed',
      'Gemini could not return a valid CV response. Try again.',
    );
  }
};
