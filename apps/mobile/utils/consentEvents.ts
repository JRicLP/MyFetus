type ConsentRequiredListener = () => void;

const listeners = new Set<ConsentRequiredListener>();

export function subscribeToConsentRequired(listener: ConsentRequiredListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyConsentRequired(): void {
  listeners.forEach((listener) => listener());
}
