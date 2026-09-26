/** Erreur métier : son message est affiché tel quel à l'administrateur. */
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export function fail(message: string, fieldErrors?: Record<string, string>): never {
  throw new DomainError(message, fieldErrors);
}
