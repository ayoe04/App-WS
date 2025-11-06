import React from 'react';
import ReactDOM from 'react-dom/client';
// Mengimpor komponen utama dari dashboard.jsx.
// Path ini menggunakan './' karena dashboard.jsx sudah dipindahkan ke folder src/ yang sama.
import App from './dashboard.jsx'; 

// Dapatkan elemen root dari public/index.html (yaitu div dengan id="root")
const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);

// Render aplikasi React.
// Pastikan file dashboard.jsx sudah diexport sebagai 'export default App;'
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

/*
CATATAN PENTING:
1. Pastikan file 'dashboard.jsx' Anda sudah dipindahkan ke folder 'src/'.
2. Pastikan Anda menjalankan perintah 'npm start' di direktori root.
3. Akses aplikasi di browser menggunakan http://localhost:3000
*/