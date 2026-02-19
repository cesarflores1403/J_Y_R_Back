# J Y R - Frontend

Frontend de la aplicación J Y R construido con React JS y Bootstrap 5.

## Requisitos

- Node.js (v14 o superior)
- npm o yarn

## Instalación

1. Clona el repositorio:

```bash
git clone <tu-repositorio>
cd J_Y_R_Fron
```

2. Instala las dependencias:

```bash
npm install
```

3. Inicia el servidor de desarrollo:

```bash
npm start
```

La aplicación estará disponible en `http://localhost:3000`

## Estructura del Proyecto

```
src/
├── components/       # Componentes reutilizables
│   ├── Navbar.js
│   ├── Navbar.css
│   ├── Footer.js
│   └── Footer.css
├── pages/           # Páginas de la aplicación
│   ├── Home.js
│   └── Home.css
├── App.js           # Componente principal
├── App.css
├── index.js         # Punto de entrada
└── index.css
```

## Tecnologías Utilizadas

- **React JS** - Librería de interfaz de usuario
- **Bootstrap 5** - Framework CSS
- **React Bootstrap** - Componentes Bootstrap para React
- **React Router** - Enrutamiento de la aplicación
- **Axios** - Cliente HTTP

## Scripts Disponibles

- `npm start` - Inicia el servidor de desarrollo
- `npm build` - Crea una versión de producción
- `npm test` - Ejecuta las pruebas
- `npm eject` - Expone la configuración (irreversible)

## Desarrollo

Para agregar nuevos componentes:

1. Crea un archivo en `src/components/`
2. Importa en el archivo donde lo necesites
3. Utiliza los estilos de Bootstrap 5

Para agregar nuevas páginas:

1. Crea un archivo en `src/pages/`
2. Agrega la ruta en `App.js` usando React Router
3. Importa el componente en `App.js`

## Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```
REACT_APP_API_URL=http://localhost:5000/api
```

## Contribuir

Las contribuciones son bienvenidas. Por favor, abre un issue o un pull request.

## Licencia

Este proyecto está bajo la licencia MIT.
