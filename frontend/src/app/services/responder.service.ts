import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DisasterEvent } from './disaster-monitoring.service';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ResponderService {
    private apiUrl = `${environment.apiUrl}/responder`;

    constructor(private http: HttpClient) { }

    /** Get alerts awaiting responder review (SENT_TO_RESPONDER or AUTO_ESCALATED) */
    getResponderAlerts(): Observable<DisasterEvent[]> {
        return this.http.get<DisasterEvent[]>(`${this.apiUrl}/alerts`);
    }

    /** Forward an alert to citizens (sets status to ACTIVE) */
    forwardToCitizen(id: number): Observable<DisasterEvent> {
        return this.http.put<DisasterEvent>(`${this.apiUrl}/alerts/${id}/forward`, {});
    }

    /** Submit a status report for a rescue task */
    submitReport(taskId: number, reportData: any, headers?: any): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/tasks/${taskId}/report`, reportData, headers);
    }

    /** Get reports for a specific task (Admin/Responder use) */
    getTaskReports(taskId: number): Observable<any[]> {
        // This can be used by both admin and responder; 
        // Admin uses /api/admin/tasks/{id}/reports, Responder normally just sees their own
        // For simplicity, we'll implement the admin path here or add another method
        return this.http.get<any[]>(`${environment.apiUrl}/admin/tasks/${taskId}/reports`);
    }
}
