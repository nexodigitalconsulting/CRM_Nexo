// Test file for pdf-lib compatibility
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function testPdfLib(): Promise<{ success: boolean; blob?: Blob; base64?: string; error?: string }> {
  try {
    console.log('🔄 Iniciando test de pdf-lib...');
    
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    
    // Embed a font
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Add a page
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
    const { width, height } = page.getSize();
    
    // Draw header
    page.drawText('TEST PDF-LIB', {
      x: 50,
      y: height - 50,
      size: 24,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.8),
    });
    
    // Draw company info
    page.drawText('Empresa de Prueba S.L.', {
      x: 50,
      y: height - 80,
      size: 12,
      font: font,
      color: rgb(0, 0, 0),
    });
    
    // Draw a line
    page.drawLine({
      start: { x: 50, y: height - 100 },
      end: { x: width - 50, y: height - 100 },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });
    
    // Draw invoice details
    const details = [
      'Factura Nº: 2024-001',
      'Fecha: 16/12/2024',
      'Cliente: Cliente de Prueba',
      'CIF: B12345678',
    ];
    
    let yPos = height - 130;
    for (const detail of details) {
      page.drawText(detail, {
        x: 50,
        y: yPos,
        size: 11,
        font: font,
        color: rgb(0, 0, 0),
      });
      yPos -= 20;
    }
    
    // Draw a table header
    yPos -= 20;
    page.drawRectangle({
      x: 50,
      y: yPos - 5,
      width: width - 100,
      height: 25,
      color: rgb(0.9, 0.9, 0.9),
    });
    
    page.drawText('Concepto', { x: 55, y: yPos, size: 10, font: boldFont });
    page.drawText('Cantidad', { x: 300, y: yPos, size: 10, font: boldFont });
    page.drawText('Precio', { x: 400, y: yPos, size: 10, font: boldFont });
    page.drawText('Total', { x: 480, y: yPos, size: 10, font: boldFont });
    
    // Draw table row
    yPos -= 25;
    page.drawText('Servicio de prueba', { x: 55, y: yPos, size: 10, font: font });
    page.drawText('1', { x: 300, y: yPos, size: 10, font: font });
    page.drawText('100,00 €', { x: 400, y: yPos, size: 10, font: font });
    page.drawText('100,00 €', { x: 480, y: yPos, size: 10, font: font });
    
    // Draw totals
    yPos -= 40;
    page.drawText('Subtotal: 100,00 €', { x: 400, y: yPos, size: 11, font: font });
    yPos -= 18;
    page.drawText('IVA (21%): 21,00 €', { x: 400, y: yPos, size: 11, font: font });
    yPos -= 18;
    page.drawText('TOTAL: 121,00 €', { x: 400, y: yPos, size: 12, font: boldFont });
    
    // Footer
    page.drawText('Generado con pdf-lib en Lovable', {
      x: 50,
      y: 30,
      size: 8,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    });
    
    // Save the PDF
    const pdfBytes = await pdfDoc.save();
    
    // Create Blob from PDF bytes
    const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
    
    // Convert to Base64
    const base64 = await blobToBase64(blob);
    
    console.log('✅ PDF generado correctamente');
    console.log('📊 Tamaño del blob:', blob.size, 'bytes');
    console.log('📊 Longitud Base64:', base64.length, 'caracteres');
    
    return { success: true, blob, base64 };
  } catch (error) {
    console.error('❌ Error en pdf-lib:', error);
    return { success: false, error: String(error) };
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // Remove data URL prefix
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function downloadTestPdf(): Promise<void> {
  const result = await testPdfLib();
  if (result.success && result.blob) {
    const url = URL.createObjectURL(result.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'test-pdf-lib.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
