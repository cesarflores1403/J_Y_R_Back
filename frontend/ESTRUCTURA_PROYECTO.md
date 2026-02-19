# Estructura del Proyecto Frontend - J Y R

## Descripción General

Este es el frontend de la aplicación J Y R, construido con React JS, Bootstrap 5 y conectado a un backend con PostgreSQL.

## Árbol de Directorios

```
J_Y_R_Fron/
│
├── public/                    # Archivos estáticos públicos
│   └── index.html            # HTML principal
│
├── src/                       # Código fuente principal
│   ├── components/           # Componentes reutilizables
│   │   ├── Navbar.js
│   │   ├── Navbar.css
│   │   ├── Footer.js
│   │   ├── Footer.css
│   │   └── CustomButton.js
│   │
│   ├── pages/               # Páginas de la aplicación
│   │   ├── Home.js
│   │   └── Home.css
│   │
│   ├── services/            # Servicios API
│   │   ├── api.js           # Cliente Axios configurado
│   │   └── userService.js   # Ejemplo de servicio
│   │
│   ├── hooks/               # React Hooks personalizados
│   │   └── useAuth.js       # Hook de autenticación
│   │
│   ├── constants/           # Constantes de la aplicación
│   │   └── constants.js
│   │
│   ├── utils/               # Funciones utilitarias
│   │   └── utils.js
│   │
│   ├── App.js              # Componente raíz
│   ├── App.css
│   ├── index.js            # Punto de entrada
│   └── index.css
│
├── .vscode/                # Configuración de VSCode
│   └── settings.json
│
├── .env.example            # Ejemplo de variables de entorno
├── .gitignore              # Ignorar archivos en Git
├── package.json            # Dependencias y scripts
└── README.md               # Documentación del proyecto
```

## Descripción de Carpetas

### `/public`

Contiene los archivos estáticos que se sirven directamente. El archivo `index.html` es el punto de entrada HTML que React monta.

### `/src/components`

Componentes reutilizables que se pueden usar en múltiples páginas:

- **Navbar**: Barra de navegación
- **Footer**: Pie de página
- **CustomButton**: Botón personalizado con estados de carga

### `/src/pages`

Componentes que representan páginas completas de la aplicación. Cada página tiene:

- Un archivo JS con la lógica
- Un archivo CSS para los estilos específicos

### `/src/services`

Servicios para comunicarse con el backend:

- **api.js**: Cliente Axios configurado con interceptores
- **userService.js**: Ejemplo de servicio CRUD para usuarios

### `/src/hooks`

React Hooks personalizados para lógica reutilizable:

- **useAuth.js**: Maneja la autenticación y sesión del usuario

### `/src/constants`

Constantes de la aplicación como URLs, códigos de estado, mensajes, etc.

### `/src/utils`

Funciones utilitarias generales:

- Validaciones (email, contraseña)
- Formateo de datos
- Manejo de localStorage
- Utilidades generales

## Flujo de Datos

```
[Usuario interactúa con la UI]
            ↓
    [Componentes React]
            ↓
    [Hooks (useAuth, etc.)]
            ↓
    [Services (api.js)]
            ↓
    [Backend (PostgreSQL)]
```

## Patrones Utilizados

### 1. Prop Types

Se recomienda usar PropTypes para validar las props de componentes:

```javascript
import PropTypes from "prop-types";

Component.propTypes = {
  name: PropTypes.string.isRequired,
  age: PropTypes.number,
};
```

### 2. Hooks Personalizados

Para lógica compartida entre componentes, crear hooks en `/src/hooks`

### 3. Servicios API

Para cualquier llamada a la API, usar los servicios en `/src/services`

### 4. Variables de Entorno

Usar `.env` para configuraciones sensibles (URLs de API, etc.)

## Convenciones de Código

### Nombres

- Componentes: PascalCase (ej: `MyComponent.js`)
- Funciones/Variables: camelCase (ej: `myFunction`, `myVariable`)
- Constantes: UPPER_SNAKE_CASE (ej: `API_URL`)

### Estructura de Componentes

```javascript
import React from "react";
import "./MyComponent.css";

function MyComponent({ prop1, prop2 }) {
  return <div className="my-component">{/* Contenido */}</div>;
}

export default MyComponent;
```

## Próximos Pasos

1. **Instalar dependencias**: `npm install`
2. **Crear archivo .env**: Copiar `.env.example` y rellenar valores
3. **Iniciar servidor**: `npm start`
4. **Agregar páginas de autenticación** (Login, Register)
5. **Crear páginas adicionales** según requisitos

## Tecnologías y Librerías

- **React 18.2.0** - Librería de UI
- **Bootstrap 5.3.0** - Framework CSS
- **React Bootstrap 2.7.0** - Componentes Bootstrap para React
- **React Router 6.8.0** - Enrutamiento
- **Axios 1.3.2** - Cliente HTTP
