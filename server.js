// Import library
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const PDFDocument = require('pdfkit');

// Membuat instance Express
const app = express();

// Konfigurasi Middleware
app.use(cors());
// Menggunakan body-parser untuk menangani data JSON yang dikirimkan dari frontend
app.use(bodyParser.json({ limit: '50mb' }));

// Rute untuk Generate PDF
app.post('/generate-pdf', (req, res) => {
    // Data dikirimkan dari React di frontend melalui req.body
    const data = req.body; 

    // Konfigurasi Header untuk response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="Laporan_Inspeksi.pdf"');

    // Buat objek PDF baru
    const doc = new PDFDocument({
        size: 'A4',
        margin: 50
    });
    
    doc.pipe(res);
    
    doc.fontSize(20).text('Laporan Inspeksi Kendaraan', { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(12).text(`Lokasi: ${data.location || 'Tidak Tersedia'}`);
    doc.text(`Nama Pelanggan: ${data.customerName || 'Tidak Tersedia'}`);
    doc.text(`Merek Mobil: ${data.carBrand || 'Tidak Tersedia'}`);
    doc.moveDown();
    
    doc.end();
});

// Konfigurasi Khusus Vercel
module.exports = app;
