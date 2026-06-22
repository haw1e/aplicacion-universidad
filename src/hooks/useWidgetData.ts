import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth';
import { useAlert } from '@/context/AlertContext';
import { supabase } from '@/lib/supabase';

export interface Task {
  id: string;
  description: string;
  due_date: string;
  completed: boolean;
  user_id: string;
}

export interface Pending {
  id: string;
  description: string;
  user_id: string;
  created_at: string;
}

export interface Evaluation {
  id: string;
  description: string;
  user_id: string;
  date: string;
  evaluation_date?: string;
}

export interface Exam {
  id: string;
  description: string;
  user_id: string;
  date: string;
  exam_date?: string;
}

export interface CalendarEvent {
  id: string;
  description: string;
  date: string;
  type: 'task' | 'pending' | 'evaluation' | 'exam';
  completed?: boolean;
  raw: any;
}

export interface WidgetDataProps {
  onPendingAdded?: () => void;
  onTaskToggled?: () => void;
}

export function useWidgetData(props?: WidgetDataProps) {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pendings, setPendings] = useState<Pending[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [savingPending, setSavingPending] = useState(false);

  // Helper to get local date from pending timestamp (YYYY-MM-DD)
  const getPendingLocalDate = (createdAtStr: string) => {
    const d = new Date(createdAtStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchAllData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [tasksRes, pendingsRes, evalsRes, examsRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', user.id),
        supabase.from('pendings').select('*').eq('user_id', user.id),
        supabase.from('evaluations').select('*').eq('user_id', user.id),
        supabase.from('exams').select('*').eq('user_id', user.id),
      ]);

      if (tasksRes.error) throw tasksRes.error;
      if (pendingsRes.error) throw pendingsRes.error;
      if (evalsRes.error) throw evalsRes.error;
      if (examsRes.error) throw examsRes.error;

      setTasks(tasksRes.data || []);
      setPendings(pendingsRes.data || []);

      // Map dates consistently
      const mappedEvals = (evalsRes.data || []).map((e: any) => ({
        ...e,
        date: e.evaluation_date || e.date,
      }));
      const mappedExams = (examsRes.data || []).map((ex: any) => ({
        ...ex,
        date: ex.exam_date || ex.date,
      }));

      setEvaluations(mappedEvals);
      setExams(mappedExams);
    } catch (e: any) {
      console.error('Error fetching widget data:', e);
      showAlert({ title: 'Error ❌', message: 'No se pudieron cargar los datos: ' + e.message });
    } finally {
      setLoading(false);
    }
  }, [user, showAlert]);

  const saveQuickPending = async (description: string): Promise<boolean> => {
    if (!user) return false;
    if (!description.trim()) {
      showAlert({ title: 'Error ❌', message: 'Por favor ingresa una descripción.' });
      return false;
    }

    setSavingPending(true);
    try {
      const { error } = await supabase
        .from('pendings')
        .insert([{ description: description.trim(), user_id: user.id }]);

      if (error) throw error;

      await fetchAllData();
      props?.onPendingAdded?.();
      return true;
    } catch (error: any) {
      showAlert({ title: 'Error ❌', message: 'Error al guardar el pendiente: ' + error.message });
      return false;
    } finally {
      setSavingPending(false);
    }
  };

  const toggleTaskCompletion = async (taskId: string, currentCompleted: boolean) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ completed: !currentCompleted })
        .eq('id', taskId);

      if (error) throw error;
      
      setTasks(prev =>
        prev.map(t => (t.id === taskId ? { ...t, completed: !currentCompleted } : t))
      );
      props?.onTaskToggled?.();
    } catch (e: any) {
      showAlert({ title: 'Error ❌', message: 'No se pudo actualizar la tarea: ' + e.message });
    }
  };

  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        fetchAllData();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [user, fetchAllData]);

  // Group events by date
  const getEventsForDate = (dateStr: string): CalendarEvent[] => {
    const dayTasks = tasks
      .filter(t => t.due_date === dateStr)
      .map(t => ({ id: t.id, description: t.description, date: dateStr, type: 'task' as const, completed: t.completed, raw: t }));
    
    const dayPendings = pendings
      .filter(p => getPendingLocalDate(p.created_at) === dateStr)
      .map(p => ({ id: p.id, description: p.description, date: dateStr, type: 'pending' as const, raw: p }));
    
    const dayEvals = evaluations
      .filter(e => e.date === dateStr)
      .map(e => ({ id: e.id, description: e.description, date: dateStr, type: 'evaluation' as const, raw: e }));
    
    const dayExams = exams
      .filter(ex => ex.date === dateStr)
      .map(ex => ({ id: ex.id, description: ex.description, date: dateStr, type: 'exam' as const, raw: ex }));

    return [...dayExams, ...dayEvals, ...dayTasks, ...dayPendings];
  };

  return {
    loading,
    tasks,
    pendings,
    evaluations,
    exams,
    savingPending,
    fetchAllData,
    saveQuickPending,
    toggleTaskCompletion,
    getEventsForDate,
    getPendingLocalDate,
  };
}
