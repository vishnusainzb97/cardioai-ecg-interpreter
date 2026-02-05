/**
 * Report Generator - Export Analysis Reports
 * Generates printable/downloadable ECG analysis reports
 */

class ReportGenerator {
    constructor() {
        this.appName = 'CardioAI ECG Interpreter';
        this.version = '1.0.0 MVP';
    }

    /**
     * Generate HTML report from analysis results
     * @param {Object} results - Analysis results from ECGAnalyzer
     * @param {string} ecgImageData - Base64 ECG image or canvas export
     * @returns {string} HTML report content
     */
    generateReport(results, ecgImageData = null) {
        const timestamp = new Date().toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const severityColor = {
            normal: '#10b981',
            warning: '#f59e0b',
            danger: '#ef4444'
        }[results.severity] || '#10b981';

        return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ECG Analysis Report - ${timestamp}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f8fafc;
      color: #1e293b;
      line-height: 1.6;
      padding: 40px;
    }
    
    .report {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    
    .report-header {
      background: linear-gradient(135deg, #0f172a, #1e293b);
      color: white;
      padding: 32px;
      text-align: center;
    }
    
    .report-logo {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }
    
    .report-title {
      font-size: 18px;
      opacity: 0.9;
      margin-bottom: 16px;
    }
    
    .report-meta {
      font-size: 14px;
      opacity: 0.7;
    }
    
    .report-body {
      padding: 32px;
    }
    
    .section {
      margin-bottom: 32px;
    }
    
    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 1px;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 8px;
      margin-bottom: 16px;
    }
    
    .rhythm-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 18px;
      background: ${severityColor}15;
      color: ${severityColor};
      border: 2px solid ${severityColor};
      margin-bottom: 16px;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    
    .stat-card {
      background: #f8fafc;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
    }
    
    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: #0f172a;
      font-family: 'SF Mono', monospace;
    }
    
    .stat-label {
      font-size: 12px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .params-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .params-table tr {
      border-bottom: 1px solid #e2e8f0;
    }
    
    .params-table tr:last-child {
      border-bottom: none;
    }
    
    .params-table td {
      padding: 12px 0;
    }
    
    .params-table td:first-child {
      color: #64748b;
    }
    
    .params-table td:last-child {
      text-align: right;
      font-weight: 600;
    }
    
    .interpretation {
      background: #f8fafc;
      border-radius: 8px;
      padding: 20px;
      border-left: 4px solid ${severityColor};
    }
    
    .interpretation p {
      margin-bottom: 12px;
    }
    
    .interpretation p:last-child {
      margin-bottom: 0;
    }
    
    .recommendations {
      list-style: none;
    }
    
    .recommendations li {
      padding: 8px 0;
      padding-left: 24px;
      position: relative;
    }
    
    .recommendations li::before {
      content: '→';
      position: absolute;
      left: 0;
      color: ${severityColor};
      font-weight: bold;
    }
    
    .risk-meter {
      margin: 16px 0;
    }
    
    .risk-bar {
      height: 12px;
      background: #e2e8f0;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 8px;
    }
    
    .risk-fill {
      height: 100%;
      border-radius: 6px;
      transition: width 1s ease;
    }
    
    .risk-fill.low { background: linear-gradient(90deg, #10b981, #34d399); }
    .risk-fill.medium { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
    .risk-fill.high { background: linear-gradient(90deg, #ef4444, #f87171); }
    
    .risk-labels {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: #94a3b8;
    }
    
    .ecg-image {
      width: 100%;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      margin-top: 16px;
    }
    
    .report-footer {
      background: #f1f5f9;
      padding: 24px 32px;
      text-align: center;
    }
    
    .disclaimer {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
      text-align: left;
      font-size: 13px;
      color: #991b1b;
    }
    
    .disclaimer strong {
      display: block;
      margin-bottom: 4px;
    }
    
    .footer-text {
      font-size: 12px;
      color: #64748b;
    }
    
    @media print {
      body {
        background: white;
        padding: 0;
      }
      
      .report {
        box-shadow: none;
        border-radius: 0;
      }
      
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="report">
    <header class="report-header">
      <div class="report-logo">
        🫀 ${this.appName}
      </div>
      <div class="report-title">ECG Analysis Report</div>
      <div class="report-meta">
        Generated: ${timestamp}<br>
        Report ID: ${this.generateReportId()}
      </div>
    </header>
    
    <div class="report-body">
      <!-- Primary Finding -->
      <section class="section">
        <h2 class="section-title">Primary Finding</h2>
        <div class="rhythm-badge">
          ${results.severity === 'danger' ? '⚠️' : results.severity === 'warning' ? '⚡' : '✓'}
          ${results.rhythmType}
        </div>
        <p><strong>Confidence Score:</strong> ${results.confidence}%</p>
      </section>
      
      <!-- Key Measurements -->
      <section class="section">
        <h2 class="section-title">Key Measurements</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${results.heartRate}</div>
            <div class="stat-label">Heart Rate (BPM)</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${results.prInterval}</div>
            <div class="stat-label">PR Interval (ms)</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${results.qrsDuration}</div>
            <div class="stat-label">QRS Duration (ms)</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${results.qtcInterval}</div>
            <div class="stat-label">QTc Interval (ms)</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${results.axis}°</div>
            <div class="stat-label">QRS Axis</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${results.riskLevel}%</div>
            <div class="stat-label">Risk Score</div>
          </div>
        </div>
      </section>
      
      <!-- Rhythm Analysis -->
      <section class="section">
        <h2 class="section-title">Rhythm Analysis</h2>
        <table class="params-table">
          <tr>
            <td>Regularity</td>
            <td>${results.regularity}</td>
          </tr>
          <tr>
            <td>P Wave</td>
            <td>${results.pWave}</td>
          </tr>
          <tr>
            <td>P:QRS Ratio</td>
            <td>${results.pQrsRatio}</td>
          </tr>
          <tr>
            <td>Rate Variability</td>
            <td>${results.rateVariability}</td>
          </tr>
        </table>
      </section>
      
      <!-- Detailed Parameters -->
      <section class="section">
        <h2 class="section-title">Detailed Parameters</h2>
        <table class="params-table">
          <tr>
            <td>ST Segment</td>
            <td>${results.stSegment}</td>
          </tr>
          <tr>
            <td>T Wave</td>
            <td>${results.tWave}</td>
          </tr>
          <tr>
            <td>Q Wave</td>
            <td>${results.qWave}</td>
          </tr>
          <tr>
            <td>U Wave</td>
            <td>${results.uWave}</td>
          </tr>
          <tr>
            <td>J Point</td>
            <td>${results.jPoint}</td>
          </tr>
        </table>
      </section>
      
      <!-- Clinical Interpretation -->
      <section class="section">
        <h2 class="section-title">Clinical Interpretation</h2>
        <div class="interpretation">
          ${results.interpretation}
        </div>
      </section>
      
      <!-- Risk Assessment -->
      <section class="section">
        <h2 class="section-title">Risk Assessment</h2>
        <div class="risk-meter">
          <div class="risk-bar">
            <div class="risk-fill ${results.riskClass}" style="width: ${results.riskLevel}%"></div>
          </div>
          <div class="risk-labels">
            <span>Low Risk</span>
            <span>Moderate</span>
            <span>High Risk</span>
          </div>
        </div>
      </section>
      
      <!-- Recommendations -->
      <section class="section">
        <h2 class="section-title">Recommendations</h2>
        <ul class="recommendations">
          ${results.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
      </section>
      
      ${ecgImageData ? `
      <!-- ECG Waveform -->
      <section class="section">
        <h2 class="section-title">ECG Waveform</h2>
        <img src="${ecgImageData}" alt="ECG Waveform" class="ecg-image">
      </section>
      ` : ''}
    </div>
    
    <footer class="report-footer">
      <div class="disclaimer">
        <strong>⚠️ Medical Disclaimer</strong>
        This report is generated by an AI system for educational and demonstration purposes only. 
        It should NOT be used for actual medical diagnosis or treatment decisions. 
        Always consult qualified healthcare professionals for ECG interpretation and cardiac care.
      </div>
      <p class="footer-text">
        ${this.appName} v${this.version} | © 2026 CardioAI
      </p>
    </footer>
  </div>
  
  <script>
    // Auto-trigger print dialog when opened
    // window.onload = () => window.print();
  </script>
</body>
</html>
    `;
    }

    /**
     * Generate unique report ID
     * @returns {string} Report ID
     */
    generateReportId() {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `ECG-${timestamp}-${random}`;
    }

    /**
     * Open report in new window for printing/saving
     * @param {Object} results - Analysis results
     * @param {string} ecgImageData - Base64 ECG image
     */
    openReport(results, ecgImageData = null) {
        const reportHTML = this.generateReport(results, ecgImageData);
        const reportWindow = window.open('', '_blank');

        if (reportWindow) {
            reportWindow.document.write(reportHTML);
            reportWindow.document.close();
        } else {
            alert('Please allow popups to view the report.');
        }
    }

    /**
     * Download report as HTML file
     * @param {Object} results - Analysis results
     * @param {string} ecgImageData - Base64 ECG image
     */
    downloadReport(results, ecgImageData = null) {
        const reportHTML = this.generateReport(results, ecgImageData);
        const blob = new Blob([reportHTML], { type: 'text/html' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `ecg-report-${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
    }
}

// Export for use in other modules
window.ReportGenerator = ReportGenerator;
