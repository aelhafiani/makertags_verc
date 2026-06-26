import { Component } from '@angular/core';
import { AnalyticsService } from '../../../shared/services/analytics.service';
import { CommonModule, formatDate } from '@angular/common';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';

@Component({
  selector: 'app-analytics',
  imports: [CommonModule,
     NzTableModule,
    NzCardModule,
    NzGridModule,
    NgChartsModule
  ],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.scss'
})
export class AnalyticsComponent {
  loading = true;

  // Tables
  exportsByUser: Array<{ user_id: string; full_name: string; total_exports: number }> = [];
  exportsByArt: Array<{ art_doc_id: string; title: string; total_exports: number }> = [];
  exportsByDay: Array<{ day: string; exports: number }> = [];

  // Chart.js data
  // Line chart (exports by day)
  lineChartLabels: string[] = [];
  lineChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Exports',
        tension: 0.3,
        fill: true,
      }
    ]
  };
  lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: { display: true },
      y: { display: true }
    }
  };

  // Bar chart (exports by user)
  barChartLabels: string[] = [];
  barChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [
      { data: [], label: 'Exports' }
    ]
  };
  barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    plugins: { legend: { display: false } }
  };

  // Pie chart (top arts)
  pieChartLabels: string[] = [];
  pieChartData: number[] = [];

  constructor(private analytics: AnalyticsService) {}

  async ngOnInit() {
    try {
      this.loading = true;

      // load tables
      this.exportsByUser = await this.analytics.getExportsByUser();
      this.exportsByArt = await this.analytics.getExportsByArt();
      this.exportsByDay = await this.analytics.getExportsByDay();

      // Prepare line chart (exports by day)
      // Sort by day to ensure proper order
      const sortedByDay = [...this.exportsByDay].sort((a,b) => new Date(a.day).getTime() - new Date(b.day).getTime());
      this.lineChartLabels = sortedByDay.map(d => formatDate(d.day, 'MMM d', 'en-US'));
      const lineValues = sortedByDay.map(d => Number(d.exports));
      this.lineChartData = {
        labels: this.lineChartLabels,
        datasets: [
          { data: lineValues, label: 'Exports', tension: 0.3, fill: true }
        ]
      };

      console.log('lineChartData', this.lineChartData);
      // Prepare bar chart (top users)
      // Optionally take top N users
      const topUsers = this.exportsByUser.slice(0, 10);
      this.barChartLabels = topUsers.map(u => u.full_name || u.user_id);
      this.barChartData = {
        labels: this.barChartLabels,
        datasets: [{ data: topUsers.map(u => Number(u.total_exports)), label: 'Exports' }]
      };

      // Prepare pie (top arts)
      const topArts = this.exportsByArt.slice(0, 10);
      this.pieChartLabels = topArts.map(a => a.title || a.art_doc_id);
      this.pieChartData = topArts.map(a => Number(a.total_exports));

    } catch (err) {
      console.error('Erreur chargement analytics:', err);
    } finally {
      this.loading = false;
    }
  }
}

