import { StyleSheet } from '@react-pdf/renderer';

export const commonStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#333333',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#333333',
  },
  companyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  companyInfo: {
    fontSize: 9,
    color: '#666666',
    marginTop: 4,
  },
  documentInfo: {
    textAlign: 'right',
  },
  documentNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  documentDate: {
    fontSize: 9,
    color: '#666666',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#666666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  clientSection: {
    marginBottom: 25,
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 4,
  },
  clientName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  clientDetail: {
    fontSize: 9,
    color: '#666666',
    marginBottom: 2,
  },
  table: {
    marginBottom: 25,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#333333',
    color: '#ffffff',
    padding: 8,
    fontWeight: 'bold',
    fontSize: 9,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  tableRowEven: {
    backgroundColor: '#f9f9f9',
  },
  colService: { width: '35%' },
  colQty: { width: '10%', textAlign: 'center' },
  colPrice: { width: '15%', textAlign: 'right' },
  colDiscount: { width: '10%', textAlign: 'center' },
  colSubtotal: { width: '15%', textAlign: 'right' },
  colTotal: { width: '15%', textAlign: 'right' },
  totalsSection: {
    alignItems: 'flex-end',
    marginBottom: 25,
  },
  totalsTable: {
    width: 200,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 6,
  },
  totalsLabel: {
    fontSize: 10,
    color: '#666666',
  },
  totalsValue: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  totalFinal: {
    backgroundColor: '#333333',
    color: '#ffffff',
    marginTop: 4,
  },
  totalFinalLabel: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 11,
  },
  totalFinalValue: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 11,
  },
  notesSection: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 4,
  },
  notesTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  notesText: {
    fontSize: 9,
    color: '#666666',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#999999',
    fontSize: 8,
    borderTopWidth: 1,
    borderTopColor: '#eeeeee',
    paddingTop: 10,
  },
  datesRow: {
    flexDirection: 'row',
    gap: 30,
    marginBottom: 15,
  },
  dateItem: {
    flexDirection: 'row',
  },
  dateLabel: {
    fontSize: 9,
    color: '#666666',
    marginRight: 6,
  },
  dateValue: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
});
