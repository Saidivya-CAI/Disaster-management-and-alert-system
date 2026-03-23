import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { DisasterMonitoringService, DisasterEvent } from '../services/disaster-monitoring.service';

@Component({
  selector: 'app-disaster-alerts',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container mt-5">
      <div class="row justify-content-center">
        <div class="col-md-8">
           <div class="d-flex justify-content-between align-items-center mb-4">
              <h2 class="fw-bold mb-0">Priority Alerts</h2>
              <a routerLink="/dashboard" class="btn btn-outline-light btn-sm rounded-pill px-4">Back to Dashboard</a>
           </div>

          <div *ngIf="loading" class="d-flex justify-content-center my-5">
             <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
             </div>
          </div>

          <div *ngIf="error" class="alert alert-danger mb-4 shadow-sm border-0 d-flex align-items-center">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-exclamation-triangle-fill flex-shrink-0 me-2" viewBox="0 0 16 16">
                <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
              </svg>
             <div>{{ error }}</div>
          </div>
          
          <div *ngFor="let alert of alerts" class="card border-0 mb-4 animate-up">
            <div class="card-body p-4">
               <div class="d-flex align-items-start">
                   <div [class]="getSeverityIconClass(alert.severity)">
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" class="bi bi-megaphone-fill" viewBox="0 0 16 16">
                         <path d="M13 2.5a1.5 1.5 0 0 1 3 0v11a1.5 1.5 0 0 1-3 0v-11zm-1 .724c-2.067.95-4.539 1.481-7 1.636V9.896c2.461-.155 4.933-.686 7-1.636V3.224z"/>
                         <path d="M6.653 9.686c-1.747-.373-3.411-.97-4.89-1.747L.5 6.467A.5.5 0 0 0 0 6.967V13.3a.5.5 0 0 0 .582.492c1.487-.202 3.033-.429 4.622-.647l.088 1.839a.5.5 0 0 0 .573.475c1.411-.082 2.822-.164 4.148-.225l.135 1.868a.5.5 0 0 0 .573.454c1.196-.067 2.39-.115 3.52-.162a.5.5 0 0 0 .42-.486l-.68-9.406a.5.5 0 0 0-.42-.516l-6.417-1.391z"/>
                      </svg>
                   </div>
                   <div>
                       <h5 class="card-title fw-bold mb-1" [class.text-danger]="alert.severity === 'CRITICAL'">{{ alert.title }}</h5>
                       <p class="text-muted small mb-2">{{ alert.region }} • {{ formatDate(alert.createdAt) }}</p>
                        <button class="btn btn-sm mt-2" [class]="alert.severity === 'CRITICAL' ? 'btn-danger' : 'btn-warning'">Acknowledge</button>
                        
                        <!-- Share Section -->
                        <div class="share-section mt-3 pt-3 border-top">
                           <p class="text-muted small fw-bold mb-2">📢 Spread Awareness:</p>
                           <div class="d-flex gap-2">
                              <button (click)="shareOnWhatsApp(alert)" class="share-btn whatsapp" title="Share on WhatsApp">
                                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.06 3.978l-1.127 4.117 4.217-1.107c1.173.64 2.493.978 3.829.978h.001c4.368 0 7.926-3.558 7.93-7.926a7.858 7.858 0 0 0-2.333-5.594ZM7.994 14.522a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.502c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592Zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232Z"/>
                                 </svg> WhatsApp
                              </button>
                              <button (click)="shareOnTwitter(alert)" class="share-btn twitter" title="Share on X">
                                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.055-4.425 5.055H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.6.75zm-.86 13.028h1.36L4.323 2.145H2.865l8.875 11.633z"/>
                                 </svg> X / Twitter
                              </button>
                              <button (click)="shareOnFacebook(alert)" class="share-btn facebook" title="Share on Facebook">
                                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M16 8.049c0-4.446-3.582-8.05-8-8.05C3.58 0-.002 3.603-.002 8.05c0 4.017 2.926 7.347 6.75 7.951v-5.625h-2.03V8.05H6.75V6.275c0-2.017 1.195-3.131 3.022-3.131.876 0 1.791.157 1.791.157v1.98h-1.009c-.993 0-1.303.621-1.303 1.258V8.05h2.218l-.354 2.326H9.25V16c3.824-.604 6.75-3.934 6.75-7.951z"/>
                                 </svg> Facebook
                              </button>
                           </div>
                        </div>
                    </div>
                </div>
            </div>
          </div>

          <div *ngIf="alerts.length === 0 && !loading" class="text-center text-muted my-5">
              <p>No active alerts to display.</p>
          </div>
          
        </div>
      </div>
    </div>
  `,
  styles: [`
    .animate-up {
        animation: fadeInUp 0.5s ease-out;
    }
    @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .share-section {
        background: #f8fafc;
        margin: 0 -1.5rem -1.5rem -1.5rem;
        padding: 1rem 1.5rem;
        border-radius: 0 0 1rem 1rem;
    }
    .share-btn {
        padding: 6px 12px;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
        font-size: 0.75rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        gap: 6px;
        background: white;
    }
    .share-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    }
    .share-btn.whatsapp:hover { color: #25D366; border-color: #25D366; }
    .share-btn.twitter:hover { color: #000; border-color: #000; }
    .share-btn.facebook:hover { color: #1877F2; border-color: #1877F2; }
  `]
})
export class DisasterAlertsComponent implements OnInit {
  alerts: DisasterEvent[] = [];
  loading = false;
  error = '';

  constructor(private disasterService: DisasterMonitoringService) { }

  ngOnInit() {
    this.loadAlerts();
  }

  loadAlerts() {
    this.loading = true;
    this.disasterService.getAlerts().subscribe({
      next: (data) => {
        this.alerts = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load data. Please ensure backend is running.';
        this.loading = false;
      }
    });
  }

  getSeverityIconClass(severity: string): string {
    if (severity === 'CRITICAL' || severity === 'HIGH') {
      return 'bg-danger bg-opacity-10 text-danger rounded p-3 me-3';
    }
    return 'bg-warning bg-opacity-10 text-warning rounded p-3 me-3';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  shareOnWhatsApp(alert: DisasterEvent) {
    const text = encodeURIComponent(`🚨 EMERGENCY ALERT: ${alert.title}\nType: ${alert.disasterType}\nSeverity: ${alert.severity}\nLocation: ${alert.region}\n\n${alert.message}\n\nStay safe!`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  }

  shareOnTwitter(alert: DisasterEvent) {
    const text = encodeURIComponent(`🚨 EMERGENCY: ${alert.title} in ${alert.region}. Type: ${alert.disasterType} [Severity: ${alert.severity}] #DisasterAlert #Emergency`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  }

  shareOnFacebook(alert: DisasterEvent) {
    const url = encodeURIComponent(window.location.href);
    const quote = encodeURIComponent(`🚨 EMERGENCY ALERT: ${alert.title} - ${alert.message}`);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${quote}`, '_blank');
  }
}
