# 🚀 Pasos para Desplegar en Vercel

Sigue estos pasos en orden para desplegar tu aplicación de boda en Vercel.

## ✅ Checklist Pre-Deploy

- [x] Carpeta `api/` creada con funciones serverless
- [x] `package.json` actualizado con `@vercel/postgres`
- [x] `vercel.json` configurado
- [x] `.gitignore` creado
- [x] Dependencias instaladas

## 📋 Instrucciones Paso a Paso

### **Paso 1: Subir a GitHub**

```bash
cd /home/jcarrio/tfm/boda

# Verificar estado
git status

# Añadir todos los cambios
git add .

# Commit
git commit -m "✨ Preparar proyecto para Vercel con Postgres"

# Push a GitHub
git push origin feature1

# Si quieres mergear a main primero:
git checkout main
git merge feature1
git push origin main
```

---

### **Paso 2: Importar en Vercel**

1. 🌐 Ve a **https://vercel.com**
2. 🔑 Inicia sesión con tu cuenta de GitHub
3. ➕ Click en **"Add New..."** → **"Project"**
4. 🔍 Busca tu repositorio: **`jcarrio18/boda`**
5. 📦 Click en **"Import"**
6. ⚙️ Vercel detectará automáticamente:
   - Framework: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
7. 🚀 Click en **"Deploy"**
8. ⏳ Espera 1-2 minutos...
9. ✅ ¡Primera deployment completado!

---

### **Paso 3: Crear Base de Datos Postgres**

1. 📊 En tu proyecto de Vercel, click en la pestaña **"Storage"**
2. ➕ Click en **"Create Database"**
3. 🐘 Selecciona **"Postgres"**
4. 📝 Elige un nombre: `boda-database` (o el que prefieras)
5. 🌍 Selecciona región: **Washington D.C., USA (iad1)** o la más cercana
6. 💰 Plan: **Hobby - Free** (incluye 256 MB, suficiente para tu boda)
7. ✅ Click en **"Create"**
8. 🔗 Click en **"Connect Project"** → Selecciona tu proyecto
9. ✅ Click en **"Connect"**

Vercel añadirá automáticamente estas variables de entorno:
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- Y otras relacionadas...

---

### **Paso 4: Configurar Token de Admin**

1. ⚙️ Ve a **Settings** → **Environment Variables**
2. ➕ Click en **"Add New"**
3. 🔑 Añade:
   - **Key:** `ADMIN_TOKEN`
   - **Value:** `TU_PASSWORD_SUPER_SECRETO_123` (cámbialo por algo seguro)
4. 💾 Click en **"Save"**
5. 🔄 **Redeploy** el proyecto:
   - Ve a **Deployments**
   - Click en los **⋮** del deployment más reciente
   - Click en **"Redeploy"**

---

### **Paso 5: Inicializar la Base de Datos**

Ahora necesitas crear la tabla `rsvps` en tu base de datos:

**Opción A: Usando curl (desde tu terminal)**

```bash
# Reemplaza con tu dominio y token
curl -X GET \
  -H "Authorization: Bearer TU_PASSWORD_SUPER_SECRETO_123" \
  https://tu-proyecto.vercel.app/api/init-db
```

**Opción B: Usando navegador + extensión**

1. Instala una extensión como **ModHeader** en Chrome/Firefox
2. Configura el header:
   - Name: `Authorization`
   - Value: `Bearer TU_PASSWORD_SUPER_SECRETO_123`
3. Visita: `https://tu-proyecto.vercel.app/api/init-db`

**Respuesta esperada:**

```json
{
  "success": true,
  "message": "Database initialized successfully. Table \"rsvps\" created with indexes."
}
```

---

### **Paso 6: ¡Probar! 🎉**

1. 🌐 Visita tu aplicación: `https://tu-proyecto.vercel.app`
2. 📝 Llena el formulario RSVP
3. ✅ Envía una prueba
4. 🔍 Verifica que se guardó:

```bash
curl -H "Authorization: Bearer TU_PASSWORD_SUPER_SECRETO_123" \
     https://tu-proyecto.vercel.app/api/rsvps
```

---

## 🎨 Configurar Dominio Personalizado (Opcional)

Si tienes un dominio (ej: `bodacristinajoan.com`):

1. Ve a **Settings** → **Domains**
2. Añade tu dominio
3. Configura los DNS según las instrucciones de Vercel
4. ✅ En 24-48h tendrás SSL/HTTPS automático

---

## 📊 Ver las Confirmaciones de Asistencia

Usa el endpoint de admin para ver todas las respuestas:

```bash
curl -H "Authorization: Bearer TU_PASSWORD_SUPER_SECRETO_123" \
     https://tu-proyecto.vercel.app/api/rsvps | jq
```

O crea un panel de administración simple en el futuro.

---

## 🆘 Solución de Problemas

### Error: "Cannot find module '@vercel/postgres'"
- ✅ **Solución:** Esto solo ocurre en desarrollo local. En Vercel funcionará perfectamente.

### Error: "Database connection failed"
- ✅ Verifica que creaste la base de datos en Vercel Storage
- ✅ Verifica que las variables de entorno estén configuradas
- ✅ Haz redeploy del proyecto

### Error: "Unauthorized" en /api/init-db
- ✅ Verifica que el header `Authorization` sea correcto
- ✅ Verifica que `ADMIN_TOKEN` esté configurado en Vercel

### El formulario no guarda datos
- ✅ Revisa los logs en Vercel: **Deployments** → Click deployment → **Functions** tab
- ✅ Verifica que ejecutaste `/api/init-db` para crear la tabla

---

## 📞 URLs Importantes

- 🏠 **Tu app:** `https://tu-proyecto.vercel.app`
- 📊 **Panel Vercel:** `https://vercel.com/dashboard`
- 📝 **API RSVP:** `https://tu-proyecto.vercel.app/api/rsvp` (POST)
- 👥 **Ver RSVPs:** `https://tu-proyecto.vercel.app/api/rsvps` (GET + Auth)

---

## ✨ ¡Listo!

Tu página de boda está ahora en producción con:
- ✅ HTTPS automático
- ✅ Base de datos PostgreSQL
- ✅ Backups automáticos
- ✅ CDN global
- ✅ 99.9% uptime
- ✅ Completamente GRATIS (para tu caso de uso)

**¡Disfruta de tu boda! 💒🎉**
