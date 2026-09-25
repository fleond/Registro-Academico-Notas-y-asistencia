# 🚀 Guía de Despliegue en Servidor WAMP (MySQL + Apache + PHP)

Esta carpeta contiene la API PHP nativa y el script SQL listos para correr el sistema directamente en tu servidor **WAMP Server**.

---

## 📋 Requisitos Previos en Windows
1. Tener **WAMP Server** instalado y corriendo (el icono en la barra de tareas de Windows debe estar en **Verde**).
2. Tener acceso a **phpMyAdmin** (`http://localhost/phpmyadmin`).
3. Por defecto en WAMP:
   - **Host:** `localhost` o `127.0.0.1`
   - **Puerto:** `3306` (o `3308` si usas MariaDB)
   - **Usuario:** `root`
   - **Contraseña:** *(vacía / en blanco)*

---

## 🛠️ Paso a Paso para la Migración

### Paso 1: Crear la Base de Datos en phpMyAdmin
1. Abre tu navegador e ingresa a `http://localhost/phpmyadmin`.
2. Inicia sesión con usuario `root` y sin contraseña.
3. Haz clic en **"Nueva"** (en el panel izquierdo).
4. Escribe como nombre de la base de datos: `registro_academico_fleon`.
5. En Cotejamiento / Collation selecciona: `utf8mb4_unicode_ci`.
6. Haz clic en **"Crear"**.

### Paso 2: Importar el Script SQL
1. Con la base de datos `registro_academico_fleon` seleccionada, ve a la pestaña superior **"Importar"**.
2. Haz clic en **"Seleccionar archivo"** y elige el archivo `database_wamp_fleon.sql` (ubicado en la raíz del proyecto o descargado desde la aplicación).
3. Desplázate hacia abajo y haz clic en **"Importar"**.
4. Verás el mensaje verde de éxito confirmando la creación de todas las 14 tablas y vistas.

### Paso 3: Opción A - Usar con Node.js / React (Recomendada)
Si ejecutas el proyecto con `npm run dev` en tu máquina local:
1. En tu archivo `.env` o en la interfaz del sistema, verifica los parámetros:
   ```env
   MYSQL_HOST="localhost"
   MYSQL_PORT="3306"
   MYSQL_USER="root"
   MYSQL_PASSWORD=""
   MYSQL_DATABASE="registro_academico_fleon"
   ```
2. Ejecuta `npm run dev` y la aplicación se conectará automáticamente a tu base de datos MySQL local en WAMP.

### Paso 4: Opción B - Alojar la API PHP en Apache WAMP
Si prefieres que las peticiones se procesen mediante Apache + PHP de WAMP:
1. Copia esta carpeta `wamp_php_api` a la ruta de tu servidor WAMP:
   `C:\wamp64\www\registro_academico_api\`
2. Puedes probar el funcionamiento abriendo en tu navegador:
   `http://localhost/registro_academico_api/?action=status`
3. Si compilas la aplicación React con `npm run build`, puedes copiar los archivos de la carpeta `dist/` a `C:\wamp64\www\registro_academico\` para tener todo el sistema corriendo 100% dentro de tu servidor WAMP sin depender de internet ni de la nube.
