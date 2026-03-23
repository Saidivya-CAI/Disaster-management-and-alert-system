const fs = require('fs');
const path = 'src/app/dashboard/admin-dashboard.component.ts';
let content = fs.readFileSync(path, 'utf8');

// The problematic block starts around "<!-- DASHBOARD OVERVIEW (Map & Stats) -->"
const duplicateTag = '<!-- DASHBOARD OVERVIEW (Map & Stats) -->';
const startIdx = content.indexOf(duplicateTag);

if (startIdx !== -1) {
    // We want to remove from startIdx to the end of that *ngIf block
    // The block ends at "<!-- ASSIGN TASK TAB -->" (approx)
    const endTag = '<!-- ASSIGN TASK TAB -->';
    const endIdx = content.indexOf(endTag, startIdx);
    
    if (endIdx !== -1) {
        // Before removing, let's extract the "Recent Alerts" table if we want to keep it
        // Or we just replace everything between line 72 and line 209 with a clean version.
        
        const mainDashboardTag = '<!-- DASHBOARD OVERVIEW -->';
        const mainDashboardIdx = content.indexOf(mainDashboardTag);
        
        if (mainDashboardIdx !== -1) {
            const cleanDashboard = `
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
            <div class="card map-card">
              <h3>🌍 Live Disaster Monitor</h3>
              <div class="map-container">
                 <iframe 
                  width="100%" 
                  height="300" 
                  frameborder="0" 
                  scrolling="no" 
                  marginheight="0" 
                  marginwidth="0" 
                  [src]="mapUrl">
                </iframe>
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
                      <div class="mission-text">{{ t.description || 'Emergency Help Requested by ' + t.citizenEmail }}</div>
                    </td>
                    <td class="responder-cell">
                      <div class="responder-info">
                        <div class="responder-icon-circle">?</div>
                        <span class="responder-name">{{ t.responderId || 'Unassigned' }}</span>
                      </div>
                    </td>
                    <td>
                      <span class="status-pill" [ngClass]="t.status.toLowerCase()">{{ t.status }}</span>
                    </td>
                    <td class="actions-cell">
                      <div class="action-buttons">
                        <button class="action-btn map-btn"><span class="icon">📍</span> Map</button>
                        <button class="action-btn report-btn"><span class="icon">📝</span> Reports</button>
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
`;
            
            const before = content.substring(0, mainDashboardIdx);
            const after = content.substring(endIdx);
            content = before + cleanDashboard + after;
            fs.writeFileSync(path, content, 'utf8');
            console.log('Consolidated dashboard successfully');
        }
    }
}
