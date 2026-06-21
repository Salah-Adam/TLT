export function encodeCursor(transactedAtIso: string, id: string): string {
  return Buffer.from(`${transactedAtIso}|${id}`, "utf8").toString("base64url");
}

export function decodeCursor(cursor: string): { transactedAt: string; id: string } | null {
  try {
    const s = Buffer.from(cursor, "base64url").toString("utf8");
    const i = s.lastIndexOf("|");
    if (i < 0) return null;
    return { transactedAt: s.slice(0, i), id: s.slice(i + 1) };
  } catch {
    return null;
  }
}