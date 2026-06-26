# Guía de Migración: De Backend Supabase a Almacenamiento 100% Local (SQLite) con Backups

Este documento detalla los pasos técnicos y el diseño de arquitectura necesarios para migrar la aplicación actual (Expo v56) a un entorno 100% offline y local. Se eliminan las dependencias del backend de Supabase y se implementa una base de datos local SQLite, junto con funciones para exportar/importar copias de seguridad en formato JSON (localmente o en Google Drive).

---

## Índice
1. [Fase 1: Clonación Limpia del Proyecto](#fase-1-clonación-limpia-del-proyecto)
2. [Fase 2: Limpieza de Dependencias y Archivos Obsoletos](#fase-2-limpieza-de-dependencias-y-archivos-obsoletos)
3. [Fase 3: Instalación de Dependencias Locales](#fase-3-instalación-de-dependencias-locales)
4. [Fase 4: Diseño e Implementación de la Base de Datos Local (`localDb.ts`)](#fase-4-diseño-e-implementación-de-la-base-de-datos-local-localdbts)
5. [Fase 5: Adaptación de la Autenticación y Flujo de Navegación (`auth.tsx`)](#fase-5-adaptación-de-la-autenticación-y-flujo-de-navegación-authtx)
6. [Fase 6: Refactorización de las Pantallas de la Aplicación](#fase-6-refactorización-de-las-pantallas-de-la-aplicación)
7. [Fase 7: Implementación del Sistema de Copias de Seguridad (Exportar / Importar)](#fase-7-implementación-del-sistema-de-copias-de-seguridad-exportar--importar)
8. [Fase 8: Modificación de la Interfaz de Usuario en Configuraciones (`settings.tsx`)](#fase-8-modificación-de-la-interfaz-de-usuario-en-configuraciones-settingstx)

---

## Fase 1: Clonación Limpia del Proyecto

Para crear un clon independiente llamado `apuntes-u-locales`, ejecuta los siguientes pasos para evitar copiar dependencias pesadas y archivos de compilación temporales:

1. Crea la carpeta de destino:
   ```powershell
   mkdir ../apuntes-u-locales
   ```
2. Copia de forma recursiva excluyendo directorios pesados (`node_modules`, `.expo`, `.git`, `android/build`, etc.):
   En Windows (PowerShell):
   ```powershell
   Copy-Item -Path .\* -Destination ..\apuntes-u-locales -Recururse -Exclude "node_modules", ".expo", ".git", "android", "ios"
   ```
   *Nota: Si necesitas mantener la estructura nativa para compilaciones (`android` e `ios`), cópialas, pero asegúrate de eliminar los directorios temporales de compilación (`android/app/build`, etc.) previamente.*

---

## Fase 2: Limpieza de Dependencias y Archivos Obsoletos

1. **Eliminar variables de entorno y configs de Supabase**:
   - Borra el archivo `src/lib/supabase.ts`.
   - Elimina las variables `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` de cualquier archivo `.env`.
   
2. **Limpiar package.json**:
   - Abre `package.json` y elimina la línea de `"@supabase/supabase-js"`.
   - Elimina la carpeta `node_modules` y el archivo `package-lock.json` del nuevo directorio para forzar una instalación limpia posterior.

3. **Eliminar vistas de Autenticación Externa**:
   - Dado que la app será 100% local, las pantallas `src/app/auth/login.tsx` y `src/app/auth/register.tsx` ya no son necesarias. Puedes borrarlas o archivarlas.

---

## Fase 3: Instalación de Dependencias Locales

Desde la raíz del nuevo proyecto `apuntes-u-locales`, ejecuta el comando de instalación de Expo para garantizar versiones compatibles con SDK 56:

```bash
npx expo install expo-sqlite expo-file-system expo-sharing expo-document-picker
```

*Opcional para Google Drive*:
Para soportar la exportación e importación con Google Drive desde el dispositivo del usuario sin servidor intermedio, instala el SDK oficial de autenticación de Google y cliente HTTP:
```bash
npx expo install @react-native-google-signin/google-signin
```

---

## Fase 4: Diseño e Implementación de la Base de Datos Local (`localDb.ts`)

Crea el archivo `src/lib/localDb.ts` para manejar la inicialización del esquema y las consultas SQL. Usaremos la versión asíncrona moderna de `expo-sqlite`.

```typescript
import * as SQLite from 'expo-sqlite';

// Nombre de la base de datos
const DB_NAME = 'apuntes_u_local.db';

export interface LocalTask {
  id: string;
  description: string;
  due_date: string;
  completed: number; // 0 o 1 en SQLite
  user_id: string;
}

export interface LocalPending {
  id: string;
  description: string;
  created_at: string;
  user_id: string;
}

export interface LocalEvaluation {
  id: string;
  description: string;
  evaluation_date: string;
  user_id: string;
}

export interface LocalExam {
  id: string;
  description: string;
  exam_date: string;
  user_id: string;
}

export interface LocalProfile {
  id: string;
  full_name: string;
  avatar_url: string;
}

let dbInstance: SQLite.SQLiteDatabase | null = null;

// Inicializa la base de datos y crea las tablas si no existen
export const getDb = async (): Promise<SQLite.SQLiteDatabase> => {
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabaseAsync(DB_NAME);

  // Crear tablas
  await dbInstance.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      full_name TEXT,
      avatar_url TEXT
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      due_date TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      user_id TEXT DEFAULT 'local-user'
    );

    CREATE TABLE IF NOT EXISTS pendings (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL,
      user_id TEXT DEFAULT 'local-user'
    );

    CREATE TABLE IF NOT EXISTS evaluations (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      evaluation_date TEXT NOT NULL,
      user_id TEXT DEFAULT 'local-user'
    );

    CREATE TABLE IF NOT EXISTS exams (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      exam_date TEXT NOT NULL,
      user_id TEXT DEFAULT 'local-user'
    );
  `);

  // Insertar un perfil por defecto si está vacío
  const defaultProfile = await dbInstance.getFirstAsync<LocalProfile>('SELECT * FROM profiles WHERE id = ?', 'local-user');
  if (!defaultProfile) {
    await dbInstance.runAsync(
      'INSERT INTO profiles (id, full_name, avatar_url) VALUES (?, ?, ?)',
      'local-user',
      'Estudiante Local',
      ''
    );
  }

  return dbInstance;
};

// Servicio de persistencia encapsulado
export const localDb = {
  // --- PERFIL ---
  getProfile: async (): Promise<LocalProfile | null> => {
    const db = await getDb();
    return db.getFirstAsync<LocalProfile>('SELECT * FROM profiles WHERE id = ?', 'local-user');
  },
  updateProfile: async (fullName: string, avatarUrl: string): Promise<void> => {
    const db = await getDb();
    await db.runAsync(
      'UPDATE profiles SET full_name = ?, avatar_url = ? WHERE id = ?',
      fullName,
      avatarUrl,
      'local-user'
    );
  },

  // --- TAREAS (tasks) ---
  getTasks: async (): Promise<LocalTask[]> => {
    const db = await getDb();
    return db.getAllAsync<LocalTask>('SELECT * FROM tasks ORDER BY due_date ASC');
  },
  insertTask: async (task: Omit<LocalTask, 'user_id'>): Promise<void> => {
    const db = await getDb();
    await db.runAsync(
      'INSERT INTO tasks (id, description, due_date, completed, user_id) VALUES (?, ?, ?, ?, ?)',
      task.id,
      task.description,
      task.due_date,
      task.completed,
      'local-user'
    );
  },
  updateTaskCompletion: async (id: string, completed: boolean): Promise<void> => {
    const db = await getDb();
    await db.runAsync('UPDATE tasks SET completed = ? WHERE id = ?', completed ? 1 : 0, id);
  },
  deleteTask: async (id: string): Promise<void> => {
    const db = await getDb();
    await db.runAsync('DELETE FROM tasks WHERE id = ?', id);
  },

  // --- PENDIENTES (pendings) ---
  getPendings: async (): Promise<LocalPending[]> => {
    const db = await getDb();
    return db.getAllAsync<LocalPending>('SELECT * FROM pendings ORDER BY created_at DESC');
  },
  insertPending: async (pending: Omit<LocalPending, 'user_id'>): Promise<void> => {
    const db = await getDb();
    await db.runAsync(
      'INSERT INTO pendings (id, description, created_at, user_id) VALUES (?, ?, ?, ?)',
      pending.id,
      pending.description,
      pending.created_at,
      'local-user'
    );
  },
  deletePending: async (id: string): Promise<void> => {
    const db = await getDb();
    await db.runAsync('DELETE FROM pendings WHERE id = ?', id);
  },

  // --- EVALUACIONES (evaluations) ---
  getEvaluations: async (): Promise<LocalEvaluation[]> => {
    const db = await getDb();
    return db.getAllAsync<LocalEvaluation>('SELECT * FROM evaluations ORDER BY evaluation_date ASC');
  },
  insertEvaluation: async (evalItem: Omit<LocalEvaluation, 'user_id'>): Promise<void> => {
    const db = await getDb();
    await db.runAsync(
      'INSERT INTO evaluations (id, description, evaluation_date, user_id) VALUES (?, ?, ?, ?)',
      evalItem.id,
      evalItem.description,
      evalItem.evaluation_date,
      'local-user'
    );
  },
  deleteEvaluation: async (id: string): Promise<void> => {
    const db = await getDb();
    await db.runAsync('DELETE FROM evaluations WHERE id = ?', id);
  },

  // --- EXÁMENES (exams) ---
  getExams: async (): Promise<LocalExam[]> => {
    const db = await getDb();
    return db.getAllAsync<LocalExam>('SELECT * FROM exams ORDER BY exam_date ASC');
  },
  insertExam: async (exam: Omit<LocalExam, 'user_id'>): Promise<void> => {
    const db = await getDb();
    await db.runAsync(
      'INSERT INTO exams (id, description, exam_date, user_id) VALUES (?, ?, ?, ?)',
      exam.id,
      exam.description,
      exam.exam_date,
      'local-user'
    );
  },
  deleteExam: async (id: string): Promise<void> => {
    const db = await getDb();
    await db.runAsync('DELETE FROM exams WHERE id = ?', id);
  },

  // --- OBTENER TODOS LOS DATOS PARA COPIA DE SEGURIDAD ---
  getAllDataBackup: async () => {
    const db = await getDb();
    const tasks = await db.getAllAsync('SELECT * FROM tasks');
    const pendings = await db.getAllAsync('SELECT * FROM pendings');
    const evaluations = await db.getAllAsync('SELECT * FROM evaluations');
    const exams = await db.getAllAsync('SELECT * FROM exams');
    const profile = await db.getFirstAsync('SELECT * FROM profiles WHERE id = ?', 'local-user');

    return {
      version: 1,
      timestamp: new Date().toISOString(),
      data: {
        profile,
        tasks,
        pendings,
        evaluations,
        exams,
      }
    };
  },

  // --- RESTAURAR COPIA DE SEGURIDAD ---
  restoreBackup: async (backupJson: any): Promise<void> => {
    const db = await getDb();

    if (!backupJson || backupJson.version !== 1 || !backupJson.data) {
      throw new Error('Estructura de respaldo inválida.');
    }

    const { profile, tasks, pendings, evaluations, exams } = backupJson.data;

    // Transacción atómica
    await db.withTransactionAsync(async () => {
      // Limpiar tablas actuales
      await db.runAsync('DELETE FROM tasks');
      await db.runAsync('DELETE FROM pendings');
      await db.runAsync('DELETE FROM evaluations');
      await db.runAsync('DELETE FROM exams');
      await db.runAsync('DELETE FROM profiles');

      // Restaurar Perfil
      if (profile) {
        await db.runAsync(
          'INSERT INTO profiles (id, full_name, avatar_url) VALUES (?, ?, ?)',
          profile.id || 'local-user',
          profile.full_name || 'Estudiante Local',
          profile.avatar_url || ''
        );
      }

      // Restaurar Tareas
      if (Array.isArray(tasks)) {
        for (const t of tasks) {
          await db.runAsync(
            'INSERT INTO tasks (id, description, due_date, completed, user_id) VALUES (?, ?, ?, ?, ?)',
            t.id, t.description, t.due_date, t.completed ? 1 : 0, t.user_id || 'local-user'
          );
        }
      }

      // Restaurar Pendientes
      if (Array.isArray(pendings)) {
        for (const p of pendings) {
          await db.runAsync(
            'INSERT INTO pendings (id, description, created_at, user_id) VALUES (?, ?, ?, ?)',
            p.id, p.description, p.created_at, p.user_id || 'local-user'
          );
        }
      }

      // Restaurar Evaluaciones
      if (Array.isArray(evaluations)) {
        for (const ev of evaluations) {
          await db.runAsync(
            'INSERT INTO evaluations (id, description, evaluation_date, user_id) VALUES (?, ?, ?, ?)',
            ev.id, ev.description, ev.evaluation_date || ev.date, ev.user_id || 'local-user'
          );
        }
      }

      // Restaurar Exámenes
      if (Array.isArray(exams)) {
        for (const ex of exams) {
          await db.runAsync(
            'INSERT INTO exams (id, description, exam_date, user_id) VALUES (?, ?, ?, ?)',
            ex.id, ex.description, ex.exam_date || ex.date, ex.user_id || 'local-user'
          );
        }
      }
    });
  }
};
```

---

## Fase 5: Adaptación de la Autenticación y Flujo de Navegación (`auth.tsx`)

Dado que ya no dependemos de Supabase Auth, simplificaremos `src/context/auth.tsx` para suministrar un usuario simulado constante en todo momento. Esto evitará romper componentes que dependen del objeto `user`.

Modifica `src/context/auth.tsx` con la siguiente estructura:

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';

interface LocalUser {
  id: string;
  email: string;
}

interface AuthContextType {
  session: any | null;
  user: LocalUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: {},
  user: { id: 'local-user', email: 'local@device.com' },
  loading: false,
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<LocalUser | null>({ id: 'local-user', email: 'local@device.com' });
  const [loading, setLoading] = useState(false);

  const signOut = async () => {
    // Si la app es 100% local, el sign out simplemente puede limpiar variables locales
    // o eliminarse el botón. Mantenemos el método vacío para evitar errores de compilación.
    console.log('Sesión local sin salida necesaria.');
  };

  return (
    <AuthContext.Provider value={{ session: {}, user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

*Nota: Asegúrate de que en tu enrutador (`src/app/_layout.tsx` o similar), si se redirigía a `/auth/login` cuando `session` o `user` eran nulos, se elimine esa lógica y se permita la navegación directa al grupo `(app)`.*

---

## Fase 6: Refactorización de las Pantallas de la Aplicación

Para cada pantalla de datos (`tasks.tsx`, `evaluations.tsx`, `exams.tsx`, `index.tsx`, `calendar.tsx`), debes reemplazar las llamadas a `supabase` por el cliente `localDb`.

### Ejemplo 1: Tareas (`tasks.tsx`)
*Antes (Supabase)*:
```typescript
const { data, error } = await supabase
  .from('tasks')
  .select('*')
  .eq('user_id', user.id);
```
*Después (SQLite)*:
```typescript
import { localDb } from '@/lib/localDb';

// Para obtener:
const data = await localDb.getTasks();

// Para insertar:
const newId = Platform.OS === 'web' ? Math.random().toString() : Crypto.randomUUID(); // O un id secuencial/aleatorio
await localDb.insertTask({
  id: newId,
  description: desc,
  due_date: taskDate,
  completed: 0 // false
});

// Para togglear completado:
await localDb.updateTaskCompletion(task.id, !task.completed);
```

### Ejemplo 2: Calendario (`calendar.tsx`)
Reemplaza las promesas que consultan múltiples colecciones simultáneamente:
*Antes (Supabase)*:
```typescript
const [tasksRes, pendingsRes, evaluationsRes, examsRes] = await Promise.all([
  supabase.from('tasks').select('*').eq('user_id', user.id),
  supabase.from('pendings').select('*').eq('user_id', user.id),
  supabase.from('evaluations').select('*').eq('user_id', user.id),
  supabase.from('exams').select('*').eq('user_id', user.id),
]);
```
*Después (SQLite)*:
```typescript
const [tasksData, pendingsData, evaluationsData, examsData] = await Promise.all([
  localDb.getTasks(),
  localDb.getPendings(),
  localDb.getEvaluations(),
  localDb.getExams(),
]);
```

### Ejemplo 3: Perfil del Usuario (`profile.tsx`)
Reemplaza las llamadas de lectura/escritura de perfil. La imagen en Base64 se puede almacenar directamente en la tabla local `profiles` o localmente en el dispositivo.
*Antes (Supabase)*:
```typescript
const { error: dbErr } = await supabase
  .from('profiles')
  .update({ avatar_url: base64Url })
  .eq('id', user?.id);
```
*Después (SQLite)*:
```typescript
await localDb.updateProfile(fullName, base64Url);
```

---

## Fase 7: Implementación del Sistema de Copias de Seguridad (Exportar / Importar)

Crea un archivo de utilidades en `src/lib/backup.ts` para encapsular la lógica de exportación a archivo e importación.

```typescript
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { localDb } from './localDb';

export const exportBackupToFile = async (): Promise<void> => {
  try {
    const backupData = await localDb.getAllDataBackup();
    const backupString = JSON.stringify(backupData, null, 2);
    
    // Nombre del archivo temporal
    const fileUri = `${FileSystem.cacheDirectory}respaldo_apuntes_u.json`;
    
    // Escribir el archivo
    await FileSystem.writeAsStringAsync(fileUri, backupString, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    
    // Verificar si compartir está disponible y abrir el diálogo
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Exportar Copia de Seguridad 💾',
        UTI: 'public.json',
      });
    } else {
      throw new Error('La función de compartir no está disponible en este dispositivo.');
    }
  } catch (error: any) {
    throw new Error('Error al exportar respaldo: ' + error.message);
  }
};

export const importBackupFromFile = async (): Promise<void> => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return; // El usuario canceló la selección
    }

    const fileUri = result.assets[0].uri;
    const fileContent = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const parsedJson = JSON.parse(fileContent);

    // Validar esquema
    if (parsedJson.version !== 1 || !parsedJson.data) {
      throw new Error('El archivo seleccionado no es un respaldo válido de Apuntes U.');
    }

    // Restaurar los datos
    await localDb.restoreBackup(parsedJson);
  } catch (error: any) {
    throw new Error('Error al importar respaldo: ' + error.message);
  }
};
```

### Integración con Google Drive (Sincronización Cloud del Usuario)

Para implementar el respaldo a Google Drive, la IA de desarrollo debe seguir esta guía técnica:

1. **Configurar Google Sign-In**:
   Inicializa Google Sign-In en el archivo raíz (ej. `src/app/_layout.tsx`):
   ```typescript
   import { GoogleSignin } from '@react-native-google-signin/google-signin';

   GoogleSignin.configure({
     scopes: ['https://www.googleapis.com/auth/drive.appdata'], // Permiso exclusivo para la carpeta de la app
     webClientId: 'TU_CLIENT_ID_WEB.apps.googleusercontent.com', // Requerido para Android/iOS
   });
   ```

2. **Subir archivo de backup a Google Drive (API REST)**:
   ```typescript
   export const uploadBackupToGoogleDrive = async (): Promise<void> => {
     try {
       // 1. Obtener usuario actual o forzar login
       let user = await GoogleSignin.getCurrentUser();
       if (!user) {
         user = await GoogleSignin.signIn();
       }
       const tokens = await GoogleSignin.getTokens();
       const accessToken = tokens.accessToken;

       // 2. Obtener data
       const backupData = await localDb.getAllDataBackup();
       const backupString = JSON.stringify(backupData);

       // 3. Crear el payload Multipart para la API de Drive
       const metadata = {
         name: 'respaldo_apuntes_u.json',
         mimeType: 'application/json',
         parents: ['appDataFolder'], // Guardar en la carpeta oculta de la app
       };

       const boundary = 'foo_bar_boundary';
       const body = 
         `\r\n--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}` +
         `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${backupString}` +
         `\r\n--${boundary}--`;

       const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
         method: 'POST',
         headers: {
           Authorization: `Bearer ${accessToken}`,
           'Content-Type': `multipart/related; boundary=${boundary}`,
         },
         body,
       });

       if (!response.ok) {
         throw new Error('Respuesta fallida de Google Drive: ' + response.statusText);
       }
     } catch (error: any) {
       throw new Error('Google Drive Export falló: ' + error.message);
     }
   };
   ```

3. **Descargar e importar respaldo de Google Drive**:
   ```typescript
   export const downloadBackupFromGoogleDrive = async (): Promise<void> => {
     try {
       let user = await GoogleSignin.getCurrentUser();
       if (!user) user = await GoogleSignin.signIn();
       const tokens = await GoogleSignin.getTokens();
       const accessToken = tokens.accessToken;

       // Buscar el archivo en appDataFolder
       const listResponse = await fetch(
         'https://www.googleapis.com/drive/v3/files?q=name="respaldo_apuntes_u.json"&spaces=appDataFolder',
         {
           headers: { Authorization: `Bearer ${accessToken}` },
         }
       );
       const listData = await listResponse.json();

       if (!listData.files || listData.files.length === 0) {
         throw new Error('No se encontró ninguna copia de seguridad en Google Drive.');
       }

       const fileId = listData.files[0].id;

       // Descargar el contenido del archivo
       const fileResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
         headers: { Authorization: `Bearer ${accessToken}` },
       });

       const backupJson = await fileResponse.json();
       await localDb.restoreBackup(backupJson);
     } catch (error: any) {
       throw new Error('Google Drive Import falló: ' + error.message);
     }
   };
   ```

---

## Fase 8: Modificación de la Interfaz de Usuario en Configuraciones (`settings.tsx`)

Reemplaza la sección "Cuenta y Acceso" por una sección elegante de "Copia de Seguridad e Importación 💾" en `src/app/(app)/settings.tsx`.

### 1. Modificar UI en `settings.tsx`
Sustituye el botón de cerrar sesión de Supabase por el siguiente bloque (integrándolo bajo el título correspondiente y manteniendo la paleta de colores y estilos del tema actual):

```tsx
import { exportBackupToFile, importBackupFromFile } from '@/lib/backup';
// Si se integra Google Drive, importar también las funciones correspondientes

// Dentro de SettingsScreen:
const handleExportBackup = async () => {
  try {
    await exportBackupToFile();
    Alert.alert('Éxito 🎉', 'Tu copia de seguridad se ha generado y compartido exitosamente.');
  } catch (error: any) {
    Alert.alert('Error ❌', error.message);
  }
};

const handleImportBackup = () => {
  showConfirm({
    title: 'Restaurar Datos ⚠️',
    message: '¿Estás seguro de que deseas importar la copia de seguridad? Esto reemplazará todos los datos actuales del dispositivo de forma permanente. 🌸',
    confirmText: 'Importar y Reemplazar',
    cancelText: 'Cancelar',
    type: 'danger',
    onConfirm: async () => {
      try {
        await importBackupFromFile();
        Alert.alert('Datos Restaurados 🎉', 'Tus apuntes y tareas se han importado correctamente. Reinicia la app si es necesario para aplicar los cambios.');
      } catch (error: any) {
        Alert.alert('Error ❌', error.message);
      }
    },
  });
};

// En el return de la pantalla (reemplazando la tarjeta de Logout):
return (
  <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.scrollContent}>
    <View style={styles.content}>
      {/* ... Sección del Tema ... */}

      {/* Copia de Seguridad */}
      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 32 }]}>Copia de Seguridad 💾</Text>
      <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
        Resguarda tus apuntes y restáuralos en caso de cambiar de dispositivo.
      </Text>

      <View style={styles.optionsList}>
        {/* Exportar a Archivo */}
        <TouchableOpacity
          style={[
            styles.optionCard,
            {
              backgroundColor: colors.backgroundCard,
              borderColor: colors.border,
              borderWidth: 1.5,
            },
          ]}
          onPress={handleExportBackup}
          activeOpacity={0.7}
        >
          <View style={styles.optionHeader}>
            <Text style={styles.optionIcon}>📤</Text>
            <View style={styles.optionInfo}>
              <Text style={[styles.optionTitle, { color: colors.text }]}>Exportar datos</Text>
              <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                Descarga un archivo .json con todas tus tareas, evaluaciones y configuraciones.
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Importar desde Archivo */}
        <TouchableOpacity
          style={[
            styles.optionCard,
            {
              backgroundColor: colors.backgroundCard,
              borderColor: colors.border,
              borderWidth: 1.5,
            },
          ]}
          onPress={handleImportBackup}
          activeOpacity={0.7}
        >
          <View style={styles.optionHeader}>
            <Text style={styles.optionIcon}>📥</Text>
            <View style={styles.optionInfo}>
              <Text style={[styles.optionTitle, { color: colors.text }]}>Importar datos</Text>
              <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                Carga un archivo de respaldo previamente guardado para restaurar tu información.
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  </ScrollView>
);
```

---

## Recomendaciones Finales para el Desarrollador / IA

1. **Evita Pérdida de Datos durante las Pruebas**: Al realizar la migración en la nueva carpeta `apuntes-u-locales`, primero inicializa la base de datos sqlite y asegúrate de que no lance errores en consola.
2. **Validación de Esquema JSON**: Al importar, es crítico que el parser JSON compruebe la presencia del objeto raíz `version: 1` y de los arreglos correspondientes para evitar caídas inesperadas de la aplicación debido a datos corruptos.
3. **Mantenimiento de los Widgets**: La app tiene integrados widgets (`react-native-android-widget`). La IA desarrolladora debe asegurarse de que la lectura de base de datos en los archivos de widgets (`widget-task-handler.tsx`) se adapte también a la lectura de SQLite si comparte el mismo almacenamiento o contexto nativo de base de datos.
