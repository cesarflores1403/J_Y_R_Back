# J Y R - Frontend

Frontend de la aplicación J Y R construido con React JS y Bootstrap 5.

## Requisitos

- Node.js (v14 o superior)
- npm o yarn

## Instalación

1. Clona el repositorio:

```bash
git clone <tu-repositorio>
cd J_Y_R_Back
cd frontend
```

2. Instala las dependencias:

```bash
npm install
```

3. Inicia el servidor de desarrollo:

```bash
npm start
```

La aplicación estará disponible en `http://localhost:5173`

## Estructura del Proyecto

```
src/
├── app/             # Componente principal y punto de entrada
│   ├── App.jsx      # Componente raíz con rutas
│   └── main.jsx     # Punto de entrada
├── components/      # Componentes reutilizables
├── pages/           # Páginas de la aplicación
├── services/        # Llamadas a la API (axios)
├── contexts/        # Contextos de React
├── hooks/           # Hooks personalizados
├── utils/           # Funciones utilitarias
└── styles/          # Módulos CSS
```

## Tecnologías Utilizadas

- **React JS** - Librería de interfaz de usuario
- **Bootstrap 5** - Framework CSS
- **React Router** - Enrutamiento de la aplicación
- **Axios** - Cliente HTTP
- **React Toastify** - Notificaciones

## Scripts Disponibles

- `npm start` - Inicia el servidor de desarrollo
- `npm run build` - Crea una versión de producción
- `npm run preview` - Vista previa de la versión de producción

## Desarrollo

Para agregar nuevos componentes:

1. Crea un archivo en `src/components/`
2. Importa en el archivo donde lo necesites
3. Utiliza los estilos de Bootstrap 5

Para agregar nuevas páginas:

1. Crea un archivo en `src/pages/`
2. Agrega la ruta en `App.jsx` usando React Router
3. Importa el componente en `App.jsx`

## Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```
VITE_API_URL=http://localhost:5000/api
```

## Contribuir

Las contribuciones son bienvenidas. Por favor, abre un issue o un pull request.

## Licencia

Este proyecto está bajo la licencia MIT.
