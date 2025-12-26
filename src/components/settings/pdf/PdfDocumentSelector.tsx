import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

type DocumentType = 'invoice' | 'quote' | 'contract';

const documentLabels: Record<DocumentType, string> = {
  invoice: 'Factura',
  quote: 'Presupuesto',
  contract: 'Contrato',
};

interface PdfDocumentSelectorProps {
  selected: DocumentType;
  onChange: (type: DocumentType) => void;
}

export function PdfDocumentSelector({ selected, onChange }: PdfDocumentSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <FileText className="h-4 w-4" />
        <span>Tipo de documento</span>
      </div>
      <div className="flex flex-col gap-2">
        {(Object.keys(documentLabels) as DocumentType[]).map((type) => (
          <Button
            key={type}
            variant={selected === type ? "default" : "ghost"}
            size="sm"
            onClick={() => onChange(type)}
            className="justify-start"
          >
            {documentLabels[type]}
          </Button>
        ))}
      </div>
    </div>
  );
}
