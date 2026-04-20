# Proyecto MEDISTOCK - API RESTful

## Descripción
Este repositorio ("Integracion") contiene la interfaz web y la integración con Supabase y Webpay para un sistema de gestión / e-commerce orientado a una distribuidora (catálogo, checkout, gestión por roles). La parte presente en este repo es principalmente frontend (HTML/CSS/JavaScript) que consume servicios y tablas alojadas en Supabase (Postgres) y gestiona pagos mediante Webpay.

## Stack Tecnológico
* **Lenguaje:** JavaScript (Vanilla) + HTML/CSS
* **Framework:** Ninguno (Frontend está hecho con HTML/CSS/JS puro)
* **Base de Datos:** Supabase (PostgreSQL)
* **Herramientas de Construcción:** n/a (se puede servir con un servidor estático como http-server o Live Server)

## Estructura de Carpetas
Explicación breve de la organización de la base de código (adaptada al repositorio actual):

* `controller/` (conceptual): Las responsabilidades de "controlador" están implementadas en archivos JS del frontend:
  * `app.js`, `auth.js` — manejo de autenticación, inicio de sesión, registro y redirección por rol.
  * `checkout.js` — lógica del flujo de checkout y manejo del carrito.
* `service/` (conceptual): Integraciones y utilidades:
  * `supabaseClient.js` — cliente y configuración de Supabase (URL + ANON KEY).
  * llamadas a Supabase (`.from(...)`) están repartidas en los archivos JS.
* `repository/` (conceptual): Migraciones y esquema:
  * `supabase_migrations.sql` — scripts de creación / migración de tablas para la base de datos en Supabase.
* `model/` (conceptual): El modelado de datos se encuentra en las tablas y migraciones SQL (ver `supabase_migrations.sql`). Entidades esperadas: `usuarios`, `productos`, `pedidos`, `roles`, etc.
* Archivos principales en la raíz del proyecto (frontend):
  * `index.html` — Login / registro
  * `catalogo.html` — Catálogo de productos
  * `checkout.html` — Checkout / pago
  * `ejecutivo.html`, `finanzas.html`, `terminal-logistica.html`, `verificacion.html`, `webpay-retorno.html`
  * `style.css` — Estilos globales
  * `app.js`, `auth.js`, `checkout.js`, `supabaseClient.js`, `supabase_migrations.sql`
  * `files/` — carpeta para archivos generados / recursos


## Documentación de Arquitectura (Modelo 4+1)
Acceso a los diagramas de despliegue, comunicación y paquetes:
* Carpeta drive con fotos y documentos del proyrcto: https://drive.google.com/drive/folders/123ICRlwOFMrSN4XPyjyDSi18XZcwC_j7?hl=es-419
  
## Configuración e Instalación
1. Clonar el repositorio:
```bash
git clone https://github.com/Gamabuntasan/Integracion.git
cd Integracion





