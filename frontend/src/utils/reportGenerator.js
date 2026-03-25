import jsPDF from 'jspdf';

export const generatePDFReport = (results) => {
    const doc = new jsPDF();
    let y = 20;
    
    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Code Analysis Report', 20, y);
    y += 15;
    
    // File Info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`File: ${results.filename}`, 20, y);
    y += 8;
    doc.text(`Analyzed: ${new Date(results.timestamp).toLocaleString()}`, 20, y);
    y += 15;
    
    // Quality Summary
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Quality Summary', 20, y);
    y += 10;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Quality Score: ${results.summary?.quality_score}/100 (Grade: ${results.summary?.quality_grade})`, 20, y);
    y += 8;
    doc.text(`Pylint Score: ${results.pylint_score}/10`, 20, y);
    y += 8;
    doc.text(`Total Lines: ${results.summary?.total_lines}`, 20, y);
    y += 8;
    doc.text(`Functions: ${results.summary?.total_functions}`, 20, y);
    y += 8;
    doc.text(`Classes: ${results.summary?.total_classes}`, 20, y);
    y += 15;
    
    // LLM Review Summary
    if (results.llm_review?.review) {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('AI Review Summary', 20, y);
        y += 10;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const reviewLines = doc.splitTextToSize(results.llm_review.review.substring(0, 500), 170);
        doc.text(reviewLines, 20, y);
        y += reviewLines.length * 5 + 10;
    }
    
    // Top Issues
    if (results.static_analysis?.issues?.length > 0) {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Top Issues', 20, y);
        y += 10;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        results.static_analysis.issues.slice(0, 5).forEach((issue, i) => {
            if (y > 270) {
                doc.addPage();
                y = 20;
            }
            doc.text(`${i + 1}. Line ${issue.line}: ${issue.message}`, 20, y);
            y += 6;
        });
    }
    
    // Get clean filename
    const cleanName = results.filename.replace(/\.[^/.]+$/, '');
    const date = new Date(results.timestamp).toISOString().split('T')[0];
    
    // Save PDF
    doc.save(`${cleanName}_report_${date}.pdf`);
};
