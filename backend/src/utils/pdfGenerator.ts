import PDFDocument from 'pdfkit';

export const generatePDF = () => {
  const doc = new PDFDocument();
  return doc;
};
