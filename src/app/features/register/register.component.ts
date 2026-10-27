import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';

import { Container } from '../../core/api/models';
import { RegistryService } from '../../core/api/registry.service';

@Component({
  selector: 'app-register',
  imports: [DatePipe],
  template: `
    <h1>Register</h1>
    @if (error()) {
      <p class="error">{{ error() }}</p>
    } @else if (containers() === null) {
      <p class="state">Loading…</p>
    } @else if (containers()!.length === 0) {
      <p class="state">No containers registered yet.</p>
    } @else {
      <table>
        <thead>
          <tr><th>Number</th><th>Size</th><th>Grade</th><th>Inspections</th><th>Identified</th></tr>
        </thead>
        <tbody>
          @for (c of containers(); track c.number) {
            <tr>
              <td class="mono">{{ c.formatted_number }}</td>
              <td>{{ c.size_label }}</td>
              <td>{{ c.cargo_grade }}</td>
              <td>{{ c.inspection_count }}</td>
              <td>{{ c.identified_at | date: 'short' }}</td>
            </tr>
          }
        </tbody>
      </table>
    }
  `,
})
export class RegisterComponent implements OnInit {
  private readonly registry = inject(RegistryService);

  readonly containers = signal<Container[] | null>(null);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.registry.list().subscribe({
      next: (containers) => this.containers.set(containers),
      error: () => this.error.set('Could not reach the API. Is the backend running on port 8001?'),
    });
  }
}
