import dotenv from 'dotenv'; // // Carga variables de entorno

dotenv.config(); // // Carga .env ANTES de importar app

const { default: app } = await import('./app.js'); // // Import dinámico para respetar dotenv

const PORT = process.env.PORT || 5000; // // Puerto configurable

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`); // // Log server
});