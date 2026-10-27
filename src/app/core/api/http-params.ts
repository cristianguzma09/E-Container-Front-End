import { HttpParams } from '@angular/common/http';

/** Builds query params, dropping keys whose value is undefined. */
export function toParams<T extends { [K in keyof T]?: string | number }>(values: T): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries<string | number | undefined>(values)) {
    if (value !== undefined) params = params.set(key, value);
  }
  return params;
}
