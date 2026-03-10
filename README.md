# 💒 Boda Cristina & Joan - Vercel Deployment

Aplicación web para confirmación de asistencia (RSVP) a la boda. Optimizada para despliegue en Vercel con Postgres.

## 🚀 Despliegue Rápido en Vercel

### 1. Preparar el Repositorio

```bash
cd /home/jcarrio/tfm/boda
git add .
git commit -m "Preparar para Vercel deployment"
git push origin main
```

### 2. Importar en Vercel

1. Ve a [vercel.com](https://vercel.com)
2. Click en **"Add New..."** → **"Project"**
3. Importa tu repositorio de GitHub: `jcarrio18/boda`
4. Vercel detectará automáticamente la configuración de Vite
5. Click en **"Deploy"**

### 3. Configurar Base de Datos

Después del primer despliegue:

1. En tu proyecto de Vercel, ve a la pestaña **Storage**
2. Click en **"Create Database"** → **"Postgres"**
3. Sigue el asistente (gratis para proyectos pequeños)
4. Vercel conectará automáticamente la base de datos a tu proyecto

Las siguientes variables de entorno se añadirán automáticamente:
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

### 4. Inicializar la Base de Datos

Una vez desplegado y con la base de datos configurada:

1. **Añadir token de admin** (recomendado):
   - Ve a **Settings** → **Environment Variables**
   - Añade: `ADMIN_TOKEN` = `tu-password-secreto-123`
   - Redeploy el proyecto

2. **Crear la tabla**:
   - Visita: `https://tu-dominio.vercel.app/api/init-db`
   - Añade header: `Authorization: Bearer tu-password-secreto-123`
   
   O usa curl:
   ```bash
   curl -H "Authorization: Bearer tu-password-secreto-123" \
        https://tu-dominio.vercel.app/api/init-db
   ```

   Deberías ver:
   ```json
   {
     "success": true,
     "message": "Database initialized successfully..."
   }
   ```

### 5. ¡Listo! 🎉

Tu aplicación estará disponible en: `https://tu-proyecto.vercel.app`

## 📡 Endpoints API

### `POST /api/rsvp`
Guardar una confirmación de asistencia

**Body:**
```json
{
  "name": "Nombre Completo",
  "email": "email@ejemplo.com",
  "attending": "yes_all",
  "dietary": "Vegetariano",
  "bus_trip": "round_trip_1",
  "songs": "Canción favorita",
  "message": "Mensaje para los novios",
  "additional_guests": [
    {
      "name": "Acompañante",
      "dietary": "Ninguna",
      "type": "adult"
    }
  ]
}
```

### `GET /api/rsvps`
Ver todas las confirmaciones (requiere autenticación)

**Headers:**
```
Authorization: Bearer tu-password-secreto-123
```

### `GET /api/init-db`
Inicializar base de datos (ejecutar solo una vez)

**Headers:**
```
Authorization: Bearer tu-password-secreto-123
```

## 🔒 Seguridad

- Todos los endpoints API tienen validación de datos
- `/api/rsvps` y `/api/init-db` están protegidos con token de admin
- La base de datos usa conexiones SSL
- Los emails son únicos (no se permiten duplicados)

## 🛠️ Desarrollo Local

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview
```

## 📊 Ver los RSVPs

Para ver todas las confirmaciones de asistencia:

```bash
curl -H "Authorization: Bearer tu-password-secreto-123" \
     https://tu-dominio.vercel.app/api/rsvps
```

O accede desde el navegador con una extensión que permita añadir headers (como ModHeader).

## 🎨 Personalización

- **Colores y estilos**: Edita los archivos en `src/`
- **Formulario**: `src/components/RSVPForm.tsx`
- **API**: Archivos en `api/`

## 📝 Notas

- La base de datos gratis de Vercel Postgres incluye:
  - 256 MB de almacenamiento
  - 1 GB de transferencia/mes
  - Más que suficiente para una boda

- Si necesitas más capacidad, los planes pagos comienzan desde $20/mes

## 🆘 Troubleshooting

**Error: "Database not configured"**
- Asegúrate de haber creado la base de datos en Vercel Storage
- Verifica que las variables de entorno estén configuradas

**Error: "Unauthorized"**
- Verifica que el header `Authorization` esté correcto
- Revisa la variable de entorno `ADMIN_TOKEN`

**Error al crear la tabla**
- Verifica la conexión de la base de datos
- Revisa los logs en Vercel Dashboard → Functions

## 📞 Soporte

Para problemas, revisa:
- [Documentación de Vercel](https://vercel.com/docs)
- [Vercel Postgres Docs](https://vercel.com/docs/storage/vercel-postgres)
