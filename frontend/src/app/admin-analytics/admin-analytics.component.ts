import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminDisasterService } from '../services/admin-disaster.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-admin-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-analytics.component.html',
  styleUrls: ['./admin-analytics.component.css']
})
export class AdminAnalyticsComponent implements OnInit, AfterViewInit {
  @ViewChild('disasterChart') private disasterChartRef!: ElementRef;
  @ViewChild('regionalChart') private regionalChartRef!: ElementRef;

  monthlyStats: any[] = [];
  regionalPerformance: any[] = [];
  riskAreas: any[] = [];
  topRiskAreas: any[] = [];
  notificationStats: any = null;
  responderPerformance: any[] = [];
  disasterDistribution: { type: string, count: number }[] = [];
  summaryStats: any = null;
  loading = true;
  currentDate: string = '';
  systemOnline = true;

  constructor(private adminService: AdminDisasterService) {}

  ngOnInit(): void {
    this.updateDate();
    this.loadData();
  }

  updateDate(): void {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    this.currentDate = new Date().toLocaleDateString('en-US', options);
  }

  ngAfterViewInit(): void {
    // Initial charts if data is already there (unlikely but safe)
    if (!this.loading) {
      this.createCharts();
    }
  }

  loadData(): void {
    this.loading = true;
    this.adminService.getMonthlyDisasterStats().subscribe({
      next: (stats) => {
        this.monthlyStats = stats;
        this.adminService.getRegionalPerformanceStats().subscribe({
          next: (perf) => {
            this.regionalPerformance = perf;
            this.adminService.getHighRiskAreas().subscribe({
              next: (risks) => {
                this.riskAreas = risks;
                this.topRiskAreas = risks.slice(0, 3);
                this.adminService.getNotificationStats().subscribe({
                  next: (notifs) => {
                    this.notificationStats = notifs;
                    this.adminService.getDisasterDistribution().subscribe({
                      next: (dist: Record<string, number>) => {
                        this.disasterDistribution = Object.entries(dist).map(([type, count]) => ({
                          type,
                          count: Number(count)
                        }));
                        this.adminService.getResponderPerformance().subscribe({
                          next: (resp) => {
                            this.responderPerformance = resp;
                            this.adminService.getSummaryStats().subscribe({
                              next: (summary) => {
                                this.summaryStats = summary;
                                this.loading = false;
                                setTimeout(() => this.createCharts(), 0);
                              },
                              error: (err) => {
                                console.error('Error fetching summary stats', err);
                                this.loading = false;
                                setTimeout(() => this.createCharts(), 0);
                              }
                            });
                          },
                          error: (err) => {
                            console.error('Error fetching responder performance', err);
                            this.loading = false;
                          }
                        });
                      },
                      error: (err) => {
                        console.error('Error fetching disaster distribution', err);
                        this.loading = false;
                      }
                    });
                  },
                  error: (err) => {
                    console.error('Error fetching notification stats', err);
                    this.loading = false;
                  }
                });
              },
              error: (err) => {
                console.error('Error fetching risk areas', err);
                this.loading = false;
              }
            });
          },
          error: (err) => {
            console.error('Error fetching regional performance', err);
            this.loading = false;
          }
        });
      },
      error: (err) => {
        console.error('Error fetching monthly stats', err);
        this.loading = false;
      }
    });
  }

  createCharts(): void {
    if (this.disasterChartRef) {
      this.createDisasterChart();
    }
    if (this.regionalChartRef) {
      this.createRegionalChart();
    }
  }

  createDisasterChart(): void {
    const ctx = this.disasterChartRef.nativeElement.getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.monthlyStats.map(s => s.yearMonth),
        datasets: [{
          label: 'Disasters Handled',
          data: this.monthlyStats.map(s => s.count),
          backgroundColor: 'rgba(79, 70, 229, 0.4)', // Indigo
          borderColor: '#4f46e5',
          borderWidth: 2,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: { display: false }
        },
        scales: {
          y: { 
            beginAtZero: true, 
            grid: { color: '#f1f5f9' }, 
            ticks: { color: '#94a3b8', font: { size: 10 } } 
          },
          x: { 
            grid: { display: false }, 
            ticks: { color: '#94a3b8', font: { size: 10 } } 
          }
        }
      }
    });
  }

  createRegionalChart(): void {
    const ctx = this.regionalChartRef.nativeElement.getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.regionalPerformance.map(p => p.region),
        datasets: [
          {
            label: 'Avg Response (min)',
            data: this.regionalPerformance.map(p => p.averageResponseTimeMinutes),
            backgroundColor: 'rgba(99, 102, 241, 0.7)', // Indigo-500
            borderColor: '#6366f1',
            borderWidth: 1,
            borderRadius: 4
          },
          {
            label: 'Avg Resolution (min)',
            data: this.regionalPerformance.map(p => p.averageResolutionTimeMinutes),
            backgroundColor: 'rgba(16, 185, 129, 0.7)', // Emerald-500
            borderColor: '#10b981',
            borderWidth: 1,
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { 
            position: 'bottom', 
            labels: { color: '#64748b', boxWidth: 12, font: { size: 11, weight: 'bold' } } 
          },
          title: { display: false }
        },
        scales: {
          y: { 
            beginAtZero: true, 
            grid: { color: '#f1f5f9' }, 
            ticks: { color: '#94a3b8', font: { size: 10 } } 
          },
          x: { 
            grid: { display: false }, 
            ticks: { color: '#94a3b8', font: { size: 10 } } 
          }
        }
      }
    });
  }

  getBestRegion(): string {
    if (this.regionalPerformance.length === 0) return 'N/A';
    const best = [...this.regionalPerformance].sort((a, b) => a.averageResponseTimeMinutes - b.averageResponseTimeMinutes)[0];
    return best.region;
  }

  getRiskLevel(score: number): { label: string, class: string } {
    if (score >= 8) return { label: 'CRITICAL', class: 'risk-critical' };
    if (score >= 5) return { label: 'HIGH', class: 'risk-high' };
    if (score >= 3) return { label: 'MEDIUM', class: 'risk-medium' };
    return { label: 'LOW', class: 'risk-low' };
  }
}
