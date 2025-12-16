import { Document, Page, Text, View } from '@react-pdf/renderer';
import { commonStyles } from './styles';

interface ServiceLine {
  name: string;
  quantity: number;
  unit_price: string;
  discount_percent?: number;
  subtotal: string;
  iva_percent?: number;
  total: string;
}

interface QuotePDFProps {
  quoteNumber: string;
  quoteName?: string;
  validUntil?: string;
  status: string;
  clientName: string;
  clientCif?: string;
  clientAddress?: string;
  clientEmail?: string;
  clientPhone?: string;
  companyName: string;
  companyCif?: string;
  companyAddress?: string;
  companyEmail?: string;
  companyPhone?: string;
  services: ServiceLine[];
  subtotal: string;
  ivaTotal: string;
  total: string;
  notes?: string;
  currentDate: string;
}

const QuotePDF = (props: QuotePDFProps) => (
  <Document>
    <Page size="A4" style={commonStyles.page}>
      {/* Header */}
      <View style={commonStyles.header}>
        <View>
          <Text style={commonStyles.companyName}>{props.companyName}</Text>
          {props.companyCif && <Text style={commonStyles.companyInfo}>CIF: {props.companyCif}</Text>}
          {props.companyAddress && <Text style={commonStyles.companyInfo}>{props.companyAddress}</Text>}
          {props.companyEmail && <Text style={commonStyles.companyInfo}>{props.companyEmail}</Text>}
          {props.companyPhone && <Text style={commonStyles.companyInfo}>{props.companyPhone}</Text>}
        </View>
        <View style={commonStyles.documentInfo}>
          <Text style={commonStyles.documentNumber}>{props.quoteNumber}</Text>
          {props.quoteName && <Text style={commonStyles.documentDate}>{props.quoteName}</Text>}
          <Text style={commonStyles.documentDate}>Fecha: {props.currentDate}</Text>
        </View>
      </View>

      {/* Dates */}
      {props.validUntil && (
        <View style={commonStyles.datesRow}>
          <View style={commonStyles.dateItem}>
            <Text style={commonStyles.dateLabel}>Válido hasta:</Text>
            <Text style={commonStyles.dateValue}>{props.validUntil}</Text>
          </View>
        </View>
      )}

      {/* Client Section */}
      <Text style={commonStyles.sectionTitle}>Datos del Cliente</Text>
      <View style={commonStyles.clientSection}>
        <Text style={commonStyles.clientName}>{props.clientName}</Text>
        {props.clientCif && <Text style={commonStyles.clientDetail}>CIF: {props.clientCif}</Text>}
        {props.clientAddress && <Text style={commonStyles.clientDetail}>{props.clientAddress}</Text>}
        {props.clientEmail && <Text style={commonStyles.clientDetail}>{props.clientEmail}</Text>}
        {props.clientPhone && <Text style={commonStyles.clientDetail}>{props.clientPhone}</Text>}
      </View>

      {/* Services Table */}
      <Text style={commonStyles.sectionTitle}>Servicios Presupuestados</Text>
      <View style={commonStyles.table}>
        <View style={commonStyles.tableHeader}>
          <Text style={commonStyles.colService}>Servicio</Text>
          <Text style={commonStyles.colQty}>Cant.</Text>
          <Text style={commonStyles.colPrice}>Precio</Text>
          <Text style={commonStyles.colDiscount}>Dto.%</Text>
          <Text style={commonStyles.colSubtotal}>Subtotal</Text>
          <Text style={commonStyles.colTotal}>Total</Text>
        </View>
        {props.services.map((service, index) => (
          <View key={index} style={[commonStyles.tableRow, index % 2 === 1 && commonStyles.tableRowEven]}>
            <Text style={commonStyles.colService}>{service.name}</Text>
            <Text style={commonStyles.colQty}>{service.quantity}</Text>
            <Text style={commonStyles.colPrice}>{service.unit_price}</Text>
            <Text style={commonStyles.colDiscount}>{service.discount_percent || 0}%</Text>
            <Text style={commonStyles.colSubtotal}>{service.subtotal}</Text>
            <Text style={commonStyles.colTotal}>{service.total}</Text>
          </View>
        ))}
      </View>

      {/* Totals */}
      <View style={commonStyles.totalsSection}>
        <View style={commonStyles.totalsTable}>
          <View style={commonStyles.totalsRow}>
            <Text style={commonStyles.totalsLabel}>Subtotal:</Text>
            <Text style={commonStyles.totalsValue}>{props.subtotal}</Text>
          </View>
          <View style={commonStyles.totalsRow}>
            <Text style={commonStyles.totalsLabel}>IVA:</Text>
            <Text style={commonStyles.totalsValue}>{props.ivaTotal}</Text>
          </View>
          <View style={[commonStyles.totalsRow, commonStyles.totalFinal]}>
            <Text style={commonStyles.totalFinalLabel}>TOTAL:</Text>
            <Text style={commonStyles.totalFinalValue}>{props.total}</Text>
          </View>
        </View>
      </View>

      {/* Notes */}
      {props.notes && (
        <View style={commonStyles.notesSection}>
          <Text style={commonStyles.notesTitle}>Notas y Condiciones</Text>
          <Text style={commonStyles.notesText}>{props.notes}</Text>
        </View>
      )}

      {/* Footer */}
      <Text style={commonStyles.footer}>
        {props.companyName} • {props.companyCif} • {props.companyEmail}
      </Text>
    </Page>
  </Document>
);

export default QuotePDF;
