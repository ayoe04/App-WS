// server.js menggunakan Express dan PDFKit
// Server akan berjalan di http://localhost:4000

const express = require('express');
const PDFDocument = require('pdfkit');
const fs = require('fs');

const app = express();
const port = 4000;

// Middleware untuk parsing JSON body
app.use(express.json({ limit: '20mb' })); 

// Middleware untuk menangani CORS dan logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    res.setHeader('Access-Control-Allow-Origin', '*'); // Hanya untuk dev/testing. Ganti dengan domain jika ke production.
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Max-Payload-Size');
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204); 
    }
    next();
});


// Endpoint untuk membuat PDF
app.post('/api/generate-pdf', (req, res) => {
  const data = req.body;
  
  if (!data || !data.customer || !data.inspection) {
    console.error('Data yang diterima tidak valid.');
    return res.status(400).send({ error: 'Invalid data format. Missing customer or inspection data.' });
  }

  // Inisialisasi PDF
  const doc = new PDFDocument({ margin: 50 });

  // Tentukan nama file
  const licensePlate = data.customer.licensePlate ? data.customer.licensePlate.replace(/[^a-zA-Z0-9]/g, '_') : 'New';
  const dateStr = new Date().toLocaleDateString('id-ID').replace(/\//g, '-');
  const fileName = `Inspection_Report_${licensePlate}_${dateStr}.pdf`;
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

  doc.pipe(res);

  try {
      // Konten PDF 
      doc.fontSize(20).font('Helvetica-Bold').text('Wrap Station Inspection Report', { align: 'center' });
      doc.moveDown();

      // Detail Customer
      doc.fontSize(16).font('Helvetica-Bold').text('1. Customer & Vehicle Details');
      doc.fontSize(12).font('Helvetica').text(`Location: ${data.customer.location || 'N/A'}`);
      doc.text(`Date: ${new Date(data.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`);
      doc.text(`Name: ${data.customer.firstName} ${data.customer.lastName}`);
      doc.text(`Phone: ${data.customer.phone}`);
      doc.text(`Vehicle: ${data.customer.carBrand} ${data.customer.carModel} (${data.customer.color})`);
      doc.text(`License Plate: ${data.customer.licensePlate}`);
      doc.moveDown();

      // Detail Inspeksi
      doc.fontSize(16).font('Helvetica-Bold').text('2. Inspection Details');
      
      // Penjelasan Status
      doc.fontSize(10).font('Helvetica').text('Status Key: G=Good, F=Fair, P=Poor');
      doc.moveDown(0.5);

      for (const [item, details] of Object.entries(data.inspection)) {
        const status = details.status || 'N/A';
        const notes = details.notes || 'No notes.';
        
        // Tampilkan item
        doc.fontSize(12).font('Helvetica-Bold').text(`- ${item} (Status: ${status})`, { continued: true });
        
        // Tampilkan Note
        doc.font('Helvetica').fontSize(10).text(` Notes: ${notes}`);
        
        // Proses Gambar Inspeksi
        if (details.file && details.file.dataUrl && details.file.dataUrl.startsWith('data:image')) {
          doc.font('Helvetica').fontSize(10).text(`  Image Attached: ${details.file.name || 'Uploaded Image'}`);
          
          try {
            
            const base64Data = details.file.dataUrl.split(',')[1];
            
            if (base64Data) {
              const imageBuffer = Buffer.from(base64Data, 'base64');
            
              if (doc.y + 150 > doc.page.height - doc.page.margins.bottom) {
                  doc.addPage();
                  doc.fontSize(12).font('Helvetica-Bold').text(`Image for ${item} (Continued):`);
              }
              
              doc.image(imageBuffer, { 
                  fit: [200, 150], 
                  align: 'left',
                  valign: 'top'
              });
              doc.moveDown(2);
            } else {
               doc.font('Helvetica').fontSize(10).text(`  [Image data is incomplete for ${item}]`);
            }
          } catch (e) {
            doc.font('Helvetica').fontSize(10).text(`  [Error rendering image for ${item}. Error: ${e.message.substring(0, 50)}...]`);
            console.error(`Error rendering image for ${item} in PDF:`, e.message);
          }
        } 
        doc.moveDown(0.5);
      }
      doc.moveDown();

      // Tanda Tangan
      doc.fontSize(16).font('Helvetica-Bold').text('3. Signature & Terms Agreement');
      doc.text(`Agreed to Terms: ${data.agreed ? 'Yes' : 'No'}`);
      
      // Proses Tanda Tangan
      if (data.signature) {
        try {
            if (doc.y + 150 > doc.page.height - doc.page.margins.bottom) {
                doc.addPage();
            }
            
            doc.moveDown(0.5);
            doc.fontSize(12).font('Helvetica-Bold').text('Customer Signature:');
            
            const signatureData = data.signature.replace(/^data:image\/png;base64,/, '');
            
            if (signatureData) {
              const signatureBuffer = Buffer.from(signatureData, 'base64');

              doc.image(signatureBuffer, {
                fit: [400, 150], 
                align: 'left'
              });
            } else {
               doc.font('Helvetica').fontSize(12).text('[Signature data is incomplete]');
            }

        } catch (e) {
            doc.font('Helvetica').fontSize(12).text('[Error rendering signature image]');
            console.error("Error rendering signature in PDF:", e.message);
        }
      }
      
      console.log(`PDF successfully generated: ${fileName}`);
      doc.end();

  } catch (globalError) {
      console.error("Critical error during PDF generation:", globalError);
      
      try {
          doc.end();
      } catch (e) {
          // ignore
      }
      if (!res.headersSent) {
        return res.status(500).send({ error: `Critical PDF generation failure: ${globalError.message || 'Unknown error'}` });
      }
  }

});

// Endpoint untuk cek status (Health Check)
app.get('/', (req, res) => {
    res.send({ status: 'Node.js PDF Backend Running' });
});

app.listen(port, () => {
  console.log(`Backend server berjalan di http://localhost:${port}`);
});