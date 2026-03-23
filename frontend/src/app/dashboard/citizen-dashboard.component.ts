import { Component, OnDestroy, OnInit, AfterViewInit } from '@angular/core';

declare var L: any;
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { of, Subscription } from 'rxjs';
import { environment } from '../../environments/environment';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { WebSocketService } from '../services/websocket.service';

@Component({
  selector: 'app-citizen-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dashboard-container">
      
      <!-- SIDEBAR -->
      <aside class="sidebar">
        <div class="sidebar-header">
          <h2>Disaster<span class="highlight">Guard</span></h2>
        </div>

        <div class="profile-summary">
          <div class="avatar">C</div>
          <div>
             <p class="name">Citizen User</p>
             <p class="role">Public Access</p>
          </div>
        </div>

        <nav class="nav-links">
          <a (click)="activeTab = 'dashboard'" [class.active]="activeTab === 'dashboard'">
            <span>🏠</span> Overview
          </a>
          <a (click)="activeTab = 'alerts'" [class.active]="activeTab === 'alerts'">
            <span>🔔</span> Active Alerts
          </a>
          <a (click)="activeTab = 'reports'" [class.active]="activeTab === 'reports'">
            <span>🚑</span> Request Help
          </a>
          <a (click)="activeTab = 'profile'" [class.active]="activeTab === 'profile'">
            <span>👤</span> My Profile
          </a>
        </nav>

        <button class="logout-btn" (click)="logout()">
          <span>🚪</span> Logout
        </button>
      </aside>

      <!-- MAIN CONTENT -->
      <main class="main-content">
        <div class="top-bar">
          <h1>{{ getPageTitle() }}</h1>
          <div class="date">{{ currentDate | date:'EEEE, MMMM d, y, h:mm:ss a' }}</div>
        </div>

        <div class="content-scroll">
          
          <!-- DASHBOARD TAB -->
          <div *ngIf="activeTab === 'dashboard'" class="fade-in">
             
             <!-- HERO BANNER -->
             <div class="welcome-banner">
               <div class="welcome-avatar">
                 C
                 <div class="active-badge"></div>
               </div>
               <div class="welcome-text">
                 <h2>SAFETY <span>MONITOR</span></h2>
                 <p>San Francisco • Protected • System Sync: Active</p>
               </div>
               <button class="share-btn" (click)="shareLocation()">UPDATE LOCATION +</button>
             </div>

             <!-- Search & Filter -->
             <div class="search-section">
                <input type="text" placeholder="Search location..." [(ngModel)]="searchQuery" (keyup.enter)="searchLocation()" class="search-input">
                <div class="filters">
                   <!-- Type Filter Dropdown -->
                   <div class="dropdown">
                      <button class="chip" (click)="toggleDropdown('type')">Type: {{ getFilterLabel('type') }} ⌄</button>
                      <div class="dropdown-content" *ngIf="activeDropdown === 'type'">
                         <a (click)="setFilter('type', '')">All</a>
                         <a (click)="setFilter('type', 'FLOOD')">Flood</a>
                         <a (click)="setFilter('type', 'EARTHQUAKE')">Earthquake</a>
                         <a (click)="setFilter('type', 'FIRE')">Fire</a>
                         <a (click)="setFilter('type', 'STORM')">Storm</a>
                      </div>
                   </div>

                   <!-- Severity Filter Dropdown -->
                   <div class="dropdown">
                      <button class="chip" (click)="toggleDropdown('severity')">Severity: {{ getFilterLabel('severity') }} ⌄</button>
                      <div class="dropdown-content" *ngIf="activeDropdown === 'severity'">
                         <a (click)="setFilter('severity', '')">All</a>
                         <a (click)="setFilter('severity', 'CRITICAL')">Critical</a>
                         <a (click)="setFilter('severity', 'HIGH')">High</a>
                         <a (click)="setFilter('severity', 'MEDIUM')">Medium</a>
                         <a (click)="setFilter('severity', 'LOW')">Low</a>
                      </div>
                   </div>

                   <span class="chip" [class.active]="isNearMeActive" (click)="toggleNearMe()">Near Me</span>
                   <button class="secondary-btn btn-sm" *ngIf="hasActiveFilters()" (click)="clearFilters()">Clear All</button>
                </div>
             </div>

             <div class="card map-card">
              <h3><span class="icon">🗺️</span> Target Region Monitor</h3>
              <div class="map-container" id="citizenMap" style="height: 300px; border-radius: 16px; border: 1px solid #e2e8f0; z-index: 1;"></div>
              <p class="map-caption" *ngIf="mapLocationName">Location: {{ mapLocationName }}</p>
             </div>

             <div class="card">
               <div class="flex-header">
                 <h3><span class="icon">🚨</span> Priority Alerts</h3>
                 <button class="secondary-btn" (click)="loadAlerts()"><span class="icon">🔄</span> Refresh Feed</button>
               </div>
               
               <div *ngIf="alerts.length === 0" class="empty-state">No active alerts match your criteria. Stay safe.</div>
               
                <div *ngFor="let alert of alerts.slice(0, 3)" class="alert-item animate-up">
                  <div class="alert-icon">{{ getIcon(alert.disasterType) }}</div>
                  <div class="alert-info">
                    <div class="alert-title-row">
                      <h4>{{ alert.title || alert.disasterType }}</h4>
                      <div class="severity-badge" [ngClass]="alert.severity?.toLowerCase()">{{ alert.severity }}</div>
                    </div>
                    <p class="region-text">📍 {{ alert.region }}</p>
                    <p class="broadcast-time">📢 Broadcast: {{ (alert.verifiedAt || alert.createdAt) | date:'shortTime' }}</p>
                  </div>
                  <div class="quick-share">
                    <button (click)="$event.stopPropagation(); shareOnWhatsApp(alert)" class="tool-btn whatsapp" title="Share on WhatsApp">
                      <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.06 3.978l-1.127 4.117 4.217-1.107c1.173.64 2.493.978 3.829.978h.001c4.368 0 7.926-3.558 7.93-7.926a7.858 7.858 0 0 0-2.333-5.594ZM7.994 14.522a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.502c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592Zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232Z"/></svg>
                    </button>
                    <button (click)="$event.stopPropagation(); shareOnTwitter(alert)" class="tool-btn twitter" title="Share on X">
                      <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.055-4.425 5.055H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.6.75zm-.86 13.028h1.36L4.323 2.145H2.865l8.875 11.633z"/></svg>
                    </button>
                  </div>
                </div>
             </div>
          </div>

          <!-- ALERTS TAB -->
          <div *ngIf="activeTab === 'alerts'" class="fade-in">
            <div class="card">
              <div class="flex-header">
                <h3>All Active Alerts</h3>
                <button class="secondary-btn" (click)="loadAlerts()"><span class="icon">🔄</span> Refresh</button>
              </div>

              <div *ngFor="let alert of alerts" class="alert-card-lg animate-up">
                <div class="alert-header">
                   <div class="icon-box">{{ getIcon(alert.disasterType) }}</div>
                    <div class="header-text">
                      <h3>{{ alert.title || alert.disasterType }}</h3>
                      <small class="alert-timestamp">Broadcasted: {{ (alert.verifiedAt || alert.createdAt) | date:'medium' }}</small>
                    </div>
                   <div class="severity-badge" [ngClass]="alert.severity.toLowerCase()">{{ alert.severity }}</div>
                </div>
                 <p class="alert-body">{{ alert.description || alert.message }}</p>
                 <div class="alert-footer">
                   <div class="footer-info">
                     <span>📍 {{ alert.region }}</span>
                   </div>
                   <div class="footer-actions">
                     <button (click)="shareOnWhatsApp(alert)" class="full-share-btn whatsapp">
                       <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.06 3.978l-1.127 4.117 4.217-1.107c1.173.64 2.493.978 3.829.978h.001c4.368 0 7.926-3.558 7.93-7.926a7.858 7.858 0 0 0-2.333-5.594ZM7.994 14.522a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.502c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592Zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232Z"/></svg> WhatsApp
                     </button>
                     <button (click)="shareOnTwitter(alert)" class="full-share-btn twitter">
                       <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.055-4.425 5.055H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.6.75zm-.86 13.028h1.36L4.323 2.145H2.865l8.875 11.633z"/></svg> X
                     </button>
                     <button (click)="shareOnFacebook(alert)" class="full-share-btn facebook">
                       <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M16 8.049c0-4.446-3.582-8.05-8-8.05C3.58 0-.002 3.603-.002 8.05c0 4.017 2.926 7.347 6.75 7.951v-5.625h-2.03V8.05H6.75V6.275c0-2.017 1.195-3.131 3.022-3.131.876 0 1.791.157 1.791.157v1.98h-1.009c-.993 0-1.303.621-1.303 1.258V8.05h2.218l-.354 2.326H9.25V16c3.824-.604 6.75-3.934 6.75-7.951z"/></svg> Facebook
                     </button>
                   </div>
                 </div>
              </div>

              <div *ngIf="alerts.length === 0" class="empty-state">No alerts found.</div>
            </div>
          </div>

          <!-- REPORTS TAB -->
          <div *ngIf="activeTab === 'reports'" class="fade-in">
             <div class="card danger-zone">
               <div class="sos-header">
                 <div class="sos-icon-large">🆘</div>
                 <h3>Emergency Assistance</h3>
                 <p *ngIf="!sosStatus">Establish a direct connection with our 24/7 rescue coordination center. Your precise location and profile telemetry will be shared with the rapid response team.</p>
               </div>
               
               <div *ngIf="sosStatus" class="sos-status-box animate-up">
                  <div class="sos-badge" [ngClass]="sosStatus.toLowerCase()">
                      {{ getSosStatusLabel() }}
                  </div>
                  <p class="sos-msg">{{ sosMessage }}</p>
                  <button class="secondary-btn btn-sm mt-4" (click)="sosStatus = null; sosMessage = ''">Cancel Connection</button>
               </div>

               <button *ngIf="!sosStatus" class="danger-btn-lg" (click)="openSosModal()" [disabled]="isLoading">
                 <span class="sos-symbol">⚡</span>
                 {{ isLoading ? 'ESTABLISHING SECURE LINK...' : 'INITIATE SOS PROTOCOL' }}
               </button>
               
               <div class="emergency-contacts" *ngIf="!sosStatus">
                 <div class="contact">
                   <span>Police</span>
                   <strong>911</strong>
                 </div>
                 <div class="contact">
                   <span>Medical</span>
                   <strong>911</strong>
                 </div>
                 <div class="contact">
                   <span>Fire</span>
                   <strong>911</strong>
                 </div>
               </div>
             </div>
          </div>

          <!-- PROFILE TAB -->
          <div *ngIf="activeTab === 'profile'" class="fade-in">
             <div class="card profile-card">
               <div class="avatar-large">C</div>
               <h2>Citizen User</h2>
               <p>San Francisco, CA</p>
               <button class="primary-btn" (click)="shareLocation()">Update My Location</button>
             </div>
          </div>

          <!-- SOS MODAL -->
          <div class="modal-backdrop" *ngIf="showSosModal" (click)="showSosModal = false"></div>
          <div class="report-modal sos-modal fade-in" *ngIf="showSosModal">
            <div class="modal-header-sos">
              <h3><span class="icon">🚒</span> Emergency Rescue Request</h3>
              <button class="close-btn" (click)="showSosModal = false">✕</button>
            </div>
            
            <p class="description">Your request will be broadcast to the nearest available rescue teams.</p>
            
            <div class="form-group">
              <label>Location Details</label>
              <input type="text" [(ngModel)]="sosRequestData.locationDetails" placeholder="Enter exact address or landmark...">
            </div>
            
            <div class="form-grid">
              <div class="form-group">
                <label>Emergency Type</label>
                <select [(ngModel)]="sosRequestData.emergencyType">
                  <option value="Trapped in Flood">Trapped in Flood</option>
                  <option value="Medical Emergency">Medical Emergency</option>
                  <option value="Fire Outbreak">Fire Outbreak</option>
                  <option value="Seismic Damage">Seismic Damage</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div class="form-group">
                <label>Severity Level</label>
                <select [(ngModel)]="sosRequestData.citizenSeverity">
                  <option value="Critical">Critical (Immediate danger)</option>
                  <option value="High">High (Serious injury/damage)</option>
                  <option value="Medium">Medium (Stable but needs help)</option>
                  <option value="Low">Low (Non-emergency assistance)</option>
                </select>
              </div>
            </div>
            
            <button class="primary-btn mt-4 danger-btn" (click)="submitEmergencyRequest()" [disabled]="isLoading">
              {{ isLoading ? 'SUBMITTING...' : 'Submit Immediate Request' }}
            </button>
          </div>

          <!-- PROFESSIONAL POPUP NOTIFICATION -->
          <div class="popup-overlay" *ngIf="popupVisible" (click)="popupVisible = false">
            <div class="popup-card" [ngClass]="popupIsError ? 'popup-error' : 'popup-success'" (click)="$event.stopPropagation()">
              <div class="popup-icon">{{ popupIsError ? '❌' : '✅' }}</div>
              <h4 class="popup-title">{{ popupIsError ? 'Action Failed' : 'Success' }}</h4>
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
    
    .logout-btn { margin: 16px; background: transparent; border: 1px solid rgba(255,255,255,0.1); color: #94a3b8; cursor: pointer; padding: 12px; display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 0.85rem; font-weight: 600; transition: all 0.2s; border-radius: 12px; font-family: 'Outfit', sans-serif; }
    .logout-btn:hover { background: rgba(225, 29, 72, 0.1); color: #fb7185; }

    /* MAIN CONTENT */
    .main-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .top-bar { background: white; padding: 16px 32px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; }
    .top-bar h1 { font-size: 1.25rem; color: #0f172a; margin: 0; font-weight: 800; }
    .date { color: #64748b; font-size: 0.8rem; font-weight: 500; }

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

    /* SEARCH & FILTERS */
    .search-section { display: flex; gap: 14px; margin-bottom: 24px; align-items: center; flex-wrap: wrap; padding: 16px; background: white; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
    .search-input { flex: 1; padding: 12px 20px; border: 1px solid #e2e8f0; border-radius: 12px; font-family: 'Outfit', sans-serif; font-size: 0.9rem; color: #1e293b; background: #f8fafc; }
    .search-input:focus { border-color: #818cf8; outline: none; background: white; }
    
    .filters { display: flex; gap: 8px; align-items: center; }
    .chip { background: #f1f5f9; padding: 8px 16px; border-radius: 10px; font-size: 0.8rem; cursor: pointer; color: #64748b; font-weight: 700; border: none; transition: all 0.2s; }
    .chip:hover { background: #e2e8f0; color: #0f172a; }
    .chip.active { background: #0b0f19; color: white; }

    .dropdown { position: relative; }
    .dropdown-content { position: absolute; background: white; min-width: 160px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); z-index: 100; border-radius: 12px; margin-top: 8px; border: 1px solid #f1f5f9; overflow: hidden; }
    .dropdown-content a { color: #334155; padding: 10px 16px; text-decoration: none; display: block; cursor: pointer; font-size: 0.85rem; font-weight: 600; }
    .dropdown-content a:hover { background: #f8fafc; color: #818cf8; }

    /* ALERTS */
    .alert-item { display: flex; align-items: center; gap: 16px; padding: 16px; background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 16px; margin-bottom: 12px; transition: all 0.2s; }
    .alert-item:hover { background: white; border-color: #e2e8f0; }
    .alert-icon { font-size: 1.5rem; width: 44px; height: 44px; background: white; border-radius: 12px; display: flex; align-items: center; justify-content: center; border: 1px solid #f1f5f9; }
    .alert-info { flex: 1; }
    .alert-info h4 { margin: 0; font-size: 0.9rem; color: #0f172a; font-weight: 800; }
    .alert-info p { margin: 2px 0 0; font-size: 0.75rem; color: #64748b; font-weight: 600; }
    
    .alert-card-lg { border: 1px solid #f1f5f9; border-radius: 20px; padding: 24px; margin-bottom: 20px; background: white; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
    .alert-card-lg:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0,0,0,0.08); }
    .alert-header { display: flex; align-items: start; gap: 16px; margin-bottom: 16px; position: relative; }
    .icon-box { width: 52px; height: 52px; background: #f8fafc; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; border: 1px solid #f1f5f9; }
    .alert-body { color: #334155; line-height: 1.6; font-size: 0.95rem; font-weight: 500; margin-bottom: 20px; padding-left: 68px; }
    .alert-footer { margin-top: 0; padding-top: 20px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; padding-left: 68px; }
    .footer-info { display: flex; flex-direction: column; gap: 4px; }
    .footer-info span { font-size: 0.8rem; color: #64748b; font-weight: 700; }
    .broadcast-badge { color: #6366f1 !important; display: flex; align-items: center; gap: 4px; }
    .footer-actions { display: flex; gap: 8px; }

    .full-share-btn { padding: 6px 12px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 0.75rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; background: white; transition: all 0.2s; color: #1e293b; }
    .full-share-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.05); }
    .full-share-btn.whatsapp:hover { border-color: #22c55e; color: #22c55e; background: #f0fdf4; }
    .full-share-btn.twitter:hover { border-color: #000000; color: #000000; background: #f8fafc; }
    .full-share-btn.facebook:hover { border-color: #1877f2; color: #1877f2; background: #eff6ff; }

    .alert-title-row { display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 4px; }
    .region-text { color: #64748b; font-weight: 700; font-size: 0.75rem; margin: 0; }
    .broadcast-time { color: #4f46e5; font-weight: 800; font-size: 0.75rem; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 0.02em; }
    .alert-timestamp { color: #475569; font-weight: 700; font-size: 0.85rem; display: block; margin-top: 4px; }
    .header-text h3 { margin: 0; font-size: 1.2rem; color: #0f172a; font-weight: 800; line-height: 1; }
    .quick-share { display: flex; gap: 6px; border-left: 1px solid #e2e8f0; padding-left: 12px; }
    .tool-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid #e2e8f0; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #94a3b8; transition: all 0.2s; }
    .tool-btn:hover { transform: scale(1.1); }
    .tool-btn.whatsapp:hover { color: #22c55e; border-color: #22c55e; }
    .tool-btn.twitter:hover { color: #000000; border-color: #000000; }

    .severity-badge { 
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
    .severity-badge.critical { background: #fee2e2; color: #b91c1c; border-color: #fecaca; }
    .severity-badge.high { background: #ffedd5; color: #c2410c; border-color: #fed7aa; }
    .severity-badge.medium { background: #e0e7ff; color: #4338ca; border-color: #c7d2fe; }
    .severity-badge.low { background: #dcfce7; color: #15803d; border-color: #bbf7d0; }

    /* FORM & UTILITY STYLES */
    .description { color: #64748b; font-size: 0.85rem; margin-bottom: 24px; font-weight: 500; }
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

    /* BUTTONS */
    .secondary-btn { 
      padding: 10px 20px; 
      background: white; 
      color: #334155; 
      border: 1px solid #e2e8f0; 
      border-radius: 10px; 
      cursor: pointer; 
      font-weight: 700; 
      font-size: 0.85rem; 
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
    
    .primary-btn { padding: 14px 28px; background: #0f172a; color: white; border: none; border-radius: 12px; cursor: pointer; font-weight: 800; transition: all 0.2s; width: 100%; }
    .primary-btn:hover { background: #1e293b; transform: translateY(-2px); }

    /* SOS SECTION */
    .danger-zone { text-align: center; background: #0f172a; color: white; border: none; padding: 48px; }
    .sos-header { display: flex; flex-direction: column; align-items: center; gap: 20px; margin-bottom: 32px; }
    .sos-icon-large { font-size: 3rem; background: rgba(239, 68, 68, 0.1); width: 80px; height: 80px; border-radius: 20px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(239, 68, 68, 0.2); }
    .danger-zone h3 { color: white; font-size: 1.5rem; margin-bottom: 0; }
    .danger-zone p { color: #94a3b8; font-size: 0.95rem; max-width: 500px; line-height: 1.6; font-weight: 500; }
    
    .danger-btn-lg { width: 100%; padding: 24px; background: #ef4444; color: white; border: none; border-radius: 16px; font-size: 1.1rem; font-weight: 900; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 12px; transition: all 0.3s; animation: sos-pulse 2.5s infinite; letter-spacing: 0.05em; margin-bottom: 40px; }
    .danger-btn-lg:hover { background: #dc2626; transform: translateY(-4px); box-shadow: 0 12px 30px rgba(239, 68, 68, 0.4); }
    .sos-symbol { font-size: 1.25rem; }

    .emergency-contacts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 32px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 32px; }
    .contact { display: flex; flex-direction: column; gap: 4px; }
    .contact span { font-size: 0.75rem; font-weight: 800; color: #64748b; text-transform: uppercase; }
    .contact strong { font-size: 1.25rem; font-weight: 900; color: white; }

    @keyframes sos-pulse {
      0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
      70% { box-shadow: 0 0 0 20px rgba(239, 68, 68, 0); }
      100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
    }
    
    .sos-status-box { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 32px; margin: 32px 0; }
    .sos-badge { 
      display: inline-flex; 
      padding: 8px 16px; 
      border-radius: 8px; 
      font-weight: 900; 
      font-size: 0.8rem; 
      text-transform: uppercase; 
      margin-bottom: 20px; 
      background: #4f46e5; 
      color: white; 
      letter-spacing: 0.05em;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .sos-badge.verified_critical { background: #ef4444; box-shadow: 0 0 15px rgba(239, 68, 68, 0.3); }
    .sos-badge.pending { background: #6366f1; }
    .sos-badge.responder_assigned { background: #10b981; }
    .sos-badge.rejected { background: #dc2626; }
    .sos-msg { color: #94a3b8; font-size: 1rem; font-weight: 600; }

    /* POPUPS (Driver Portal Style) */
    .popup-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.4); z-index: 10000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
    .popup-card { background: white; padding: 32px; border-radius: 20px; width: 340px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.2); }
    .popup-title { font-size: 1.25rem; font-weight: 900; color: #0f172a; margin: 0 0 8px; }
    .popup-msg { color: #64748b; font-size: 0.9rem; margin-bottom: 24px; line-height: 1.5; font-weight: 500; }
    .popup-dismiss { padding: 12px 32px; border-radius: 10px; border: none; font-weight: 800; background: #0f172a; color: white; cursor: pointer; transition: all 0.2s; }
    .popup-dismiss:hover { background: #1e293b; }

    .profile-card h2 { color: #0f172a; margin-top: 16px; margin-bottom: 4px; }
    .profile-card p { color: #64748b; font-weight: 600; margin-bottom: 24px; }

    .message { position: fixed; bottom: 24px; right: 24px; padding: 12px 24px; border-radius: 12px; font-weight: 700; font-size: 0.85rem; background: #0f172a; color: white; box-shadow: 0 8px 16px rgba(0,0,0,0.1); z-index: 1000; }
    .message.error { background: #ef4431; }
    
    .fade-in { animation: fadeIn 0.4s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

    /* MODAL STYLES */
    .modal-backdrop { 
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.6); z-index: 10000; backdrop-filter: blur(4px);
    }
    .report-modal { 
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: white; padding: 32px; border-radius: 24px; width: 480px;
      z-index: 10001; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
      border: 1px solid #f1f5f9;
    }
    .modal-header-sos { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .modal-header-sos h3 { margin: 0; color: #0f172a; font-size: 1.5rem; font-weight: 900; display: flex; align-items: center; gap: 12px; }
    .modal-header-sos h3 .icon { color: #ef4444; }
    .close-btn { background: none; border: none; font-size: 1.25rem; cursor: pointer; color: #94a3b8; }
    
    .danger-btn { background: #ef4444 !important; color: white !important; font-weight: 900 !important; }
    .danger-btn:hover { background: #dc2626 !important; }
    
    .mt-4 { margin-top: 16px; }
  `]
})
export class CitizenDashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  activeTab = 'dashboard';
  alerts: any[] = [];
  searchQuery = '';
  message = '';
  isError = false;
  isLoading = false;
  currentDate = new Date();

  // Professional Popup
  popupVisible = false;
  popupMessage = '';
  popupIsError = false;
  private clockTimer: any;
  private popupTimer: any;

  // Filters
  activeDropdown: string | null = null;
  filters = {
    type: '',
    severity: '',
    region: ''
  };
  isNearMeActive = false;

  // Map
  private map: any;
  private markers: any[] = [];
  mapLocationName = '';

  private apiUrl = `${environment.apiUrl}/disasters`;
  private citizenApiUrl = `${environment.apiUrl}/citizen`;
  private authApiUrl = `${environment.apiUrl}/auth`;
  sosStatus: string | null = null;
  sosMessage: string = '';

  // SOS Request Details
  showSosModal = false;
  sosRequestData = {
    locationDetails: '',
    emergencyType: 'Trapped in Flood',
    citizenSeverity: 'Medium'
  };

  private wsSubscription: Subscription | undefined;
  private regionWsSubscription: any | undefined;
  private sosSubscription: Subscription | undefined;

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private wsService: WebSocketService
  ) {
    this.updateMapUrl(-122.52, 37.70, -122.35, 37.83); // Default SF
  }

  ngOnInit() {
    // Live Clock
    this.clockTimer = setInterval(() => {
      this.currentDate = new Date();
    }, 1000);

    this.loadAlerts();
    this.setupWebSocket();
  }

  ngOnDestroy() {
    if (this.wsSubscription) {
      this.wsSubscription.unsubscribe();
    }
    if (this.regionWsSubscription) {
      this.regionWsSubscription.unsubscribe();
    }
    if (this.clockTimer) {
      clearInterval(this.clockTimer);
    }
  }

  setupWebSocket() {
    this.wsSubscription = this.wsService.getAlerts().subscribe(alert => {
      if (alert) {
        console.log('Real-time global alert received:', alert);
        this.addAlertUnique(alert);
      }
    });

    // Listen for SOS updates
    this.wsService.subscribe('/topic/citizen-sos-status', (msg: any) => {
      this.sosStatus = msg.status;
      this.sosMessage = msg.message;
      this.isError = msg.status === 'REJECTED';
    });

    this.wsService.subscribe('/user/queue/sos-status', (msg: any) => {
      this.sosStatus = msg.status;
      this.sosMessage = msg.reason || msg.message;
      this.isError = msg.status === 'REJECTED';
    });
  }

  private addAlertUnique(alert: any) {
    if (!this.alerts.find(a => a.id === alert.id)) {
      this.alerts.unshift(alert);
      this.message = `New Alert: ${alert.title}`;
      setTimeout(() => this.message = '', 5000);
    }
  }

  logout() {
    this.authService.logout();
  }

  getPageTitle(): string {
    switch (this.activeTab) {
      case 'dashboard': return 'Dashboard Overview';
      case 'alerts': return 'Safety Alerts';
      case 'reports': return 'Emergency Report';
      case 'profile': return 'My Profile';
      default: return 'Disaster Guard';
    }
  }

  getSosStatusLabel(): string {
    switch (this.sosStatus) {
      case 'PENDING': return 'Verifying Emergency...';
      case 'CRITICAL': return '🚨 CRITICAL: Dispatching Now';
      case 'RESPONDER_ASSIGNED': return '🛡️ Responder Dispatched';
      case 'REJECTED': return 'Request Rejected';
      default: return 'Searching for help...';
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

  loadAlerts() {
    let queryParams = `?`;
    if (this.filters.type) queryParams += `type=${this.filters.type}&`;
    if (this.filters.severity) queryParams += `severity=${this.filters.severity}&`;
    if (this.filters.region) queryParams += `region=${encodeURIComponent(this.filters.region)}&`;

    this.http.get<any[]>(`${this.apiUrl}${queryParams}`, this.getHeaders())
      .pipe(catchError(err => {
        console.error(err);
        return of([]);
      }))
      .subscribe(data => {
        this.alerts = data;
        this.renderMarkers();
        if (data.length > 0 && this.filters.region) {
          // We might want to look up coordinates for the region if we haven't already
        }
      });
  }

  toggleDropdown(name: string) {
    this.activeDropdown = this.activeDropdown === name ? null : name;
  }

  setFilter(key: 'type' | 'severity', value: string) {
    this.filters[key] = value;
    this.activeDropdown = null;
    this.loadAlerts();
  }

  getFilterLabel(key: 'type' | 'severity'): string {
    const val = this.filters[key];
    if (!val) return 'All';
    return val.charAt(0) + val.slice(1).toLowerCase();
  }

  hasActiveFilters(): boolean {
    return !!this.filters.type || !!this.filters.severity || !!this.filters.region || this.isNearMeActive;
  }

  clearFilters() {
    this.filters = { type: '', severity: '', region: '' };
    this.isNearMeActive = false;
    this.searchQuery = '';
    this.mapLocationName = '';
    this.loadAlerts();
  }

  toggleNearMe() {
    this.isNearMeActive = !this.isNearMeActive;
    if (this.isNearMeActive) {
      if (navigator.geolocation) {
        this.message = "Locating you...";
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            this.updateMapUrl(lon - 0.1, lat - 0.1, lon + 0.1, lat + 0.1);
            this.getRegionFromCoords(lat, lon);
            this.message = "";
          },
          (err) => {
            this.message = "Location access denied.";
            this.isNearMeActive = false;
          }
        );
      } else {
        this.message = "Geolocation not supported.";
        this.isNearMeActive = false;
      }
    } else {
      this.filters.region = '';
      if (this.regionWsSubscription) {
        this.regionWsSubscription.unsubscribe();
        this.regionWsSubscription = undefined;
      }
      this.loadAlerts();
    }
  }

  getRegionFromCoords(lat: number, lon: number) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
    this.http.get<any>(url).subscribe(data => {
      if (data && data.address) {
        const city = data.address.city || data.address.town || data.address.village || data.address.county;
        if (city) {
          this.filters.region = city;
          this.mapLocationName = city;
          this.loadAlerts();
          this.message = `Showing alerts near ${city}`;
          setTimeout(() => this.message = '', 3000);

          // Subscribe to regional topic
          this.subscribeToRegionTheme(city);
        }
      }
    });
  }

  subscribeToRegionTheme(region: string) {
    if (this.regionWsSubscription) {
      this.regionWsSubscription.unsubscribe();
    }
    const topic = `/topic/alerts/${region.replace(/\\s+/g, '_').toLowerCase()}`;
    this.regionWsSubscription = this.wsService.subscribe(topic, (msg: any) => {
      console.log(`Regional alert for ${region}:`, msg);
      this.addAlertUnique(msg);
    });
  }

  searchLocation() {
    if (!this.searchQuery) return;

    // Call Nominatim API for map update & region filter
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.searchQuery)}`;

    this.http.get<any[]>(url).subscribe({
      next: (results) => {
        if (results && results.length > 0) {
          const result = results[0];
          const bb = result.boundingbox;
          this.updateMapUrl(bb[2], bb[0], bb[3], bb[1]);

          this.filters.region = this.searchQuery; // Use search query as region filter
          this.mapLocationName = result.display_name;
          this.loadAlerts();
        } else {
          this.message = 'Location not found';
        }
      }
    });
  }

  updateMapUrl(minLon: any, minLat: any, maxLon: any, maxLat: any) {
    if (this.map) {
      this.map.fitBounds([
        [parseFloat(minLat), parseFloat(minLon)],
        [parseFloat(maxLat), parseFloat(maxLon)]
      ]);
    }
  }

  ngAfterViewInit() {
    this.initLeafletMap();
    this.renderMarkers();
  }

  private initLeafletMap() {
    if (this.map) return;
    this.map = L.map('citizenMap').setView([20.5937, 78.9629], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        this.map.setView([lat, lon], 10);
      }, () => {});
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
      this.map.fitBounds(group.getBounds().pad(0.1));
    }
  }

  openSosModal() {
    this.showSosModal = true;
    this.sosRequestData.locationDetails = this.mapLocationName || '';
  }

  submitEmergencyRequest() {
    if (!this.sosRequestData.locationDetails.trim()) {
      this.showPopup("Please provide location details.", true);
      return;
    }

    this.isLoading = true;
    this.showSosModal = false;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.sendSosRequest(
            position.coords.latitude,
            position.coords.longitude,
            this.sosRequestData.locationDetails,
            this.sosRequestData.emergencyType,
            this.sosRequestData.citizenSeverity
          );
        },
        (err) => {
          this.sendSosRequest(null, null, this.sosRequestData.locationDetails, this.sosRequestData.emergencyType, this.sosRequestData.citizenSeverity);
        }
      );
    } else {
      this.sendSosRequest(null, null, this.sosRequestData.locationDetails, this.sosRequestData.emergencyType, this.sosRequestData.citizenSeverity);
    }
  }

  private sendSosRequest(lat: number | null, lon: number | null, loc: string | null, type: string, severity: string) {
    const payload = {
      description: `${type} - ${severity} Severity - ${loc}`,
      latitude: lat,
      longitude: lon,
      locationName: loc,
      emergencyType: type,
      citizenSeverity: severity
    };

    this.http.post(`${this.citizenApiUrl}/request-help`, payload, { ...this.getHeaders(), responseType: 'text' })
      .subscribe({
        next: (res) => {
          this.sosStatus = 'PENDING';
          this.sosMessage = 'Hang tight. We are verifying your request and notifying the nearest rescue team.';
          this.isError = false;
          this.isLoading = false;
          this.showPopup('SOS request sent successfully! Help is on the way.', false);
        },
        error: (err) => {
          this.isError = true;
          this.isLoading = false;
          this.showPopup('SOS request failed. Please try again or call emergency services.', true);
        }
      });
  }

  shareLocation() {
    if (navigator.geolocation) {
      this.message = "Updating profile location...";
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const payload = { latitude: position.coords.latitude, longitude: position.coords.longitude };
          const token = this.authService.getToken();
          console.log('Saving location, token present:', !!token, 'payload:', payload);
          const headers = {
            headers: new HttpHeaders({
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            })
          };
          this.http.put(`${this.authApiUrl}/profile/location`, payload, headers).subscribe({
            next: () => {
              this.message = '';
              this.isError = false;
              this.showPopup('Profile location updated successfully.', false);
              this.activeTab = 'dashboard';
              this.toggleNearMe();
            },
            error: (err) => {
              console.error('Failed to save profile location:', err);
              this.showPopup('Failed to save profile location.', true);
            }
          })
        },
        (err) => {
          this.showPopup('Location access denied by browser.', true);
        }
      );
    } else {
      this.showPopup('Geolocation is not supported by your browser.', true);
    }
  }

  private showPopup(msg: string, isErr: boolean) {
    this.popupMessage = msg;
    this.popupIsError = isErr;
    this.popupVisible = true;
    if (this.popupTimer) clearTimeout(this.popupTimer);
    this.popupTimer = setTimeout(() => this.popupVisible = false, 5000);
  }

  shareOnWhatsApp(alert: any) {
    const text = encodeURIComponent(`🚨 EMERGENCY ALERT: ${alert.title || alert.disasterType}\nSeverity: ${alert.severity}\nLocation: ${alert.region}\nBroadcast: ${new Date(alert.verifiedAt || alert.createdAt).toLocaleTimeString()}\n\nStay safe!`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  }

  shareOnTwitter(alert: any) {
    const text = encodeURIComponent(`🚨 EMERGENCY: ${alert.title || alert.disasterType} in ${alert.region}. [Severity: ${alert.severity}] #DisasterAlert #StaySafe`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  }

  shareOnFacebook(alert: any) {
    const url = encodeURIComponent(window.location.href);
    const quote = encodeURIComponent(`🚨 EMERGENCY ALERT: ${alert.title || alert.disasterType} - ${alert.region}`);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${quote}`, '_blank');
  }
}
