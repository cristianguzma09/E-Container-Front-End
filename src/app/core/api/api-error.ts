import { HttpErrorResponse } from '@angular/common/http';

import { ApiError } from './models';

/** Turns any failed call into one line an operator can act on. */
export function describeError(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return 'Something went wrong.';
  if (error.status === 0) return 'Could not reach the API. Is the backend running on port 8001?';

  const body = error.error as Partial<ApiError> | { detail?: unknown } | null;
  if (body && typeof body.detail === 'string') return body.detail;
  // FastAPI's own request validation: detail is a list of { loc, msg }.
  if (body && Array.isArray(body.detail)) {
    return body.detail.map((d: { msg?: string }) => d.msg ?? '').filter(Boolean).join('; ');
  }
  return `Request failed (${error.status}).`;
}
