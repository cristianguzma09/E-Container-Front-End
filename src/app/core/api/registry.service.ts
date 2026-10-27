import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { toParams } from './http-params';
import {
  Container,
  ContainerDetail,
  ContainerNumberValidation,
  Inspection,
  Page,
  RecordInspectionRequest,
  RegisterContainerRequest,
} from './models';

@Injectable({ providedIn: 'root' })
export class RegistryService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  register(body: RegisterContainerRequest): Observable<ContainerDetail> {
    return this.http.post<ContainerDetail>(`${this.base}/containers`, body);
  }

  list(page: Page = {}): Observable<Container[]> {
    return this.http.get<Container[]>(`${this.base}/containers`, { params: toParams(page) });
  }

  get(number: string): Observable<ContainerDetail> {
    return this.http.get<ContainerDetail>(`${this.base}/containers/${number}`);
  }

  amend(number: string, sizeTypeCode: string): Observable<Container> {
    return this.http.patch<Container>(`${this.base}/containers/${number}`, {
      size_type_code: sizeTypeCode,
    });
  }

  recordInspection(number: string, body: RecordInspectionRequest): Observable<Inspection> {
    return this.http.post<Inspection>(`${this.base}/containers/${number}/inspections`, body);
  }

  inspections(number: string): Observable<Inspection[]> {
    return this.http.get<Inspection[]>(`${this.base}/containers/${number}/inspections`);
  }

  validateNumber(containerNumber: string): Observable<ContainerNumberValidation> {
    return this.http.post<ContainerNumberValidation>(`${this.base}/container-numbers/validate`, {
      container_number: containerNumber,
    });
  }
}
