import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';

declare var L: any;
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '../../environments/environment';
import { DomSanitizer } from '@angular/platform-browser';
import { WebSocketService } from '../services/websocket.service';
import { ResponderService } from '../services/responder.service';

@Component({
  selector: 'app-responder-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dashboard-container">
      
      <!-- SIDEBAR -->
      <aside class="sidebar">
        <div class="sidebar-header">
          <h2>Responder<span class="highlight">Guard</span></h2>
        </div>

        <div class="profile-summary">
          <div class="avatar">RES</div>
          <div>
             <p class="name">Unit Alpha-1</p>
             <p class="role">On Duty</p>
          </div>
        </div>

        <nav class="nav-links">
          <a (click)="activeTab = 'dashboard'" [class.active]="activeTab === 'dashboard'">
            <span class="icon">📊</span> Overview
          </a>
          <a (click)="activeTab = 'forward'; loadForwardAlerts()" [class.active]="activeTab === 'forward'">
            <span class="icon">📡</span> Public Alerts
            <span *ngIf="forwardAlerts.length > 0" class="nav-badge">{{ forwardAlerts.length }}</span>
          </a>
          <a (click)="activeTab = 'alerts'; loadAlerts()" [class.active]="activeTab === 'alerts'">
            <span class="icon">📢</span> General Alerts
          </a>
          <a (click)="activeTab = 'missions'" [class.active]="activeTab === 'missions'">
            <span class="icon">🛡️</span> My Tasks
          </a>
          <a (click)="activeTab = 'profile'" [class.active]="activeTab === 'profile'">
            <span class="icon">⚙️</span> Profile
          </a>
        </nav>

        <button class="logout-btn" (click)="logout()">
          <span>🚪</span> Logout
        </button>
      </aside>

      <!-- MAIN CONTENT -->
      <main class="main-content">
        <div class="top-bar">
          <div class="header-main">
            <h1>{{ getPageTitle() }}</h1>
            <div class="date">{{ currentDate | date:'EEEE, MMMM d, y, h:mm:ss a' }}</div>
          </div>
          <div class="status-pill" (click)="activeTab = 'dashboard'">
            <span class="active-dot"></span> System Online
          </div>
        </div>

        <div class="content-scroll">
          
          <!-- OVERVIEW TAB -->
          <div *ngIf="activeTab === 'dashboard'" class="fade-in">
             
             <!-- HERO BANNER -->
             <div class="welcome-banner">
               <div class="welcome-avatar">
                 RES
                 <div class="active-badge"></div>
               </div>
               <div class="welcome-text">
                 <h2>MISSION <span>CONTROL</span></h2>
                 <p>Unit Alpha-1 • Active Duty • System Sync: Online</p>
               </div>
               <button class="share-btn" (click)="shareLocation()">UPDATE LOCATION +</button>
             </div>

             <div class="card map-card">
              <h3><span class="icon">🗺️</span> Disaster Monitor</h3>
              <div class="map-container" id="responderMap" style="height: 350px; border-radius: 16px; border: 1px solid #e2e8f0; z-index: 1;"></div>
             </div>

             <!-- Emergency Requests -->
             <div class="card">
               <div class="flex-header">
                 <h3><span class="icon">🚨</span> High-Priority Requests</h3>
                 <button class="secondary-btn" (click)="loadAlerts()"><span class="icon">🔄</span> Refresh Feed</button>
               </div>
               
               <div *ngIf="alerts.length === 0" class="empty-state">No active requests in your area.</div>
               
               <div *ngFor="let alert of alerts.slice(0, 3)" class="alert-item">
                 <div class="alert-icon">{{ getIcon(alert.disasterType) }}</div>
                 <div class="alert-info">
                   <h4>{{ alert.title || alert.disasterType }}</h4>
                   <p>Location: {{ alert.region }}</p>
                 </div>
                 <div class="severity-badge" [ngClass]="alert.severity?.toLowerCase()">{{ alert.severity }}</div>
                 <button class="sm-btn primary" (click)="respondToAlert(alert)">Deploy</button>
               </div>
            </div>
          </div>

          <!-- PUBLIC ALERTS TAB -->
          <div *ngIf="activeTab === 'forward'" class="fade-in">
            <div class="card">
              <div class="flex-header">
                <h3><span class="icon">📡</span> Notify Citizens</h3>
                <button class="secondary-btn" (click)="loadForwardAlerts()"><span class="icon">🔄</span> Refresh</button>
              </div>
              <p class="description">Forward verified emergency data to the public to provide early warnings.</p>

              <div *ngFor="let alert of forwardAlerts" class="card-item animate-up">
                <div class="card-item-header">
                   <div class="icon-box">{{ getIcon(alert.disasterType) }}</div>
                   <div class="header-text">
                     <h4>{{ alert.title }}</h4>
                     <small>Received: {{ alert.createdAt | date:'shortTime' }}</small>
                   </div>
                   <div class="severity-badge" [ngClass]="alert.severity?.toLowerCase()">{{ alert.severity }}</div>
                </div>
                <p class="item-body">{{ alert.description }}</p>
                <div class="item-footer">
                   <span>📍 {{ alert.region }}</span>
                   <button class="sm-btn success" (click)="forwardToCitizen(alert)">Forward to Public</button>
                </div>
              </div>

              <div *ngIf="forwardAlerts.length === 0" class="empty-state">No alerts pending public notification.</div>
            </div>
          </div>

          <!-- GENERAL ALERTS TAB -->
          <div *ngIf="activeTab === 'alerts'" class="fade-in">
            <div class="card">
              <div class="flex-header">
                <h3><span class="icon">📢</span> Active Alerts</h3>
                <button class="secondary-btn" (click)="loadAlerts()"><span class="icon">🔄</span> Refresh</button>
              </div>

              <div *ngFor="let alert of alerts" class="card-item animate-up">
                <div class="card-item-header">
                   <div class="icon-box">{{ getIcon(alert.disasterType) }}</div>
                   <div class="header-text">
                     <h4>{{ alert.title }}</h4>
                     <small>Logged: {{ alert.createdAt | date:'shortTime' }}</small>
                   </div>
                   <div class="severity-badge" [ngClass]="alert.severity?.toLowerCase()">{{ alert.severity }}</div>
                </div>
                <p class="item-body">{{ alert.description }}</p>
                <div class="item-footer">
                   <span>📍 {{ alert.region }}</span>
                   <button class="sm-btn primary" (click)="respondToAlert(alert)">View Details</button>
                </div>
              </div>

              <div *ngIf="alerts.length === 0" class="empty-state">No active alerts recorded.</div>
            </div>
          </div>

          <!-- MY TASKS TAB -->
          <div *ngIf="activeTab === 'missions'" class="fade-in">
            <div class="card">
              <div class="flex-header">
                <h3><span class="icon">🛡️</span> Current Tasks</h3>
                <button class="secondary-btn" (click)="loadTasks()"><span class="icon">🔄</span> Refresh Status</button>
              </div>

              <div *ngFor="let task of tasks" class="task-item">
                <div class="task-info">
                   <h4>{{ task.description }}</h4>
                   <div class="meta-row">
                      <p class="meta"><span>🕒</span> Time: {{ task.createdAt | date:'shortTime' }}</p>
                      <p class="meta" *ngIf="task.locationName"><span>📍</span> Place: {{ task.locationName }}</p>
                   </div>
                   <p class="meta" *ngIf="task.priority"><span>⚡</span> Priority: <span class="severity-badge" [ngClass]="task.priority.toLowerCase()">{{ task.priority }}</span></p>
                   <p class="meta success-text" *ngIf="task.acknowledged"><span>✓</span> Task Confirmed - {{ task.acknowledgedAt | date:'shortTime' }}</p>
                   <p class="meta success-text" *ngIf="task.reportSubmitted"><span>✓</span> Report Submitted</p>
                </div>
                <div class="task-actions">
                   <div class="status-badge" [ngClass]="task.status?.toLowerCase()">{{ task.status }}</div>
                   <div class="btn-group">
                      <button *ngIf="!task.responderId" (click)="claimTask(task.id)" class="sm-btn info">Accept Task</button>
                      <button *ngIf="(task.status === 'PENDING' || task.status === 'IN_PROGRESS') && !task.acknowledged" (click)="acknowledgeTask(task.id)" class="sm-btn primary">Confirm</button>
                      <button *ngIf="task.acknowledged && task.status !== 'COMPLETED'" (click)="openReportModal(task.id, true)" class="sm-btn success">🏁 Complete</button>
                      <button *ngIf="task.acknowledged && task.status !== 'COMPLETED'" (click)="updateStatus(task.id, 'FAILED')" class="sm-btn danger">Cancel</button>
                      <button *ngIf="task.acknowledged || task.status === 'IN_PROGRESS' || task.status === 'VERIFIED'" (click)="notifyCitizen(task.id)" class="sm-btn info">Message Citizen</button>
                      <button *ngIf="task.acknowledged || task.status === 'IN_PROGRESS'" (click)="openReportModal(task.id)" class="sm-btn primary">📝 Report Status</button>
                   </div>
                </div>
              </div>

              <div *ngIf="tasks.length === 0" class="empty-state">You have no tasks assigned.</div>
            </div>
          </div>

          <!-- REPORT MODAL -->
          <div class="modal-backdrop" *ngIf="showReportModal" (click)="showReportModal = false"></div>
          <div class="report-modal fade-in" *ngIf="showReportModal">
            <h3 [class.success-text]="reportIsFinal">
             <span class="icon">{{ reportIsFinal ? '🏁' : '📝' }}</span> 
             {{ reportIsFinal ? 'Final Mission Audit' : 'Submit Operation Report' }}
           </h3>
           <p class="description" style="margin-bottom: 4px;">
             {{ reportIsFinal ? 'Summarize the mission results to close this operation.' : 'Document your progress and upload situational images.' }}
           </p>
           <p class="meta" style="font-size: 0.75rem; margin-bottom: 16px;">Mission ID: #{{selectedTaskId}}</p>
            
            <div class="form-group">
              <label>Status Update</label>
              <textarea [(ngModel)]="reportData.statusUpdate" rows="4" placeholder="Describe the current situation and actions taken..."></textarea>
            </div>
            
            <div class="form-group">
              <label>Situation Images</label>
              <div class="file-upload-container">
                <input type="file" #fileInput (change)="onFileSelected($event)" multiple accept="image/*" style="display: none;">
                <button class="secondary-btn w-full" (click)="fileInput.click()" [disabled]="isUploading">
                  <span class="icon">📷</span> {{ isUploading ? 'Processing...' : 'Attach Photos' }}
                </button>
              </div>

              <div class="image-previews-grid mt-3" *ngIf="reportData.imageUrls.length > 0">
                <div class="preview-item" *ngFor="let url of reportData.imageUrls; let i = index">
                  <img [src]="url" class="report-img" alt="Preview">
                  <button class="remove-img-btn" (click)="removeImage(i)">✕</button>
                </div>
              </div>
            </div>
            
            <div class="action-group mt-4" style="justify-content: flex-end;">
               <button class="secondary-btn" (click)="showReportModal = false" [disabled]="isSubmitting">Cancel</button>
               <button class="sm-btn" [ngClass]="reportIsFinal ? 'success' : 'primary'" (click)="submitReport()" [disabled]="isSubmitting || isUploading">
                 <span class="icon" *ngIf="isSubmitting">⏳</span>
                 {{ isSubmitting ? 'Submitting...' : (reportIsFinal ? 'Complete Mission' : 'Submit Report') }}
               </button>
             </div>
          </div>

          <!-- MESSAGE CITIZEN MODAL -->
          <div class="modal-backdrop" *ngIf="showMessageModal" (click)="showMessageModal = false"></div>
          <div class="report-modal fade-in" *ngIf="showMessageModal">
            <h3>
              <span class="icon">💬</span> Message Citizen
            </h3>
            <p class="description">
              Send a custom update to the citizen regarding this rescue operation.
            </p>
            <p class="meta" style="font-size: 0.75rem; margin-bottom: 16px;">Mission ID: #{{selectedTaskId}}</p>
            
            <div class="form-group">
              <label>Your Message</label>
              <textarea [(ngModel)]="citizenMessage" rows="4" placeholder="e.g., We are 5 minutes away, stay safe..."></textarea>
            </div>
            
            <div class="action-group mt-4" style="justify-content: flex-end;">
               <button class="secondary-btn" (click)="showMessageModal = false" [disabled]="isSubmitting">Cancel</button>
               <button class="sm-btn primary" (click)="submitCitizenNotification()" [disabled]="isSubmitting || !citizenMessage.trim()">
                 <span class="icon" *ngIf="isSubmitting">⏳</span>
                 {{ isSubmitting ? 'Sending...' : 'Send Message' }}
               </button>
             </div>
          </div>

          <!-- PROFILE TAB -->
          <div *ngIf="activeTab === 'profile'" class="fade-in">
             <div class="card profile-card">
               <div class="avatar-large">RES</div>
               <h2>Responder Profile</h2>
               <p class="profile-meta">Unit ID: #8821 | Status: Active</p>
               <button class="primary-btn mt-6" (click)="shareLocation()">Update My Location</button>
               
               <div class="stats-row mt-6">
                 <div class="stat-card" (click)="activeTab = 'missions'">
                   <div class="stat-icon" style="background: #ecfdf5; color: #10b981;">🛡️</div>
                   <h3>{{ tasks.length }}</h3>
                   <p>Tasks Completed</p>
                   <div class="trend-line"></div>
                 </div>
                 <div class="stat-card" (click)="activeTab = 'alerts'; loadAlerts()">
                   <div class="stat-icon" style="background: #eff6ff; color: #3b82f6;">📢</div>
                   <h3>{{ alerts.length }}</h3>
                   <p>Recent Alerts</p>
                   <div class="trend-line"></div>
                 </div>
                 <div class="stat-card">
                   <div class="stat-icon" style="background: #fdf2f8; color: #db2777;">⛓️</div>
                   <h3 class="success-text">ONLINE</h3>
                   <p>System Status</p>
                   <div class="trend-line"></div>
                 </div>
               </div>
             </div>
          </div>

          <!-- NOTIFICATIONS -->
          <div class="popup-overlay" *ngIf="popupVisible" (click)="popupVisible = false">
            <div class="popup-card" [ngClass]="popupIsError ? 'popup-error' : 'popup-success'" (click)="$event.stopPropagation()">
              <div class="popup-icon">{{ popupIsError ? '❌' : '✅' }}</div>
              <h4 class="popup-title">{{ popupIsError ? 'Error' : 'Notification' }}</h4>
              <p class="popup-msg">{{ popupMessage }}</p>
              <button class="popup-dismiss" (click)="popupVisible = false">OK</button>
            </div>
          </div>

          <div *ngIf="message" class="message" [ngClass]="{'error': isError, 'success': !isError}">{{ message }}</div>

        </div>
      </main>
    </div>
  `,
  styles: [`
    :host { 
      display: block; 
      height: 100vh; 
      font-family: 'Outfit', sans-serif; 
      color: #1e293b; 
      background: #f8fafc; /* Light Grey/Lavender background */
    }
    
    .dashboard-container { 
      display: flex; 
      height: 100%; 
      background-color: #f8fafc;
      overflow: hidden;
    }
    
    /* SIDEBAR - DEEP ONYX (Driver Portal Style) */
    .sidebar { 
      width: 260px; 
      background: #0b0f19; /* Deep Onyx */
      color: #94a3b8; 
      display: flex; 
      flex-direction: column; 
      padding: 24px 0; 
      z-index: 100;
      box-shadow: 4px 0 20px rgba(0,0,0,0.1);
    }
    
    .sidebar-header { padding: 0 24px 32px; }
    .sidebar-header h2 { margin: 0; font-size: 1.4rem; font-weight: 800; letter-spacing: -0.02em; color: white; }
    .highlight { color: #818cf8; } /* Soft Purple */
    
    .profile-summary { margin: 0 16px 32px; padding: 16px; background: rgba(255,255,255,0.03); border-radius: 12px; display: flex; align-items: center; gap: 12px; }
    .avatar { width: 40px; height: 40px; background: #6366f1; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.9rem; color: white; }
    .avatar-large { width: 80px; height: 80px; background: #0f172a; border-radius: 20px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 2rem; color: #94a3b8; margin: 0 auto 16px; border: 1px solid rgba(255,255,255,0.05); }
    
    .name { margin: 0; font-weight: 600; font-size: 0.85rem; color: white; }
    .role { margin: 2px 0 0; color: #64748b; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }

    .nav-links { display: flex; flex-direction: column; gap: 4px; flex: 1; }
    .nav-links a { padding: 12px 24px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 12px; color: #94a3b8; text-decoration: none; font-weight: 600; font-size: 0.85rem; position: relative; }
    .nav-links a:hover { color: white; background: rgba(255,255,255,0.02); }
    
    /* Active state with gradient and dot indicator */
    .nav-links a.active { 
      background: linear-gradient(to right, rgba(99, 102, 241, 0.15), transparent);
      color: white; 
    }
    .nav-links a.active::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      background: #818cf8;
      border-radius: 0 4px 4px 0;
    }
    .nav-links a.active::after {
      content: '';
      position: absolute;
      right: 16px;
      width: 6px;
      height: 6px;
      background: white;
      border-radius: 50%;
    }
    .nav-badge { position: absolute; right: 32px; background: #ef4444; color: white; font-size: 0.65rem; padding: 1px 5px; border-radius: 6px; font-weight: 800; }
    
    .logout-btn { margin: 16px; background: transparent; border: 1px solid rgba(255,255,255,0.1); color: #94a3b8; cursor: pointer; padding: 12px; display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 0.85rem; font-weight: 600; transition: all 0.2s; border-radius: 12px; font-family: 'Outfit', sans-serif; }
    .logout-btn:hover { background: rgba(225, 29, 72, 0.1); color: #fb7185; }

    /* MAIN CONTENT */
    .main-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .top-bar { background: white; padding: 16px 32px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; }
    .top-bar h1 { font-size: 1.25rem; color: #0f172a; margin: 0; font-weight: 800; }
    .date { color: #64748b; font-size: 0.8rem; font-weight: 500; }
    .status-pill { 
      display: flex; 
      align-items: center; 
      gap: 8px; 
      background: #f8fafc; 
      padding: 6px 12px; 
      border-radius: 8px; 
      border: 1px solid #e2e8f0; 
      color: #64748b; 
      font-size: 0.7rem; 
      font-weight: 700; 
      text-transform: uppercase; 
      cursor: pointer;
      transition: all 0.2s;
    }
    .status-pill:hover {
      background: #f1f5f9;
      border-color: #cbd5e1;
      color: #0f172a;
    }

    .content-scroll { padding: 24px 32px; overflow-y: auto; flex: 1; }

    /* HERO WELCOME BANNER */
    .welcome-banner { 
      background: #0f172a; 
      border-radius: 20px; 
      padding: 40px; 
      color: white; 
      margin-bottom: 24px; 
      position: relative; 
      overflow: hidden;
      display: flex;
      align-items: center;
      gap: 24px;
    }
    .welcome-banner::after {
      content: '';
      position: absolute;
      top: -50%;
      right: -10%;
      width: 300px;
      height: 300px;
      background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%);
      pointer-events: none;
    }
    .welcome-avatar {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #334155, #0f172a);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      font-weight: 900;
      color: #94a3b8;
      border: 1px solid rgba(255,255,255,0.1);
      position: relative;
    }
    .welcome-avatar .active-badge {
      position: absolute;
      bottom: -4px;
      right: -4px;
      width: 20px;
      height: 20px;
      background: #10b981;
      border: 4px solid #0f172a;
      border-radius: 50%;
    }
    .welcome-text h2 { margin: 0; font-size: 2rem; font-weight: 900; letter-spacing: -0.03em; }
    .welcome-text h2 span { color: #94a3b8; opacity: 0.8; }
    .welcome-text p { margin: 8px 0 0; color: #94a3b8; font-weight: 600; font-size: 0.9rem; }
    .share-btn { 
      margin-left: auto;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      color: white;
      padding: 10px 20px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .share-btn:hover { background: rgba(255,255,255,0.1); }
    
    .card { background: white; padding: 24px; border-radius: 20px; border: 1px solid #f1f5f9; box-shadow: 0 4px 12px rgba(0,0,0,0.03); margin-bottom: 24px; }
    .card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.06); }
    .map-container { position: relative; height: 350px; border-radius: 16px; overflow: hidden; background: #f1f5f9; margin-top: 16px; }
    .card h3 { margin: 0 0 20px; color: #0f172a; font-size: 1.1rem; font-weight: 800; display: flex; align-items: center; gap: 10px; }

    .alert-item { display: flex; align-items: center; gap: 16px; padding: 16px; background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 16px; margin-bottom: 12px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer; }
    .alert-item:hover { background: white; border-color: #818cf8; transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.05); }
    .alert-icon { font-size: 1.5rem; width: 44px; height: 44px; background: white; border-radius: 12px; display: flex; align-items: center; justify-content: center; border: 1px solid #f1f5f9; }
    .alert-info { flex: 1; }
    .alert-info h4 { margin: 0; font-size: 0.9rem; color: #0f172a; font-weight: 800; }
    .alert-info p { margin: 2px 0 0; font-size: 0.75rem; color: #64748b; font-weight: 600; }
    
    .card-item { padding: 20px; border: 1px solid #f1f5f9; border-radius: 16px; margin-bottom: 16px; background: #f8fafc; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer; }
    .card-item:hover { background: white; border-color: #818cf8; transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.05); }
    .icon-box { width: 40px; height: 40px; background: white; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; border: 1px solid #f1f5f9; }
    .item-body { font-size: 0.85rem; color: #334155; line-height: 1.5; margin: 16px 0; font-weight: 500; }
    .item-footer { display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: #64748b; font-weight: 700; }

    .task-item { padding: 24px; border: 1px solid #f1f5f9; border-radius: 20px; margin-bottom: 20px; background: white; display: flex; justify-content: space-between; align-items: center; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); }
    .task-item:hover { border-color: #818cf8; transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.06); }
    .task-actions { display: flex; flex-direction: column; align-items: flex-end; gap: 12px; }
    .header-text h4, .alert-info h4, .task-info h4 { margin: 0; font-size: 1.1rem; color: #0f172a; font-weight: 800; text-transform: capitalize; }
    .header-text small, .alert-info p { color: #64748b; font-size: 0.8rem; font-weight: 600; }
    
    .severity-badge { padding: 4px 10px; border-radius: 6px; font-size: 0.65rem; font-weight: 800; text-transform: uppercase; }
    .severity-badge.critical { background: #fee2e2; color: #ef4444; }
    .severity-badge.high { background: #ffedd5; color: #f97316; }
    .severity-badge.medium { background: #e0e7ff; color: #6366f1; }
    .severity-badge.low { background: #dcfce7; color: #22c55e; }

    /* FORM & UTILITY STYLES */
    .description { color: #64748b; font-size: 0.85rem; margin-bottom: 24px; font-weight: 500; }
    .meta { color: #1e293b; font-weight: 600; }
    .form-group { margin-bottom: 20px; display: flex; flex-direction: column; gap: 8px; }
    .form-group label { font-size: 0.75rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    
    input, select, textarea {
      padding: 12px 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      font-family: 'Outfit', sans-serif;
      font-size: 0.9rem;
      color: #1e293b;
      transition: all 0.2s;
      width: 100%;
    }
    input:focus, select:focus, textarea:focus {
      outline: none;
      border-color: #818cf8;
      background: white;
      box-shadow: 0 0 0 4px rgba(129, 140, 248, 0.1);
    }
    input::placeholder { color: #cbd5e1; }

    .action-group { display: flex; gap: 10px; align-items: center; }
    .empty-state { padding: 40px; text-align: center; color: #94a3b8; font-weight: 600; background: #f8fafc; border-radius: 16px; border: 2px dashed #e2e8f0; }
    .flex-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }

    .status-badge { 
      padding: 6px 12px; 
      border-radius: 8px; 
      font-size: 0.75rem; 
      font-weight: 800; 
      text-transform: uppercase; 
      letter-spacing: 0.025em;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid transparent;
    }
    .status-badge.pending { background: #f1f5f9; color: #64748b; border-color: #e2e8f0; }
    .status-badge.in_progress { background: #eff6ff; color: #1d4ed8; border-color: #dbeafe; }
    .status-badge.completed { background: #dcfce7; color: #15803d; border-color: #bbf7d0; }
    .status-badge.verified, .status-badge.sent_to_responder { background: #e0e7ff; color: #4338ca; border-color: #c7d2fe; }
    .status-badge.auto_escalated { 
      background: #fff7ed; 
      color: #c2410c; 
      border-color: #fed7aa; 
      animation: pulse-orange 2s infinite;
    }
    .status-badge.rejected, .status-badge.failed, .status-badge.cancelled { background: #fee2e2; color: #b91c1c; border-color: #fecaca; }

    @keyframes pulse-orange {
      0% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.4); }
      70% { box-shadow: 0 0 0 10px rgba(249, 115, 22, 0); }
      100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); }
    }

    .secondary-btn { 
      padding: 8px 16px; 
      background: white; 
      color: #334155; 
      border: 1px solid #e2e8f0; 
      border-radius: 10px; 
      cursor: pointer; 
      font-weight: 700; 
      font-size: 0.8rem; 
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .secondary-btn:hover { 
      background: #f8fafc;
      border-color: #cbd5e1;
      color: #0f172a;
      transform: translateY(-1px);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .secondary-btn:active { transform: translateY(0); }
    .secondary-btn .icon { font-size: 0.9rem; }

    .sm-btn { padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer; font-weight: 700; font-size: 0.8rem; transition: all 0.2s; font-family: 'Outfit', sans-serif; }
    .sm-btn.primary { background: #0f172a; color: white; }
    .sm-btn.success { background: #10b981; color: white; }
    .sm-btn.info { background: white; color: #64748b; border: 1px solid #e2e8f0; }
    .sm-btn:hover { transform: translateY(-1px); background: #1e293b; }
    
    .primary-btn { padding: 14px 28px; background: #0f172a; color: white; border: none; border-radius: 12px; cursor: pointer; font-weight: 800; transition: all 0.2s; font-size: 0.95rem; width: 100%; font-family: 'Outfit', sans-serif; }
    .primary-btn:hover { background: #1e293b; transform: translateY(-2px); }

    /* STAT CARDS (Driver Portal Style) */
    .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
    .stat-card { 
      background: white; 
      padding: 24px; 
      border-radius: 20px; 
      border: 1px solid #f1f5f9; 
      position: relative; 
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.03);
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .stat-card:hover { 
      transform: translateY(-5px); 
      box-shadow: 0 12px 24px rgba(0,0,0,0.08); 
      border-color: #818cf8;
    }
    .stat-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      margin-bottom: 16px;
    }
    .stat-card h3 { font-size: 1.75rem; margin: 0; color: #0f172a !important; font-weight: 900; }
    .stat-card p { margin: 4px 0 0; color: #64748b; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
    .trend-line {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 40px;
      background: linear-gradient(to top, rgba(99, 102, 241, 0.05), transparent);
    }
    .trend-line::after {
      content: '';
      position: absolute;
      bottom: 12px;
      left: 12px;
      right: 12px;
      height: 2px;
      background: #e2e8f0;
      border-radius: 1px;
    }
    .trend-line::before {
      content: '';
      position: absolute;
      bottom: 12px;
      left: 12px;
      width: 60%;
      height: 2px;
      background: #818cf8;
      border-radius: 1px;
      box-shadow: 0 0 8px rgba(129, 140, 248, 0.5);
    }

    .popup-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.4); z-index: 20000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
    .popup-card { background: white; padding: 32px; border-radius: 20px; width: 340px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.2); border: 1px solid #f1f5f9; }
    .popup-success { border-bottom: 6px solid #10b981; }
    .popup-error { border-bottom: 6px solid #ef4444; }
    .popup-dismiss { padding: 12px 32px; border-radius: 10px; border: none; font-weight: 800; background: #0f172a; color: white; cursor: pointer; transition: all 0.2s; margin-top: 10px; }
    .popup-dismiss:hover { background: #1e293b; }

    .success-text { color: #10b981; font-weight: 800; }
    .profile-card h2 { color: #0f172a; margin-top: 16px; margin-bottom: 4px; }
    .profile-meta { color: #64748b; font-weight: 600; margin-bottom: 24px; }
    .active-dot { height: 8px; width: 8px; background: #10b981; border-radius: 50%; display: inline-block; }
    .message { position: fixed; bottom: 24px; right: 24px; padding: 12px 24px; border-radius: 12px; font-weight: 700; font-size: 0.85rem; background: #0f172a; color: white; box-shadow: 0 8px 16px rgba(0,0,0,0.1); z-index: 1000; }
    .message.error { background: #ef4444; }
    
    .fade-in { animation: fadeIn 0.4s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .mt-6 { margin-top: 24px; }
    .report-modal { 
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: white; padding: 32px; border-radius: 24px; width: 480px;
      z-index: 10001; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
      border: 1px solid #f1f5f9;
    }
    .report-modal h3 { 
      margin: 0 0 8px; 
      color: #0f172a; 
      font-size: 1.5rem; 
      font-weight: 900; 
      display: flex; 
      align-items: center; 
      gap: 12px; 
    }
    .report-modal h3.success-text { color: #10b981; }
    .modal-backdrop { 
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.5); z-index: 10000; backdrop-filter: blur(4px);
    }
    .w-full { width: 100%; justify-content: center; }
    .image-previews-grid { 
      display: grid; 
      grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); 
      gap: 12px; 
    }
    .preview-item { 
      position: relative; 
      aspect-ratio: 1; 
      border-radius: 12px; 
      overflow: hidden; 
      border: 1px solid #e2e8f0;
    }
    .preview-item img { 
      width: 100%; 
      height: 100%; 
      object-fit: cover; 
    }
    .remove-img-btn { 
      position: absolute; 
      top: 4px; 
      right: 4px; 
      width: 20px; 
      height: 20px; 
      border-radius: 50%; 
      background: rgba(0,0,0,0.6); 
      color: white; 
      border: none; 
      font-size: 10px; 
      cursor: pointer; 
      display: flex; 
      align-items: center; 
      justify-content: center;
      backdrop-filter: blur(4px);
    }
    .remove-img-btn:hover { background: #ef4444; }
  `]
})
export class ResponderDashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  activeTab = 'dashboard';
  tasks: any[] = [];
  alerts: any[] = [];
  forwardAlerts: any[] = [];
  message = '';
  isError = false;
  currentDate = new Date();

  // Reporting Logic
  showReportModal = false;
  selectedTaskId: number | null = null;
  reportData = {
    statusUpdate: '',
    imageUrls: [] as string[]
  };
  taskReports: any[] = [];
  isUploading = false;
  isSubmitting = false;
  reportIsFinal = false;

  // Messaging Logic
  showMessageModal = false;
  citizenMessage = '';

  // Professional Popup
  popupVisible = false;
  popupMessage = '';
  popupIsError = false;
  private clockTimer: any;
  private popupTimer: any;

  private apiUrl = `${environment.apiUrl}/responder`;
  private alertsApiUrl = `${environment.apiUrl}/disasters`;
  private authApiUrl = `${environment.apiUrl}/auth`;

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private wsService: WebSocketService,
    private responderService: ResponderService
  ) {
    this.loadTasks();
    this.loadAlerts();
    this.loadForwardAlerts();
  }

  ngOnDestroy() {
    this.wsSubscriptions.forEach(sub => {
      if (sub && sub.unsubscribe) sub.unsubscribe();
    });
    if (this.clockTimer) clearInterval(this.clockTimer);
  }

  logout() {
    this.authService.logout();
  }

  getPageTitle(): string {
    switch (this.activeTab) {
      case 'dashboard': return 'Mission Control';
      case 'forward': return 'Alerts to Forward';
      case 'alerts': return 'Active Disaster Alerts';
      case 'missions': return 'My Missions';
      case 'profile': return 'My Profile';
      default: return 'Responder Dashboard';
    }
  }

  getIcon(type: string): string {
    switch (type?.toUpperCase()) {
      case 'FLOOD': return '🌊';
      case 'EARTHQUAKE': return '⛰️';
      case 'FIRE': return '🔥';
      case 'STORM': return '⛈️';
      case 'CYCLONE': return '🌀';
      default: return '⚠️';
    }
  }

  private getHeaders() {
    return {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${this.authService.getToken()}`
      })
    };
  }

  loadTasks() {
    this.http.get<any[]>(`${this.apiUrl}/tasks`, this.getHeaders())
      .pipe(catchError(err => {
        console.error(err);
        this.isError = true;
        this.message = 'Failed to load tasks.';
        return of([]);
      }))
      .subscribe(data => {
        this.tasks = data;
        this.isError = false;
      });
  }

  loadAlerts() {
    this.http.get<any[]>(`${this.alertsApiUrl}`, this.getHeaders())
      .pipe(catchError(err => {
        console.error('Failed to load alerts:', err);
        return of([]);
      }))
      .subscribe(data => {
        this.alerts = data;
      });
  }

  loadForwardAlerts() {
    this.responderService.getResponderAlerts()
      .pipe(catchError(err => {
        console.error('Failed to load forwarding alerts:', err);
        return of([]);
      }))
      .subscribe(data => {
        this.forwardAlerts = data;
      });
  }

  forwardToCitizen(alert: any) {
    this.responderService.forwardToCitizen(alert.id).subscribe({
      next: () => {
        this.showPopup(`Alert "${alert.title}" has been forwarded to citizens.`, false);
        this.loadForwardAlerts();
        this.loadAlerts();
      },
      error: (err) => {
        this.showPopup('Failed to forward alert.', true);
        console.error('Error forwarding alert:', err);
      }
    });
  }

  acknowledgeTask(taskId: number) {
    this.http.patch(`${this.apiUrl}/tasks/${taskId}/acknowledge`, {}, this.getHeaders())
      .subscribe({
        next: () => {
          this.showPopup('Mission acknowledged successfully! Proceed with caution.', false);
          this.loadTasks();
        },
        error: () => {
          this.showPopup('Failed to acknowledge mission.', true);
        }
      });
  }

  claimTask(taskId: number) {
    this.http.patch(`${this.apiUrl}/tasks/${taskId}/claim`, {}, this.getHeaders())
      .subscribe({
        next: () => {
          this.showPopup('Mission claimed successfully! You are now assigned.', false);
          this.loadTasks();
        },
        error: () => {
          this.showPopup('Failed to claim mission.', true);
        }
      });
  }

  updateStatus(taskId: number, status: string) {
    this.http.patch(`${this.apiUrl}/tasks/${taskId}/status?status=${status}`, {}, this.getHeaders())
      .subscribe({
        next: (res) => {
          this.showPopup(`Task has been updated to ${status}.`, false);
          this.loadTasks();
        },
        error: (err) => {
          this.showPopup('Failed to update task status.', true);
        }
      });
  }

  notifyCitizen(taskId: number) {
    this.selectedTaskId = taskId;
    this.citizenMessage = 'A responder has acknowledged your request and is on the way.';
    this.showMessageModal = true;
  }

  submitCitizenNotification() {
    if (!this.selectedTaskId || !this.citizenMessage.trim()) return;

    this.isSubmitting = true;
    this.http.post(`${this.apiUrl}/tasks/${this.selectedTaskId}/notify-citizen`, { message: this.citizenMessage }, this.getHeaders())
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.showMessageModal = false;
          this.showPopup('Citizen has been notified of your status!', false);
        },
        error: () => {
          this.isSubmitting = false;
          this.showPopup('Failed to notify citizen.', true);
        }
      });
  }

  openReportModal(taskId: number, isFinal: boolean = false) {
    this.selectedTaskId = taskId;
    this.reportIsFinal = isFinal;
    this.reportData = { statusUpdate: '', imageUrls: [] };
    this.isSubmitting = false;
    this.isUploading = false;
    this.showReportModal = true;
  }

  onFileSelected(event: any) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    this.isUploading = true;
    const promises = Array.from(files).map((file: any) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e: any) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(promises).then((base64Strings: any) => {
      this.reportData.imageUrls = [...this.reportData.imageUrls, ...base64Strings];
    }).catch(err => {
      console.error("File processing error:", err);
      this.showPopup("Failed to process images.", true);
    }).finally(() => {
      this.isUploading = false;
    });
  }

  removeImage(index: number) {
    this.reportData.imageUrls.splice(index, 1);
  }

  submitReport() {
    console.log("Submit button clicked! Task ID:", this.selectedTaskId);
    this.showPopup("Processing submission... please wait.", false);

    if (!this.selectedTaskId) {
      console.error("No task selected for report submission.");
      this.showPopup("No task selected. Please close and reopen the modal.", true);
      return;
    }

    if (!this.reportData.statusUpdate.trim()) {
      this.showPopup("Please provide a status update.", true);
      return;
    }

    this.isSubmitting = true;
    const payload = {
      statusUpdate: this.reportData.statusUpdate,
      imageUrls: this.reportData.imageUrls.join('|'),
      markAsCompleted: this.reportIsFinal
    };

    console.log("Submitting report payload:", payload);

    this.responderService.submitReport(this.selectedTaskId, payload, this.getHeaders()).subscribe({
      next: (res) => {
        console.log("Report response:", res);
        this.isSubmitting = false;

        // Comprehensive Success Feedback
        this.showPopup("Mission status updated successfully! 🛡️", false);
        this.message = "Submission Success: " + (this.reportIsFinal ? "Mission Completed" : "Status Updated");
        this.isError = false;

        this.showReportModal = false;
        this.reportData = { statusUpdate: '', imageUrls: [] }; // Reset form
        this.loadTasks();
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error("Report submission error details:", err);

        let errorMsg = "Unknown error";
        if (err.error) {
          if (typeof err.error === 'string') errorMsg = err.error;
          else if (err.error.message) errorMsg = err.error.message;
          else if (err.error.error) errorMsg = err.error.error;
        } else if (err.message) {
          errorMsg = err.message;
        }

        this.showPopup("Submission Failed: " + errorMsg, true);
        this.message = "Failed: " + errorMsg;
        this.isError = true;
      }
    });
  }

  shareLocation() {
    if (navigator.geolocation) {
      this.showPopup("Acquiring GPS location...", false);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const payload = { latitude: position.coords.latitude, longitude: position.coords.longitude };
          this.http.put(`${this.authApiUrl}/profile/location`, payload, this.getHeaders()).subscribe({
            next: () => {
              this.showPopup("Profile location updated successfully ✅", false);
              this.activeTab = 'dashboard';
            },
            error: () => {
              this.showPopup("Failed to save profile location.", true);
            }
          })
        },
        (err) => {
          this.showPopup("Location access denied.", true);
        }
      );
    } else {
      this.showPopup("Geolocation is not supported by your browser.", true);
    }
  }

  respondToAlert(alert: any) {
    this.showPopup(`Responding to: ${alert.title || alert.disasterType} at ${alert.region}`, false);

    // Center map on alert location if available
    if (alert.latitude && alert.longitude) {
      this.centerMapOnTask(alert);
    }
  }

  // WebSocket & Map Logic
  private wsSubscriptions: any[] = [];
  private map: any;
  private markers: any[] = [];

  ngOnInit() {
    this.clockTimer = setInterval(() => {
      this.currentDate = new Date();
    }, 1000);

    // Subscribe to task updates
    const taskSub = this.wsService.subscribe('/topic/responder-tasks', (msg: any) => {
      console.log('Received responder task update:', msg);
      if (msg.type === 'TASK_VERIFIED' || msg.type === 'NEW_SOS') {
        this.showPopup(`🛡️ New Mission: ${msg.description || 'Emergency SOS'}`, false);
        this.loadTasks();
      }
    });
    if (taskSub) this.wsSubscriptions.push(taskSub);

    // Subscribe to alert updates (Escalated or Sent to Responder)
    const alertSub = this.wsService.subscribe('/topic/responder-alerts', (msg: any) => {
      console.log('Received responder alert update:', msg);
      this.showPopup(`📡 New Alert: ${msg.title || msg.disasterType}`, msg.severity === 'CRITICAL');
      if (msg.status === 'AUTO_ESCALATED') {
        this.showPopup(`⚠️ AUTO-ESCALATED: ${msg.title}`, true);
      }
      this.loadForwardAlerts();
      this.loadAlerts();
    });
    if (alertSub) this.wsSubscriptions.push(alertSub);
  }

  ngAfterViewInit() {
    this.initLeafletMap();
    this.renderMarkers();
  }

  private initLeafletMap() {
    if (this.map) return;
    this.map = L.map('responderMap').setView([20.5937, 78.9629], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        this.map.setView([lat, lon], 12);
        L.marker([lat, lon]).addTo(this.map).bindPopup("<b>Your Location</b>").openPopup();
      });
    }
  }

  private renderMarkers() {
    if (!this.map) return;
    this.markers.forEach(m => this.map.removeLayer(m));
    this.markers = [];

    const alertIcon = L.icon({
      iconUrl: 'https://cdn-icons-png.flaticon.com/512/564/564619.png',
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    });

    this.alerts.forEach(a => {
      if (a.latitude && a.longitude) {
        const popupContent = `
          <div style="line-height: 1.4;">
            <b>Disaster Event</b><br>
            Type: ${a.disasterType || 'Unknown'}<br>
            Severity: ${a.severity || 'Unknown'}<br>
            Location: ${a.locationName || a.region || 'Unknown'}
          </div>
        `;
        const m = L.marker([a.latitude, a.longitude], { icon: alertIcon })
          .bindPopup(popupContent, { autoClose: false, closeOnClick: false })
          .addTo(this.map)
          .openPopup();
        this.markers.push(m);
      }
    });

    if (this.markers.length > 0) {
      const group = L.featureGroup(this.markers);
      this.map.fitBounds(group.getBounds().pad(0.2));
    }
  }


  updateMapUrl(minLon: any, minLat: any, maxLon: any, maxLat: any) {
    if (this.map) {
      this.map.fitBounds([[minLat, minLon], [maxLat, maxLon]]);
    }
  }

  centerMapOnTask(task: any) {
    if (this.map && task.latitude && task.longitude) {
      this.map.setView([task.latitude, task.longitude], 14);
      L.marker([task.latitude, task.longitude]).addTo(this.map)
        .bindPopup(`<b>Alert Location</b><br>${task.title}`).openPopup();
    }
  }

  private showPopup(msg: string, isErr: boolean) {
    this.popupMessage = msg;
    this.popupIsError = isErr;
    this.popupVisible = true;
    if (this.popupTimer) clearTimeout(this.popupTimer);
    this.popupTimer = setTimeout(() => this.popupVisible = false, 5000);
  }
}
