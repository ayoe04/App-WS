const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const PDFDocument = require('pdfkit');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Serve static files from build folder (for production)
app.use(express.static(path.join(__dirname, 'build')));

// PDF Generation Route - PERBAIKI INI
app.post('/api/generate-pdf', (req, res) => {
    try {
        console.log('Received PDF generation request');
        
        const data = req.body;
        
        // Validasi data
        if (!data || !data.customer) {
            return res.status(400).json({ error: 'Data tidak valid' });
        }

        // Setup response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="Laporan_Inspeksi.pdf"');

        // Create PDF
        const doc = new PDFDocument({
            size: 'A4',
            margin: 50
        });
        
        // Pipe PDF to response
        doc.pipe(res);
        
        // Add content to PDF
        doc.fontSize(20).text('LAPORAN INSPEKSI KENDARAAN', { align: 'center' });
        doc.moveDown();
        
        doc.fontSize(12)
           .text(`Lokasi: ${data.customer.location || 'Tidak Tersedia'}`)
           .text(`Nama: ${data.customer.firstName || ''} ${data.customer.lastName || ''}`)
           .text(`Telepon: ${data.customer.phone || 'Tidak Tersedia'}`)
           .text(`Mobil: ${data.customer.carBrand || ''} ${data.customer.carModel || ''}`)
           .text(`Warna: ${data.customer.color || 'Tidak Tersedia'}`)
           .text(`Plat: ${data.customer.licensePlate || 'Tidak Tersedia'}`);
        
        doc.moveDown();
        
        // Inspection results
        doc.text('HASIL INSPEKSI:', { underline: true });
        doc.moveDown(0.5);
        
        Object.entries(data.inspection || {}).forEach(([item, details]) => {
            const status = details.status === 'G' ? 'BAIK' : 
                          details.status === 'F' ? 'CUKUP' : 'BURUK';
            
            doc.text(`${item}: ${status}`);
            
            if (details.notes) {
                doc.text(`   Catatan: ${details.notes}`, { indent: 20 });
            }
            
            doc.moveDown(0.5);
        });
        
        // Finalize PDF
        doc.end();
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ 
            error: 'Gagal generate PDF',
            details: error.message 
        });
    }
});

// Handle all other routes by serving the React app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Export for Vercel
module.exports = app;