/**
 * Returns the Algerian university mention for a given grade /20.
 */
export function computeMention(grade: number): string {
  if (grade < 10) return "Ajourné";
  if (grade < 12) return "Passable";
  if (grade < 14) return "Assez Bien";
  if (grade < 16) return "Bien";
  if (grade < 18) return "Très Bien";
  return "Excellent";
}
