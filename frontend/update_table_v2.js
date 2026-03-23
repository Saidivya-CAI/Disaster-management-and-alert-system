const fs = require('fs');
const path = 'src/app/dashboard/admin-dashboard.component.ts';
let content = fs.readFileSync(path, 'utf8');

const anchor = '<h3>All Rescue Tasks</h3>';
const startIdx = content.indexOf(anchor);

if (startIdx !== -1) {
    // Find the next <table and </table>
    const tableStart = content.indexOf('<table', startIdx);
    const tableEnd = content.indexOf('</table>', tableStart) + '</table>'.length;
    
    if (tableStart !== -1 && tableEnd !== -1) {
        const newTable = `<table class="data-table">
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
                </table>`;
        
        const before = content.substring(0, tableStart);
        const after = content.substring(tableEnd);
        content = before + newTable + after;
        fs.writeFileSync(path, content, 'utf8');
        console.log('Successfully replaced table');
    } else {
        console.log('Could not find table tags after anchor');
    }
} else {
    console.log('Could not find anchor: ' + anchor);
}
