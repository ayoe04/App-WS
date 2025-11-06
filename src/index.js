import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './dashboard.jsx'; 

// Dapatkan elemen root dari public/index.html (yaitu div dengan id="root")
const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);

// Render aplikasi React.
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
