export default function distance(a: string, b: string): number {
  if (a === b) return 0;

  let count = 0;
  for (let i = 0; i < a.length; i++) {
    count += Number(a.charCodeAt(i) !== b.charCodeAt(i));
  }
  return count;
}
