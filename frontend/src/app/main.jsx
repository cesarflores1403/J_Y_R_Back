import React from 'react'; // // React
import ReactDOM from 'react-dom/client'; // // Render
import App from './App.jsx'; // // App principal

import 'bootstrap/dist/css/bootstrap.min.css'; // // Bootstrap global
import '../styles/index.css'; // // CSS global propio

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);