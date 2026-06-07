export function parseAIJson(text) {
  const raw = String(text || '').trim();
  const withoutFence = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1]?.trim();
  const objectMatch = withoutFence.match(/(\{[\s\S]*\})/);
  const arrayMatch = withoutFence.match(/(\[[\s\S]*\])/);
  const candidates = [fenced, objectMatch?.[1], arrayMatch?.[1], withoutFence].filter(Boolean);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error('The AI returned incomplete JSON. Please try again.');
}
