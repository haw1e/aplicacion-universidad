import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { supabase } from './supabase';
import { appStorage } from './storage';

export const exportSupabaseBackupToFile = async (userId: string): Promise<void> => {
  try {
    // 1. Fetch Profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', userId)
      .single();

    // 2. Fetch Tasks
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId);

    // 3. Fetch Pendings
    const { data: pendingsData } = await supabase
      .from('pendings')
      .select('*')
      .eq('user_id', userId);

    // 4. Fetch Evaluations
    const { data: evaluationsData } = await supabase
      .from('evaluations')
      .select('*')
      .eq('user_id', userId);

    // 5. Fetch Exams
    const { data: examsData } = await supabase
      .from('exams')
      .select('*')
      .eq('user_id', userId);

    // Map profile photo from local storage if not in supabase
    const localPhoto = await appStorage.getItem('profile_photo');
    const avatarUrl = profileData?.avatar_url || localPhoto || '';

    // Map evaluations and exams date columns for SQLite compatibility
    const mappedEvaluations = (evaluationsData || []).map((e: any) => ({
      id: e.id,
      description: e.description,
      evaluation_date: e.evaluation_date || e.date || '',
      user_id: 'local-user'
    }));

    const mappedExams = (examsData || []).map((ex: any) => ({
      id: ex.id,
      description: ex.description,
      exam_date: ex.exam_date || ex.date || '',
      user_id: 'local-user'
    }));

    const mappedTasks = (tasksData || []).map((t: any) => ({
      id: t.id,
      description: t.description,
      due_date: t.due_date,
      completed: t.completed ? 1 : 0,
      user_id: 'local-user'
    }));

    const mappedPendings = (pendingsData || []).map((p: any) => ({
      id: p.id,
      description: p.description,
      created_at: p.created_at,
      user_id: 'local-user'
    }));

    const backupData = {
      version: 1,
      timestamp: new Date().toISOString(),
      data: {
        profile: {
          id: 'local-user',
          full_name: profileData?.full_name || 'Estudiante Local',
          avatar_url: avatarUrl
        },
        tasks: mappedTasks,
        pendings: mappedPendings,
        evaluations: mappedEvaluations,
        exams: mappedExams
      }
    };

    const backupString = JSON.stringify(backupData, null, 2);

    if (Platform.OS === 'web') {
      if (typeof document !== 'undefined') {
        const blob = new Blob([backupString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `migracion_apuntes_u_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      return;
    }

    // Ruta temporal nativa
    const fileUri = `${(FileSystem as any).documentDirectory || (FileSystem as any).cacheDirectory}migracion_apuntes_u.json`;
    
    // Escribir archivo localmente
    await (FileSystem as any).writeAsStringAsync(fileUri, backupString, {
      encoding: (FileSystem as any).EncodingType.UTF8,
    });
    
    // Compartir el archivo con el sistema
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Exportar Datos para Migración 💾',
        UTI: 'public.json',
      });
    } else {
      throw new Error('La función de compartir no está disponible en este dispositivo.');
    }
  } catch (error: any) {
    throw new Error('Error al exportar datos para migración: ' + error.message);
  }
};
