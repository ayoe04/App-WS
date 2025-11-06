// server.js
// Server backend sederhana menggunakan Express dan PDFKit
//
// Untuk menjalankan ini:
// 1. Pastikan Anda memiliki Node.js
// 2. Jalankan `npm install express pdfkit`
// 3. Jalankan `node server.js`
// 4. Server akan berjalan di http://localhost:4000

const express = require('express');
const PDFDocument = require('pdfkit');
const fs = require('fs');

const app = express();
const port = 4000;

// Middleware untuk parsing JSON body
// Ditingkatkan menjadi 20mb untuk mengatasi ukuran file gambar Base64 yang besar
app.use(express.json({ limit: '20mb' })); 

// Middleware sederhana untuk menangani CORS dan logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    
    // --- Perbaikan CORS: Memastikan semua header yang dibutuhkan diizinkan ---
    res.setHeader('Access-Control-Allow-Origin', '*'); // Hanya untuk dev/testing. Ganti dengan domain Anda di production.
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Max-Payload-Size'); // Menambahkan Content-Type dan X-Max-Payload-Size
    
    if (req.method === 'OPTIONS') {
        // Respons yang eksplisit untuk preflight CORS request
        return res.sendStatus(204); // Menggunakan 204 No Content adalah standar yang lebih baik untuk OPTIONS
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

  // --- Mulai Inisialisasi PDF ---
  const doc = new PDFDocument({ margin: 50 });

  // Tentukan nama file
  const licensePlate = data.customer.licensePlate ? data.customer.licensePlate.replace(/[^a-zA-Z0-9]/g, '_') : 'New';
  const dateStr = new Date().toLocaleDateString('id-ID').replace(/\//g, '-');
  const fileName = `Inspection_Report_${licensePlate}_${dateStr}.pdf`;
  
  // Atur respons untuk mengirimkan file PDF
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

  // Salurkan PDF ke respons HTTP
  doc.pipe(res);

  try {
      // --- Mulai membuat konten PDF ---
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
        
        // Tampilkan Catatan
        doc.font('Helvetica').fontSize(10).text(` Notes: ${notes}`);
        
        // --- Pemrosesan Gambar Inspeksi ---
        if (details.file && details.file.dataUrl && details.file.dataUrl.startsWith('data:image')) {
          doc.font('Helvetica').fontSize(10).text(`  Image Attached: ${details.file.name || 'Uploaded Image'}`);
          
          try {
            // Hapus prefix data URL agar PDFKit bisa membacanya dan buat Buffer
            const base64Data = details.file.dataUrl.split(',')[1];
            
            // Pengecekan keamanan dan konversi Buffer
            if (base64Data) {
              const imageBuffer = Buffer.from(base64Data, 'base64');
            
              // Cek apakah gambar dapat ditampung di halaman saat ini, jika tidak tambahkan halaman baru
              if (doc.y + 150 > doc.page.height - doc.page.margins.bottom) {
                  doc.addPage();
                  doc.fontSize(12).font('Helvetica-Bold').text(`Image for ${item} (Continued):`);
              }
              
              doc.image(imageBuffer, { 
                  fit: [200, 150], // Sesuaikan ukuran gambar
                  align: 'left',
                  valign: 'top'
              });
              doc.moveDown(2); // Tambahkan spasi setelah gambar
            } else {
               doc.font('Helvetica').fontSize(10).text(`  [Image data is incomplete for ${item}]`);
            }
          } catch (e) {
            // Tangani error konversi buffer atau image rendering lokal
            doc.font('Helvetica').fontSize(10).text(`  [Error rendering image for ${item}. Error: ${e.message.substring(0, 50)}...]`);
            console.error(`Error rendering image for ${item} in PDF:`, e.message);
            // Lanjutkan loop, jangan biarkan error ini menghentikan proses PDF
          }
        } 
        doc.moveDown(0.5);
      }
      doc.moveDown();

      // Tanda Tangan
      doc.fontSize(16).font('Helvetica-Bold').text('3. Signature & Terms Agreement');
      doc.text(`Agreed to Terms: ${data.agreed ? 'Yes' : 'No'}`);
      
      // --- Pemrosesan Tanda Tangan ---
      if (data.signature) {
        try {
            // Cek apakah gambar tanda tangan perlu halaman baru
            if (doc.y + 150 > doc.page.height - doc.page.margins.bottom) {
                doc.addPage();
            }
            
            doc.moveDown(0.5);
            doc.fontSize(12).font('Helvetica-Bold').text('Customer Signature:');
            
            // Hapus prefix data URL agar PDFKit bisa membacanya
            const signatureData = data.signature.replace(/^data:image\/png;base64,/, '');
            
            if (signatureData) {
              const signatureBuffer = Buffer.from(signatureData, 'base64');

              doc.image(signatureBuffer, {
                fit: [400, 150], // Sesuaikan ukuran
                align: 'left'
              });
            } else {
               doc.font('Helvetica').fontSize(12).text('[Signature data is incomplete]');
            }

        } catch (e) {
            // Tangani error konversi buffer atau signature rendering lokal
            doc.font('Helvetica').fontSize(12).text('[Error rendering signature image]');
            console.error("Error rendering signature in PDF:", e.message);
        }
      }
      
      // --- Akhiri PDF ---
      console.log(`PDF successfully generated: ${fileName}`);
      doc.end();

  } catch (globalError) {
      // Tangani error global saat generate PDF (misalnya, jika doc.end() belum dipanggil)
      console.error("Critical error during PDF generation:", globalError);
      
      // Coba untuk menutup doc jika memungkinkan, dan kirim error response
      try {
          doc.end();
      } catch (e) {
          // ignore
      }
      // Kirim error response HANYA jika header belum dikirim
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