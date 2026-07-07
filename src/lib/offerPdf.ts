import { jsPDF } from 'jspdf';
import type { Lead, Order, TestResult } from './types';
import { formatOrderNumber } from './format';
import { buildHearingAnalysis, formatFreqLabel, ANALYSIS_FREQS } from './hearingAnalysis';

function addImageToPdf(doc: jsPDF, imageUrl: string | null, x: number, y: number, w: number, h: number): number {
  if (!imageUrl || !imageUrl.startsWith('data:image')) return y;
  try {
    const format = imageUrl.includes('image/png') ? 'PNG' : 'JPEG';
    doc.addImage(imageUrl, format, x, y, w, h);
    return y + h + 8;
  } catch {
    return y;
  }
}

function addHearingResultsPage(doc: jsPDF, results: TestResult[], margin: number) {
  doc.addPage();
  let y = margin;

  const analysis = buildHearingAnalysis(results);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(27, 42, 74);
  doc.text('Uw hoortestresultaten', margin, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`HearDirect analyse — score ${analysis.scorePct}% · ${analysis.profileLabel}`, margin, y);
  y += 14;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(27, 42, 74);
  doc.text('Audiogram (indicatief)', margin, y);
  y += 8;

  const colW = 85;
  ['Rechts', 'Links'].forEach((earLabel, earIdx) => {
    const points = earIdx === 0 ? analysis.rechts : analysis.links;
    const x = margin + earIdx * (colW + 10);
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(earLabel, x, y);

    ANALYSIS_FREQS.forEach((freq, i) => {
      const pt = points[i];
      const rowY = y + 10 + i * 14;
      if (pt.heard === null) {
        doc.setFillColor(241, 245, 249);
        doc.setTextColor(100, 116, 139);
      } else if (pt.heard) {
        doc.setFillColor(220, 252, 231);
        doc.setTextColor(21, 128, 61);
      } else {
        doc.setFillColor(254, 226, 226);
        doc.setTextColor(185, 28, 28);
      }
      doc.roundedRect(x, rowY, colW, 12, 1, 1, 'F');
      const status = pt.heard === null ? '—' : pt.heard ? 'Gehoord' : 'Niet gehoord';
      doc.text(`${formatFreqLabel(freq)} Hz: ${status}`, x + 3, rowY + 8);
    });
  });

  y += 70;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const lines = doc.splitTextToSize(`${analysis.profileDetail} Geen medische diagnose.`, 170);
  doc.text(lines, margin, y);
}

export function generateSignedOfferPdf(lead: Lead, order: Order, testResults: TestResult[] = []): string {
  const doc = new jsPDF();
  const margin = 20;
  let y = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(27, 42, 74);
  doc.text('HearDirect', margin, y);

  y += 12;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Ondertekende offerte — pagina 1', margin, y);

  y += 16;
  doc.setTextColor(27, 42, 74);
  doc.setFontSize(11);
  doc.text(`Ordernummer: ${formatOrderNumber(order.order_nummer)}`, margin, y);
  y += 7;
  doc.text(`Datum: ${order.ondertekend_op ? new Date(order.ondertekend_op).toLocaleDateString('nl-NL') : '—'}`, margin, y);

  y += 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Klantgegevens', margin, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Naam: ${lead.naam}`, margin, y);
  y += 6;
  doc.text(`Telefoon: ${lead.telefoon}`, margin, y);
  if (lead.email) {
    y += 6;
    doc.text(`E-mail: ${lead.email}`, margin, y);
  }

  if (order.straat && order.plaats) {
    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Afleveradres', margin, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    const adres = `${order.straat} ${order.huisnummer}${order.huisnummer_toevoeging ? order.huisnummer_toevoeging : ''}`;
    doc.text(adres, margin, y);
    y += 6;
    doc.text(`${order.postcode} ${order.plaats}`, margin, y);
    y += 6;
    doc.text(`${order.provincie || ''}, ${order.land}`, margin, y);
  }

  y += 14;
  y = addImageToPdf(doc, order.product_image_url, margin, y, 40, 30);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Offerte', margin, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Product: ${order.productnaam}`, margin, y);
  if (order.product_model) {
    y += 6;
    doc.text(`Model: ${order.product_model}`, margin, y);
  }

  y += 8;
  doc.text(`Listprijs: € ${Number(order.listprijs).toFixed(2)}`, margin, y);
  if (order.korting_bedrag > 0) {
    y += 6;
    doc.setTextColor(220, 38, 38);
    doc.text(`Korting: − € ${Number(order.korting_bedrag).toFixed(2)}`, margin, y);
    doc.setTextColor(27, 42, 74);
  }
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(37, 99, 235);
  doc.text(`Totaal: € ${Number(order.prijs).toFixed(2)}`, margin, y);

  if (testResults.length > 0) {
    addHearingResultsPage(doc, testResults, margin);
  }

  const signPage = testResults.length > 0 ? 2 : 1;
  doc.setPage(signPage);
  let signY = testResults.length > 0 ? margin + 130 : y + 20;

  doc.setTextColor(27, 42, 74);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Ondertekend door: ${order.ondertekend_door || lead.naam}`, margin, signY);
  signY += 6;
  doc.text(
    `Ondertekend op: ${order.ondertekend_op ? new Date(order.ondertekend_op).toLocaleString('nl-NL') : '—'}`,
    margin,
    signY
  );

  if (order.signature_image?.startsWith('data:image')) {
    signY += 10;
    try {
      doc.addImage(order.signature_image, 'PNG', margin, signY, 50, 20);
    } catch {
      /* skip */
    }
  }

  return doc.output('datauristring');
}

export function downloadOfferPdf(pdfData: string, filename: string) {
  const link = document.createElement('a');
  link.href = pdfData;
  link.download = filename;
  link.click();
}
