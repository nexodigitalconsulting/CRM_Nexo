import { PdfConfig } from '@/lib/pdf/pdfUtils';
import { ContractPdfPreview } from './ContractPdfPreview';
import { InvoicePdfPreview } from './InvoicePdfPreview';
import { QuotePdfPreview } from './QuotePdfPreview';

interface PdfPreviewProps {
  content?: string;
  documentType: 'invoice' | 'contract' | 'quote';
  scale?: number;
  config?: PdfConfig;
}

/**
 * PDF Preview Wrapper Component
 * 
 * Routes to the appropriate preview component based on document type.
 * Each preview component matches the exact layout of its respective pdf-lib generator.
 */
export function PdfPreview({ documentType, scale = 0.5, config }: PdfPreviewProps) {
  switch (documentType) {
    case 'contract':
      return <ContractPdfPreview config={config} scale={scale} />;
    case 'invoice':
      return <InvoicePdfPreview config={config} scale={scale} />;
    case 'quote':
      return <QuotePdfPreview config={config} scale={scale} />;
    default:
      return <InvoicePdfPreview config={config} scale={scale} />;
  }
}
