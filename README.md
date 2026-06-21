# 🌸 Aplicación de Apuntes Académicos

Una aplicación universal para dispositivos móviles y web desarrollada con **React Native** y **Expo** diseñada específicamente para ayudar a estudiantes universitarios a organizar su vida académica. Cuenta con un diseño estético pastel en tonos rosa, soporte para temas (claro y oscuro), y simpáticas mascotas animadas interactivas que te acompañarán durante tus horas de estudio.

---

## ✨ Características Principales

### 🐾 1. Mascotas de Compañía Interactivas (Companion Pets)
* **Compañeros Animados:** Elige entre un esponjoso **Poro ☁️** (de League of Legends) o el tierno **Kirby 🌸** para que caminen y floten en tu pantalla.
* **Comportamiento Autónomo:** Las mascotas caminan aleatoriamente, respiran/flotan de forma constante y expresan burbujas de diálogo con mensajes motivacionales y divertidos sobre el estudio.
* **Mecánica de Arrastre (Draggable):** Puedes arrastrar y soltar a tu mascota en cualquier parte de la pantalla si interrumpe la visualización de algún botón o texto. La burbuja de diálogo y los efectos visuales la seguirán perfectamente.
* **Interacciones al Tocar:** Haz clic o toca a tu mascota para que realice un salto de alegría y emita ráfagas de estrellas ✨ y corazones 💖.

### 📅 2. Calendario Académico Expandido
* **Visualización Completa:** Un calendario mensual interactivo donde se marcan con pequeños badges informativos los exámenes (🎓), evaluaciones (🌟), tareas (📝) y pendientes rápidos (⚡).
* **Organización en Columna:** Un diseño limpio que sitúa la lista de actividades del día seleccionado **directamente debajo del calendario**, adaptándose elegantemente tanto a teléfonos como a tablets (sin divisiones laterales incómodas).
* **Detalles al Instante:** Toca cualquier día para desplegar y revisar al instante todas tus responsabilidades programadas.

### 📝 3. Gestor de Tareas y Pendientes Rápidos
* **Doble Panel Deslizable:** Alterna fácilmente entre tus Tareas formales (con fecha límite) y Pendientes Rápidos redactados al instante.
* **Switch Animado Ultra-Limpio:** Transición fluida impulsada por curvas Bezier cúbicas de alta velocidad que elimina por completo cualquier rebote ("jiggle").
* **Creación y Conversión:** Guarda un pendiente velozmente y conviértelo más tarde en una tarea académica formal asignándole una fecha límite con un solo clic.

### 📊 4. Evaluaciones y Exámenes
* **Clasificación Clara:** Secciones separadas y organizadas cronológicamente para ingresar calificaciones, controles, entregas de proyectos y exámenes finales.
* **Base de Datos Segura:** Todos los registros académicos se sincronizan en tiempo real mediante la integración de base de datos relacional.

### 👤 5. Perfil de Estudiante y Ajustes
* **Personalización:** Modifica tu nombre completo y sube una foto de perfil personalizada desde la galería de tu dispositivo o cámara.
* **Almacenamiento Local Híbrido:** Integración inteligente que respalda tus preferencias de sesión e imagen de perfil localmente de forma segura en Web y dispositivos móviles nativos.
* **Seguridad:** Panel de cambio de contraseña encriptado conectado directamente con el motor de autenticación.

### 💬 6. Sistema de Alertas y Confirmaciones Personalizadas
* **Coherencia Visual:** Se han reemplazado los cuadros de alerta genéricos del navegador y del sistema (`Alert.alert` y `window.confirm`) por **diálogos modales personalizados dentro de la propia aplicación**.
* **Integración de Colores:** Los diálogos de alerta e información adoptan los colores exactos del tema claro y oscuro, mostrando botones de peligro en rojo pastel para acciones destructivas (como eliminar eventos).

---

## 🛠️ Stack Tecnológico

* **Core & Routing:** [React Native](https://reactnative.dev/) & [Expo (v56)](https://expo.dev/) con File-Based Routing mediante [Expo Router](https://docs.expo.dev/router/introduction/).
* **Animaciones:** [React Native Reanimated](https://docs.expo.dev/versions/latest/sdk/reanimated/) para el renderizado suave de traslaciones, botes y gestos interactivos.
* **Componentes de Calendario:** [React Native Calendars](https://github.com/wix/react-native-calendars).
* **Backend como Servicio (BaaS):** [Supabase](https://supabase.com/) (Autenticación de usuarios, base de datos relacional PostgreSQL y almacenamiento persistente).
* **Tipado:** [TypeScript](https://www.typescriptlang.org/) para garantizar la robustez y seguridad del código.

---

## 🚀 Instalación y Configuración Local

Sigue estos pasos para instalar y ejecutar el proyecto en tu máquina local:

### 1. Clonar el repositorio e instalar dependencias
```bash
# Instalar dependencias
npm install
```

### 2. Configurar las variables de entorno
Crea un archivo `.env` en la raíz del proyecto (este archivo está configurado en `.gitignore` para que nunca se suba al repositorio de GitHub):
```env
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto-supabase.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anon-de-supabase
```

### 3. Iniciar el servidor de desarrollo de Expo
```bash
# Iniciar Metro Bundler
npm run start
```

Desde la consola puedes pulsar:
* `a` para abrir en un emulador de **Android**.
* `i` para abrir en el simulador de **iOS**.
* `w` para abrir en el navegador **Web**.

---

## 🔒 Seguridad y Buenas Prácticas
* **Ignorado de Credenciales:** El archivo `.gitignore` está configurado para omitir completamente archivos de desarrollo como `.env`, `.env.local` y carpetas de compilación nativa (`/ios`, `/android`, `.expo/`).
* **Conexión API Segura:** Toda la comunicación con base de datos y autenticación se realiza mediante tokens JWT auto-renovados provistos de forma transparente por Supabase.
