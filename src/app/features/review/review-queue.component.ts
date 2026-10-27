import { DatePipe, PercentPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';

import { RecognitionJob } from '../../core/api/models';
import { RecognitionService } from '../../core/api/recognition.service';

@Component({
  selector: 'app-review-queue',
  imports: [DatePipe, PercentPipe],
  template: `
    <h1>Review queue</h1>
    @if (error()) {
      <p class="error">{{ error() }}</p>
    } @else if (jobs() === null) {
      <p class="state">Loading…</p>
    } @else if (jobs()!.length === 0) {
      <p class="state">Nothing waiting for review.</p>
    } @else {
      <table>
        <thead>
          <tr><th>Submitted</th><th>Reading</th><th>Confidence</th><th>Check digit</th></tr>
        </thead>
        <tbody>
          @for (job of jobs(); track job.id) {
            <tr>
              <td>{{ job.submitted_at | date: 'short' }}</td>
              <td class="mono">{{ job.container_number ?? '—' }}</td>
              <td>{{ job.confidence === null ? '—' : (job.confidence | percent) }}</td>
              <td>{{ job.check_digit_valid ? 'valid' : 'invalid' }}</td>
            </tr>
          }
        </tbody>
      </table>
    }
  `,
})
export class ReviewQueueComponent implements OnInit {
  private readonly recognitions = inject(RecognitionService);

  readonly jobs = signal<RecognitionJob[] | null>(null);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.recognitions.list({ status: 'NEEDS_REVIEW' }).subscribe({
      next: (jobs) => this.jobs.set(jobs),
      error: () => this.error.set('Could not reach the API. Is the backend running on port 8001?'),
    });
  }
}
