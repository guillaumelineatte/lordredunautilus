// Le message est montré tel quel à l'admin, donc on l'écrit pour lui.
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
