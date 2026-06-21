// Throw sites carry only the code (+ status); the text is resolved later from the catalog in the user's language.

export class AppError extends Error {
  code: string;
  statusCode: number;
  field?: string;
  params?: Record<string, string | number>;

  constructor(
    code: string,
    statusCode: number,
    opts?: { field?: string; params?: Record<string, string | number> }
  ) {
    super(code); // .message holds the code; real text is localized at the handler
    this.code = code;
    this.statusCode = statusCode;
    this.field = opts?.field;
    this.params = opts?.params;
  }
}