import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateComprehensivePDFReport = (results) => {
    const doc = new jsPDF();
    let y = 20;
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;

    const primaryColor = [14, 116, 144];
    const textColor = [0, 0, 0];
    const secondaryColor = [60, 60, 60];

    const checkPageBreak = (requiredSpace) => {
        if (y + requiredSpace > pageHeight - margin) {
            doc.addPage();
            y = 20;
            return true;
        }
        return false;
    };

    const addSectionHeader = (title) => {
        checkPageBreak(15);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryColor);
        doc.text(title, margin, y);
        y += 2;
        doc.setDrawColor(...primaryColor);
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageWidth - margin, y);
        y += 8;
        doc.setTextColor(...textColor);
    };

    // =========================================================================
    // PAGE 1: COVER PAGE
    // =========================================================================
    
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('CODE ANALYSIS REPORT', pageWidth / 2, 60, { align: 'center' });
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...secondaryColor);
    const displayName = results.filename.replace(/_\d{8}_\d{6}_[a-f0-9]{8}/gi, '');
    doc.text(displayName, pageWidth / 2, 75, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    const analysisDate = new Date(results.timestamp).toLocaleString('en-US', {
        dateStyle: 'long',
        timeStyle: 'short'
    });
    doc.text(`Analyzed: ${analysisDate}`, pageWidth / 2, 90, { align: 'center' });
    
    const score = results.summary?.quality_score || 0;
    const grade = results.summary?.quality_grade || 'N/A';
    
    doc.setFontSize(60);
    doc.setFont('helvetica', 'bold');
    const scoreColor = score >= 90 ? [34, 197, 94] : score >= 70 ? [251, 146, 60] : [239, 68, 68];
    doc.setTextColor(...scoreColor);
    doc.text(`${score}`, pageWidth / 2, 130, { align: 'center' });
    
    doc.setFontSize(20);
    doc.setTextColor(100, 100, 100);
    doc.text('/100', pageWidth / 2 + 20, 130);
    
    doc.setFontSize(32);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...scoreColor);
    doc.text(`Grade ${grade}`, pageWidth / 2, 150, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text('AI Code Assistant | Powered by Google Gemini', pageWidth / 2, pageHeight - 20, { align: 'center' });

    // =========================================================================
    // PAGE 2: QUALITY SUMMARY
    // =========================================================================
    
    doc.addPage();
    y = 20;
    
    addSectionHeader('Quality Summary');
    
    // FIXED: Use autoTable(doc, {...}) instead of doc.autoTable({...})
    autoTable(doc, { 
        startY: y,
        head: [['Metric', 'Value']],
        body: [
            ['Quality Score', `${score}/100 (Grade ${grade})`],
            ['Pylint Score', `${results.pylint_score || 0}/10`],
            ['Total Lines', results.summary?.total_lines || 0],
            ['Total Functions', results.summary?.total_functions || 0],
            ['Total Classes', results.summary?.total_classes || 0],
            ['Total Issues', results.summary?.total_issues || 0],
            ['Has Docstring', results.summary?.has_docstring ? 'Yes' : 'No'],
            ['Pylint Passed', results.summary?.pylint_passed ? 'Yes' : 'No'],
            ['Flake8 Passed', results.summary?.flake8_passed ? 'Yes' : 'No'],
        ],
        theme: 'grid',
        headStyles: { fillColor: primaryColor, fontSize: 11, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 2 },
        margin: { left: margin, right: margin }
    });
    
    y = doc.lastAutoTable.finalY + 12;

    // =========================================================================
    // AI REVIEW
    // =========================================================================
    
    addSectionHeader('AI Code Review');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    if (results.llm_review?.review) {
        let reviewText = results.llm_review.review;
        reviewText = reviewText.replace(/``````/g, '');
        reviewText = reviewText.trim();
        
        if (reviewText.length > 1200) {
            reviewText = reviewText.substring(0, 1200) + '...';
        }
        
        const reviewLines = doc.splitTextToSize(reviewText, contentWidth);
        doc.text(reviewLines, margin, y);
        y += reviewLines.length * 4.5 + 8;
    } else {
        doc.setTextColor(150, 150, 150);
        doc.text('No AI review available', margin, y);
        y += 8;
        doc.setTextColor(...textColor);
    }
    
    if (results.llm_review?.suggestions?.length > 0) {
        checkPageBreak(30);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Top Suggestions:', margin, y);
        y += 7;
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        results.llm_review.suggestions.slice(0, 5).forEach((suggestion, i) => {
            checkPageBreak(10);
            let cleanSuggestion = suggestion.replace(/^[-*•]\s*/, '').trim();
            
            const suggestionLines = doc.splitTextToSize(`${i + 1}. ${cleanSuggestion}`, contentWidth - 5);
            doc.text(suggestionLines, margin + 5, y);
            y += suggestionLines.length * 4 + 2;
        });
        y += 3;
    }

    // =========================================================================
    // PAGE 3: TOP ISSUES
    // =========================================================================
    
    if (results.static_analysis?.issues?.length > 0) {
        doc.addPage();
        y = 20;
        
        addSectionHeader('Top Issues');
        
        const issuesData = results.static_analysis.issues.slice(0, 20).map(issue => [
            issue.line || 'N/A',
            issue.severity || 'Info',
            (issue.message || 'No message').substring(0, 70),
        ]);
        
        // FIXED: Use autoTable(doc, {...}) instead of doc.autoTable({...})
        autoTable(doc, {
            startY: y,
            head: [['Line', 'Severity', 'Message']],
            body: issuesData,
            theme: 'striped',
            headStyles: { fillColor: primaryColor, fontSize: 10, fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 2 },
            columnStyles: {
                0: { cellWidth: 18 },
                1: { cellWidth: 22 },
                2: { cellWidth: 'auto' }
            },
            margin: { left: margin, right: margin }
        });
        
        y = doc.lastAutoTable.finalY + 10;
    }

    // =========================================================================
    // PAGE 4: DOCUMENTATION
    // =========================================================================
    
    if (results.documentation?.sections) {
        doc.addPage();
        y = 20;
        
        addSectionHeader('Documentation');
        
        const description = results.documentation.sections.description;
        if (description) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const descLines = doc.splitTextToSize(description.substring(0, 400), contentWidth);
            doc.text(descLines, margin, y);
            y += descLines.length * 4.5 + 8;
        }
        
        const functions = results.documentation.sections.functions || [];
        if (functions.length > 0) {
            checkPageBreak(15);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(`Functions (${functions.length})`, margin, y);
            y += 8;
            
            functions.slice(0, 8).forEach((func, i) => {
                checkPageBreak(20);
                
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...primaryColor);
                doc.text(`${i + 1}. ${func.name}`, margin + 5, y);
                y += 5;
                
                doc.setFontSize(9);
                doc.setFont('courier', 'normal');
                doc.setTextColor(60, 60, 60);
                const sig = func.signature || `def ${func.name}()`;
                doc.text(sig.substring(0, 80), margin + 5, y);
                y += 4;
                
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...textColor);
                const docstring = func.docstring || 'No documentation';
                const docLines = doc.splitTextToSize(docstring.substring(0, 150), contentWidth - 10);
                doc.text(docLines, margin + 5, y);
                y += docLines.length * 3.5 + 6;
            });
        }
    }

    // =========================================================================
    // PAGE 5: REFACTORED CODE
    // =========================================================================
    
    if (results.updated_code) {
        doc.addPage();
        y = 20;
        
        if (results.refactoring_successful) {
            addSectionHeader('Auto-Refactored Code (Preview)');
        } else {
            addSectionHeader('Original Code (Refactoring Failed)');
            doc.setFontSize(10);
            doc.setTextColor(200, 100, 100);
            doc.text('Auto-refactoring was not successful. Showing original code.', margin, y);
            y += 8;
            doc.setTextColor(...textColor);
        }
        
        doc.setFontSize(7);
        doc.setFont('courier', 'normal');
        
        const codeLines = results.updated_code.split('\n').slice(0, 100);
        
        codeLines.forEach(line => {
            if (checkPageBreak(4)) {
                // Continue on next page
            }
            doc.text(line.substring(0, 100), margin, y);
            y += 3.5;
        });
        
        if (results.updated_code.split('\n').length > 100) {
            y += 4;
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(100, 100, 100);
            doc.text('... (code truncated. Full code available in web interface)', margin, y);
        }
    }

    // =========================================================================
    // SAVE PDF
    // =========================================================================
    
    let cleanName = results.filename;
    cleanName = cleanName.replace(/\.[^/.]+$/, '');
    cleanName = cleanName.replace(/_\d{8}_\d{6}/g, '');
    cleanName = cleanName.replace(/_[a-f0-9]{8}/gi, '');
    cleanName = cleanName.replace(/_+$/, '');
    
    const date = new Date(results.timestamp).toISOString().split('T')[0];
    
    doc.save(`${cleanName}_report_${date}.pdf`);
};
