import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, switchMap, takeWhile, timer } from 'rxjs';

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

  /** Emits the job on every poll and completes once the engine is done with it. */
  watch(jobId: string, everyMs = 1500): Observable<RecognitionJob> {
    return timer(0, everyMs).pipe(
      switchMap(() => this.get(jobId)),
      takeWhile((job) => job.status === 'PENDING' || job.status === 'PROCESSING', true),
    );
  }

  list(filter: Page & { status?: JobStatus } = {}): Observable<RecognitionJob[]> {
    return this.http.get<RecognitionJob[]>(this.base, { params: toParams(filter) });
  }

  confirm(jobId: string, body: ConfirmCaptureRequest): Observable<ConfirmedCapture> {
    return this.http.post<ConfirmedCapture>(`${this.base}/${jobId}/confirm`, body);
  }
}
