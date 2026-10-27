import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { toParams } from './http-params';
import {
  ConfirmCaptureRequest,
  ConfirmedCapture,
  JobStatus,
  Page,
  RecognitionJob,
} from './models';

@Injectable({ providedIn: 'root' })
export class RecognitionService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/recognitions`;

  /** Returns a PENDING job straight away (202); poll get() for the reading. */
  submit(image: File, submittedBy?: string): Observable<RecognitionJob> {
    const form = new FormData();
    form.append('image', image);
    if (submittedBy) form.append('submitted_by', submittedBy);
    return this.http.post<RecognitionJob>(this.base, form);
  }

  get(jobId: string): Observable<RecognitionJob> {
    return this.http.get<RecognitionJob>(`${this.base}/${jobId}`);
  }

  list(filter: Page & { status?: JobStatus } = {}): Observable<RecognitionJob[]> {
    return this.http.get<RecognitionJob[]>(this.base, { params: toParams(filter) });
  }

  confirm(jobId: string, body: ConfirmCaptureRequest): Observable<ConfirmedCapture> {
    return this.http.post<ConfirmedCapture>(`${this.base}/${jobId}/confirm`, body);
  }
}
