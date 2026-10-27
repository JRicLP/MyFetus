export function parseInputFloat(input: string): number {
  if (input === '') return 0;
  return parseFloat(input.replace(',', '.'));
}

export function parseInputInt(input: string): number {
  if (input === '') return 0;
  return parseInt(input, 10);
}
