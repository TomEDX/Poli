/**
 * Leaving the quiz loses the answers, which are kept nowhere (ADR 0002): the visitor confirms
 * once they have answered at least one question, unless their results are on screen.
 */
export function mustConfirmLeaving({ answered, showingResults }: { answered: number; showingResults: boolean }) {
  return answered > 0 && !showingResults;
}
