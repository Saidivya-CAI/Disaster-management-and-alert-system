import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';

declare var L: any;

import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { of, Subscription } from 'rxjs';
import { environment } from '../../environments/environment';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { WebSocketService } from '../services/websocket.service';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);


@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dashboard-container">
      
      <!-- SIDEBAR -->
      <aside class="sidebar">
        <div class="sidebar-header">
          <h2>Admin <span class="highlight">Guard</span></h2>
        </div>

        <div class="profile-summary">
          <div class="avatar">ADM</div>
          <div>
             <p class="name">Admin Settings</p>
             <p class="role">SUPER ADMIN</p>
          </div>
        </div>

        <nav class="nav-links">
          <a (click)="activeTab = 'dashboard'" [class.active]="activeTab === 'dashboard'">
            <span class="nav-icon">📊</span> Dashboard Overview
            <span class="active-indicator" *ngIf="activeTab === 'dashboard'"></span>
          </a>
          <a (click)="switchTab('analytics')" [class.active]="activeTab === 'analytics'">
            <span class="nav-icon">📈</span> Analytics
            <span class="active-indicator" *ngIf="activeTab === 'analytics'"></span>
          </a>
          <a (click)="activeTab = 'tasks'" [class.active]="activeTab === 'tasks'">
            <span class="nav-icon">🚨</span> Emergency Tasks
          </a>
          <a (click)="activeTab = 'responders'" [class.active]="activeTab === 'responders'">
            <span class="nav-icon">👮</span> Responders
          </a>
          <a (click)="activeTab = 'alerts'" [class.active]="activeTab === 'alerts'">
            <span class="nav-icon">📣</span> Create Alerts
          </a>
        </nav>


        <button class="logout-btn" (click)="logout()">
          <span class="logout-icon">■</span> Logout
        </button>
      </aside>

      <!-- MAIN CONTENT -->
      <main class="main-content">
        <div class="top-bar">
          <div class="top-bar-left">
            <h1>{{ getPageTitle() }}</h1>
            <div class="date">{{ currentDate | date:'fullDate' }}</div>
          </div>
          <div class="system-status">
            <span class="status-dot"></span> SYSTEM ONLINE
          </div>
        </div>

        <div class="content-scroll">
          
          
          <!-- DASHBOARD OVERVIEW -->
          <div *ngIf="activeTab === 'dashboard'" class="fade-in">
            <!-- Welcome Banner -->
            <div class="welcome-banner">
              <div class="welcome-left">
                <div class="welcome-avatar">ADM</div>
                <div class="welcome-text">
                  <h2>WELCOME, <span>ADMIN!</span></h2>
                  <p>System Monitor • {{ tasks.length + responders.length + recentAlerts.length }} Active Nodes</p>
                </div>
              </div>
              <button class="analytics-btn" (click)="activeTab = 'tasks'">SYSTEM ANALYTICS +</button>
            </div>

            <!-- Stats Row -->
            <div class="stats-row">
              <div class="stat-card">
                <div class="stat-header">
                  <div class="stat-icon responder-icon">👤</div>
                  <span class="trend up">+12.5% ↑</span>
                </div>
                <h3>{{ responders.length }}</h3>
                <p>Responders Active</p>
              </div>
              <div class="stat-card">
                <div class="stat-header">
                  <div class="stat-icon task-icon">📋</div>
                  <span class="trend up">+5.2% ↑</span>
                </div>
                <h3>{{ tasks.length }}</h3>
                <p>Ongoing Tasks</p>
              </div>
              <div class="stat-card alert-stat">
                <div class="stat-header">
                  <div class="stat-icon alert-icon">⚠</div>
                  <span class="trend stable">Stable</span>
                </div>
                <h3>{{ recentAlerts.length }}</h3>
                <p>Active Alerts</p>
              </div>
              <div class="stat-card critical-stat">
                <div class="stat-header">
                  <div class="stat-icon critical-icon">⚠</div>
                  <span class="trend critical">Critical</span>
                </div>
                <h3>{{ criticalCount }}</h3>
                <p>Critical Threats</p>
              </div>
            </div>

            <!-- Live Disaster Monitor -->
            <div class="card map-card" id="map-section">
              <h3>🌍 Live Disaster Monitor</h3>
              <div class="map-container">
                 <div id="adminMap" style="height: 300px; width: 100%; border-radius: 12px; z-index: 1;"></div>
              </div>

            </div>

            <!-- Recent Missions (Tasks) -->
            <div class="card" *ngIf="tasks.length > 0">
              <div class="flex-header">
                <h3>Recent Missions</h3>
                <button class="secondary-btn" (click)="loadTasks()">Refresh</button>
              </div>
              <table class="data-table">
                <thead>
                  <tr>
                    <th style="width: 40%">MISSION</th>
                    <th style="width: 25%">RESPONDER</th>
                    <th style="width: 15%">STATUS</th>
                    <th style="width: 20%">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let t of tasks.slice(0, 5)" class="fade-row">
                    <td class="mission-cell">
                      <div class="mission-text">{{ t.description || 'Emergency Help Requested' }}</div>
                      <div class="mission-subtext" *ngIf="t.taskDescription">{{ t.taskDescription }}</div>
                    </td>

                    <td class="responder-cell">
                      <div class="responder-info">
                        <div class="responder-icon-circle">👤</div>
                        <span class="responder-name">{{ t.responderEmail || 'Unassigned' }}</span>
                      </div>
                    </td>
                    <td>
                      <span class="status-pill" [ngClass]="t.status.toLowerCase()">{{ t.status }}</span>
                    </td>
                    <td class="actions-cell">
                      <div class="action-buttons">
                        <button class="action-btn map-btn" (click)="viewOnMap(t)"><span class="icon">📍</span> Map</button>
                        <button class="action-btn report-btn" (click)="viewReports(t)"><span class="icon">📝</span> Reports</button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Recent Alerts List -->
            <div class="card" *ngIf="recentAlerts.length > 0">
              <div class="flex-header">
                <h3>Recent Alerts</h3>
                <button class="secondary-btn" (click)="loadRecentAlerts()">Refresh</button>
              </div>
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Severity</th>
                    <th>Region</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let a of recentAlerts.slice(0, 5)" class="fade-row">
                    <td>{{ a.title }}</td>
                    <td>{{ getIcon(a.disasterType) }} {{ a.disasterType }}</td>
                    <td>
                      <span class="severity-badge" [ngClass]="a.severity?.toLowerCase()">{{ a.severity }}</span>
                    </td>
                    <td>{{ a.region || '—' }}</td>
                    <td>
                      <span class="status-badge" [ngClass]="a.status?.toLowerCase()">{{ a.status }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- ANALYTICS TAB -->
          <div *ngIf="activeTab === 'analytics'" class="fade-in">
            <div class="analytics-header">
              <h2>📊 Operations Analytics</h2>
              <p>Real-time insights into disaster response and regional efficiency.</p>
            </div>

            <div class="stats-row">
              <div class="stat-card">
                 <div class="stat-header">
                   <div class="stat-icon responder-icon">📈</div>
                 </div>
                 <h3>{{ tasks.length }}</h3>
                 <p>Total Rescue Ops</p>
              </div>
              <div class="stat-card">
                 <div class="stat-header">
                   <div class="stat-icon task-icon">✅</div>
                 </div>
                 <h3>{{ getCompletedTaskCount() }}</h3>
                 <p>Successfully Resolved</p>
              </div>
              <div class="stat-card">
                <div class="stat-header">
                  <div class="stat-icon alert-icon">⏳</div>
                </div>
                <h3>{{ avgResponseTime }}m</h3>
                <p>Avg Response Time</p>
              </div>
              <div class="stat-card">
                <div class="stat-header">
                  <div class="stat-icon critical-icon">⚡</div>
                </div>
                <h3>{{ resolutionEfficiency }}%</h3>
                <p>Resolution Efficiency</p>
              </div>
            </div>

            <div class="charts-grid">
              <div class="card chart-card">
                <div class="flex-header">
                  <h3>🌍 Disaster Trends (Monthly)</h3>
                  <div class="chart-type">Timeline</div>
                </div>
                <div class="chart-container">
                  <canvas id="disasterTrendChart"></canvas>
                </div>
              </div>

              <div class="card chart-card">
                <div class="flex-header">
                  <h3>🏢 Regional Performance Comparison</h3>
                  <div class="chart-type">Geography</div>
                </div>
                <div class="chart-container">
                  <canvas id="regionalPerformanceChart"></canvas>
                </div>
              </div>
            </div>

            <div class="mt-4 card">
              <h3>💡 Strategic Insights</h3>
              <div class="insights-list">
                 <div class="insight-item" *ngFor="let insight of generatedInsights">
                    <span class="insight-icon">✨</span>
                    <p>{{ insight }}</p>
                 </div>
              </div>
            </div>

            <div class="mt-4 charts-grid">
              <!-- Responder Rankings -->
              <div class="card">
                <div class="flex-header">
                  <h3>🏆 Responder Performance</h3>
                  <div class="chart-type">Rankings</div>
                </div>
                <div class="table-scroll">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Responder</th>
                        <th>Tasks</th>
                        <th>Completion</th>
                        <th>Avg Resp</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let p of responderPerf.slice(0, 5)">
                        <td>
                          <div class="responder-name">{{ p.name }}</div>
                          <div class="role" style="font-size: 0.6rem;">{{ p.email }}</div>
                        </td>
                        <td>{{ p.totalTasks }}</td>
                        <td>
                          <div class="progress-bar-mini">
                            <div class="progress-fill" [style.width.%]="p.completionRate"></div>
                          </div>
                          <span style="font-size: 0.75rem; font-weight: 700;">{{ p.completionRate | number:'1.0-0' }}%</span>
                        </td>
                        <td>{{ p.averageResponseTimeMinutes | number:'1.0-1' }}m</td>
                      </tr>
                    </tbody>
                  </table>
                  <div *ngIf="responderPerf.length === 0" class="empty-mini">No performance data.</div>
                </div>
              </div>

              <!-- High-Risk Areas -->
              <div class="card">
                <div class="flex-header">
                  <h3>🔥 High-Risk Hotspots</h3>
                  <div class="chart-type">Security</div>
                </div>
                <div class="hotspot-list">
                  <div class="hotspot-item" *ngFor="let area of riskAreas.slice(0, 5)">
                    <div class="hotspot-info">
                      <div class="hotspot-name">{{ area.locationName }}</div>
                      <div class="hotspot-stats">
                        <span>{{ area.incidentCount }} Incidents</span> • 
                        <span>Avg Sev: {{ area.averageSeverityScore | number:'1.1-1' }}</span>
                      </div>
                    </div>
                    <div class="risk-badge" [ngClass]="getRiskClass(area.riskScore)">
                      {{ area.riskScore | number:'1.1-1' }}
                    </div>
                  </div>
                  <div *ngIf="riskAreas.length === 0" class="empty-mini">No risk data identified.</div>
                </div>
              </div>
            </div>
          </div>

<!-- ASSIGN TASK TAB -->
          <div *ngIf="activeTab === 'tasks'" class="fade-in">
             <div class="card" style="border-left-color: #ef4444;">
               <div class="flex-header">
                 <h3>🆘 Pending SOS Requests</h3>
                 <button class="secondary-btn" (click)="loadTasks()">Refresh</button>
               </div>
               <p class="description">Select a responder and click <strong>Investigate</strong> to send them to verify if the citizen's request is genuine. After investigation, approve or reject.</p>
               
               <div *ngIf="getPendingSOS().length === 0" class="empty-state">No pending SOS requests.</div>
               
               <table class="data-table" *ngIf="getPendingSOS().length > 0">
                 <thead>
                    <tr>
                      <th>Citizen</th>
                      <th>Time</th>
                      <th>Status</th>
                      <th>Assign Responder</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                 <tbody>
                   <tr *ngFor="let t of getPendingSOS()" class="fade-row">
                      <td>{{ t.citizenEmail || 'Anonymous' }}</td>
                      <td>{{ t.createdAt | date:'shortTime' }}</td>
                      <td>
                         <span class="status-badge" [ngClass]="t.status.toLowerCase()">{{ t.status }}</span>
                         <span *ngIf="t.status === 'IN_PROGRESS'" class="investigate-label">🔍 Under Review</span>
                       </td>
                      <td>
                        <select class="sm-select" [(ngModel)]="t.selectedResponderId">
                          <option [ngValue]="null">-- Select Responder --</option>
                          <option *ngFor="let r of responders" [ngValue]="r.id">{{ r.email }}</option>
                        </select>
                      </td>
                      <td>
                         <div class="action-group">
                           <!-- Step 1: Send responder to investigate -->
                            <button class="sm-btn investigate" (click)="investigateSOS(t)">🔍 Investigate</button>
                            <!-- Step 2: After investigation, verify or reject -->
                            
                              <button class="sm-btn success" (click)="approveSOS(t.id, 'MEDIUM', t.selectedResponderId)">✅ Verify</button>
                              <button class="sm-btn danger" (click)="rejectSOS(t.id)">❌ Reject</button>
                            
                        </div>
                     </td>
                   </tr>
                 </tbody>
               </table>
             </div>

             <div class="card mt-4">
               <h3>Assign New Rescue Task</h3>
               <p class="description">Manually create and assign rescue tasks to available responders.</p>
               
               <div class="form-group">
                 <label>Task Name</label>
                 <input type="text" [(ngModel)]="newTask.description" placeholder="e.g. Flash Flood Rescue">
               </div>
               
               <div class="form-group mt-3">
                  <div class="flex-header">
                    <label>Task Description (Detailed Instructions)</label>
                    <button class="ai-gen-btn" (click)="generateAIDescription()" [disabled]="isGeneratingAI">
                      <span class="ai-sparkle" [class.spinning]="isGeneratingAI">✨</span> 
                      {{ isGeneratingAI ? 'Thinking...' : 'Instruct with AI' }}
                    </button>
                  </div>
                  <textarea [(ngModel)]="newTask.taskDescription" rows="4" 
                    [class.ai-glow]="isGeneratingAI"
                    placeholder="Describe the mission details, required equipment, etc..."></textarea>
                </div>

               
               <div class="form-grid">
                  <div class="form-group">
                    <label>Responder</label>
                    <select [(ngModel)]="newTask.responderId">
                      <option [ngValue]="null" disabled>Select a responder</option>
                      <option *ngFor="let r of responders" [ngValue]="r.id">{{ r.email }}</option>
                    </select>
                  </div>
                 <div class="form-group">
                   <label>Locality/Region</label>
                   <div class="search-input-group">
                    <input type="text" [(ngModel)]="newTask.locationName" placeholder="Search area...">
                    <button class="secondary-btn sm" (click)="performTaskLocationSearch()">🔍 Geocode</button>
                   </div>
                 </div>
               </div>
               
               <div class="form-grid" *ngIf="newTask.latitude">
                  <div class="form-group">
                    <label>Latitude</label>
                    <input type="number" [(ngModel)]="newTask.latitude" readonly>
                  </div>
                  <div class="form-group">
                    <label>Longitude</label>
                    <input type="number" [(ngModel)]="newTask.longitude" readonly>
                  </div>
               </div>

               <button class="primary-btn" (click)="createTask()" [disabled]="isLoading">
                 {{ isLoading ? 'Assigning...' : 'Create Task' }}
               </button>
             </div>

             <div class="mt-4">
               <h3>All Rescue Tasks</h3>
               <table class="data-table">
                  <thead>
                    <tr>
                      <th style="width: 40%">MISSION</th>
                      <th style="width: 25%">RESPONDER</th>
                      <th style="width: 15%">STATUS</th>
                      <th style="width: 20%">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let t of tasks" class="fade-row">
                      <td class="mission-cell">
                        <div class="mission-text">{{ t.description || 'Emergency Help Requested' }}</div>
                        <div class="mission-subtext" *ngIf="t.taskDescription">{{ t.taskDescription }}</div>
                      </td>

                      <td class="responder-cell">
                        <div class="responder-info">
                          <div class="responder-icon-circle">👤</div>
                          <span class="responder-name">{{ t.responderEmail || 'Unassigned' }}</span>
                        </div>
                      </td>
                      <td>
                        <span class="status-pill" [ngClass]="t.status.toLowerCase()">{{ t.status }}</span>
                      </td>
                      <td class="actions-cell">
                        <div class="action-buttons">
                          <button class="action-btn map-btn" (click)="viewOnMap(t)"><span class="icon">📍</span> Map</button>
                          <button class="action-btn report-btn" (click)="viewReports(t)"><span class="icon">📝</span> Reports</button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
             </div>
          </div>

          <!-- MANAGE RESPONDERS TAB -->
          <div *ngIf="activeTab === 'responders'" class="fade-in">
            <div class="card">
              <div class="flex-header">
                <h3>Responders Field Unit</h3>
                <button class="secondary-btn" (click)="loadResponders()">Refresh List</button>
              </div>
              
              <table class="data-table">
                 <thead>
                   <tr>
                     <th>ID</th>
                     <th>Email</th>
                     <th>Status</th>
                   </tr>
                 </thead>
                 <tbody>
                   <tr *ngFor="let r of responders">
                     <td>#{{ r.id }}</td>
                     <td>{{ r.email }}</td>
                     <td><span class="active-dot"></span> Online</td>
                   </tr>
                 </tbody>
               </table>
            </div>
          </div>

          <!-- CREATE ALERT TAB -->
          <div *ngIf="activeTab === 'alerts'" class="fade-in">

             <!-- CRITICAL WARNING BANNER -->
             <div class="critical-banner" *ngIf="newAlert.severity === 'CRITICAL'">
               <div class="banner-icon">⚠️</div>
               <div class="banner-text">
                 <strong>CRITICAL ALERT — Instant Broadcast</strong>
                 <p>This alert will be sent <u>immediately</u> to all citizens via real-time notifications. There is no review step for critical alerts.</p>
               </div>
             </div>

             <div class="card alert-card" [ngClass]="newAlert.severity?.toLowerCase()">
               <h3>Broadcast Disaster Alert</h3>
               <p class="description">Send emergency alerts to all citizens in the affected region.</p>

               <!-- Search Location Section -->
               <div class="form-group search-section">
                 <label>Search Location</label>
                 <div class="search-input-group">
                   <input type="text" [(ngModel)]="searchQuery" placeholder="Search city or area..." (keyup.enter)="performSearch()">
                   <button class="secondary-btn" (click)="performSearch()" [disabled]="isSearching">
                     {{ isSearching ? 'Searching...' : 'Search' }}
                   </button>
                 </div>
                 
                 <!-- Map Preview for Search -->
                 <div class="map-container small-map" *ngIf="searchQuery && !isSearching">
                    <iframe 
                      width="100%" 
                      height="200" 
                      frameborder="0" 
                      scrolling="no" 
                      marginheight="0" 
                      marginwidth="0" 
                      [src]="mapUrl">
                    </iframe>
                    <p class="map-caption">Location Preview: {{ newAlert.locationName }}</p>
                 </div>
               </div>

               <div class="form-group">
                 <label>Alert Title</label>
                 <input type="text" [(ngModel)]="newAlert.title" placeholder="e.g. Flash Flood Warning">
               </div>

               <div class="form-grid">
                  <div class="form-group">
                    <label>Type</label>
                    <select [(ngModel)]="newAlert.disasterType">
                       <option value="FLOOD">Flood</option>
                       <option value="EARTHQUAKE">Earthquake</option>
                       <option value="FIRE">Fire</option>
                       <option value="STORM">Storm</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Severity</label>
                    <select [(ngModel)]="newAlert.severity" (change)="onSeverityChange()">
                       <option value="LOW">Low</option>
                       <option value="MEDIUM">Medium</option>
                       <option value="HIGH">High</option>
                       <option value="CRITICAL">🔴 Critical (Auto-Broadcast)</option>
                    </select>
                  </div>
               </div>

               <div class="form-grid">
                  <div class="form-group">
                    <label>Region (Auto-filled)</label>
                    <input type="text" [(ngModel)]="newAlert.region" placeholder="Region">
                  </div>
                  <div class="form-group">
                    <label>Specific Location</label>
                    <input type="text" [(ngModel)]="newAlert.locationName" placeholder="Specific Point/Address">
                  </div>
               </div>

               <div class="form-group">
                  <div class="flex-header">
                    <label>Description</label>
                    <button class="ai-gen-btn" (click)="generateAlertDescription()" [disabled]="isGeneratingAI">
                      <span class="ai-sparkle" [class.spinning]="isGeneratingAI">✨</span> 
                      {{ isGeneratingAI ? 'Thinking...' : 'Instruct with AI' }}
                    </button>
                  </div>
                  <textarea [(ngModel)]="newAlert.description" rows="4" 
                    [class.ai-glow]="isGeneratingAI"
                    placeholder="Detailed instructions..."></textarea>
                </div>

               <button 
                  [class]="newAlert.severity === 'CRITICAL' ? 'critical-broadcast-btn' : 'danger-btn'" 
                  (click)="onBroadcastClick()" 
                  [disabled]="isLoading">
                  <span class="icon">{{ newAlert.severity === 'CRITICAL' ? '🚨' : '📡' }}</span>
                  {{ isLoading ? 'Processing...' : (newAlert.severity === 'CRITICAL' ? 'BROADCAST CRITICAL ALERT' : 'Broadcast Alert') }}
                </button>
             </div>
          </div>

          <!-- CONFIRM DIALOG -->
          <div class="modal-overlay" *ngIf="showConfirmDialog" (click)="showConfirmDialog = false">
            <div class="modal-box success-modal" (click)="$event.stopPropagation()">
              <div class="modal-icon critical">🚨</div>
              <h3>Confirm Critical Broadcast</h3>
              <p>You are about to broadcast a <strong>CRITICAL</strong> alert. This will be sent immediately to <strong>all citizens</strong> in the system.</p>
              <div class="modal-detail">
                <div class="detail-row"><strong>Title:</strong> <span>{{ newAlert.title }}</span></div>
                <div class="detail-row"><strong>Region:</strong> <span>{{ newAlert.region }}</span></div>
                <div class="detail-row"><strong>Type:</strong> <span>{{ newAlert.disasterType }}</span></div>
              </div>
              <div class="modal-actions">
                <button class="secondary-btn" style="width: 100px" (click)="showConfirmDialog = false">Cancel</button>
                <button class="critical-confirm-btn" style="flex: 1" (click)="confirmBroadcast()">Yes, Broadcast Now</button>
              </div>
            </div>
          </div>

          <div *ngIf="message" class="message" [ngClass]="{'error': isError, 'success': !isError}">
            {{ message }}
          </div>

          <!-- REPORTS MODAL -->
          <div class="modal-overlay" *ngIf="showReportsModal" (click)="showReportsModal = false">
            <div class="modal-box report-modal" (click)="$event.stopPropagation()">
              <div class="modal-header">
                <h3>📋 {{ selectedTask?.description || 'Rescue Mission' }}</h3>
                <div class="header-actions">
                  <button class="icon-btn" (click)="viewReports(selectedTask)" title="Refresh Reports">🔄</button>
                  <span class="task-id-badge">ID: #{{ selectedTaskId }}</span>
                </div>
                <button class="close-btn" (click)="showReportsModal = false">×</button>
              </div>

              <!-- OPERATION CONTEXT -->
              <div class="operation-context" *ngIf="selectedTask">
                <div class="op-header">
                  <div class="op-title">{{ selectedTask.description || 'Rescue Operation' }}</div>
                  <div class="op-status" [class]="selectedTask.status?.toLowerCase()">{{ selectedTask.status }}</div>
                </div>
                <div class="op-details" *ngIf="selectedTask.taskDescription">
                  <strong>Instructions:</strong> {{ selectedTask.taskDescription }}
                </div>
                <div class="op-meta" *ngIf="selectedTask.locationName">
                  <strong>📍 Location:</strong> {{ selectedTask.locationName }}
                </div>
                <div class="op-meta" *ngIf="selectedTask.responderEmail">
                  <strong>👤 Responder:</strong> {{ selectedTask.responderEmail }}
                </div>
                <div class="op-meta" *ngIf="selectedTask.priority">
                  <strong>⚡ Priority:</strong> <span class="severity-badge" [class]="selectedTask.priority.toLowerCase()">{{ selectedTask.priority }}</span>
                </div>
              </div>
              
              <div class="reports-list" *ngFor="let r of selectedTaskReports">
                <div class="report-item">
                  <div class="report-meta">
                    <span class="report-time">{{ r.timestamp | date:'shortTime' }}</span>
                    <span class="report-responder">{{ r.responderEmail }}</span>
                  </div>
                  <p class="report-text">{{ r.statusUpdate }}</p>
                  <div class="report-images" *ngIf="r.imageUrls">
                    <img *ngFor="let img of r.imageUrls.split('|')" [src]="img" class="report-img" (click)="openDetailImage(img)">
                  </div>
                </div>
              </div>
              
              <div *ngIf="selectedTaskReports.length === 0" class="empty-reports">
                <p>No reports submitted for this mission yet.</p>
              </div>
              
              <div class="modal-footer">
                <button class="primary-btn" (click)="showReportsModal = false">Close</button>
              </div>
            </div>
          </div>

          <!-- IMAGE DETAIL MODAL -->
          <div class="modal-overlay" *ngIf="selectedImageUrl" (click)="closeDetailImage()">
            <div class="image-detail-box" (click)="$event.stopPropagation()">
              <button class="close-btn" (click)="closeDetailImage()">×</button>
              <img [src]="selectedImageUrl" alt="Detail View" class="full-img">
            </div>
          </div>

          <!-- TASK SUCCESS MODAL -->
          <div class="modal-overlay" *ngIf="showTaskSuccessModal" (click)="showTaskSuccessModal = false">
            <div class="modal-box success-modal" (click)="$event.stopPropagation()">
              <div class="modal-icon success">✅</div>
              <h3>Task Created Successfully</h3>
              <p>The mission has been assigned and the responder has been notified.</p>
              
              <div class="modal-detail" *ngIf="createdTask">
                <div class="detail-row">
                  <strong>Mission:</strong> <span>{{ createdTask.description }}</span>
                </div>
                <div class="detail-row">
                  <strong>Responder:</strong> <span>{{ createdTask.responderEmail }}</span>
                </div>
                <div class="detail-row">
                   <strong>Location:</strong> <span>{{ createdTask.locationName }}</span>
                </div>
              </div>

              <div class="modal-actions">
                <button class="primary-btn" (click)="showTaskSuccessModal = false">Understood</button>
              </div>
            </div>
          </div>

          <!-- ALERT SUCCESS MODAL -->
          <div class="modal-overlay" *ngIf="showAlertSuccessModal" (click)="showAlertSuccessModal = false">
            <div class="modal-box success-modal broadcast-success" (click)="$event.stopPropagation()">
              <div class="modal-icon success pulse-icon">📡</div>
              <h3>Alert Broadcasted!</h3>
              <p>The emergency alert has been successfully transmitted to all citizens in the affected region.</p>
              
              <div class="modal-detail" *ngIf="lastBroadcastedAlert">
                <div class="detail-row">
                  <strong>Title:</strong> <span>{{ lastBroadcastedAlert.title }}</span>
                </div>
                <div class="detail-row">
                  <strong>Severity:</strong> <span class="severity-badge" [class]="lastBroadcastedAlert.severity?.toLowerCase()">{{ lastBroadcastedAlert.severity }}</span>
                </div>
                <div class="detail-row">
                   <strong>Location:</strong> <span>{{ lastBroadcastedAlert.locationName || lastBroadcastedAlert.region }}</span>
                </div>
              </div>

              <div class="modal-actions">
                <button class="primary-btn" (click)="showAlertSuccessModal = false">Dismiss</button>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100vh; font-family: 'Inter', sans-serif; color: #1e293b; }
    .dashboard-container { display: flex; height: 100%; background-color: #f1f5f9; }
    
    /* SIDEBAR - DEEP COSMOS */
    .sidebar { width: 220px; background: linear-gradient(180deg, #0b0f19 0%, #111827 100%); color: white; display: flex; flex-direction: column; padding: 20px 16px; box-shadow: 4px 0 24px rgba(0,0,0,0.3); z-index: 10; border-right: 1px solid rgba(255,255,255,0.03); }
    .sidebar-header { margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .sidebar-header h2 { margin: 0; font-size: 1.3rem; font-weight: 900; letter-spacing: -0.02em; color: #fff; text-shadow: 0 4px 20px rgba(16,185,129,0.2); }
    .highlight { color: #10b981; }
    
    .profile-summary { display: flex; align-items: center; gap: 12px; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 12px; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.05); }
    .avatar { width: 40px; height: 40px; background: linear-gradient(135deg, #1e293b, #334155); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.65rem; color: #94a3b8; box-shadow: 0 2px 8px rgba(0,0,0,0.3); letter-spacing: 0.5px; border: 1px solid rgba(255,255,255,0.08); }
    .name { margin: 0; font-weight: 600; font-size: 0.82rem; color: #e2e8f0; }
    .mission-text { font-weight: 700; font-size: 0.88rem; color: #0f172a; margin-bottom: 2px; }
    .mission-subtext { font-size: 0.75rem; color: #64748b; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

    .role { margin: 2px 0 0; color: #64748b; font-size: 0.65rem; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; }

    .nav-links { display: flex; flex-direction: column; gap: 2px; flex: 1; margin-top: 4px; }
    .nav-links a { padding: 10px 14px; border-radius: 10px; cursor: pointer; transition: all 0.2s cubic-bezier(.4,0,.2,1); display: flex; align-items: center; gap: 10px; color: #94a3b8; text-decoration: none; font-weight: 600; font-size: 0.8rem; position: relative; }
    .nav-links a:hover { background: rgba(255,255,255,0.04); color: #fff; }
    .nav-links a.active { background: rgba(99,102,241,0.08); color: #818cf8; box-shadow: inset 0 0 10px rgba(99,102,241,0.05); }
    .nav-links a.active::after { content: ''; position: absolute; right: 12px; width: 6px; height: 6px; background: #818cf8; border-radius: 50%; box-shadow: 0 0 8px rgba(129,140,248,0.5); }
    .nav-icon { font-size: 0.95rem; }

    /* ANALYTICS STYLES */
    .analytics-header { margin-bottom: 24px; }
    .analytics-header h2 { margin: 0; font-size: 1.5rem; font-weight: 800; color: #0f172a; }
    .analytics-header p { margin: 4px 0 0; color: #64748b; font-size: 0.88rem; }

    .charts-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 24px; }
    .chart-card { border-left: none; padding: 24px; height: 400px; display: flex; flex-direction: column; }
    .chart-container { flex: 1; position: relative; margin-top: 16px; min-height: 0; }
    .chart-type { font-size: 0.65rem; font-weight: 700; color: #818cf8; background: rgba(99,102,241,0.1); padding: 4px 10px; border-radius: 12px; text-transform: uppercase; }

    .insights-list { display: flex; flex-direction: column; gap: 12px; margin-top: 16px; }
    .insight-item { display: flex; gap: 12px; align-items: flex-start; padding: 12px; background: #f8fafc; border-radius: 10px; border-left: 3px solid #818cf8; transition: transform 0.2s; }
    .insight-item:hover { transform: translateX(5px); background: #f1f5f9; }
    .insight-icon { font-size: 1.1rem; }
    .insight-item p { margin: 0; font-size: 0.88rem; color: #334155; line-height: 1.5; }

    .active-indicator { width: 6px; height: 6px; background: #818cf8; border-radius: 50%; margin-left: auto; }

    
    .logout-btn { background: none; border: none; color: #ef4444; cursor: pointer; padding: 10px 12px; display: flex; align-items: center; gap: 8px; font-size: 0.82rem; font-weight: 500; width: 100%; text-align: left; margin-top: auto; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 16px; transition: all 0.2s; border-radius: 8px; font-family: 'Inter', sans-serif; }
    .logout-icon { display: inline-block; width: 12px; height: 12px; background: #ef4444; border-radius: 2px; }
    .logout-btn:hover { color: #f87171; background: rgba(239,68,68,0.08); }

    /* ANALYTICS STYLES */
    .analytics-header { margin-bottom: 24px; }
    .analytics-header h2 { margin: 0; font-size: 1.5rem; font-weight: 800; color: #0f172a; }
    .analytics-header p { margin: 4px 0 0; color: #64748b; font-size: 0.88rem; }

    .charts-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 24px; }
    .chart-card { border-left: none; padding: 24px; height: 400px; display: flex; flex-direction: column; }
    .chart-container { flex: 1; position: relative; margin-top: 16px; min-height: 0; }
    .chart-type { font-size: 0.65rem; font-weight: 700; color: #818cf8; background: rgba(99,102,241,0.1); padding: 4px 10px; border-radius: 12px; text-transform: uppercase; }

    .insights-list { display: flex; flex-direction: column; gap: 12px; margin-top: 16px; }
    .insight-item { display: flex; gap: 12px; align-items: flex-start; padding: 12px; background: #f8fafc; border-radius: 10px; border-left: 3px solid #818cf8; transition: transform 0.2s; }
    .insight-item:hover { transform: translateX(5px); background: #f1f5f9; }
    .insight-icon { font-size: 1.1rem; }
    .insight-item p { margin: 0; font-size: 0.88rem; color: #334155; line-height: 1.5; }

    /* MAIN CONTENT */

    .main-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .top-bar { background: white; padding: 16px 32px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
    .top-bar-left h1 { font-size: 1.35rem; color: #0f172a; margin: 0 0 2px; font-weight: 700; letter-spacing: -0.02em; }
    .date { color: #94a3b8; font-size: 0.78rem; font-weight: 500; }
    .system-status { display: flex; align-items: center; gap: 8px; font-size: 0.72rem; font-weight: 700; color: #10b981; text-transform: uppercase; letter-spacing: 0.08em; padding: 6px 14px; border: 1.5px solid #d1fae5; border-radius: 20px; background: #ecfdf5; }
    .status-dot { width: 8px; height: 8px; background: #10b981; border-radius: 50%; animation: blink 2s infinite; }

    .content-scroll { padding: 24px 32px; overflow-y: auto; flex: 1; }
    
    /* WELCOME BANNER */
    .welcome-banner { background: linear-gradient(135deg, #1e293b 0%, #334155 100%); border-radius: 16px; padding: 28px 32px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; color: white; }
    .welcome-left { display: flex; align-items: center; gap: 18px; }
    .welcome-avatar { width: 56px; height: 56px; background: linear-gradient(135deg, #1e293b, #0f172a); border-radius: 14px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.8rem; color: #94a3b8; letter-spacing: 1px; border: 1.5px solid rgba(255,255,255,0.1); position: relative; }
    .welcome-avatar::after { content: ''; position: absolute; bottom: -2px; right: -2px; width: 10px; height: 10px; background: #10b981; border-radius: 50%; border: 2px solid #1e293b; }
    .welcome-text h2 { margin: 0; font-size: 1.5rem; font-weight: 800; letter-spacing: 0.02em; }
    .welcome-text h2 span { color: #94a3b8; }
    .welcome-text p { margin: 4px 0 0; color: #64748b; font-size: 0.82rem; font-weight: 500; }
    .analytics-btn { padding: 10px 22px; background: rgba(255,255,255,0.08); color: #e2e8f0; border: 1.5px solid rgba(255,255,255,0.15); border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 0.82rem; letter-spacing: 0.04em; transition: all 0.2s; font-family: 'Inter', sans-serif; }
    .analytics-btn:hover { background: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.25); }

    /* STATS */
    .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .stat-card { background: white; padding: 20px; border-radius: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02); transition: transform 0.25s cubic-bezier(.4,0,.2,1), box-shadow 0.25s; border: 1px solid #e2e8f0; position: relative; overflow: hidden; }
    .stat-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
    .stat-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .stat-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1rem; }
    .stat-icon.responder-icon { background: #ede9fe; color: #7c3aed; }
    .stat-icon.task-icon { background: #fee2e2; color: #ef4444; }
    .stat-icon.alert-icon { background: #fef3c7; color: #f59e0b; }
    .stat-icon.critical-icon { background: #ffedd5; color: #f97316; }
    .trend { font-size: 0.68rem; font-weight: 700; padding: 3px 8px; border-radius: 6px; }
    .trend.up { color: #10b981; background: #ecfdf5; }
    .trend.stable { color: #f59e0b; background: #fffbeb; }
    .trend.critical { color: #ef4444; background: #fef2f2; }
    .stat-card h3 { font-size: 2rem; margin: 0; color: #0f172a; font-weight: 800; letter-spacing: -0.02em; text-align: left; }
    .stat-card p { margin: 4px 0 0; color: #94a3b8; text-transform: uppercase; font-size: 0.65rem; letter-spacing: 1.5px; font-weight: 600; text-align: left; }

    /* CRITICAL BANNER */
    .critical-banner { display: flex; align-items: flex-start; gap: 16px; padding: 20px 24px; background: linear-gradient(135deg, #fef2f2, #fee2e2); border: 2px solid #ef4444; border-radius: 14px; margin-bottom: 20px; animation: pulse-border 2s ease-in-out infinite; }
    .banner-icon { font-size: 2rem; line-height: 1; }
    .banner-text strong { color: #dc2626; font-size: 1rem; font-weight: 700; }
    .banner-text p { margin: 5px 0 0; color: #991b1b; font-size: 0.85rem; line-height: 1.6; }

    @keyframes pulse-border {
      0%, 100% { border-color: #ef4444; box-shadow: 0 0 0 0 rgba(239,68,68,0); }
      50% { border-color: #f87171; box-shadow: 0 0 20px 2px rgba(239,68,68,0.12); }
    }

    /* CARDS & LAYOUT */
    .card { background: white; padding: 28px; border-radius: 20px; box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 8px 24px rgba(0,0,0,0.03); margin-bottom: 24px; border: 1px solid #f1f5f9; transition: all 0.3s cubic-bezier(.4,0,.2,1); }
    .card:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(0,0,0,0.06); }
    .card.alert-card { border-top: 4px solid #6366f1; }
    .card.alert-card.low { border-top-color: #10b981; }
    .card.alert-card.medium { border-top-color: #f59e0b; }
    .card.alert-card.high { border-top-color: #f97316; }
    .card.alert-card.critical { border-top-color: #ef4444; }
    
    .map-container { position: relative; height: 300px; border-radius: 12px; overflow: hidden; background: #e2e8f0; margin-top: 16px; border: 1px solid #e2e8f0; }
    .map-container.small-map { height: 200px; margin-top: 10px; margin-bottom: 10px; }
    .map-caption { font-size: 0.8rem; color: #94a3b8; margin-top: 8px; text-align: right; font-weight: 500; }
    
    .card h3 { margin-top: 0; color: #0f172a; font-size: 1.25rem; margin-bottom: 12px; font-weight: 800; letter-spacing: -0.02em; }
    .description { color: #64748b; margin-bottom: 24px; line-height: 1.7; font-size: 0.9rem; font-weight: 500; }
    .card.critical-card { border-left-color: #ef4444; box-shadow: 0 1px 3px rgba(239,68,68,0.06), 0 4px 16px rgba(239,68,68,0.04); }
    
    .map-container { position: relative; height: 300px; border-radius: 12px; overflow: hidden; background: #e2e8f0; margin-top: 16px; border: 1px solid #e2e8f0; }
    .map-container.small-map { height: 200px; margin-top: 10px; margin-bottom: 10px; }
    .map-caption { font-size: 0.8rem; color: #94a3b8; margin-top: 8px; text-align: right; font-weight: 500; }
    
    .card h3 { margin-top: 0; color: #0f172a; font-size: 1.2rem; margin-bottom: 8px; font-weight: 700; letter-spacing: -0.01em; }
    .description { color: #64748b; margin-bottom: 24px; line-height: 1.6; font-size: 0.9rem; }

    /* FORMS */
    .form-group { margin-bottom: 20px; }
    .form-group label { display: block; margin-bottom: 10px; font-weight: 700; color: #475569; font-size: 0.75rem; letter-spacing: 0.05em; text-transform: uppercase; }
    .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 12px 16px; border: 1.5px solid #e2e8f0; border-radius: 12px; font-family: 'Outfit', 'Inter', sans-serif; font-size: 0.9rem; transition: all 0.2s cubic-bezier(.4,0,.2,1); box-sizing: border-box; color: #1e293b; background: #f8fafc; }
    .form-group input:focus, .form-group select:focus, .form-group textarea:focus { border-color: #6366f1; outline: none; box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1); background: white; }
    .form-group input::placeholder, .form-group textarea::placeholder { color: #94a3b8; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

    /* SEARCH SECTION */
    .search-section { background: #f1f5f9; padding: 20px; border-radius: 12px; border: 1.5px dashed #cbd5e1; }
    .search-input-group { display: flex; gap: 10px; }
    .search-input-group input { flex: 1; }

    /* BUTTONS */
    .primary-btn { padding: 14px 28px; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: white; border: none; border-radius: 12px; cursor: pointer; font-weight: 700; transition: all 0.3s cubic-bezier(.4,0,.2,1); font-size: 0.9rem; width: 100%; box-shadow: 0 4px 12px rgba(15,23,42,0.2); font-family: 'Outfit', sans-serif; }
    .primary-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(15,23,42,0.3); background: linear-gradient(135deg, #334155 0%, #1e293b 100%); }
    .primary-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

    .danger-btn { padding: 14px 28px; background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; border: none; border-radius: 12px; cursor: pointer; font-weight: 700; width: 100%; transition: all 0.3s cubic-bezier(.4,0,.2,1); font-family: 'Outfit', sans-serif; box-shadow: 0 4px 14px rgba(99,102,241,0.25); }
    .danger-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(99,102,241,0.4); background: linear-gradient(135deg, #818cf8, #6366f1); }

    .critical-broadcast-btn { 
      padding: 15px 28px; 
      background: linear-gradient(135deg, #dc2626, #991b1b); 
      color: white; border: none; border-radius: 10px; cursor: pointer; 
      font-weight: 700; width: 100%; font-size: 1.05rem; font-family: 'Inter', sans-serif;
      letter-spacing: 0.5px;
      animation: pulse-btn 1.5s ease-in-out infinite;
      box-shadow: 0 4px 20px rgba(220, 38, 38, 0.35);
      transition: transform 0.2s;
    }
    .critical-broadcast-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 28px rgba(220, 38, 38, 0.45); }
    .critical-broadcast-btn:disabled { animation: none; opacity: 0.6; cursor: not-allowed; transform: none; }

    @keyframes pulse-btn {
      0%, 100% { box-shadow: 0 4px 20px rgba(220, 38, 38, 0.35); }
      50% { box-shadow: 0 4px 32px rgba(220, 38, 38, 0.55); }
    }

    .secondary-btn { padding: 8px 18px; background: #f1f5f9; color: #334155; border: 1.5px solid #e2e8f0; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.85rem; white-space: nowrap; transition: all 0.2s; font-family: 'Inter', sans-serif; }
    .secondary-btn:hover { background: #e2e8f0; border-color: #cbd5e1; }

    /* TABLE */
    .data-table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    .data-table th, .data-table td { padding: 14px 16px; text-align: left; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 0.9rem; }
    .data-table th { background-color: #f8fafc; color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.06em; }
    .data-table tr { transition: background 0.15s; }
    .data-table tbody tr:nth-child(even) { background-color: #fafbfc; }
    .data-table tbody tr:hover { background-color: #f1f5f9; }
    
    .status-badge { padding: 5px 12px; border-radius: 20px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; }
    .status-badge.pending { background: #fef3c7; color: #92400e; }
    .status-badge.in_progress { background: #dbeafe; color: #1e40af; }
    .status-badge.completed { background: #d1fae5; color: #065f46; }
    .status-badge.verified { background: #d1fae5; color: #065f46; }
    .status-badge.active { background: #dbeafe; color: #1e40af; }
    .status-badge.rejected { background: #fee2e2; color: #991b1b; }

    .sm-select { padding: 4px 8px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 0.8rem; background: white; margin-right: 8px; }
    .sm-btn { padding: 6px 12px; border-radius: 6px; border: none; cursor: pointer; font-weight: 600; font-size: 0.75rem; transition: all 0.2s; }
    .sm-btn.success { background: #10b981; color: white; }
    .sm-btn.danger { background: #ef4444; color: white; }
    .sm-btn.investigate { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 7px 16px; font-size: 0.8rem; letter-spacing: 0.02em; box-shadow: 0 2px 8px rgba(37,99,235,0.25); }
    .sm-btn.investigate:disabled { opacity: 0.45; cursor: not-allowed; transform: none; box-shadow: none; }
    .sm-btn:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); }
    .action-group { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .investigate-label { display: block; font-size: 0.72rem; color: #2563eb; font-weight: 600; margin-top: 4px; }
    .status-badge.investigating { background: #dbeafe; color: #1e40af; }

    .severity-badge { padding: 4px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; }
    .severity-badge.critical { background: #fee2e2; color: #991b1b; }
    .severity-badge.high { background: #ffedd5; color: #9a3412; }
    .severity-badge.medium { background: #fef3c7; color: #92400e; }
    .severity-badge.low { background: #d1fae5; color: #065f46; }

    .active-dot { height: 8px; width: 8px; background: #10b981; border-radius: 50%; display: inline-block; margin-right: 6px; box-shadow: 0 0 0 2px rgba(16,185,129,0.2); animation: blink 2s infinite; }
    @keyframes blink {
      0%, 100% { opacity: 1; box-shadow: 0 0 0 2px rgba(16,185,129,0.2); }
      50% { opacity: 0.5; box-shadow: 0 0 0 4px rgba(16,185,129,0.1); }
    }

    /* MODAL */
    .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15,23,42,0.65); z-index: 10000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(8px); animation: fadeIn 0.2s; }
    .modal-box { background: white; padding: 36px; border-radius: 24px; max-width: 480px; width: 90%; text-align: center; box-shadow: 0 25px 60px rgba(0,0,0,0.2); animation: slideUp 0.3s cubic-bezier(.4,0,.2,1); border: 1px solid rgba(255,255,255,0.1); }
    .modal-icon { font-size: 3.5rem; margin-bottom: 16px; }
    .modal-icon.success { color: #10b981; text-shadow: 0 0 20px rgba(16,185,129,0.2); }
    
    .success-modal h3 { font-size: 1.6rem; font-weight: 800; color: #0f172a; margin-bottom: 8px; letter-spacing: -0.02em; }
    .success-modal p { color: #64748b; font-size: 0.95rem; margin-bottom: 24px; line-height: 1.6; }
    
    .modal-detail { background: #f8fafc; border-radius: 16px; padding: 20px; margin-bottom: 28px; text-align: left; border: 1px solid #e2e8f0; }
    .detail-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 0.92rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }
    .detail-row:last-child { margin-bottom: 0; border-bottom: none; padding-bottom: 0; }
    .detail-row strong { color: #64748b; font-weight: 600; }
    .detail-row span { color: #0f172a; font-weight: 700; }
    
    .modal-actions { display: flex; gap: 12px; justify-content: center; }
    .critical-confirm-btn { padding: 11px 28px; background: linear-gradient(135deg, #ef4444, #dc2626); color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 0.95rem; transition: all 0.2s; font-family: 'Inter', sans-serif; }
    .critical-confirm-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(239,68,68,0.3); }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }

    .message { margin-top: 20px; padding: 14px 20px; border-radius: 10px; text-align: center; font-weight: 500; animation: slideUp 0.3s; font-size: 0.9rem; }
    .success { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
    .error { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
    
    .mt-4 { margin-top: 1.5rem; }
    .flex-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }

    /* REPORT MODAL SPECIFIC */
    .report-modal { max-width: 600px; text-align: left; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .modal-header h3 { margin: 0; font-size: 1.4rem; font-weight: 800; color: #0f172a; }
    .header-actions { display: flex; align-items: center; gap: 12px; margin-left: auto; margin-right: 16px; }
    .icon-btn { 
      background: #f1f5f9; 
      border: none; 
      border-radius: 8px; 
      width: 32px; 
      height: 32px; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      cursor: pointer; 
      transition: all 0.2s; 
      font-size: 1.1rem;
    }
    .icon-btn:hover { background: #e2e8f0; transform: rotate(45deg); }
    .task-id-badge { background: #f1f5f9; color: #64748b; padding: 4px 10px; border-radius: 8px; font-size: 0.75rem; font-weight: 700; margin-left: 12px; }
    .close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #94a3b8; }

    /* AI GEN BUTTON */
    .ai-gen-btn { 
      background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%); 
      border: 1.2px solid #ddd6fe; 
      color: #7c3aed; 
      padding: 4px 12px; 
      border-radius: 8px; 
      font-size: 0.72rem; 
      font-weight: 700; 
      cursor: pointer; 
      display: flex; 
      align-items: center; 
      gap: 6px; 
      transition: all 0.2s cubic-bezier(.4,0,.2,1);
      margin-bottom: 6px;
    }
    .ai-gen-btn:hover:not(:disabled) { background: #ede9fe; border-color: #c4b5fd; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(124,58,237,0.12); }
    .ai-gen-btn:active { transform: translateY(0); }
    .ai-gen-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .ai-sparkle { animation: pulse 2s infinite; }

    .reports-list { max-height: 400px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; margin-bottom: 20px; padding-right: 8px; }
    .report-item { background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; }
    .report-meta { display: flex; justify-content: space-between; font-size: 0.75rem; color: #64748b; margin-bottom: 8px; font-weight: 600; }
    .report-text { margin: 0; font-size: 0.9rem; line-height: 1.5; color: #1e293b; }
    .empty-reports { padding: 40px; text-align: center; color: #94a3b8; font-weight: 600; background: #f8fafc; border-radius: 16px; border: 2px dashed #e2e8f0; }

    /* Operation Context Styles */
    .operation-context {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .op-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }
    .op-title {
      font-size: 1.1rem;
      font-weight: 800;
      color: #0f172a;
      flex: 1;
    }
    .op-status {
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 0.65rem;
      font-weight: 800;
      text-transform: uppercase;
    }
    .op-status.pending { background: #f1f5f9; color: #64748b; }
    .op-status.in_progress { background: #eff6ff; color: #1d4ed8; }
    .op-status.completed { background: #dcfce7; color: #15803d; }
    .op-details {
      font-size: 0.85rem;
      color: #334155;
      line-height: 1.5;
      margin-bottom: 8px;
    }
    .operation-context .meta {
      font-size: 0.8rem;
      color: #64748b;
      font-weight: 600;
    }

    /* AI TYPING GLOW */
    .ai-glow { 
      border-color: #a78bfa !important; 
      box-shadow: 0 0 0 4px rgba(167, 139, 250, 0.15) !important;
      background: white !important;
      transition: all 0.3s ease;
    }
    
    /* IMAGE DETAIL */
    .modal-box.success-modal { text-align: center; padding: 40px 32px; max-width: 400px; }
    .modal-icon.success { font-size: 4rem; margin-bottom: 24px; }
    .broadcast-success .modal-icon { color: #818cf8; text-shadow: 0 0 20px rgba(129, 140, 248, 0.3); }
    .pulse-icon { animation: pulse 2s infinite; }
    
    .modal-detail { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 24px 0; text-align: left; }
    .modal-detail .detail-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.9rem; }
    .modal-detail .detail-row:last-child { margin-bottom: 0; }
    .modal-detail strong { color: #64748b; font-weight: 600; }
    .modal-detail span { color: #0f172a; font-weight: 700; }

    .image-detail-box { position: relative; max-width: 90vw; max-height: 90vh; background: white; padding: 10px; border-radius: 12px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; overflow: hidden; }
    .full-img { max-width: 100%; max-height: calc(90vh - 20px); object-fit: contain; border-radius: 8px; }
    .report-img { width: 80px; height: 80px; border-radius: 8px; object-fit: cover; cursor: pointer; border: 2px solid #f1f5f9; transition: transform 0.2s; }
    .report-img:hover { transform: scale(1.05); border-color: #3b82f6; }
    .empty-icon { font-size: 2.5rem; margin-bottom: 12px; opacity: 0.5; }

    /* ANIMATIONS */
    /* MISSIONS TABLE UI ENHANCEMENTS */
    .mission-cell { font-weight: 600; color: #334155; }
    .responder-info { display: flex; align-items: center; gap: 10px; }
    .responder-icon-circle { width: 32px; height: 32px; background: #6366f1; color: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.9rem; }
    .responder-name { font-weight: 600; color: #1e293b; }
    .status-pill { padding: 4px 16px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; }
    .status-pill.completed { background: #ecfdf5; color: #10b981; border-color: #d1fae5; }
    .action-buttons { display: flex; gap: 8px; }
    .action-btn { display: flex; align-items: center; gap: 6px; padding: 10px 20px; border-radius: 10px; border: none; background: #f1f5f9; color: #1e293b; font-weight: 700; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; }
    .action-btn:hover { background: #e2e8f0; transform: translateY(-1px); }
    .action-btn .icon { font-size: 0.9rem; }

    .fade-in { animation: fadeIn 0.35s ease-out; }
    .fade-row { animation: fadeIn 0.25s ease-out; }

    .table-scroll { max-height: 280px; overflow-y: auto; }
    .progress-bar-mini { width: 100%; height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden; margin-top: 4px; }
    .progress-fill { height: 100%; background: #10b981; border-radius: 3px; }
    .hotspot-list { display: flex; flex-direction: column; gap: 10px; }
    .hotspot-item { display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
    .hotspot-name { font-weight: 700; color: #1e293b; font-size: 0.9rem; }
    .hotspot-stats { font-size: 0.75rem; color: #64748b; margin-top: 2px; }
    .risk-badge { padding: 6px 12px; border-radius: 8px; font-weight: 800; font-size: 0.85rem; }
    .risk-low { background: #d1fae5; color: #065f46; }
    .risk-medium { background: #fef3c7; color: #92400e; }
    .risk-high { background: #fee2e2; color: #991b1b; }
    .empty-mini { padding: 20px; text-align: center; color: #94a3b8; font-size: 0.85rem; font-style: italic; }
  `]
})
export class AdminDashboardComponent implements OnInit, OnDestroy, AfterViewInit {

  private wsSubscription?: any;
  activeTab = 'dashboard';
  currentDate = new Date();

  // Data
  responders: any[] = [];
  tasks: any[] = [];
  recentAlerts: any[] = [];
  criticalCount = 0;
  isLoading = false;
  message = '';
  isError = false;

  // Success Modal State
  showTaskSuccessModal = false;
  createdTask: any = null;
  showAlertSuccessModal = false;
  lastBroadcastedAlert: any = null;

  // Forms
  newTask = {
    description: '',
    taskDescription: '',
    responderId: null,
    locationName: '',
    latitude: null as number | null,
    longitude: null as number | null,
    status: 'PENDING'
  };

  newAlert = {
    title: '',
    disasterType: 'FLOOD',
    severity: 'MEDIUM',
    region: '',
    locationName: '',
    description: ''
  };

  // Search Logic
  searchQuery = '';
  isSearching = false;

  // Map Logic
  mapUrl!: SafeResourceUrl;
  map!: any;
  private markers: any[] = [];


  // Reports
  selectedTask: any = null; // Store the full task object
  selectedTaskReports: any[] = [];
  selectedTaskId: number | null = null;
  showReportsModal = false;
  selectedImageUrl: string | null = null;

  // Confirm Dialog
  showConfirmDialog = false;

  // AI Generation
  isGeneratingAI = false;


  private apiUrl = `${environment.apiUrl}/admin`;

  // Analytics Data
  disasterStats: any[] = [];
  regionalStats: any[] = [];
  responderPerf: any[] = [];
  riskAreas: any[] = [];
  trendChart: any;
  perfChart: any;
  avgResponseTime: number = 0;
  resolutionEfficiency: number = 0;
  generatedInsights: string[] = [];

  constructor(

    private authService: AuthService,
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private wsService: WebSocketService,
    private router: Router
  ) {
    this.initMapWithCurrentLocation();
    this.loadData();
  }

  ngOnInit() {
    this.wsSubscription = this.wsService.subscribe('/topic/admin-tasks', (msg: any) => {
      console.log('Received admin task update:', msg);
      if (msg.type === 'NEW_SOS') {
        this.showMessage(`🆘 ${msg.message}`, false);
        this.loadTasks(); // Refresh tasks list
      }
    });
  }

  ngOnDestroy() {
    if (this.wsSubscription) {
      this.wsSubscription.unsubscribe();
    }
  }

  ngAfterViewInit() {
    this.initLeafletMap();
    this.renderMapMarkers();
  }

  private initLeafletMap() {
    if (this.map) return;
    
    // Default focus on India area
    this.map = L.map('adminMap').setView([20.5937, 78.9629], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    // Try to get current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        this.map.setView([lat, lon], 10);
      }, () => {
        console.warn('Geolocation denied, staying at default view.');
      });
    }
  }

  private renderMapMarkers() {
    if (!this.map) return;
    
    // Clear existing markers
    this.markers.forEach(m => this.map.removeLayer(m));
    this.markers = [];

    const taskIcon = L.icon({
      iconUrl: 'https://cdn-icons-png.flaticon.com/512/564/564619.png', // red emergency icon
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });

    const eventIcon = L.icon({
      iconUrl: 'https://cdn-icons-png.flaticon.com/512/2991/2991231.png', // orange alert icon
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -28]
    });

    // Add task markers
    this.tasks.forEach(t => {
      if (t.latitude && t.longitude) {
        const popupContent = `
          <div style="font-family: 'Outfit', sans-serif;">
            <b style="color: #ef4444;">🚨 Rescue Task</b><br>
            <b>Mission:</b> ${t.description}<br>
            <b>Responder:</b> ${t.responderEmail || 'Unassigned'}<br>
            <b>Status:</b> ${t.status}<br>
          </div>
        `;
        const m = L.marker([t.latitude, t.longitude], { icon: taskIcon })
          .bindPopup(popupContent)
          .addTo(this.map);
        this.markers.push(m);
      }
    });

    // Add disaster event markers
    this.recentAlerts.forEach(e => {
      if (e.latitude && e.longitude) {
        const popupContent = `
          <div style="font-family: 'Outfit', sans-serif;">
            <b style="color: #f97316;">⚠️ Disaster Alert</b><br>
            <b>Type:</b> ${e.disasterType}<br>
            <b>Severity:</b> ${e.severity}<br>
            <b>Location:</b> ${e.locationName || e.region}<br>
          </div>
        `;
        const m = L.marker([e.latitude, e.longitude], { icon: eventIcon })
          .bindPopup(popupContent)
          .addTo(this.map);
        this.markers.push(m);
      }
    });
  }

  private initMapWithCurrentLocation() {
    // Legacy method - replaced by initLeafletMap
  }


  logout() {
    this.authService.logout();
  }



  getPageTitle(): string {
    switch (this.activeTab) {
      case 'dashboard': return 'Dashboard Overview';
      case 'tasks': return 'Assign Rescue Task';
      case 'responders': return 'Manage Responders';
      case 'alerts': return 'Create Disaster Alert';
      default: return 'Admin Dashboard';
    }
  }

  getIcon(type: string): string {
    switch (type?.toUpperCase()) {
      case 'FLOOD': return '🌊';
      case 'EARTHQUAKE': return '⛰️';
      case 'FIRE': return '🔥';
      case 'STORM': return '⛈️';
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

  loadData() {
    this.loadTasks();
    this.loadResponders();
    this.loadRecentAlerts();
    this.loadAnalyticsData();
  }

  getCompletedTaskCount() {
    return this.tasks.filter(t => t.status === 'COMPLETED').length;
  }

  getOngoingTaskCount() {
    return this.tasks.filter(t => t.status === 'IN_PROGRESS' || t.status === 'PENDING' || t.status === 'INVESTIGATING').length;
  }

  getRiskClass(score: number): string {
    if (score > 7) return 'risk-high';
    if (score > 4) return 'risk-medium';
    return 'risk-low';
  }

  loadAnalyticsData() {
    this.http.get<any[]>(`${this.apiUrl}/analytics/disaster-stats`, this.getHeaders())
      .subscribe(data => {
        this.disasterStats = data || [];
        if (this.activeTab === 'analytics') this.updateTrendChart();
      });

    this.http.get<any[]>(`${this.apiUrl}/analytics/regional-performance`, this.getHeaders())
      .subscribe(data => {
        this.regionalStats = data || [];
        this.calculateMetrics();
        if (this.activeTab === 'analytics') this.updatePerfChart();
      });

    // 3. Load Responder Performance
    this.http.get<any[]>(`${this.apiUrl}/analytics/responder-performance`, this.getHeaders())
      .subscribe(data => {
        this.responderPerf = data || [];
      });

    // 4. Load Risk Areas
    this.http.get<any[]>(`${this.apiUrl}/analytics/risk-areas`, this.getHeaders())
      .subscribe(data => {
        this.riskAreas = data || [];
      });
  }

  calculateMetrics() {
    if (this.regionalStats.length === 0) return;
    
    let totalResp = 0;
    let totalTasks = 0;
    this.regionalStats.forEach(s => {
      totalResp += s.averageResponseTimeMinutes * s.totalTasks;
      totalTasks += s.totalTasks;
    });
    
    this.avgResponseTime = Math.round(totalTasks > 0 ? totalResp / totalTasks : 0);
    
    // Resolution efficiency = (Completed Tasks / Total Tasks) * 100
    const completed = this.getCompletedTaskCount();
    this.resolutionEfficiency = Math.round(this.tasks.length > 0 ? (completed / this.tasks.length) * 100 : 0);

    // Generate smart insights
    this.generatedInsights = [
      `Average Response Time optimized to ${this.avgResponseTime} minutes across all active regions.`,
      `Resolution Efficiency currently at ${this.resolutionEfficiency}%, showing high responder performance.`,
      this.regionalStats.length > 0 ? `Region "${this.regionalStats[0].region}" shows the highest operations volume.` : 'Monitoring emerging regional disaster patterns.'
    ];
  }

  updateTrendChart() {
    const ctx = document.getElementById('disasterTrendChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.trendChart) this.trendChart.destroy();

    this.trendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.disasterStats.map(s => s.yearMonth),
        datasets: [{
          label: 'Disaster Incidents',
          data: this.disasterStats.map(s => s.count),
          borderColor: '#818cf8',
          backgroundColor: 'rgba(129, 140, 248, 0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 3,
          pointBackgroundColor: '#fff',
          pointBorderColor: '#818cf8',
          pointBorderWidth: 2,
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 } } },
          x: { grid: { display: false }, ticks: { font: { size: 10 } } }
        }
      }
    });
  }

  updatePerfChart() {
    const ctx = document.getElementById('regionalPerformanceChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.perfChart) this.perfChart.destroy();

    this.perfChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.regionalStats.map(s => s.region),
        datasets: [
          {
            label: 'Avg Response (min)',
            data: this.regionalStats.map(s => s.averageResponseTimeMinutes),
            backgroundColor: '#818cf8',
            borderRadius: 6
          },
          {
            label: 'Avg Resolution (min)',
            data: this.regionalStats.map(s => s.averageResolutionTimeMinutes),
            backgroundColor: '#10b981',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { 
          legend: { 
            position: 'bottom',
            labels: { boxWidth: 12, padding: 15, font: { size: 10, weight: 'bold' } } 
          } 
        },
        scales: {
          y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 } } },
          x: { grid: { display: false }, ticks: { font: { size: 10 } } }
        }
      }
    });
  }

  switchTab(tab: string) {
    this.activeTab = tab;
    this.message = '';
    if (tab === 'dashboard') {
      setTimeout(() => this.initLeafletMap(), 100);
    }
    if (tab === 'analytics') {
      setTimeout(() => {
        this.updateTrendChart();
        this.updatePerfChart();
      }, 300);
    }
  }


  loadTasks() {
    this.http.get<any[]>(`${this.apiUrl}/tasks`, this.getHeaders())
      .pipe(catchError(e => of([])))
      .subscribe(data => {
        this.tasks = (data || []).map((t: any) => ({ ...t, selectedResponderId: t.responderId || null }));
        this.renderMapMarkers();
      });

  }

  loadResponders() {
    this.http.get<any[]>(`${this.apiUrl}/responders`, this.getHeaders())
      .pipe(catchError(e => of([])))
      .subscribe(data => this.responders = data || []);
  }

  loadRecentAlerts() {
    this.http.get<any[]>(`${this.apiUrl}/alerts`, this.getHeaders())
      .pipe(catchError(e => of([])))
      .subscribe(data => {
        this.recentAlerts = (data || []).sort((a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        this.criticalCount = this.recentAlerts.filter((a: any) => a.severity === 'CRITICAL').length;
        this.renderMapMarkers();
      });

  }

  getPendingSOS() {
    // Show SOS requests that are PENDING, INVESTIGATING, or IN_PROGRESS but not yet VERIFIED
    return this.tasks.filter(t => (t.status === 'PENDING' || t.status === 'IN_PROGRESS' || t.status === 'INVESTIGATING') && t.citizenId && !t.verifiedAt);
  }

  investigateSOS(task: any) {
    // 1. Open Google News search for validation
    const location = task.location || task.description || '';
    const query = encodeURIComponent(location + ' disaster emergency news');
    const newsUrl = 'https://news.google.com/search?q=' + query;
    window.open(newsUrl, '_blank');

    // 2. Update status in backend to mark as investigating
    this.http.put(`${this.apiUrl}/tasks/${task.id}/investigate`, {}, this.getHeaders())
      .subscribe({
        next: () => {
          this.showMessage('🔍 Investigation started. Status updated to Under Review.', false);
          this.loadTasks();
        },
        error: () => this.showMessage('Failed to update investigation status', true)
      });
  }

  viewOnMap(task: any) {
    if (task && task.latitude && task.longitude) {
      console.log('Centering Leaflet map on task location:', task.latitude, task.longitude);
      const lat = parseFloat(task.latitude);
      const lon = parseFloat(task.longitude);
      
      // Switch to dashboard tab to ensure map container is visible
      if (this.activeTab !== 'dashboard') {
        this.activeTab = 'dashboard';
      }

      // Small delay to ensure tab content renders
      setTimeout(() => {
        // Init map if it was somehow destroyed or not yet init
        this.initLeafletMap();
        
        if (this.map) {
          this.map.setView([lat, lon], 13);
          
          // Find the marker and open its popup
          const marker = this.markers.find(m => {
            const pos = m.getLatLng();
            return Math.abs(pos.lat - lat) < 0.0001 && Math.abs(pos.lng - lon) < 0.0001;
          });
          
          if (marker) {
            marker.openPopup();
          }

          const el = document.getElementById('adminMap');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
          }
        }
      }, 150);
    } else if (task && (task.locationName || task.description)) {
      // Fallback: Geocode if coordinates are missing but location name exists
      this.geocodeAndViewOnMap(task);
    } else {
      console.warn('Cannot view on map: Mission has no coordinates or location name', task);
      this.showMessage('No location data available for this mission', true);
    }
  }

  private geocodeAndViewOnMap(task: any) {
    this.isLoading = true;
    const query = task.locationName || task.description;
    console.log('Missing coordinates, attempting geocode for:', query);
    
    // Simple geocoding using Nominatim
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
    
    this.http.get<any[]>(url).subscribe({
      next: (results) => {
        if (results && results.length > 0) {
          const result = results[0];
          task.latitude = parseFloat(result.lat);
          task.longitude = parseFloat(result.lon);
          console.log('Geocoding success:', task.latitude, task.longitude);
          this.viewOnMap(task); // Try again now that we have coordinates
        } else {
          this.showMessage('Could not find map location for: ' + query, true);
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Geocoding error:', err);
        this.showMessage('Error searching for location', true);
        this.isLoading = false;
      }
    });
  }



  viewReports(task: any) {
    if (!task || !task.id) {
      console.error('viewReports called with invalid task:', task);
      this.showMessage('Invalid task selected', true);
      return;
    }
    this.selectedTask = task; // Store full task for context
    this.selectedTaskId = task.id; // Correctly set the ID for the modal
    console.log(`Fetching reports for task ID: ${task.id}`, task);
    this.http.get<any[]>(`${this.apiUrl}/tasks/${task.id}/reports`, this.getHeaders())
      .subscribe({
        next: (data) => {
          console.log(`Received ${data.length} reports for task ${task.id}:`, data);
          this.selectedTaskReports = data;
          this.showReportsModal = true;
        },
        error: (err) => {
          console.error(`Error fetching reports for task ${task.id}:`, err);
          this.showMessage('Failed to load mission reports', true);
        }
      });
  }

  // Image zoom/view logic
  openDetailImage(url: string) {
    this.selectedImageUrl = url;
  }
  closeDetailImage() {
    this.selectedImageUrl = null;
  }

  approveSOS(id: number, priority: string, responderId?: number) {
    this.isLoading = true;

    const doApprove = () => {
      this.http.put(`${this.apiUrl}/tasks/${id}/approve?priority=${priority}`, {}, this.getHeaders())
        .subscribe({
          next: () => {
            this.showMessage(`SOS Verified as ${priority}`, false);
            this.loadTasks();
            this.isLoading = false;
          },
          error: () => {
            this.showMessage('Failed to verify SOS', true);
            this.isLoading = false;
          }
        });
    };

    // If a responder was selected, assign them first, then approve
    if (responderId) {
      this.http.put(`${this.apiUrl}/tasks/${id}/assign?responderId=${responderId}`, {}, this.getHeaders())
        .subscribe({
          next: () => doApprove(),
          error: () => {
            this.showMessage('Failed to assign responder', true);
            this.isLoading = false;
          }
        });
    } else {
      doApprove();
    }
  }

  rejectSOS(id: number) {
    const reason = prompt('Reason for rejection:', 'Not a valid emergency');
    if (reason === null) return;

    this.isLoading = true;
    this.http.put(`${this.apiUrl}/tasks/${id}/reject`, { reason }, this.getHeaders())
      .subscribe({
        next: () => {
          this.showMessage('SOS Rejected', false);
          this.loadTasks();
          this.isLoading = false;
        },
        error: () => {
          this.showMessage('Failed to reject SOS', true);
          this.isLoading = false;
        }
      });
  }

  createTask() {
    if (!this.newTask.description || !this.newTask.responderId) {
      this.showMessage('Please fill required fields', true);
      return;
    }

    this.isLoading = true;
    console.log('Sending createTask request:', this.newTask);
    this.http.post(`${this.apiUrl}/tasks`, this.newTask, this.getHeaders())
      .subscribe({
        next: (response: any) => {
          console.log('Task created result:', response);
          this.createdTask = response;
          this.showTaskSuccessModal = true;
          this.loadTasks();
          // Reset form
          this.newTask = { description: '', taskDescription: '', responderId: null, locationName: '', latitude: null, longitude: null, status: 'PENDING' };
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Failed to assign task:', err);
          const errorMsg = err.error?.error || 'Failed to assign task';
          this.showMessage(errorMsg, true);
          this.isLoading = false;
        }
      });
  }

  performSearch() {
    if (!this.searchQuery) return;
    this.isSearching = true;
    this.message = '';

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.searchQuery)}`;

    this.http.get<any[]>(url).subscribe({
      next: (results) => {
        if (results && results.length > 0) {
          const result = results[0];
          const bb = result.boundingbox;
          this.newAlert.region = result.display_name.split(',')[0];
          this.newAlert.locationName = result.display_name;
          this.updateMapUrl(bb[2], bb[0], bb[3], bb[1]);
          this.showMessage(`Found: ${result.display_name}`, false);
        } else {
          this.showMessage('Location not found', true);
        }
        this.isSearching = false;
      },
      error: () => {
        this.showMessage('Error searching location', true);
        this.isSearching = false;
      }
    });
  }

  updateMapUrl(minLon: any, minLat: any, maxLon: any, maxLat: any) {
    const url = `https://www.openstreetmap.org/export/embed.html?bbox=${minLon},${minLat},${maxLon},${maxLat}&layer=mapnik`;
    this.mapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  onSeverityChange() {
    // Visual feedback only — the banner shows/hides reactively via *ngIf
  }

  onBroadcastClick() {
    if (!this.newAlert.title) {
      this.showMessage('Title required', true);
      return;
    }

    if (this.newAlert.severity === 'CRITICAL') {
      this.showConfirmDialog = true;
    } else {
      this.createAlert();
    }
  }

  confirmBroadcast() {
    this.showConfirmDialog = false;
    this.createAlert();
  }

  createAlert() {
    this.isLoading = true;
    this.http.post(`${this.apiUrl}/alerts`, this.newAlert, this.getHeaders())
      .subscribe({
        next: (response: any) => {
          this.lastBroadcastedAlert = { ...this.newAlert, id: response.id, createdAt: response.createdAt }; // Capture the full alert object including ID and creation time
          this.showAlertSuccessModal = true;
          
          this.newAlert = { title: '', disasterType: 'FLOOD', severity: 'MEDIUM', region: '', locationName: '', description: '' };
          this.searchQuery = '';
          this.isLoading = false;
          this.loadRecentAlerts(); // Refresh the recent alerts list
        },
        error: (err) => {
          console.error(err);
          this.showMessage('Failed to broadcast alert', true);
          this.isLoading = false;
        }
      });
  }

  performTaskLocationSearch() {
    if (!this.newTask.locationName) return;
    this.isLoading = true;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.newTask.locationName)}`;
    this.http.get<any[]>(url).subscribe({
      next: (results) => {
        if (results && results.length > 0) {
          const result = results[0];
          this.newTask.latitude = parseFloat(result.lat);
          this.newTask.longitude = parseFloat(result.lon);
          this.newTask.locationName = result.display_name;
          this.showMessage(`Geocoded: ${result.display_name}`, false);
        } else {
          this.showMessage('Location not found', true);
        }
        this.isLoading = false;
      },
      error: () => {
        this.showMessage('Error searching location', true);
        this.isLoading = false;
      }
    });
  }

  private showMessage(msg: string, isErr: boolean) {
    this.message = msg;
    this.isError = isErr;
    setTimeout(() => this.message = '', 4000);
  }

  generateAIDescription() {
    if (!this.newTask.description) {
      this.showMessage("Please enter a Task Name first to generate instructions.", true);
      return;
    }

    this.isGeneratingAI = true;
    this.newTask.taskDescription = ""; // Clear for typing effect
    
    // Simulate AI thinking and multi-step generation
    setTimeout(() => {
      const name = this.newTask.description.toLowerCase();
      const loc = this.newTask.locationName ? ` in ${this.newTask.locationName.split(',')[0]}` : "";
      let instructions = "";

      if (name.includes('flood')) {
        instructions = `CRITICAL MISSION: Conduct immediate search and rescue in the flooded sectors${loc}. 
- Priority: Evacute high-risk areas and prioritize the elderly, children, and disabled. 
- Equipment: Deploy inflatable rescue boats, life jackets, and thermal blankets. 
- Coordination: Establish a field triage center and sync with local medical units. 
- Safety: Maintain strict radio contact and monitor water level changes every 15 minutes.`;
      } else if (name.includes('fire')) {
        instructions = `EMERGENCY OPS: Establish a secure perimeter and begin systematic evacuation related to the fire outbreak${loc}. 
- Action Plan: Deploy fire-retardant suppressants and check all structural units for trapped occupants.
- Gear: Full specialized heat-shield gear and oxygen support required.
- Utilities: Ensure all gas and electrical mainlines are isolated immediately.
- Logistics: Coordinate with water tankers for continuous supply during suppression.`;
      } else if (name.includes('earthquake')) {
        instructions = `RESCUE PROTOCOL: Initiate structural integrity assessment and survivor search${loc}. 
- Method: Use acoustic and thermal sensors to locate survivors beneath rubble.
- Support: Set up a central command post and provide emergency water, food, and first-aid kits.
- Priority: Clear primary access routes for heavy machinery and emergency vehicles.
- Caution: Watch for aftershocks and secondary structural collapses.`;
      } else if (name.includes('storm')) {
        instructions = `STORM RESPONSE: Clear fallen debris and restore accessibility to primary corridors${loc}. 
- Tasking: Remove downed trees and obstacles from main arteries to allow emergency passage.
- Utility Team: Coordinate with the electrical grid team to secure live fallen wires.
- Welfare: Provide temporary shelter materials and medical aid to displaced residents.
- Risk: Maintain vigilant weather monitoring for potential secondary wind-events.`;
      } else {
        instructions = `OPERATION SCOPE: ${this.newTask.description}${loc}. 
1. INITIAL RESPONSE: Proceed to target zone with standard emergency rescue modules.
2. ASSESSMENT: Conduct a 360-degree situational scan upon arrival to identify high-threat zones.
3. LIFE SAFETY: Identify and prioritize immediate risks to human life.
4. COMMUNICATION: Establish a dedicated comms-link with the Admin Guard command center.
5. DEPLOYMENT: Coordinate with local responders to allocate manpower and equipment based on tactical needs.`;
      }

      // Typing effect
      let i = 0;
      const interval = setInterval(() => {
        if (i < instructions.length) {
          this.newTask.taskDescription += instructions.charAt(i);
          i++;
        } else {
          clearInterval(interval);
          this.isGeneratingAI = false;
          this.showMessage("AI-generated mission instructions applied! ✨", false);
        }
      }, 10); // Fast typing
    }, 1000);
  }

  generateAlertDescription() {
    if (!this.newAlert.disasterType) {
      this.showMessage("Please select a Disaster Type first.", true);
      return;
    }

    this.isGeneratingAI = true;
    this.newAlert.description = ""; // Clear for typing effect
    
    // Simulate AI thinking and multi-step generation
    setTimeout(() => {
      const type = this.newAlert.disasterType.toUpperCase();
      const loc = this.newAlert.locationName || this.newAlert.region ? ` in ${this.newAlert.locationName || this.newAlert.region}` : "";
      let instructions = "";

      if (type === 'FLOOD') {
        instructions = `URGENT PUBLIC WARNING: Moderate flooding detected${loc}. Residents in low-lying areas are advised to move to higher ground immediately. Secure all pets and valuable documents. Avoid driving through flooded streets.`;
      } else if (type === 'FIRE') {
        instructions = `EMERGENCY ALERT: Active fire reported near${loc}. Immediate evacuation for residents within a 1km radius. Follow designated evacuation routes. Stay clear of the affected perimeter to allow emergency vehicle access.`;
      } else if (type === 'EARTHQUAKE') {
        instructions = `PUBLIC SAFETY NOTICE: Seismic activity detected${loc}. Drop, Cover, and Hold on if you feel an aftershock. Stay away from windows and tall structures. Check for gas leaks if safe and avoid elevators.`;
      } else if (type === 'STORM') {
        instructions = `SEVERE WEATHER ALERT: High-intensity storm approaching${loc}. Seek immediate shelter in a sturdy building. Stay away from glass windows and power lines. Secure all outdoor equipment.`;
      } else {
        instructions = `PUBLIC ADVISORY: Emergency situation reported${loc}. Citizens are urged to remain vigilant and follow official instructions from local authorities. Stay tuned for further updates on this broadcast channel.`;
      }

      // Typing effect
      let i = 0;
      const interval = setInterval(() => {
        if (i < instructions.length) {
          this.newAlert.description += instructions.charAt(i);
          i++;
        } else {
          clearInterval(interval);
          this.isGeneratingAI = false;
          this.showMessage("AI-generated public broadcast instructions applied! ✨", false);
        }
      }, 10); // Fast typing
    }, 1000);
  }
}
