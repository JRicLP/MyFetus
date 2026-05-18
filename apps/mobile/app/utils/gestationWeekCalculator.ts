export function calculateGestationWeek(lastMenstruation: Date): number {
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - lastMenstruation.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const gestationWeek = Math.floor(diffDays / 7);
  return Math.min(gestationWeek, 42); // Limitando a 42 semanas
} 