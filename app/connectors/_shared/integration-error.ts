export type IntegrationErrorKind =
  | "auth"
  | "rate-limit"
  | "network"
  | "not-found"
  | "unknown";

export class IntegrationError extends Error {
  kind: IntegrationErrorKind;
  constructor(kind: IntegrationErrorKind, message: string) {
    super(message);
    this.kind = kind;
    this.name = "IntegrationError";
  }
}
