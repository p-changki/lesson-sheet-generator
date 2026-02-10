export class LlmUpstreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmUpstreamError";
  }
}
