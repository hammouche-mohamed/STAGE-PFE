/**
 * Computes the individual final grade for a jury member's evaluation.
 * Formula: report*0.40 + technical*0.30 + oral*0.30
 */
export function computeIndividualGrade(
  reportScore: number,
  technicalScore: number,
  oralScore: number
): number {
  return reportScore * 0.4 + technicalScore * 0.3 + oralScore * 0.3;
}

/**
 * Computes average of all non-advisory jury grades.
 */
export function computeFinalGrade(individualGrades: number[]): number {
  if (individualGrades.length === 0) return 0;
  const sum = individualGrades.reduce((a, b) => a + b, 0);
  return Math.round((sum / individualGrades.length) * 100) / 100;
}
