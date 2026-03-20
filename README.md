# SQLens 🔍✨

**SQLens** es una plataforma inteligente diseñada para analistas de soporte Nivel 3. Permite almacenar, buscar y organizar consultas SQL críticas de forma eficiente, potenciada por Inteligencia Artificial para generar sugerencias cuando no se encuentran resultados exactos.

---

## 🛠️ Tecnologías Usadas

- **Frontend**: HTML5, CSS3 (Diseño Glassmorphism Premium), JavaScript Vanilla.
- **Backend**: Node.js & Express.
- **Base de Datos**: PostgreSQL (Soporta Neon.tech y despliegues serverless).
- **IA**: OpenRouter API (Integración con modelos de lenguaje avanzados).
- **Seguridad**: Helmet, CORS y validación de esquemas con Joi.

---

## 🚀 Requisitos Previos

1. **Node.js**: Versión 18 o superior.
2. **PostgreSQL**: Una instancia local o en la nube (ej: [Neon.tech](https://neon.tech)).
3. **OpenRouter API Key**: Para las funcionalidades de IA.

---

## ⚙️ Instalación Local

1. **Clonar el repositorio**:
   ```bash
   git clone <url-del-repo>
   cd SQLens
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**:
   Crea un archivo `.env` en la raíz con lo siguiente:
   ```env
   PORT=3000
   DATABASE_URL=postgresql://usuario:password@localhost:5432/sqlens
   OPENROUTER_API_KEY=tu_api_key_aqui
   AI_MODEL=google/gemini-2.0-flash-exp:free
   ```

4. **Inicializar base de datos**:
   Ejecuta el script de migración inicial para crear las tablas y módulos base:
   ```bash
   node migrate_modules.js
   ```

5. **Lanzar la aplicación**:
   ```bash
   npm run dev
   ```
   Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 📖 Guía Rápida de Uso

1. **Búsqueda Inteligente**: Escribe tu problema (ej: "consultar pedidos bloqueados"). Si la query no existe, la IA generará una para ti basada en el contexto de tu base de datos.
2. **Gestión de Módulos**: Usa el botón ⚙️ para crear categorías personalizadas con iconos y colores sugeridos por IA.
3. **Firma de Autor**: Al guardar una query, añade tu nombre en el campo **Dev Author** para trazabilidad.
4. **Confirmación Segura**: SQLens incluye diálogos de confirmación premium antes de cualquier eliminación permanente.

---

## 🌐 Despliegue en Producción

Recomendamos **Render.com** para el servidor y **Neon.tech** para la base de datos.
> Consulta la [Guía de Despliegue Detallada](./brain/deployment_guide.md) para más información.
