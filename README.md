# 🌸 Aplicación de Apuntes Académicos

Una aplicación universal para dispositivos móviles y web desarrollada con **React Native** y **Expo** diseñada específicamente para ayudar a estudiantes universitarios a organizar su vida académica. Cuenta con un diseño estético pastel en tonos rosa, soporte para temas (claro y oscuro), y simpáticas mascotas animadas interactivas que te acompañarán durante tus horas de estudio.

---

## ✨ Características Principales

### 🐾 1. Mascotas de Compañía Interactivas (Companion Pets)
* **Compañeros Animados:** Elige a tu compañero de estudio favorito entre una tierna variedad:
  * **Poro ☁️** (El esponjoso guardián del Abismo de los Lamentos de League of Legends)
  * **Kirby 🌸** (El glotón y tierno héroe rosa de Nintendo)
  * **Junimo 🌿** (El espíritu guardián del bosque de Stardew Valley)
  * **Kyubey 🌟** (El misterioso mensajero mágico de Madoka Magica)
  * **Morpeko (Full Belly) 🐹** (La forma simpática y hambrienta de este Pokémon)
  * **Morpeko (Hangry) 😡** (La versión molesta y oscura de Morpeko cuando tiene hambre)
  * **Napstablook 👻** (El fantasma melómano e introvertido de Undertale)
* **Comportamiento Autónomo:** Las mascotas caminan de forma aleatoria por la pantalla, respiran/flotan de forma constante y muestran burbujas de diálogo personalizadas con frases motivacionales o divertidas específicas de su universo.
* **Mecánica de Arrastre (Draggable):** Si la mascota bloquea algún botón, puedes arrastrarla libremente a cualquier rincón de la pantalla. La burbuja de diálogo y los efectos la seguirán fluidamente.
* **Interacciones al Tocar:** Toca a tu mascota para ver un divertido salto de alegría acompañado de un efecto festivo de estrellas ✨ y corazones 💖.

### 📅 2. Calendario Académico Inteligente
* **Visualización Mensual:** Un calendario interactivo completo donde cada día muestra badges informativos según su tipo de actividad: exámenes (🎓), evaluaciones (🌟), tareas (📝) y pendientes rápidos (⚡).
* **Diseño Responsivo Unificado:** El listado detallado de actividades del día seleccionado se despliega directamente debajo del calendario, optimizando el espacio tanto en pantallas móviles como en tablets sin molestas divisiones.

### 📝 3. Gestor de Tareas y Pendientes Rápidos
* **Doble Panel Deslizable:** Alterna fácilmente entre tus Tareas formales (con fecha límite) y Pendientes Rápidos con un switch animado de alta precisión (curvas Bezier) libre de rebotes ("jiggle").
* **Creación y Conversión:** Registra una idea o pendiente en un segundo y conviértelo más tarde en una tarea académica formal con fecha de entrega con un solo toque.

### 📊 4. Planificador de Evaluaciones y Exámenes
* **Clasificación Cronológica:** Secciones dedicadas para controles, proyectos, entregas y exámenes finales de tus asignaturas.
* **Base de Datos Relacional:** Almacenamiento seguro sincronizado en tiempo real mediante integración con Supabase.

### 🚨 5. Recordatorios y Notificaciones Locales Automáticas
* **Recordatorios Inteligentes:** Mediante `expo-notifications`, la aplicación programa alertas automáticas en tu dispositivo para avisarte sobre tus exámenes y evaluaciones:
  * **7 días antes** a las 9:00 AM 📅
  * **1 día antes** a las 9:00 AM (¡Mañana es el día!) 🚨

### 📱 6. Widgets Interactivos para la Pantalla de Inicio (Android)
* **Acceso desde el Escritorio:** Soporte nativo para Widgets interactivos mediante `react-native-android-widget`:
  * **CalendarWidgetPhone**: Versión vertical optimizada para teléfonos móviles.
  * **CalendarWidgetTablet**: Versión expandida ideal para tablets.
* **Interactividad en Tiempo Real:** Revisa tu calendario semanal, cambia de día directamente desde el widget y visualiza las actividades pendientes sin abrir la aplicación.
* **Sincronización en Segundo Plano:** Los widgets leen la sesión de Supabase de manera segura mediante `SecureStore` y se actualizan automáticamente al realizar cambios dentro de la app o añadir nuevas notas rápidas.

### 🔗 7. Enlaces Profundos (Deep Linking)
* **Añadido Veloz:** Al tocar el botón de añadir (+) en el Widget de Android, se ejecuta el protocolo `fastnotes://quick-add-modal` para abrir la app al instante con un modal flotante listo para recibir texto de inmediato.

### 🚀 8. Actualizaciones Automáticas Over-The-Air (OTA)
* **Buscador de Versiones:** La aplicación se conecta al repositorio remoto de GitHub (`version.json`) para comprobar si existe una nueva compilación del APK.
* **Pantalla de Actualización:** Si hay una versión más reciente disponible, muestra un modal con el historial de cambios (*changelog*) y un acceso directo para descargar e instalar el nuevo APK.

### 🎨 9. Soporte de Temas (Claro y Oscuro)
* **Personalización Visual:** Alterna entre el **Modo Claro ☀️** (con tonos rosas pastel relajantes) y el **Modo Oscuro 🌙** (tonos uva y morado oscuro suaves para descansar la vista de noche), con opción de ajuste automático basado en el sistema operativo.

### 🔒 10. Perfil de Estudiante y Seguridad
* **Gestión de Perfil:** Personaliza tu nombre y tu avatar de perfil utilizando imágenes de la galería o de la cámara, persistidos mediante un sistema híbrido (local y remoto) para asegurar el funcionamiento sin conexión.
* **Autenticación Robusta:** Conexión directa a Supabase Auth para un inicio de sesión seguro, registro y panel encriptado de cambio de contraseña.

### 💬 11. Diálogos Modales Personalizados
* **Estilo Coherente:** Alertas y diálogos de confirmación completamente rediseñados integrando la paleta de colores del tema activo, reemplazando las ventanas emergentes nativas del sistema (`Alert.alert` y `window.confirm`).

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
