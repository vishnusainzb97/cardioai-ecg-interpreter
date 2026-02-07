/**
 * Report Generator Service
 * Generates PDF reports for ECG analyses
 */

class ReportGenerator {
    constructor() {
        this.appName = 'CardioAI ECG Interpreter';
    }

    /**
     * Generate PDF report from ECG record
     * @param {Object} record - ECG record from database
     * @returns {Buffer} PDF buffer
     */
    async generatePDF(record) {
        // For MVP, generate HTML report that can be printed as PDF
        // In production, use a library like PDFKit or puppeteer

        const html = this.generateHTML(record);

        // Convert HTML to PDF buffer
        // For now, return the HTML as a buffer (client can use browser print)
        return Buffer.from(html, 'utf8');
    }

    /**
     * Generate HTML report
     */
    generateHTML(record) {
        const timestamp = record.createdAt.toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const severityColors = {
            normal: '#10b981',
            warning: '#f59e0b',
            danger: '#ef4444'
        };

        const severityColor = severityColors[record.analysisResults.severity] || '#10b981';

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
      line-height: 1.6;
      color: #1e293b;
      background: #fff;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    
    .report {
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
    }
    
    .report-header {
      background: linear-gradient(135deg, #1e3a5f, #0f172a);
      color: white;
      padding: 30px;
      text-align: center;
    }
    
    .report-logo {
      font-size: 1.8rem;
      font-weight: 700;
      margin-bottom: 10px;
    }
    
    .report-title {
      font-size: 1.4rem;
      opacity: 0.9;
    }
    
    .report-meta {
      margin-top: 15px;
      font-size: 0.9rem;
      opacity: 0.8;
    }
    
    .report-body {
      padding: 30px;
    }
    
    .section {
      margin-bottom: 25px;
    }
    
    .section-title {
      font-size: 1.1rem;
      font-weight: 600;
      color: #0ea5e9;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 8px;
      margin-bottom: 15px;
    }
    
    .primary-finding {
      background: #f0f9ff;
      border-left: 4px solid ${severityColor};
      padding: 20px;
      border-radius: 0 8px 8px 0;
      margin-bottom: 20px;
    }
    
    .finding-classification {
      font-size: 1.5rem;
      font-weight: 700;
      color: ${severityColor};
    }
    
    .finding-confidence {
      color: #64748b;
      margin-top: 5px;
    }
    
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
    }
    
    .metric {
      background: #f8fafc;
      padding: 15px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    
    .metric-label {
      font-size: 0.8rem;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .metric-value {
      font-size: 1.4rem;
      font-weight: 600;
      color: #1e293b;
    }
    
    .metric-unit {
      font-size: 0.9rem;
      color: #64748b;
    }
    
    .findings-list, .recommendations-list {
      list-style: none;
    }
    
    .findings-list li, .recommendations-list li {
      padding: 8px 0;
      padding-left: 25px;
      position: relative;
      border-bottom: 1px solid #f1f5f9;
    }
    
    .findings-list li:last-child, .recommendations-list li:last-child {
      border-bottom: none;
    }
    
    .findings-list li::before {
      content: '→';
      position: absolute;
      left: 0;
      color: #0ea5e9;
    }
    
    .recommendations-list li::before {
      content: '✓';
      position: absolute;
      left: 0;
      color: #10b981;
    }
    
    .report-footer {
      background: #f8fafc;
      padding: 20px 30px;
      border-top: 1px solid #e2e8f0;
      font-size: 0.85rem;
      color: #64748b;
    }
    
    .disclaimer {
      background: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 8px;
      padding: 15px;
      margin-top: 20px;
    }
    
    .disclaimer-title {
      font-weight: 600;
      color: #92400e;
    }
    
    @media print {
      body {
        padding: 0;
      }
      .report {
        border: none;
      }
    }
  </style>
</head>
<body>
  <div class="report">
    <header class="report-header">
      <div class="report-logo">🫀 ${this.appName}</div>
      <div class="report-title">ECG Analysis Report</div>
      <div class="report-meta">
        Generated: ${timestamp}<br>
        Report ID: ${record._id}
      </div>
    </header>
    
    <div class="report-body">
      <div class="primary-finding">
        <div class="finding-classification">${record.analysisResults.classification}</div>
        <div class="finding-confidence">Confidence: ${record.analysisResults.confidence}%</div>
      </div>
      
      <div class="section">
        <h2 class="section-title">📊 Key Measurements</h2>
        <div class="metrics-grid">
          <div class="metric">
            <div class="metric-label">Heart Rate</div>
            <div class="metric-value">${record.analysisResults.heartRate} <span class="metric-unit">BPM</span></div>
          </div>
          <div class="metric">
            <div class="metric-label">Rhythm</div>
            <div class="metric-value">${record.analysisResults.rhythm?.regular ? 'Regular' : 'Irregular'}</div>
          </div>
          ${record.analysisResults.intervals?.pr ? `
          <div class="metric">
            <div class="metric-label">PR Interval</div>
            <div class="metric-value">${record.analysisResults.intervals.pr} <span class="metric-unit">ms</span></div>
          </div>
          ` : ''}
          <div class="metric">
            <div class="metric-label">QRS Duration</div>
            <div class="metric-value">${record.analysisResults.intervals?.qrs || 'N/A'} <span class="metric-unit">ms</span></div>
          </div>
          <div class="metric">
            <div class="metric-label">QT Interval</div>
            <div class="metric-value">${record.analysisResults.intervals?.qt || 'N/A'} <span class="metric-unit">ms</span></div>
          </div>
          <div class="metric">
            <div class="metric-label">QTc</div>
            <div class="metric-value">${record.analysisResults.intervals?.qtc || 'N/A'} <span class="metric-unit">ms</span></div>
          </div>
        </div>
      </div>
      
      <div class="section">
        <h2 class="section-title">🔍 Interpretation</h2>
        <p>${record.interpretation?.summary || 'No interpretation available.'}</p>
      </div>
      
      ${record.interpretation?.findings?.length ? `
      <div class="section">
        <h2 class="section-title">📋 Findings</h2>
        <ul class="findings-list">
          ${record.interpretation.findings.map(f => `<li>${f}</li>`).join('')}
        </ul>
      </div>
      ` : ''}
      
      ${record.interpretation?.recommendations?.length ? `
      <div class="section">
        <h2 class="section-title">💡 Recommendations</h2>
        <ul class="recommendations-list">
          ${record.interpretation.recommendations.map(r => `<li>${r}</li>`).join('')}
        </ul>
      </div>
      ` : ''}
      
      <div class="disclaimer">
        <div class="disclaimer-title">⚠️ Medical Disclaimer</div>
        <p>This report is generated by an AI system and is intended for informational purposes only. 
        It should not be used as a substitute for professional medical advice, diagnosis, or treatment. 
        Always consult with a qualified healthcare provider for any medical concerns.</p>
      </div>
    </div>
    
    <footer class="report-footer">
      <p>Model Version: ${record.modelVersion || 'N/A'} | 
         Analysis Time: ${record.inferenceTimeMs || 'N/A'}ms | 
         Leads Analyzed: ${record.leadCount || 1}</p>
      <p>© ${new Date().getFullYear()} ${this.appName} - HIPAA Compliant Medical Analysis System</p>
    </footer>
  </div>
</body>
</html>
    `;
    }
}

module.exports = new ReportGenerator();
