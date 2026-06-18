// Attempt to close any unclosed strings, arrays, and objects in a truncated JSON string
function repairJson(text) {
  let inString = false;
  let escape = false;
  const stack = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') stack.push('}');
    else if (ch === '[') stack.push(']');
    else if (ch === '}' || ch === ']') stack.pop();
  }

  let repaired = text;
  if (inString) repaired += '"';                   // close unclosed string
  repaired = repaired.replace(/,\s*$/, '');        // strip trailing comma
  while (stack.length) repaired += stack.pop();    // close unclosed brackets
  return repaired;
}

export function parseAIJson(text) {
  const raw = String(text || '').trim();
  const withoutFence = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1]?.trim();
  const objectMatch = withoutFence.match(/(\{[\s\S]*\})/);
  const arrayMatch = withoutFence.match(/(\[[\s\S]*\])/);

  const candidates = [
    fenced,
    objectMatch?.[1],
    arrayMatch?.[1],
    withoutFence,
    // Repaired versions as fallback
    fenced        && repairJson(fenced),
    objectMatch   && repairJson(objectMatch[1]),
    arrayMatch    && repairJson(arrayMatch[1]),
    repairJson(withoutFence),
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // try next candidate
    }
  }

  throw new Error('The AI returned incomplete JSON. Please try again.');
}
