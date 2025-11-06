import React, { useState, useCallback, useRef } from 'react';
import { Car, FileText, CheckSquare, Clock, X, Trash2, Camera, Download, Loader2 } from 'lucide-react'; 

// PERUBAHAN 1: Mengubah URL ABSOLUT menjadi RELATIF. 
// Vercel akan otomatis mengarahkan /api/generate-pdf ke server.js Anda.
const API_URL = "/api/generate-pdf";

// Skema data inspeksi default
const defaultInspectionSchema = {
  Paint: { status: 'G', notes: '', file: null },
  Windshield: { status: 'G', notes: '', file: null },
  Windows: { status: 'G', notes: 'Windows is clean.', file: null },
  Mirrors: { status: 'G', notes: '', file: null },
  'Rear Window': { status: 'G', notes: '', file: null },
  Tires: { status: 'G', notes: '', file: null },
  Wheels: { status: 'G', notes: '', file: null },
};

// Component Input Data Customer
const InputGroup = React.memo(({ label, value, name, onChange, required = false }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input
            type="text"
            name={name}
            value={value}
            onChange={onChange}
            className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none 
                border-gray-300 focus:ring-indigo-500 focus:border-indigo-500
            `}
        />
    </div>
));


// Component Tanda Tangan
const SignaturePad = ({ signature, setSignature }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const startDrawing = useCallback((e) => {
    e.preventDefault(); 
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, []);

  const draw = useCallback((e) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  }, [isDrawing]);

  const stopDrawing = useCallback(() => {
    if (isDrawing) {
      setIsDrawing(false);
      const canvas = canvasRef.current;
      if (canvas) {
        // Memastikan tanda tangan tersimpan
        setSignature(canvas.toDataURL('image/png'));
      }
    }
  }, [isDrawing, setSignature]);

  // Setup Canvas dan Redraw
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.lineWidth = 3; 
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#000';
      
      const updateCanvasSize = () => {
        const parent = canvas.parentElement;
        canvas.width = parent.clientWidth;
        canvas.height = 200; 
        
        // Redraw signature jika sudah ada
        if (signature) {
            const img = new Image();
            img.onload = () => {
                // Gambar ulang tanda tangan sesuai ukuran baru
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
            img.src = signature;
        }
      };
      
      updateCanvasSize();
      window.addEventListener('resize', updateCanvasSize);
      
      // Cleanup listener
      return () => window.removeEventListener('resize', updateCanvasSize);
    }
  }, [signature]); 

  // Listener untuk Mouse/Touch Events
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // MOUSE EVENTS
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', stopDrawing); 
    
    // TOUCH EVENTS (Passive: false untuk mencegah default action seperti scrolling)
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    window.addEventListener('touchend', stopDrawing);

    return () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      window.removeEventListener('mouseup', stopDrawing);
      
      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchmove', draw);
      window.removeEventListener('touchend', stopDrawing);
    };
  }, [startDrawing, draw, stopDrawing]); // isDrawing bukan dependency karena start/stop sudah menangani logic

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setSignature(''); // Set state ke string kosong
    }
  };


  return (
    <div className="relative border border-gray-300 rounded-lg shadow-inner bg-white min-h-[200px]">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
      />
      <button 
        onClick={clearSignature}
        type="button"
        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition duration-150 shadow-lg"
        title="Hapus Tanda Tangan"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
};


// Component Item Inspeksi
const InspectionItem = React.memo(({ item, details, onUpdate, onError }) => { // Tambahkan onError
  
  const [showNotes, setShowNotes] = useState(!!details.notes || !!details.file);
  const fileInputRef = useRef(null);

  const handleStatusChange = (newStatus) => {
    onUpdate(item, { ...details, status: newStatus });
  };

  const handleNotesChange = (e) => {
    onUpdate(item, { ...details, notes: e.target.value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
         // PERUBAHAN 2: Ganti alert() dengan pemanggilan onError (Modal)
         onError("Ukuran file terlalu besar. Maksimal 5MB.");
         e.target.value = null; // Reset input
         onUpdate(item, { ...details, file: null });
         return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        // Simpan Data URL (Base64) dan nama file
        onUpdate(item, { 
          ...details, 
          file: {
            name: file.name,
            dataUrl: reader.result 
          }
        });
        setShowNotes(true); // Pastikan notes terbuka jika file diupload
      };
      reader.onerror = () => {
         console.error("Gagal membaca file.");
         onUpdate(item, { ...details, file: null });
      };
      
      reader.readAsDataURL(file);
    } else {
      onUpdate(item, { ...details, file: null });
    }
  };

  const removeFile = () => {
    onUpdate(item, { ...details, file: null });
    // Reset input file
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4">
      <div className="flex items-center justify-between">
        
        {/* Item & Status Buttons (G/F/P) */}
        <div className="flex items-center space-x-4">
          <div className="flex space-x-1">
            {['G', 'F', 'P'].map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                className={`w-10 h-10 text-lg font-bold rounded-lg transition duration-150 ${
                  details.status === s 
                    ? s === 'G' ? 'bg-green-600 text-white shadow-lg' : s === 'F' ? 'bg-yellow-500 text-gray-800 shadow-lg' : 'bg-red-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <h3 className="text-lg font-semibold text-gray-800">{item}</h3>
        </div>

        {/* Note/Toggle Button */}
        <button
          onClick={() => setShowNotes(!showNotes)}
          className={`p-2 rounded-full transition duration-200 ${
            showNotes ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
          title={showNotes ? 'Sembunyikan Catatan' : 'Tampilkan Catatan'}
        >
          {showNotes ? <X className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
        </button>
      </div>

      {/* Notes & File Section */}
      {showNotes && (
        <div className="mt-4 p-4 border-t border-gray-200 bg-gray-50 rounded-lg">
          <textarea
            value={details.notes}
            onChange={handleNotesChange}
            placeholder={`Tambahkan tulisan di note untuk ${item}...`}
            rows="3"
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm"
          />
          
          <div className="mt-3 flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 flex items-center space-x-2 cursor-pointer bg-indigo-100 px-3 py-1.5 rounded-md hover:bg-indigo-200 transition duration-150">
                <Camera className="w-4 h-4 text-indigo-600" />
                <span>Pilih Foto Kerusakan</span>
                <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange} 
                    className="hidden" 
                    accept="image/*"
                />
            </label>
            
            {details.file ? (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span className="truncate max-w-xs font-medium">{details.file.name}</span>
                <button onClick={removeFile} type="button" className="text-red-500 hover:text-red-700 p-1 rounded-full bg-red-100">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <span className="text-sm text-gray-500 italic">Maksimal 5MB.</span>
            )}
          </div>
          {details.file && details.file.dataUrl && (
             <img src={details.file.dataUrl} alt="Preview Foto Kerusakan" className="mt-3 w-40 h-40 object-cover rounded-md border border-gray-300 shadow-md" />
          )}
        </div>
      )}
    </div>
  );
});


// Custom Modal Component
const Modal = ({ message, type, onClose }) => {
    const isSuccess = type === 'success';
    const isError = type === 'error';
    const isLoading = type === 'loading';

    return (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm text-center transform transition-all duration-300 scale-100">
          
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
             isSuccess ? 'bg-green-100' : isError ? 'bg-red-100' : 'bg-indigo-100'
          }`}>
            {isLoading ? (
               <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            ) : isSuccess ? (
              <CheckSquare className="w-8 h-8 text-green-600" />
            ) : (
              <X className="w-8 h-8 text-red-600" />
            )}
          </div>
          
          <h3 className="text-xl font-bold mb-2 text-gray-800">
            {isLoading ? 'Processing...' : isSuccess ? 'Sukses' : 'Error'}
          </h3>
          <p className="text-gray-600 mb-6">{message}</p>

          {!isLoading && (
            <button
              onClick={onClose}
              className={`w-full py-2 rounded-lg font-semibold transition duration-200 ${
                isSuccess ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md' : 'bg-red-500 hover:bg-red-600 text-white shadow-md'
              }`}
            >
              OK
            </button>
          )}
        </div>
      </div>
    );
  };

// Hook kustom untuk menangani logika fetch dan download PDF
const usePDF = ({ apiUrl }) => {
    
    // Fungsi untuk mengunduh PDF
    const downloadPDF = useCallback(async (data) => {
        try {
            console.log("Mengirim data inspeksi ke backend di jalur:", apiUrl);
            
            const MAX_RETRIES = 3;
            let response;
            
            for (let i = 0; i < MAX_RETRIES; i++) {
                try {
                    // PENTING: apiUrl kini menggunakan jalur RELATIF (/api/generate-pdf)
                    response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Max-Payload-Size': '5MB' 
                        },
                        body: JSON.stringify(data),
                    });
                    
                    if (response.ok) {
                        break; 
                    } else if (response.status === 413) {
                         // Payload Too Large
                         throw new Error(`Ukuran data terlalu besar. Harap periksa ukuran file gambar Anda.`);
                    } else if (i === MAX_RETRIES - 1) {
                         // Tampilkan pesan error dari server jika ada
                         const errorText = await response.text();
                         throw new Error(`Server error (${response.status}): ${errorText.substring(0, 100)}...`);
                    }

                } catch (error) {
                    if (i === MAX_RETRIES - 1 || error.message.includes("Ukuran data terlalu besar")) {
                        throw error; // Melemparkan error ukuran file atau error terakhir
                    }
                    console.error(`Attempt ${i+1} failed:`, error.message);
                    // Exponential backoff
                    const delay = Math.pow(2, i) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }


            // Dapatkan blob PDF dari respons
            const blob = await response.blob();
            
            // Dapatkan nama file dari header Content-Disposition jika tersedia
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = `Inspection_Report_${data.customer.licensePlate || 'New'}_${new Date().toLocaleDateString('id-ID').replace(/\//g, '-')}.pdf`;
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="(.+)"/);
                if (match && match[1]) {
                    filename = match[1];
                }
            }

            // Buat URL objek dan link download
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            
            // download pdf
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            
            console.log(`PDF berhasil diunduh: ${filename}`);
            return filename; 
            
        } catch (error) {
            console.error("Error dalam proses download PDF:", error);
            throw new Error(`Gagal mengunduh PDF: ${error.message}`);
        }
    }, [apiUrl]);

    return { downloadPDF };
};


// Component Utama Dashboard
const Dashboard = () => {
  const [activeStep, setActiveStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState('success'); // 'success', 'error', 'loading'

  const [formData, setFormData] = useState(() => ({
    date: new Date().toISOString(),
    customer: {
      location: '', 
      firstName: '',
      lastName: '',
      phone: '',
      carBrand: '',
      carModel: '',
      color: '',
      licensePlate: '',
    },
    inspection: defaultInspectionSchema,
    agreed: false,
    signature: '',
  }));

  // Kustom hook untuk logika Fetch PDF
  const { downloadPDF } = usePDF({ apiUrl: API_URL });

  const handleCustomerChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      customer: {
        ...prev.customer,
        [name]: value,
      },
    }));
  }, []);

  const handleInspectionUpdate = useCallback((item, newDetails) => {
    setFormData(prev => ({
      ...prev,
      inspection: {
        ...prev.inspection,
        [item]: newDetails,
      },
    }));
  }, []);

  // Fungsi yang dipanggil oleh InspectionItem saat ada error (misal file size)
  const handleInspectionError = (message) => {
    setModalMessage(message);
    setModalType('error');
    setShowModal(true);
  };

  const handleSignatureChange = useCallback((dataUrl) => {
    setFormData(prev => ({ ...prev, signature: dataUrl }));
  }, []);

  const handleAgreementChange = useCallback((e) => {
    setFormData(prev => ({ ...prev, agreed: e.target.checked }));
  }, []);

  const isStep1Valid = () => {
    const cust = formData.customer;
    return cust.firstName && cust.lastName && cust.phone && cust.carBrand && cust.carModel && cust.licensePlate && cust.location;
  };

  const isStep3Valid = () => {
    return formData.agreed && formData.signature;
  };

  const handleNext = () => {
    if (activeStep === 1 && !isStep1Valid()) {
      setModalMessage('Harap isi semua detail pelanggan dan kendaraan wajib yang bertanda (*).');
      setModalType('error');
      setShowModal(true);
      return;
    }
    setActiveStep(prev => prev + 1);
  };

  const handlePrev = () => {
    activeStep > 1 && setActiveStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!isStep3Valid()) {
      setModalMessage('Anda harus menandatangani dan menyetujui Syarat & Ketentuan.');
      setModalType('error');
      setShowModal(true);
      return;
    }

    setIsSubmitting(true);
    setModalMessage('Membuat PDF...');
    setModalType('loading'); 
    setShowModal(true);

    try {
      await downloadPDF(formData);

      setModalMessage('Inspeksi Berhasil Ditambahkan dan PDF Diunduh!');
      setModalType('success');
      
      // Reset Form Data setelah sukses
      setFormData({
        date: new Date().toISOString(),
        customer: {
          location: 'Wrap Station Medan',
          firstName: '',
          lastName: '',
          phone: '',
          carBrand: '',
          carModel: '',
          color: '',
          licensePlate: '',
        },
        inspection: defaultInspectionSchema,
        agreed: false,
        signature: '',
      });
      setActiveStep(1); 
      
    } catch (error) {
      console.error('Error saat submit/mengunduh PDF:', error);
      let errorMessage = error.message || 'Periksa koneksi server.';
      if (errorMessage.includes('Ukuran data terlalu besar')) {
          errorMessage = 'Gagal: Ukuran data (termasuk gambar) melebihi batas. Harap perkecil ukuran foto atau batasi jumlahnya.';
      }
      setModalMessage(`Gagal mengunduh PDF: ${errorMessage}`);
      setModalType('error');
    } finally {
      setIsSubmitting(false);
    }
  };


  const renderStep = () => {
    switch (activeStep) {
      case 1:
        // STEP 1: Customer Details
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 border-b pb-2 mb-4 flex items-center space-x-2">
                <Car className="w-6 h-6 text-indigo-600" />
                <span>Detail Pelanggan & Kendaraan</span>
            </h2>
            
            <InputGroup label="Lokasi" value={formData.customer.location} name="location" onChange={handleCustomerChange} required={true}/>
            <InputGroup label="Nama Depan Pelanggan" value={formData.customer.firstName} name="firstName" onChange={handleCustomerChange} required={true}/>
            <InputGroup label="Nama Belakang Pelanggan" value={formData.customer.lastName} name="lastName" onChange={handleCustomerChange} required={true}/>
            <InputGroup label="Nomor Telepon Pelanggan" value={formData.customer.phone} name="phone" onChange={handleCustomerChange} required={true}/>
            <InputGroup label="Merek Mobil" value={formData.customer.carBrand} name="carBrand" onChange={handleCustomerChange} required={true}/>
            <InputGroup label="Model Mobil" value={formData.customer.carModel} name="carModel" onChange={handleCustomerChange} required={true}/>
            <InputGroup label="Warna" value={formData.customer.color} name="color" onChange={handleCustomerChange}/>
            <InputGroup label="Plat Nomor" value={formData.customer.licensePlate} name="licensePlate" onChange={handleCustomerChange} required={true}/>
            
            <div className="flex justify-end pt-4">
              <button 
                onClick={handleNext} 
                disabled={!isStep1Valid()}
                className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition duration-200 disabled:opacity-50"
              >
                Selanjutnya <span aria-hidden="true">&rarr;</span>
              </button>
            </div>
          </div>
        );

      case 2:
        // STEP 2: Inspection
        
        // Group items for better UI layout
        const groups = {
          'Body Paint': ['Paint'],
          'Glass': ['Windshield', 'Windows', 'Mirrors', 'Rear Window'],
          'Wheels & Tires': ['Tires', 'Wheels'],
        };

        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 border-b pb-2 mb-4 flex items-center space-x-2">
                <FileText className="w-6 h-6 text-indigo-600" />
                <span>Detail Inspeksi</span>
            </h2>
            
            <div className="flex items-center space-x-4 mb-6 text-sm font-semibold p-3 bg-gray-100 rounded-lg">
                <span className="text-green-600">G = Baik (Good)</span>
                <span className="text-yellow-500">F = Cukup (Fair)</span>
                <span className="text-red-600">P = Buruk (Poor)</span>
            </div>

            {Object.entries(groups).map(([groupName, items]) => (
                <div key={groupName} className="mb-8">
                    <h3 className="text-xl font-bold text-indigo-700 mb-4">{groupName}</h3>
                    <div className="space-y-4">
                        {items.map(item => (
                            <InspectionItem 
                                key={item}
                                item={item} 
                                details={formData.inspection[item]} 
                                onUpdate={handleInspectionUpdate}
                                onError={handleInspectionError} // Teruskan fungsi error handler
                            />
                        ))}
                    </div>
                </div>
            ))}

            <div className="flex justify-between pt-4">
              <button 
                onClick={handlePrev}
                className="px-6 py-2 bg-gray-300 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-400 transition duration-200"
              >
                &larr; Sebelumnya
              </button>
              <button 
                onClick={handleNext} 
                className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition duration-200"
              >
                Selanjutnya <span aria-hidden="true">&rarr;</span>
              </button>
            </div>
          </div>
        );

      case 3:
        // STEP 3: Terms & Signature
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 border-b pb-2 mb-4 flex items-center space-x-2">
                <CheckSquare className="w-6 h-6 text-indigo-600" />
                <span>Syarat & Tanda Tangan</span>
            </h2>
            
            {/* Terms and Conditions */}
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 h-64 overflow-y-scroll text-sm text-gray-700">
                <h3 className="font-bold text-lg mb-3 text-indigo-700">Syarat dan Ketentuan - Serah Terima Kendaraan di Wrap Station</h3>
                <ol className="list-decimal list-inside space-y-2">
                    <li>Kondisi kendaraan dapat berubah setelah pembersihan. Tim akan menginformasikan jika ada perubahan.</li>
                    <li>Status cat kendaraan (repaint/original) tidak dapat dipastikan, risiko ditanggung pemilik.</li>
                    <li>Penambahan jarak tempuh (mileage) bisa terjadi, dan bukan tanggung jawab Wrap Station.</li>
                    <li>Kerusakan/malfungsi mesin selama atau setelah pengerjaan bukan tanggung jawab Wrap Station.</li>
                    <li>Kerusakan akibat pembongkaran aksesori oleh pelanggan bukan tanggung jawab Wrap Station.</li>
                    <li>Kehilangan barang pribadi bukan tanggung jawab Wrap Station.</li>
                    <li>Wrap Station berhak melakukan tindakan teknis yang diperlukan tanpa persetujuan lebih lanjut.</li>
                    <li>Kondisi/modifikasi khusus yang tidak diinformasikan di awal dapat membatalkan garansi.</li>
                    <li>Penurunan baterai EV adalah kondisi alami, bukan tanggung jawab kami.</li>
                    <li>Estimasi pengerjaan dapat berubah karena faktor tak terduga.</li>
                </ol>
            </div>

            {/* Agreement Checkbox */}
            <div className="flex items-start mt-4">
                <input
                    type="checkbox"
                    id="agreed"
                    checked={formData.agreed}
                    onChange={handleAgreementChange}
                    className="mt-1 h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="agreed" className="ml-3 text-base text-gray-900 font-medium cursor-pointer">
                    Saya telah membaca dan menyetujui Syarat & Ketentuan.
                </label>
            </div>

            {/* Signature Pad */}
            <div className="pt-4">
              <h3 className="text-xl font-bold text-gray-800 mb-2">Tanda Tangan Pelanggan</h3>
              <SignaturePad 
                signature={formData.signature} 
                setSignature={handleSignatureChange} 
              />
            </div>


            <div className="flex justify-between pt-6">
              <button 
                onClick={handlePrev}
                className="px-6 py-2 bg-gray-300 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-400 transition duration-200"
              >
                &larr; Sebelumnya
              </button>
              <button 
                onClick={handleSubmit} 
                disabled={isSubmitting || !isStep3Valid()}
                className="flex items-center justify-center space-x-2 px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-xl hover:bg-indigo-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                 {isSubmitting ? (
                    <>
                       <Loader2 className="w-5 h-5 animate-spin" />
                       <span>Membuat PDF...</span>
                    </>
                 ) : (
                    <>
                       <Download className="w-5 h-5" />
                       <span>Submit Inspection & Download PDF</span>
                    </>
                 )}
              </button>
            </div>
          </div>
        );

      default:
        return <div>Langkah Tidak Dikenal</div>;
    }
  };

  
  // Navigasi Langkah
  const steps = [
    { id: 1, name: 'Detail Kendaraan', icon: Car },
    { id: 2, name: 'Inspeksi', icon: FileText },
    { id: 3, name: 'Tanda Tangan', icon: CheckSquare },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Clock className="w-8 h-8 text-indigo-600" />
            <h1 className="text-2xl font-extrabold text-gray-900">WRAP STATION</h1>
          </div>
          <div className="text-sm font-medium text-gray-500 hidden sm:block">
             Inspeksi Kendaraan
          </div>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto pt-8 px-4 sm:px-6 lg:px-8">
        {/* Step Navigation */}
        <nav className="flex justify-between mb-8" aria-label="Progress">
          {steps.map((step) => (
            <div 
              key={step.id} 
              className={`flex-1 flex flex-col items-center py-2 transition-colors duration-300 relative ${
                activeStep === step.id ? 'text-indigo-600' : 'text-gray-400'
              }`}
            >
              {/* Icon & Text */}
              <div className={`flex items-center space-x-2 ${
                activeStep >= step.id ? 'font-semibold' : 'font-medium'
              }`}>
                <step.icon className="w-6 h-6" />
                <span className="hidden sm:inline text-sm">
                  {step.name}
                </span>
              </div>
              
              {/* Bottom Indicator */}
              <div className={`absolute bottom-0 h-1 w-full transition-all duration-300 ${
                activeStep === step.id ? 'bg-indigo-600' : 'bg-gray-200'
              }`}></div>
            </div>
          ))}
        </nav>

        {/* Form Content */}
        <div className="bg-white p-8 rounded-xl shadow-lg">
          {renderStep()}
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <Modal 
          message={modalMessage} 
          type={modalType} 
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;