import type { Tables } from "@/integrations/supabase/types";
import { getAIPrediction } from "../api/ai";

type TestSession = Tables<"test_sessions">;
type VoiceAnalysis = Tables<"voice_analysis">;
type Student = Tables<"students">;

interface ReportData {
  student: Student | { name: string; grade: string };
  session: TestSession;
  analysis?: VoiceAnalysis | null;
  conductedBy?: string;
}

interface PrincipalReportData {
  overview: {
    totalStudents: number;
    testedStudents: number;
    flaggedStudents: number;
    avgScore: number;
    weeklyChange: number;
  };
  gradeStats: {
    grade: string;
    students: number;
    tested: number;
    flagged: number;
    flagPercentage: number;
    avgScore: number;
    status: string;
  }[];
  cohortData: { cohort: string; count: number; percentage: number }[];
  trendData: { week: string; avgScore: number; tested: number; flagged: number }[];
}

const LOGO_SVG = `<svg width="180" height="36" viewBox="0 0 180 36" xmlns="http://www.w3.org/2000/svg">
  <text x="0" y="28" font-family="'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" font-size="28" font-weight="bold">
    <tspan fill="#8b22d6">SWAR</tspan><tspan fill="#f97316">SETU</tspan>
  </text>
</svg>`;

const SHARED_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { 
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
    line-height: 1.6; 
    color: #1a1a2e; 
    padding: 40px;
    max-width: 800px;
    margin: 0 auto;
  }
  .header { 
    text-align: center; 
    border-bottom: 3px solid #8b22d6; 
    padding-bottom: 20px; 
    margin-bottom: 30px; 
  }
  .header-logo { margin-bottom: 8px; }
  .report-title { font-size: 20px; margin-top: 8px; color: #374151; font-weight: 600; }
  .report-date { font-size: 12px; color: #6b7280; margin-top: 5px; }
  .section { margin-bottom: 25px; }
  .section-title { 
    font-size: 15px; 
    font-weight: 600; 
    color: #8b22d6; 
    border-bottom: 1px solid #e5e7eb; 
    padding-bottom: 8px; 
    margin-bottom: 15px; 
  }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
  .info-label { font-size: 12px; color: #6b7280; }
  .info-value { font-size: 14px; font-weight: 500; }
  .score-box { 
    text-align: center; 
    background: linear-gradient(135deg, #8b22d6 0%, #a855f7 100%); 
    color: white; 
    padding: 25px; 
    border-radius: 12px; 
    margin-bottom: 20px; 
  }
  .score-value { font-size: 48px; font-weight: bold; }
  .score-label { font-size: 14px; opacity: 0.9; }
  .metrics-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .metric-card { 
    background: #f9fafb; 
    padding: 15px; 
    border-radius: 8px; 
    text-align: center; 
  }
  .metric-value { font-size: 24px; font-weight: bold; color: #8b22d6; }
  .metric-label { font-size: 12px; color: #6b7280; }
  .risk-badge { 
    display: inline-block; 
    padding: 6px 16px; 
    border-radius: 20px; 
    font-weight: 600; 
    text-transform: uppercase; 
    font-size: 12px; 
  }
  .risk-low { background: #d1fae5; color: #065f46; }
  .risk-moderate { background: #fef3c7; color: #92400e; }
  .risk-high { background: #fee2e2; color: #991b1b; }
  .condition-badge { 
    display: inline-block; 
    background: #fee2e2; 
    color: #991b1b; 
    padding: 4px 12px; 
    border-radius: 15px; 
    font-size: 12px; 
    margin-right: 8px; 
    margin-bottom: 8px; 
  }
  .summary-text { 
    background: #f3f4f6; 
    padding: 15px; 
    border-radius: 8px; 
    font-size: 14px; 
  }
  .recommendations { list-style: none; }
  .recommendations li { 
    padding: 10px 0; 
    border-bottom: 1px solid #e5e7eb; 
    font-size: 14px; 
    display: flex; 
    align-items: flex-start; 
  }
  .recommendations li:last-child { border-bottom: none; }
  .recommendations li::before { 
    content: "✓"; 
    color: #10b981; 
    font-weight: bold; 
    margin-right: 10px; 
  }
  .progress-bar { 
    height: 8px; 
    background: #e5e7eb; 
    border-radius: 4px; 
    overflow: hidden; 
    margin-top: 4px;
  }
  .progress-fill { 
    height: 100%; 
    background: linear-gradient(90deg, #8b22d6, #a855f7); 
    border-radius: 4px; 
  }
  .question-row { 
    padding: 8px 12px; 
    border-radius: 6px; 
    font-size: 13px; 
    margin-bottom: 6px; 
    border: 1px solid; 
  }
  .question-correct { border-color: #d1fae5; background: #f0fdf4; }
  .question-wrong { border-color: #fee2e2; background: #fef2f2; }
  .footer { 
    margin-top: 40px; 
    padding-top: 20px; 
    border-top: 1px solid #e5e7eb; 
    text-align: center; 
    font-size: 11px; 
    color: #9ca3af; 
  }
  .disclaimer { 
    background: #fef3c7; 
    padding: 12px; 
    border-radius: 8px; 
    font-size: 12px; 
    color: #92400e; 
    margin-top: 20px; 
  }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; padding: 10px; border-bottom: 2px solid #e5e7eb; color: #6b7280; font-size: 12px; }
  td { padding: 10px; border-bottom: 1px solid #f3f4f6; }
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
  .stat-card { text-align: center; padding: 16px; background: #f9fafb; border-radius: 10px; }
  .stat-value { font-size: 28px; font-weight: bold; color: #8b22d6; }
  .stat-label { font-size: 11px; color: #6b7280; margin-top: 4px; }
  @media print {
    body { padding: 20px; }
    .no-print { display: none; }
  }
`;

function formatDate() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function openPrintWindow(html: string) {
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  }
}

export function generatePdfReport(data: ReportData): void {
  const { student, session, analysis, conductedBy } = data;
  const analysisReport = session.analysis_report as {
    riskLevel?: string;
    summary?: string;
    recommendations?: string[];
    subtestScores?: { id: string; accuracy: number; avgResponseTime: number; errorCount: number; hesitationCount: number }[];
    flaggedConditions?: string[];
    domainScores?: Record<string, number>;
    answeredQuestions?: { question: string; answer: string; correct: boolean; subtest: string; responseTime: number }[];
  } | null;

  const flaggedConditions = session.flagged_conditions || analysisReport?.flaggedConditions || [];

  // Subtest scores section
  let subtestHtml = "";
  if (analysisReport?.subtestScores && analysisReport.subtestScores.length > 0) {
    subtestHtml = `
      <div class="section">
        <div class="section-title">📊 Subtest Performance</div>
        <div class="metrics-grid">
          ${analysisReport.subtestScores.map(st => `
            <div class="metric-card" style="text-align:left;">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                <span style="font-size:13px;font-weight:600;text-transform:capitalize;">${st.id.replace(/_/g, " ")}</span>
                <span style="font-weight:bold;color:#8b22d6;">${Math.round(st.accuracy)}%</span>
              </div>
              <div class="progress-bar"><div class="progress-fill" style="width:${st.accuracy}%"></div></div>
              <div style="font-size:11px;color:#6b7280;margin-top:4px;">${st.errorCount} errors • ${st.avgResponseTime.toFixed(1)}s avg</div>
            </div>
          `).join("")}
        </div>
      </div>`;
  }

  // Domain scores (dysgraphia)
  let domainHtml = "";
  if (analysisReport?.domainScores) {
    domainHtml = `
      <div class="section">
        <div class="section-title">✍️ Domain Scores</div>
        <div class="metrics-grid">
          ${Object.entries(analysisReport.domainScores).map(([key, value]) => `
            <div class="metric-card">
              <div class="metric-value">${value}%</div>
              <div class="metric-label" style="text-transform:capitalize;">${key.replace(/([A-Z])/g, " $1").trim()}</div>
              <div class="progress-bar"><div class="progress-fill" style="width:${value}%"></div></div>
            </div>
          `).join("")}
        </div>
      </div>`;
  }

  // Question breakdown
  let questionsHtml = "";
  if (analysisReport?.answeredQuestions && analysisReport.answeredQuestions.length > 0) {
    questionsHtml = `
      <div class="section">
        <div class="section-title">📝 Question-by-Question Breakdown</div>
        ${analysisReport.answeredQuestions.map((q, i) => `
          <div class="question-row ${q.correct ? 'question-correct' : 'question-wrong'}">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <strong>${q.correct ? '✓' : '✗'} Q${i + 1}</strong>
                <span style="font-size:11px;background:#e5e7eb;padding:2px 6px;border-radius:4px;margin-left:6px;">${q.subtest}</span>
              </div>
              <span style="font-size:11px;color:#6b7280;">${q.responseTime.toFixed(1)}s</span>
            </div>
            <div style="color:#6b7280;font-size:12px;margin-top:4px;">${q.question}</div>
            <div style="margin-top:2px;font-size:12px;">Answer: <span style="color:${q.correct ? '#065f46' : '#991b1b'}">${q.answer}</span></div>
          </div>
        `).join("")}
      </div>`;
  }

  const printContent = `<!DOCTYPE html><html><head>
    <title>SLD Assessment Report - ${student.name}</title>
    <style>${SHARED_STYLES}</style>
  </head><body>
    <div class="header">
      <div class="header-logo">${LOGO_SVG}</div>
      <div class="report-title">${session.test_type === 'voice' ? 'Voice-Based' : session.test_type.charAt(0).toUpperCase() + session.test_type.slice(1)} SLD Assessment Report</div>
      <div class="report-date">Generated on ${formatDate()}</div>
    </div>

    <div class="section">
      <div class="section-title">👤 Student Information</div>
      <div class="info-grid">
        <div><div class="info-label">Student Name</div><div class="info-value">${student.name}</div></div>
        <div><div class="info-label">Grade</div><div class="info-value">${student.grade}</div></div>
        <div><div class="info-label">Test Date</div><div class="info-value">${new Date(session.created_at).toLocaleDateString("en-IN")}</div></div>
        <div><div class="info-label">Conducted By</div><div class="info-value">${conductedBy || "Teacher"}</div></div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">📈 Overall Assessment</div>
      <div class="score-box">
        <div class="score-value">${session.overall_score ?? 0}%</div>
        <div class="score-label">Overall Performance Score</div>
        <div style="margin-top:10px;">
          <span class="risk-badge risk-${analysisReport?.riskLevel || 'low'}">${analysisReport?.riskLevel || 'N/A'} Risk</span>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">📋 Detailed Metrics</div>
      <div class="metrics-grid">
        <div class="metric-card"><div class="metric-value">${session.reading_score ?? 0}%</div><div class="metric-label">Reading Score</div></div>
        <div class="metric-card"><div class="metric-value">${session.phoneme_score ?? 0}%</div><div class="metric-label">Phoneme Score</div></div>
        <div class="metric-card"><div class="metric-value">${analysis?.prosodic_score ?? 0}%</div><div class="metric-label">Prosodic Score</div></div>
        <div class="metric-card"><div class="metric-value">${analysis?.temporal_score ?? 0}%</div><div class="metric-label">Temporal Score</div></div>
      </div>
    </div>

    ${subtestHtml}
    ${domainHtml}

    ${flaggedConditions.length > 0 ? `
    <div class="section">
      <div class="section-title">⚠️ Flagged Indicators</div>
      <div>${flaggedConditions.map((c: string) => `<span class="condition-badge">${c}</span>`).join("")}</div>
      <p style="font-size:12px;color:#6b7280;margin-top:10px;">These are potential indicators based on assessment analysis. Further professional evaluation is recommended.</p>
    </div>` : ""}

    ${analysisReport?.summary ? `
    <div class="section">
      <div class="section-title">🧠 AI Analysis Summary</div>
      <div class="summary-text">${analysisReport.summary}</div>
    </div>` : ""}

    ${questionsHtml}

    ${analysisReport?.recommendations && analysisReport.recommendations.length > 0 ? `
    <div class="section">
      <div class="section-title">💡 Recommendations</div>
      <ul class="recommendations">
        ${analysisReport.recommendations.map(r => `<li>${r}</li>`).join("")}
      </ul>
    </div>` : ""}

    <div class="disclaimer">
      <strong>Important Disclaimer:</strong> This assessment is a screening tool only and does not constitute a medical diagnosis.
      The results should be reviewed by qualified educational psychologists or SLD specialists for proper diagnosis and intervention planning.
    </div>

    <div class="footer">
      <p><strong>SWARSETU</strong> — AI-Powered SLD Screening Platform</p>
      <p>This report was auto-generated. Please retain for records.</p>
    </div>
  </body></html>`;

  openPrintWindow(printContent);
}

export function generatePrincipalPdfReport(data: PrincipalReportData): void {
  const printContent = `<!DOCTYPE html><html><head>
    <title>School Performance Report - SWARSETU</title>
    <style>${SHARED_STYLES}</style>
  </head><body>
    <div class="header">
      <div class="header-logo">${LOGO_SVG}</div>
      <div class="report-title">School-Wide Performance Report</div>
      <div class="report-date">Generated on ${formatDate()}</div>
    </div>

    <div class="section">
      <div class="section-title">📊 Overview</div>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-value">${data.overview.totalStudents}</div><div class="stat-label">Total Students</div></div>
        <div class="stat-card"><div class="stat-value">${data.overview.testedStudents}</div><div class="stat-label">Tested</div></div>
        <div class="stat-card"><div class="stat-value" style="color:#dc2626;">${data.overview.flaggedStudents}</div><div class="stat-label">Flagged</div></div>
        <div class="stat-card"><div class="stat-value">${data.overview.avgScore}%</div><div class="stat-label">Avg Score</div></div>
      </div>
      ${data.overview.weeklyChange !== 0 ? `<p style="text-align:center;font-size:13px;color:${data.overview.weeklyChange > 0 ? '#059669' : '#dc2626'};">Weekly Change: ${data.overview.weeklyChange > 0 ? '+' : ''}${data.overview.weeklyChange}%</p>` : ''}
    </div>

    <div class="section">
      <div class="section-title">📚 Grade-wise Performance</div>
      <table>
        <thead>
          <tr><th>Grade</th><th>Students</th><th>Tested</th><th>Flagged</th><th>Flag %</th><th>Avg Score</th><th>Status</th></tr>
        </thead>
        <tbody>
          ${data.gradeStats.map(g => `
            <tr>
              <td style="font-weight:600;">${g.grade}</td>
              <td>${g.students}</td>
              <td>${g.tested}</td>
              <td style="color:${g.flagged > 0 ? '#dc2626' : 'inherit'};font-weight:${g.flagged > 0 ? '600' : 'normal'};">${g.flagged}</td>
              <td>${g.flagPercentage.toFixed(1)}%</td>
              <td>
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="font-weight:600;">${g.avgScore}%</span>
                  <div class="progress-bar" style="width:60px;"><div class="progress-fill" style="width:${g.avgScore}%"></div></div>
                </div>
              </td>
              <td>
                <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${g.status === 'red' ? '#dc2626' : g.status === 'yellow' ? '#f59e0b' : '#10b981'};"></span>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>

    <div class="section">
      <div class="section-title">👥 Cohort Distribution</div>
      ${data.cohortData.map(c => `
        <div style="margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
            <span style="font-size:14px;font-weight:500;">${c.cohort}</span>
            <span style="font-size:13px;color:#6b7280;">${c.count} students (${c.percentage}%)</span>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width:${c.percentage}%;background:${c.cohort === 'High Performers' ? '#10b981' : c.cohort === 'Needs Support' ? '#dc2626' : '#8b22d6'};"></div></div>
        </div>
      `).join("")}
    </div>

    <div class="section">
      <div class="section-title">📈 Weekly Trends (8 Weeks)</div>
      <table>
        <thead>
          <tr><th>Week</th><th>Avg Score</th><th>Tested</th><th>Flagged</th></tr>
        </thead>
        <tbody>
          ${data.trendData.map(t => `
            <tr>
              <td>${t.week}</td>
              <td>
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="font-weight:600;">${t.avgScore}%</span>
                  <div class="progress-bar" style="width:80px;"><div class="progress-fill" style="width:${t.avgScore}%"></div></div>
                </div>
              </td>
              <td>${t.tested}</td>
              <td style="color:${t.flagged > 0 ? '#dc2626' : 'inherit'};">${t.flagged}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>

    <div class="disclaimer">
      <strong>Note:</strong> This report is auto-generated from assessment data collected via SWARSETU.
      All data should be interpreted in context with individual student assessments.
    </div>

    <div class="footer">
      <p><strong>SWARSETU</strong> — AI-Powered SLD Screening Platform</p>
      <p>School-wide report. Confidential — for authorized personnel only.</p>
    </div>
  </body></html>`;

  openPrintWindow(printContent);
}

export function downloadPdfReport(data: ReportData): void {
  generatePdfReport(data);
}
