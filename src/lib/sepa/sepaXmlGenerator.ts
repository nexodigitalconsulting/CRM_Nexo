/**
 * SEPA Direct Debit XML Generator
 * Generates ISO 20022 pain.008.001.02 format XML files
 * for SEPA Core Direct Debit Scheme
 */

import { format } from "date-fns";

export interface SepaCreditor {
  name: string;
  iban: string;
  bic?: string;
  creditorId: string; // SEPA Creditor Identifier
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

export interface SepaDebtor {
  name: string;
  iban: string;
  bic?: string;
  mandateId: string;
  mandateSignatureDate: string; // YYYY-MM-DD format
  address?: string;
}

export interface SepaTransaction {
  invoiceId: string;
  endToEndId: string; // Unique reference for this transaction
  amount: number; // In EUR
  debtor: SepaDebtor;
  remittanceInfo: string; // Description/reference for the debit
  sequenceType: 'FRST' | 'RCUR' | 'OOFF' | 'FNAL'; // First, Recurring, One-Off, Final
}

export interface SepaDirectDebitData {
  messageId: string;
  creationDateTime: string;
  creditor: SepaCreditor;
  requestedCollectionDate: string; // YYYY-MM-DD format
  transactions: SepaTransaction[];
  batchBooking?: boolean;
}

/**
 * Escapes XML special characters
 */
function escapeXml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Formats amount to 2 decimal places
 */
function formatAmount(amount: number): string {
  return amount.toFixed(2);
}

/**
 * Validates IBAN format (basic check)
 */
export function validateIBAN(iban: string): boolean {
  if (!iban) return false;
  const cleanIban = iban.replace(/\s/g, '').toUpperCase();
  // Spanish IBAN: ES + 2 check digits + 20 digits
  const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}$/;
  return ibanRegex.test(cleanIban);
}

/**
 * Generates a unique message ID for the SEPA file
 */
export function generateMessageId(prefix: string = 'MSG'): string {
  const timestamp = format(new Date(), 'yyyyMMddHHmmss');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`.substring(0, 35); // Max 35 chars
}

/**
 * Generates a unique end-to-end ID for each transaction
 */
export function generateEndToEndId(invoiceNumber: number | string): string {
  const timestamp = format(new Date(), 'yyyyMMdd');
  return `INV${String(invoiceNumber).padStart(6, '0')}-${timestamp}`.substring(0, 35);
}

/**
 * Groups transactions by sequence type for payment info blocks
 */
function groupBySequenceType(transactions: SepaTransaction[]): Map<string, SepaTransaction[]> {
  const groups = new Map<string, SepaTransaction[]>();
  for (const tx of transactions) {
    const key = tx.sequenceType;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(tx);
  }
  return groups;
}

/**
 * Generates SEPA Direct Debit XML (pain.008.001.02)
 */
export function generateSepaXml(data: SepaDirectDebitData): string {
  const { messageId, creationDateTime, creditor, requestedCollectionDate, transactions, batchBooking = true } = data;
  
  // Calculate control sums
  const numberOfTransactions = transactions.length;
  const controlSum = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  
  // Group transactions by sequence type
  const transactionGroups = groupBySequenceType(transactions);
  
  // Generate payment info blocks
  let paymentInfoBlocks = '';
  let pmtInfIdCounter = 1;
  
  for (const [seqType, txGroup] of transactionGroups) {
    const pmtInfId = `${messageId}-PMT${String(pmtInfIdCounter++).padStart(3, '0')}`;
    const groupControlSum = txGroup.reduce((sum, tx) => sum + tx.amount, 0);
    
    let transactionBlocks = '';
    for (const tx of txGroup) {
      transactionBlocks += `
        <DrctDbtTxInf>
          <PmtId>
            <EndToEndId>${escapeXml(tx.endToEndId)}</EndToEndId>
          </PmtId>
          <InstdAmt Ccy="EUR">${formatAmount(tx.amount)}</InstdAmt>
          <DrctDbtTx>
            <MndtRltdInf>
              <MndtId>${escapeXml(tx.debtor.mandateId)}</MndtId>
              <DtOfSgntr>${tx.debtor.mandateSignatureDate}</DtOfSgntr>
            </MndtRltdInf>
          </DrctDbtTx>
          <DbtrAgt>
            <FinInstnId>
              ${tx.debtor.bic ? `<BIC>${escapeXml(tx.debtor.bic)}</BIC>` : '<Othr><Id>NOTPROVIDED</Id></Othr>'}
            </FinInstnId>
          </DbtrAgt>
          <Dbtr>
            <Nm>${escapeXml(tx.debtor.name.substring(0, 70))}</Nm>
            ${tx.debtor.address ? `<PstlAdr><AdrLine>${escapeXml(tx.debtor.address.substring(0, 70))}</AdrLine></PstlAdr>` : ''}
          </Dbtr>
          <DbtrAcct>
            <Id>
              <IBAN>${tx.debtor.iban.replace(/\s/g, '').toUpperCase()}</IBAN>
            </Id>
          </DbtrAcct>
          <RmtInf>
            <Ustrd>${escapeXml(tx.remittanceInfo.substring(0, 140))}</Ustrd>
          </RmtInf>
        </DrctDbtTxInf>`;
    }
    
    paymentInfoBlocks += `
      <PmtInf>
        <PmtInfId>${escapeXml(pmtInfId)}</PmtInfId>
        <PmtMtd>DD</PmtMtd>
        <BtchBookg>${batchBooking ? 'true' : 'false'}</BtchBookg>
        <NbOfTxs>${txGroup.length}</NbOfTxs>
        <CtrlSum>${formatAmount(groupControlSum)}</CtrlSum>
        <PmtTpInf>
          <SvcLvl>
            <Cd>SEPA</Cd>
          </SvcLvl>
          <LclInstrm>
            <Cd>CORE</Cd>
          </LclInstrm>
          <SeqTp>${seqType}</SeqTp>
        </PmtTpInf>
        <ReqdColltnDt>${requestedCollectionDate}</ReqdColltnDt>
        <Cdtr>
          <Nm>${escapeXml(creditor.name.substring(0, 70))}</Nm>
          ${creditor.address ? `
          <PstlAdr>
            ${creditor.postalCode ? `<PstCd>${escapeXml(creditor.postalCode)}</PstCd>` : ''}
            ${creditor.city ? `<TwnNm>${escapeXml(creditor.city)}</TwnNm>` : ''}
            ${creditor.country ? `<Ctry>${escapeXml(creditor.country.substring(0, 2).toUpperCase())}</Ctry>` : ''}
            <AdrLine>${escapeXml(creditor.address.substring(0, 70))}</AdrLine>
          </PstlAdr>` : ''}
        </Cdtr>
        <CdtrAcct>
          <Id>
            <IBAN>${creditor.iban.replace(/\s/g, '').toUpperCase()}</IBAN>
          </Id>
        </CdtrAcct>
        <CdtrAgt>
          <FinInstnId>
            ${creditor.bic ? `<BIC>${escapeXml(creditor.bic)}</BIC>` : '<Othr><Id>NOTPROVIDED</Id></Othr>'}
          </FinInstnId>
        </CdtrAgt>
        <CdtrSchmeId>
          <Id>
            <PrvtId>
              <Othr>
                <Id>${escapeXml(creditor.creditorId)}</Id>
                <SchmeNm>
                  <Prtry>SEPA</Prtry>
                </SchmeNm>
              </Othr>
            </PrvtId>
          </Id>
        </CdtrSchmeId>
        ${transactionBlocks}
      </PmtInf>`;
  }
  
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.008.001.02" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CstmrDrctDbtInitn>
    <GrpHdr>
      <MsgId>${escapeXml(messageId)}</MsgId>
      <CreDtTm>${creationDateTime}</CreDtTm>
      <NbOfTxs>${numberOfTransactions}</NbOfTxs>
      <CtrlSum>${formatAmount(controlSum)}</CtrlSum>
      <InitgPty>
        <Nm>${escapeXml(creditor.name.substring(0, 70))}</Nm>
      </InitgPty>
    </GrpHdr>
    ${paymentInfoBlocks}
  </CstmrDrctDbtInitn>
</Document>`;

  return xml.trim();
}

/**
 * Downloads the XML as a file
 */
export function downloadSepaXml(xml: string, filename: string): void {
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.xml`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Creates a SEPA XML from remittance data
 */
export function createSepaXmlFromRemittance(
  remittance: {
    id: string;
    code: string | null;
    remittance_number: number;
    collection_date?: string | null;
  },
  creditor: SepaCreditor,
  invoices: Array<{
    id: string;
    invoice_number: number;
    total: number | null;
    client?: {
      name: string;
      iban: string | null;
      bic?: string | null;
      sepa_mandate_id?: string | null;
      sepa_mandate_date?: string | null;
      sepa_sequence_type?: string | null;
      address?: string | null;
    } | null;
  }>
): string {
  const messageId = generateMessageId(`REM${String(remittance.remittance_number).padStart(4, '0')}`);
  const creationDateTime = format(new Date(), "yyyy-MM-dd'T'HH:mm:ss");
  const requestedCollectionDate = remittance.collection_date || format(new Date(), 'yyyy-MM-dd');
  
  const transactions: SepaTransaction[] = invoices
    .filter(inv => inv.client?.iban && inv.client?.sepa_mandate_id)
    .map(inv => ({
      invoiceId: inv.id,
      endToEndId: generateEndToEndId(inv.invoice_number),
      amount: Number(inv.total) || 0,
      debtor: {
        name: inv.client!.name,
        iban: inv.client!.iban!,
        bic: inv.client!.bic || undefined,
        mandateId: inv.client!.sepa_mandate_id!,
        mandateSignatureDate: inv.client!.sepa_mandate_date || format(new Date(), 'yyyy-MM-dd'),
        address: inv.client!.address || undefined,
      },
      remittanceInfo: `Factura FF-${String(inv.invoice_number).padStart(4, '0')}`,
      sequenceType: (inv.client!.sepa_sequence_type as 'FRST' | 'RCUR' | 'OOFF' | 'FNAL') || 'RCUR',
    }));
  
  return generateSepaXml({
    messageId,
    creationDateTime,
    creditor,
    requestedCollectionDate,
    transactions,
    batchBooking: true,
  });
}
