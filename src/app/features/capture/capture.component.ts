import { PercentPipe } from '@angular/common';
import { Component, DestroyRef, OnDestroy, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntil, timer } from 'rxjs';

import { describeError } from '../../core/api/api-error';
import { Candidate, ConfirmedCapture, RecognitionJob } from '../../core/api/models';
import { RecognitionService } from '../../core/api/recognition.service';

const OPERATOR_KEY = 'econtainer.operator';
/** Past this the engine is likely stuck; the job stays in the queue either way. */
const POLL_GIVE_UP_MS = 90_000;

type Phase = 'pick' | 'reading' | 'review' | 'done';

@Component({
  selector: 'app-capture',
  imports: [PercentPipe, ReactiveFormsModule, RouterLink],
  template: `
    <h1>Capture</h1>

    @if (error()) {
      <p class="error">{{ error() }}</p>
    }

    @switch (phase()) {
      @case ('pick') {
        <form class="card" [formGroup]="pickForm" (ngSubmit)="submit()">
          <label>
            Operator
            <input formControlName="operator" autocomplete="name" placeholder="Your name" />
          </label>
          <label>
            Photo of the container number
            <input type="file" accept="image/*" capture="environment" (change)="onFile($event)" />
          </label>
          @if (previewUrl()) {
            <img class="preview" [src]="previewUrl()" alt="Selected photo" />
          }
          <button type="submit" [disabled]="!file() || pickForm.invalid || busy()">
            {{ busy() ? 'Uploading…' : 'Read number' }}
          </button>
        </form>
      }

      @case ('reading') {
        <div class="card">
          <img class="preview" [src]="previewUrl()" alt="Submitted photo" />
          <p class="state">Reading the number… ({{ job()?.status ?? 'PENDING' }})</p>
        </div>
      }

      @case ('review') {
        @let j = job()!;
        <div class="card">
          <img class="preview" [src]="previewUrl()" alt="Submitted photo" />

          @if (j.status === 'FAILED') {
            <p class="error">The engine could not read this photo: {{ j.failure_reason }}</p>
            <button type="button" (click)="reset()">Try another photo</button>
          } @else if (j.status === 'PENDING' || j.status === 'PROCESSING') {
            <p class="state">
              Still processing. It will show up in the <a routerLink="/review">review queue</a>
              once read.
            </p>
            <button type="button" (click)="reset()">Capture another</button>
          } @else {
            <div class="reading">
              <span class="mono big">{{ j.container_number ?? 'No reading' }}</span>
              <span class="badge" [class.warn]="j.needs_review" [class.ok]="!j.needs_review">
                {{ j.needs_review ? 'Needs review' : 'Looks good' }}
              </span>
            </div>
            <p class="state">
              Confidence {{ j.confidence === null ? '—' : (j.confidence | percent) }} ·
              check digit {{ j.check_digit_valid ? 'valid' : 'invalid' }}
              @if (j.repaired) { · repaired }
            </p>

            @if (j.candidates.length > 1) {
              <p class="label">Other candidates</p>
              <div class="candidates">
                @for (c of j.candidates; track c.value) {
                  <button type="button" class="chip mono" (click)="pick(c)">
                    {{ c.value }} <small>{{ c.score | percent }}</small>
                  </button>
                }
              </div>
            }

            <form [formGroup]="confirmForm" (ngSubmit)="confirm()">
              <label>
                Container number
                <input class="mono" formControlName="containerNumber" placeholder="CSQU3054383" />
              </label>
              @if (corrected()) {
                <p class="hint warn">This corrects the engine's reading.</p>
              }
              <label>
                Size-type code
                <input class="mono" formControlName="sizeTypeCode" list="size-types" />
                <datalist id="size-types">
                  <option value="22G1">20ft general</option>
                  <option value="42G1">40ft general</option>
                  <option value="45G1">40ft high cube</option>
                  <option value="22R1">20ft reefer</option>
                  <option value="45R1">40ft high cube reefer</option>
                  <option value="L5G1">45ft high cube</option>
                </datalist>
              </label>
              <div class="row">
                <label>
                  Cleanliness
                  <select formControlName="cleanliness">
                    <option value="CLEAN">Clean</option>
                    <option value="DIRTY">Dirty</option>
                  </select>
                </label>
                <label>
                  Structure
                  <select formControlName="structural">
                    <option value="SOUND">Sound</option>
                    <option value="DAMAGED">Damaged</option>
                  </select>
                </label>
              </div>
              <label class="check">
                <input type="checkbox" formControlName="foodCertified" />
                Food-grade certificate presented
              </label>
              <label>
                Notes
                <textarea formControlName="notes" rows="2"></textarea>
              </label>
              <div class="row">
                <button type="submit" [disabled]="confirmForm.invalid || busy()">
                  {{ busy() ? 'Confirming…' : 'Confirm and register' }}
                </button>
                <button type="button" class="secondary" (click)="reset()">Discard</button>
              </div>
            </form>
          }
        </div>
      }

      @case ('done') {
        @let r = result()!;
        <div class="card">
          <div class="reading">
            <span class="mono big">{{ r.container.formatted_number }}</span>
            <span class="badge ok">{{ r.newly_registered ? 'Registered' : 'Inspection recorded' }}</span>
          </div>
          <p class="state">
            {{ r.container.size_label }} · {{ r.container.cargo_grade }} ·
            {{ r.container.is_available_for_loading ? 'available for loading' : 'not available' }}
            @if (r.corrected) { · reading corrected }
          </p>
          <div class="row">
            <button type="button" (click)="reset()">Capture another</button>
            <a routerLink="/register">View register</a>
          </div>
        </div>
      }
    }
  `,
  styles: `
    .card {
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
      max-width: 32rem;
      padding: 1rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
    }
    label {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      font-size: 0.9rem;
      color: var(--muted);
    }
    label.check {
      flex-direction: row;
      align-items: center;
      gap: 0.5rem;
    }
    input:not([type='checkbox']),
    select,
    textarea {
      font: inherit;
      color: var(--text);
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 0.5rem 0.6rem;
    }
    .row {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      flex-wrap: wrap;
      > label {
        flex: 1;
      }
    }
    button {
      font: inherit;
      padding: 0.55rem 1rem;
      border: 0;
      border-radius: 6px;
      background: var(--accent);
      color: #fff;
      cursor: pointer;
      &:disabled {
        opacity: 0.5;
        cursor: default;
      }
      &.secondary {
        background: transparent;
        color: var(--muted);
        border: 1px solid var(--border);
      }
    }
    .preview {
      max-width: 100%;
      max-height: 16rem;
      object-fit: contain;
      border-radius: 6px;
      background: var(--bg);
    }
    .reading {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .big {
      font-size: 1.6rem;
      font-weight: 700;
      letter-spacing: 0.05em;
    }
    .badge {
      font-size: 0.8rem;
      font-weight: 600;
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
      &.ok {
        color: var(--ok);
        border: 1px solid var(--ok);
      }
      &.warn {
        color: var(--warn);
        border: 1px solid var(--warn);
      }
    }
    .label {
      margin: 0;
      font-size: 0.9rem;
      color: var(--muted);
    }
    .candidates {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .chip {
      background: var(--accent-soft);
      color: var(--accent);
      padding: 0.3rem 0.6rem;
      small {
        opacity: 0.7;
      }
    }
    .hint {
      margin: -0.5rem 0 0;
      font-size: 0.85rem;
      &.warn {
        color: var(--warn);
      }
    }
  `,
})
export class CaptureComponent implements OnDestroy {
  private readonly recognitions = inject(RecognitionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly phase = signal<Phase>('pick');
  readonly file = signal<File | null>(null);
  readonly previewUrl = signal<string | null>(null);
  readonly job = signal<RecognitionJob | null>(null);
  readonly result = signal<ConfirmedCapture | null>(null);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  readonly pickForm = this.fb.group({
    operator: [readOperator(), Validators.required],
  });

  readonly confirmForm = this.fb.group({
    containerNumber: ['', Validators.required],
    sizeTypeCode: ['22G1', Validators.required],
    cleanliness: this.fb.control<'CLEAN' | 'DIRTY'>('CLEAN'),
    structural: this.fb.control<'SOUND' | 'DAMAGED'>('SOUND'),
    foodCertified: false,
    notes: '',
  });

  private readonly typedNumber = signal('');
  readonly corrected = computed(() => {
    const read = this.job()?.container_number;
    const typed = normalize(this.typedNumber());
    return !!read && !!typed && typed !== read;
  });

  constructor() {
    this.confirmForm.controls.containerNumber.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => this.typedNumber.set(value));
  }

  onFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.file.set(file);
    this.setPreview(file);
  }

  submit(): void {
    const file = this.file();
    if (!file || this.pickForm.invalid) return;
    const operator = this.pickForm.controls.operator.value.trim();
    saveOperator(operator);

    this.busy.set(true);
    this.error.set(null);
    this.recognitions.submit(file, operator).subscribe({
      next: (job) => {
        this.busy.set(false);
        this.job.set(job);
        this.phase.set('reading');
        this.poll(job.id);
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(describeError(err));
      },
    });
  }

  pick(candidate: Candidate): void {
    this.confirmForm.controls.containerNumber.setValue(candidate.value);
  }

  confirm(): void {
    const job = this.job();
    if (!job || this.confirmForm.invalid) return;
    const form = this.confirmForm.getRawValue();
    const typed = normalize(form.containerNumber);

    this.busy.set(true);
    this.error.set(null);
    this.recognitions
      .confirm(job.id, {
        confirmed_by: this.pickForm.controls.operator.value.trim(),
        size_type_code: form.sizeTypeCode.trim().toUpperCase(),
        cleanliness: form.cleanliness,
        structural: form.structural,
        food_certified: form.foodCertified,
        // Only send a number when it overrides the reading, so the backend
        // can tell a correction from an acceptance.
        container_number: typed === job.container_number ? null : typed,
        notes: form.notes.trim() || null,
      })
      .subscribe({
        next: (result) => {
          this.busy.set(false);
          this.result.set(result);
          this.phase.set('done');
        },
        error: (err) => {
          this.busy.set(false);
          this.error.set(describeError(err));
        },
      });
  }

  reset(): void {
    this.phase.set('pick');
    this.file.set(null);
    this.setPreview(null);
    this.job.set(null);
    this.result.set(null);
    this.error.set(null);
    this.confirmForm.reset();
  }

  ngOnDestroy(): void {
    this.setPreview(null);
  }

  private poll(jobId: string): void {
    this.recognitions
      .watch(jobId)
      .pipe(takeUntil(timer(POLL_GIVE_UP_MS)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (job) => this.job.set(job),
        error: (err) => {
          this.error.set(describeError(err));
          this.phase.set('review');
        },
        complete: () => {
          const job = this.job()!;
          this.confirmForm.controls.containerNumber.setValue(job.container_number ?? '');
          this.phase.set('review');
        },
      });
  }

  private setPreview(file: File | null): void {
    const old = this.previewUrl();
    if (old) URL.revokeObjectURL(old);
    this.previewUrl.set(file ? URL.createObjectURL(file) : null);
  }
}

function normalize(value: string): string {
  return value.replace(/[\s-]/g, '').toUpperCase();
}

// Browser storage can be unavailable (private mode, blocked site data);
// remembering the operator is only a convenience.
function readOperator(): string {
  try {
    return localStorage.getItem(OPERATOR_KEY) ?? '';
  } catch {
    return '';
  }
}

function saveOperator(name: string): void {
  try {
    localStorage.setItem(OPERATOR_KEY, name);
  } catch {
    // ignore
  }
}
