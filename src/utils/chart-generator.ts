/**
 * Generate Chart.js HTML embeds for PDF reports
 * Creates interactive charts that render in HTML and convert to PDF
 */
export class ChartGenerator {
  /**
   * Generate a line chart for velocity trends
   */
  static generateVelocityChart(weeks: number[], mergedPRs: number[], maxValue: number): string {
    const labels = weeks.map((w) => `W${w}`).join('","');
    const data = mergedPRs.join(',');

    return `
<div class="chart-container" style="position: relative; width: 100%; height: 300px; margin: 1.5em 0;">
  <canvas id="velocityChart"></canvas>
</div>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script>
  const velocityCtx = document.getElementById('velocityChart').getContext('2d');
  new Chart(velocityCtx, {
    type: 'line',
    data: {
      labels: ["${labels}"],
      datasets: [{
        label: 'Merged PRs per Week',
        data: [${data}],
        borderColor: '#0066cc',
        backgroundColor: 'rgba(0, 102, 204, 0.1)',
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: '#0066cc',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { usePointStyle: true }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: ${maxValue},
          title: { display: true, text: 'Merged PRs' }
        }
      }
    }
  });
</script>
`;
  }

  /**
   * Generate a line chart for backlog burndown
   */
  static generateBurndownChart(
    weeks: string[],
    projectedIssues: number[],
    idealIssues: number[],
    maxValue: number
  ): string {
    const weekLabels = weeks.join('","');
    const projectedData = projectedIssues.join(',');
    const idealData = idealIssues.join(',');

    return `
<div class="chart-container" style="position: relative; width: 100%; height: 300px; margin: 1.5em 0;">
  <canvas id="burndownChart"></canvas>
</div>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script>
  const burndownCtx = document.getElementById('burndownChart').getContext('2d');
  new Chart(burndownCtx, {
    type: 'line',
    data: {
      labels: ["${weekLabels}"],
      datasets: [
        {
          label: 'Projected Open Issues',
          data: [${projectedData}],
          borderColor: '#d63384',
          backgroundColor: 'rgba(214, 51, 132, 0.1)',
          borderWidth: 2,
          pointRadius: 3,
          tension: 0.3,
          fill: true
        },
        {
          label: 'Ideal Pace',
          data: [${idealData}],
          borderColor: '#0066cc',
          borderDash: [5, 5],
          borderWidth: 2,
          pointRadius: 2,
          tension: 0.3,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { usePointStyle: true }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: ${maxValue},
          title: { display: true, text: 'Open Issues' }
        }
      }
    }
  });
</script>
`;
  }

  /**
   * Generate a radar chart for benchmark comparison
   */
  static generateRadarChart(categories: string[], values: number[]): string {
    const categoryLabels = categories.map((c) => `"${c}"`).join(',');
    const dataValues = values.join(',');

    return `
<div class="chart-container" style="position: relative; width: 100%; height: 350px; margin: 1.5em 0;">
  <canvas id="radarChart"></canvas>
</div>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script>
  const radarCtx = document.getElementById('radarChart').getContext('2d');
  new Chart(radarCtx, {
    type: 'radar',
    data: {
      labels: [${categoryLabels}],
      datasets: [{
        label: 'Your Repository',
        data: [${dataValues}],
        borderColor: '#0066cc',
        backgroundColor: 'rgba(0, 102, 204, 0.2)',
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: '#0066cc',
        pointBorderColor: '#fff',
        pointBorderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { usePointStyle: true }
        }
      },
      scales: {
        r: {
          min: 0,
          max: 100,
          beginAtZero: true,
          ticks: {
            stepSize: 20
          }
        }
      }
    }
  });
</script>
`;
  }
}
