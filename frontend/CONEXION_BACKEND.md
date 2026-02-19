# Guía de Conexión con Backend (PostgreSQL)

## Concepto General

El frontend se comunica con el backend a través de llamadas HTTP REST. La configuración está lista en `src/services/api.js`.

## Configuración Actual

### Archivo: `src/services/api.js`

```javascript
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
```

Esto usa la URL definida en el archivo `.env`.

## Servicios Implementados

### 1. Service Base (api.js)

- Configura Axios con baseURL
- Agrega token de autenticación automáticamente
- Maneja errores comunes (401 Unauthorized)

### 2. User Service (userService.js)

Ejemplo de CRUD para usuarios:

```javascript
import userService from "../services/userService";

// Obtener todos los usuarios
const users = await userService.getAllUsers();

// Obtener usuario por ID
const user = await userService.getUserById(1);

// Crear usuario
const newUser = await userService.createUser({
  name: "Juan",
  email: "juan@example.com",
  password: "password123",
});

// Actualizar usuario
const updated = await userService.updateUser(1, {
  name: "Juan Pérez",
});

// Eliminar usuario
await userService.deleteUser(1);
```

## Crear un Nuevo Servicio

Sigue este patrón para crear servicios adicionales:

```javascript
// src/services/productService.js
import apiClient from "./api";

const productService = {
  getAllProducts: async () => {
    try {
      const response = await apiClient.get("/products");
      return response.data;
    } catch (error) {
      console.error("Error fetching products:", error);
      throw error;
    }
  },

  getProductById: async (productId) => {
    try {
      const response = await apiClient.get(`/products/${productId}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching product:", error);
      throw error;
    }
  },

  createProduct: async (productData) => {
    try {
      const response = await apiClient.post("/products", productData);
      return response.data;
    } catch (error) {
      console.error("Error creating product:", error);
      throw error;
    }
  },

  updateProduct: async (productId, productData) => {
    try {
      const response = await apiClient.put(
        `/products/${productId}`,
        productData,
      );
      return response.data;
    } catch (error) {
      console.error("Error updating product:", error);
      throw error;
    }
  },

  deleteProduct: async (productId) => {
    try {
      const response = await apiClient.delete(`/products/${productId}`);
      return response.data;
    } catch (error) {
      console.error("Error deleting product:", error);
      throw error;
    }
  },
};

export default productService;
```

## Usar un Servicio en un Componente

### Ejemplo con React Hooks

```javascript
import React, { useState, useEffect } from "react";
import userService from "../services/userService";

function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await userService.getAllUsers();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p>Cargando...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div>
      <h1>Usuarios</h1>
      <ul>
        {users.map((user) => (
          <li key={user.id}>
            {user.name} - {user.email}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default UserList;
```

## Estructura de Respuestas del Backend

El backend debe devolver respuestas JSON estructuradas:

```json
{
  "success": true,
  "message": "Operación exitosa",
  "data": {
    "id": 1,
    "name": "Usuario",
    "email": "usuario@example.com"
  }
}
```

Para errores:

```json
{
  "success": false,
  "message": "Error en la operación",
  "error": "Detalles del error"
}
```

## Manejo de Errores

### Estados de HTTP Comunes

- **200 OK**: Éxito
- **201 Created**: Recurso creado exitosamente
- **400 Bad Request**: Solicitud inválida
- **401 Unauthorized**: No autenticado
- **403 Forbidden**: No autorizado
- **404 Not Found**: Recurso no encontrado
- **500 Server Error**: Error del servidor

### Manejo en el Código

```javascript
try {
  const response = await apiClient.get("/endpoint");
  // Manejar éxito
} catch (error) {
  if (error.response) {
    // El servidor respondió con un código de error
    console.error("Status:", error.response.status);
    console.error("Data:", error.response.data);
  } else if (error.request) {
    // La solicitud se realizó pero no se recibió respuesta
    console.error("No response received");
  } else {
    // Error en la configuración de la solicitud
    console.error("Error:", error.message);
  }
}
```

## Autenticación y Token

El token se agrega automáticamente a todas las solicitudes:

```javascript
// Cuando el usuario inicia sesión, guarda el token:
localStorage.setItem("token", tokenDelBackend);

// El interceptor lo agrega a cada solicitud:
// Authorization: Bearer <token>
```

## Variables de Entorno

Edita tu `.env`:

```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_API_TIMEOUT=5000
```

Para usar una variable de entorno en el código:

```javascript
const apiUrl = process.env.REACT_APP_API_URL;
const timeout = process.env.REACT_APP_API_TIMEOUT || 5000;
```

**Nota**: Las variables deben comenzar con `REACT_APP_` para ser accesibles en el frontend.

## Testing de API

Usa **Thunder Client**, **Postman**, o **REST Client** para probar endpoints:

### Ejemplo con Thunder Client

```
GET http://localhost:5000/api/users
Authorization: Bearer <tu-token>
```

## Endpoints Esperados del Backend

```
GET    /api/users           - Obtener todos los usuarios
GET    /api/users/:id       - Obtener usuario por ID
POST   /api/users           - Crear nuevo usuario
PUT    /api/users/:id       - Actualizar usuario
DELETE /api/users/:id       - Eliminar usuario

GET    /api/products        - Obtener todos los productos
POST   /api/products        - Crear producto
PUT    /api/products/:id    - Actualizar producto
DELETE /api/products/:id    - Eliminar producto

POST   /api/auth/login      - Login
POST   /api/auth/register   - Registro
POST   /api/auth/logout     - Logout
```

Estos son ejemplos. Adapta según tu backend real.

## Proxies para Desarrollo

Si tienes problemas CORS, puedes configurar un proxy en `package.json`:

```json
{
  "proxy": "http://localhost:5000"
}
```

Luego usa URLs relativas en el código:

```javascript
// En lugar de:
apiClient.get("http://localhost:5000/api/users");

// Usa:
apiClient.get("/api/users");
```

---

Para más información sobre Axios, consulta: [axios-http.com](https://axios-http.com)
