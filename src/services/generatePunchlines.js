export async function generatePunchlines(texteBrut) {
  const seed = texteBrut.trim();
  if (!seed) return [];

  const phrases = seed
    .split(/[.!?]/)
    .map((part) => part.trim())
    .filter(Boolean);

  const base = phrases.length ? phrases : [seed];
  const punchlines = base.slice(0, 3).map((phrase, index) => `✦ ${phrase}`);

  while (punchlines.length < 3) {
    punchlines.push(`✦ ${seed} — variation ${punchlines.length + 1}`);
  }

  await new Promise((resolve) => setTimeout(resolve, 260));
  return punchlines;
}
