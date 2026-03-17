import React from 'react'; // // React
import ReactDOM from 'react-dom/client'; // // Render
import App from './App.jsx'; // // App principal

import 'bootstrap/dist/css/bootstrap.min.css'; // // Bootstrap global
import 'react-toastify/dist/ReactToastify.css'; // // Toastify CSS
import 'sweetalert2/dist/sweetalert2.min.css'; // // SweetAlert2 CSS
import '../assets/css/theme.css'; // // Theme JYR
import '../styles/index.css'; // // CSS global propio

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);