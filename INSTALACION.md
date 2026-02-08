# Guía de Instalación y Configuración - J Y R Frontend

## Requisitos Previos

- **Node.js**: v14 o superior (descargado desde [nodejs.org](https://nodejs.org))
- **npm**: incluido con Node.js
- **Git**: para clonar el repositorio

## Pasos de Instalación

### 1. Clonar el Repositorio

```bash
git clone <url-del-repositorio>
cd J_Y_R_Fron
```

### 2. Instalar Dependencias

```bash
npm install
```

Esto instalará todas las dependencias listadas en `package.json`.

### 3. Configurar Variables de Entorno

Copia el archivo `.env.example` a `.env`:

```bash
cp .env.example .env
```

Luego edita el archivo `.env` con tus valores:

```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ENV=development
```

**Nota**: Para Windows usa `copy` en lugar de `cp`:

```bash
copy .env.example .env
```

### 4. Iniciar el Servidor de Desarrollo

```bash
npm start
```

La aplicación se abrirá automáticamente en `http://localhost:3000`

## Comandos Disponibles

### Iniciar Servidor de Desarrollo

```bash
npm start
```

- Ejecuta la app en modo desarrollo
- Abre [http://localhost:3000](http://localhost:3000) en el navegador
- La página se recargará cuando hagas cambios
- Verás errores de linting en la consola

### Compilar para Producción

```bash
npm build
```

- Compila la app para producción en la carpeta `build/`
- Optimiza el tamaño del bundle y el rendimiento
- La construcción es minificada

### Ejecutar Tests

```bash
npm test
```

- Ejecuta el test runner en modo interactivo
- Ver [testing](https://facebook.github.io/create-react-app/docs/running-tests) para más info

## Configuración de VSCode

Se incluye un archivo `.vscode/settings.json` con configuraciones recomendadas.

### Extensiones Recomendadas

Instala estas extensiones en VSCode:

- **ES7+ React/Redux/React-Native snippets** (dsznajder.es7-react-js-snippets)
- **Prettier - Code formatter** (esbenp.prettier-vscode)
- **ESLint** (dbaeumer.vscode-eslint)
- **Thunder Client** o **REST Client** (para probar API)

## Conectar con el Backend

### URL por Defecto

```
http://localhost:5000/api
```

Si tu backend está en otro puerto, actualiza:

```
REACT_APP_API_URL=http://localhost:PUERTO/api
```

## Estructura de Carpetas

Consulta `ESTRUCTURA_PROYECTO.md` para una descripción detallada de la estructura.

## Desarrollo de Componentes

### Crear un Nuevo Componente

```javascript
// src/components/MiComponente.js
import React from "react";
import "./MiComponente.css";

function MiComponente() {
  return <div className="mi-componente">Contenido</div>;
}

export default MiComponente;
```

### Crear una Nueva Página

```javascript
// src/pages/MiPagina.js
import React from "react";
import "./MiPagina.css";

function MiPagina() {
  return <div className="mi-pagina">Contenido</div>;
}

export default MiPagina;
```

Luego agrégala en `src/App.js`:

```javascript
import MiPagina from "./pages/MiPagina";

// En el componente Routes:
<Route path="/mi-pagina" element={<MiPagina />} />;
```

## Problemas Comunes y Soluciones

### 1. "npm: command not found"

**Solución**: Verifica que Node.js esté instalado correctamente

```bash
node --version
npm --version
```

### 2. Los cambios no se reflejan

**Solución**: Limpia el caché del navegador o reinicia el servidor

```bash
# Presiona Ctrl+C para detener el servidor
npm start
```

### 3. Errores de módulos no encontrados

**Solución**: Reinstala las dependencias

```bash
rm -rf node_modules
npm install
```

### 4. Error de puerto ya en uso

Si el puerto 3000 está ocupado:

```bash
# En Windows - Encuentra el PID usando el puerto 3000
netstat -ano | findstr :3000

# En Linux/Mac
lsof -i :3000
```

## Buenas Prácticas

1. **Commits Frecuentes**: Haz commits pequeños y descriptivos
2. **Ramas Separadas**: Crea ramas para nuevas funcionalidades
3. **Código Limpio**: Sigue las convenciones de ESLint
4. **Comentarios**: Documenta código complejo
5. **Testing**: Escribe tests para nuevas funcionalidades

## Deploy

### Build para Producción

```bash
npm build
```

Se generarán archivos optimizados en la carpeta `build/` listos para servir.

### Opciones de Hosting

- **Vercel** (recomendado para React)
- **Netlify**
- **GitHub Pages**
- **Heroku**
- **AWS S3 + CloudFront**

## Más Información

- [Documentación de React](https://react.dev)
- [Bootstrap 5 Documentation](https://getbootstrap.com/docs/5.0)
- [React Router Documentation](https://reactrouter.com)
- [Axios Documentation](https://axios-http.com)

---

Para más ayuda o reportar problemas, contacta al equipo de desarrollo.
