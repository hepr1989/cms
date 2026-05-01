export interface Heading {
  level: number;
  text: string;
  id: string;
}

export function extractHeadings(contentMd: string): Heading[] {
  const matches = contentMd.match(/^#{1,6}\s+.+$/gm);
  if (!matches) return [];

  return matches.map((match, index) => {
    const level = match.match(/^(#{1,6})/)?.[1].length || 1;
    const text = match.replace(/^#{1,6}\s+/, '');
    return { level, text, id: `heading-${index}` };
  });
}

export function generateHeadingId(index: number): string {
  return `heading-${index}`;
}
