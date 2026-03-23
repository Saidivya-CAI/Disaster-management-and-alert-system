const fs = require('fs');
const path = 'src/app/dashboard/admin-dashboard.component.ts';
let content = fs.readFileSync(path, 'utf8');

const tableHeaderOld = `                <table class="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Description</th>
                      <th>Priority</th>
                      <th>Responder</th>
                      <th>Status</th>
                    </tr>
                  </thead>`;

const tableHeaderNew = `                <table class="data-table">
                  <thead>
                    <tr>
                      <th style="width: 40%">MISSION</th>
                      <th style="width: 25%">RESPONDER</th>
                      <th style="width: 15%">STATUS</th>
                      <th style="width: 20%">ACTIONS</th>
                    </tr>
                  </thead>`;

const tableBodyOld = `                  <tbody>
                    <tr *ngFor="let t of tasks">
                      <td>#{{ t.id }}</td>
                      <td>{{ t.description }}</td>
                      <td>
                         <span *ngIf="t.priority" class="severity-badge" [ngClass]="t.priority.toLowerCase()">{{ t.priority }}</span>
                         <span *ngIf="!t.priority">—</span>
                      </td>
                      <td>{{ t.responderId || 'Unassigned' }}</td>
                      <td>
                        <span class="status-badge" [ngClass]="t.status.toLowerCase()">{{ t.status }}</span>
                      </td>
                    </tr>
                  </tbody>`;

const tableBodyNew = `                  <tbody>
                    <tr *ngFor="let t of tasks" class="fade-row">
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
                  </tbody>`;

// Normalize line endings for replacement
const normalize = (str) => str.replace(/\r\n/g, '\n').trim();

if (normalize(content).includes(normalize(tableHeaderOld))) {
    content = content.replace(tableHeaderOld, tableHeaderNew);
    console.log('Header replaced');
} else {
    console.log('Header not found');
}

if (normalize(content).includes(normalize(tableBodyOld))) {
    content = content.replace(tableBodyOld, tableBodyNew);
    console.log('Body replaced');
} else {
    console.log('Body not found');
}

fs.writeFileSync(path, content, 'utf8');
