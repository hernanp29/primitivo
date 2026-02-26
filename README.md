# PRIMITIVO — Guía de migración a otra cuenta

## Archivos del proyecto

```
/
├── index.html              ← Sitio web (todos los valores vienen de CONFIG)
├── api/
│   └── crear-preferencia.js ← API de MercadoPago (lee .env)
├── .env                    ← 🔐 Variables secretas (NO subir a Git)
└── .gitignore              ← Asegurate que incluya ".env"
```

---

## ¿Cómo migrar a otra cuenta?

### 1. MercadoPago (el más importante)

1. Entrá a [mercadopago.com.ar/developers/panel](https://www.mercadopago.com.ar/developers/panel)
2. Creá una nueva aplicación o usá una existente
3. Copiá el **Access Token de producción**
4. Pegalo en `.env`:
   ```
   MP_ACCESS_TOKEN=APP_USR-TU-NUEVO-TOKEN-ACA
   ```
5. En Vercel: **Settings → Environment Variables** → agregá `MP_ACCESS_TOKEN`

### 2. URL del sitio

Si cambiás el dominio (ej: de `primitivo-ten.vercel.app` a tu propio dominio):
```
SITE_URL=https://tu-nuevo-dominio.com
```
En Vercel también agregala como variable de entorno.

### 3. WhatsApp

Cambiá el número en `.env` y en `CONFIG` dentro de `index.html`:
```
WHATSAPP_NUMBER=5491100000000   ← formato: código país + número sin espacios
```
Y en `index.html` buscá el bloque `CONFIG` al inicio del `<script>`:
```js
whatsappNumber: "5491100000000",
whatsappLink:   "https://wa.link/TU-LINK",
```

### 4. Redes sociales

En `index.html`, bloque `CONFIG`:
```js
instagram:    "https://www.instagram.com/NUEVA_CUENTA",
facebook:     "https://www.facebook.com/NUEVA_CUENTA",
tiktok:       "https://www.tiktok.com/@NUEVA_CUENTA",
whatsappLink: "https://wa.link/NUEVO_LINK",
```

### 5. Google Sheets (catálogo de tienda y portafolio)

1. Creá tu propio Google Sheet con las mismas columnas
2. **Archivo → Compartir → Publicar en la web**
3. Elegí la pestaña → CSV → Publicar → Copiá el enlace
4. Actualizá en `index.html`, bloque `CONFIG`:
   ```js
   sheets: {
     tienda:     "TU_URL_CSV_TIENDA",
     portafolio: "TU_URL_CSV_PORTAFOLIO"
   }
   ```

### 6. AppSheet (imágenes)

Si usás AppSheet para servir imágenes:
1. Creá tu app en [appsheet.com](https://www.appsheet.com)
2. Copiá el App ID desde **Manage → Integrations**
3. Actualizá en `index.html`, bloque `CONFIG`:
   ```js
   appsheetAppId: "TU-APP-ID"
   ```

---

## Deploy en Vercel

```bash
# 1. Instalá Vercel CLI (si no lo tenés)
npm i -g vercel

# 2. Desde la carpeta del proyecto
vercel

# 3. Configurá las variables de entorno en el dashboard
#    vercel.com → Tu proyecto → Settings → Environment Variables
#    Agregá: MP_ACCESS_TOKEN y SITE_URL
```

### Variables que van en Vercel (no en .env del repo)

| Variable         | Descripción                        |
|------------------|------------------------------------|
| `MP_ACCESS_TOKEN`| Token secreto de MercadoPago       |
| `SITE_URL`       | URL pública del sitio              |

---

## .gitignore recomendado

```
.env
.env.local
node_modules/
.vercel/
```

---

> ⚠️ **Nunca subas `.env` a GitHub.** Contiene claves privadas.
