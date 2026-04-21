declare module "pdf2json" {
  interface TextRun { T: string }
  interface Text { R: TextRun[] }
  interface Page { Texts: Text[] }
  interface PDFData { Pages: Page[] }
  interface PDFError { parserError?: unknown }

  class PDFParser {
    on(event: "pdfParser_dataReady", cb: (data: PDFData) => void): void;
    on(event: "pdfParser_dataError", cb: (err: PDFError) => void): void;
    parseBuffer(buffer: Buffer): void;
  }

  export default PDFParser;
}
