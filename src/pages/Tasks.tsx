import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Clock, Plus, Trash2, Calendar as CalendarIcon, Filter, Bell, ArrowRight, CheckSquare, X, Archive, ArchiveRestore, Pencil, LayoutList, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../lib/api';

interface Task {
  id: number;
  title: string;
  description: string;
  dueDate: string | null;
  reminderTime: string | null;
  status: 'todo' | 'in_progress' | 'completed';
  isArchived?: number;
}

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'week'>('week');
  const [currentWeekDate, setCurrentWeekDate] = useState(new Date());
  const [isAdding, setIsAdding] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [newTask, setNewTask] = useState<Partial<Task>>({ title: '', description: '', dueDate: '', reminderTime: '', status: 'todo' });
  const [notifiedTasks, setNotifiedTasks] = useState<Set<number>>(new Set());
  const [activeReminder, setActiveReminder] = useState<Task | null>(null);
  const [settingReminderFor, setSettingReminderFor] = useState<Task | null>(null);
  const [customReminderTime, setCustomReminderTime] = useState<string>('');

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    if (settingReminderFor) {
      setCustomReminderTime(settingReminderFor.reminderTime || '');
    }
  }, [settingReminderFor]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      tasks.forEach(task => {
        if (task.reminderTime && task.status !== 'completed' && !notifiedTasks.has(task.id)) {
          const reminderDate = new Date(task.reminderTime);
          if (now >= reminderDate) {
            setActiveReminder(task);
            setNotifiedTasks(prev => new Set(prev).add(task.id));
            if (Notification.permission === 'granted') {
              new Notification('Rappel de tâche', { body: task.title });
            }
          }
        }
      });
    }, 10000);

    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => clearInterval(interval);
  }, [tasks, notifiedTasks]);

  const saveReminder = async (taskId: number, timeStr: string | null) => {
    const taskToUpdate = tasks.find(t => t.id === taskId);
    if (!taskToUpdate) return;
    
    try {
      setTasks(tasks.map(t => t.id === taskId ? { ...t, reminderTime: timeStr } : t));
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ ...taskToUpdate, reminderTime: timeStr })
      });
      toast.success(timeStr ? "Rappel programmé !" : "Rappel supprimé");
    } catch(e) {
      toast.error("Erreur d'enregistrement");
      fetchTasks();
    }
    setSettingReminderFor(null);
  };

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      console.error(error);
      toast.error('Erreur de chargement des tâches');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title) return;
    try {
      if (editingTaskId) {
        await fetch(`/api/tasks/${editingTaskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: JSON.stringify(newTask)
        });
        setTasks(tasks.map(t => t.id === editingTaskId ? { ...t, ...newTask } as Task : t));
        toast.success('Tâche modifiée');
      } else {
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: JSON.stringify(newTask)
        });
        if (response.ok) {
          const { id } = await response.json();
          setTasks([{ ...newTask, id, isArchived: 0 } as Task, ...tasks]);
          toast.success('Tâche ajoutée');
        }
      }
      setNewTask({ title: '', description: '', dueDate: '', reminderTime: '', status: 'todo' });
      setIsAdding(false);
      setEditingTaskId(null);
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const startEditing = (task: Task) => {
    setNewTask({ ...task });
    setEditingTaskId(task.id);
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleArchive = async (task: Task) => {
    const newArchivedState = task.isArchived === 1 ? 0 : 1;
    setTasks(tasks.map(t => t.id === task.id ? { ...t, isArchived: newArchivedState } : t));
    toast.success(newArchivedState ? 'Tâche archivée' : 'Tâche restaurée');
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ ...task, isArchived: newArchivedState })
      });
    } catch (error) {
       fetchTasks();
    }
  };

  const updateTaskStatus = async (task: Task, newStatus: Task['status']) => {
    // Optimistic update
    setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    if (newStatus === 'completed') {
      toast.success('Tâche terminée !', {
        icon: '✨',
        style: { borderRadius: '10px', background: '#333', color: '#fff' }
      });
    }

    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ ...task, status: newStatus })
      });
    } catch (error) {
      toast.error('Erreur de mise à jour');
      fetchTasks(); // Revert on failure
    }
  };

  const deleteTask = async (id: number) => {
    setTasks(tasks.filter(t => t.id !== id));
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Tâche supprimée');
    } catch (error) {
      toast.error('Erreur de suppression');
      fetchTasks();
    }
  };

  const openTaskModal = (presetDate?: Date) => {
    let presetString = '';
    if (presetDate) {
      const d = new Date(presetDate);
      d.setHours(9, 0, 0, 0);
      const pad = (n: number) => n.toString().padStart(2, '0');
      presetString = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T09:00`;
    }
    setNewTask({ title: '', description: '', dueDate: presetString, reminderTime: '', status: 'todo' });
    setEditingTaskId(null);
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const weekDays = useMemo(() => {
    const start = new Date(currentWeekDate);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    start.setHours(0,0,0,0);
    return Array.from({length: 7}).map((_, i) => {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        return d;
    });
  }, [currentWeekDate]);

  const changeWeek = (offset: number) => {
    const newDate = new Date(currentWeekDate);
    newDate.setDate(newDate.getDate() + (offset * 7));
    setCurrentWeekDate(newDate);
  };

  const filteredTasks = useMemo(() => {
    const now = new Date();
    return tasks.filter(task => {
      const isArchived = task.isArchived === 1;
      
      if (filterStatus === 'archived') {
        return isArchived;
      }
      
      if (isArchived) return false;

      if (filterStatus !== 'all' && task.status !== filterStatus) return false;
      if (filterDate !== 'all') {
        if (!task.dueDate) return filterDate === 'nodate';
        const due = new Date(task.dueDate);
        const isToday = due.toDateString() === now.toDateString();
        const isOverdue = due < now && !isToday;
        
        if (filterDate === 'today' && !isToday) return false;
        if (filterDate === 'overdue' && !isOverdue) return false;
        if (filterDate === 'upcoming' && (isToday || isOverdue)) return false;
      }
      return true;
    });
  }, [tasks, filterStatus, filterDate]);

  if (loading) return <div className="flex justify-center p-20"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  const TaskCard = ({ task }: { task: Task }) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      className={`group flex flex-col sm:flex-row gap-4 sm:items-center justify-between p-4 bg-white rounded-2xl border transition-all ${
        task.status === 'completed' ? 'border-emerald-100 bg-emerald-50/30' : 'border-slate-100 hover:shadow-md hover:border-primary/20'
      }`}
    >
      <div className="flex items-start gap-4 flex-1">
        <button 
          onClick={() => updateTaskStatus(task, task.status === 'completed' ? 'todo' : 'completed')}
          className={`mt-1 flex-shrink-0 transition-colors ${task.status === 'completed' ? 'text-emerald-500' : 'text-slate-300 hover:text-primary'}`}
        >
          {task.status === 'completed' ? <CheckCircle2 size={24} className="animate-in zoom-in duration-300" /> : <Circle size={24} />}
        </button>
        <div className="flex-1 min-w-0">
          <h4 className={`text-base font-bold transition-all ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-900 group-hover:text-primary'}`}>
            {task.title}
          </h4>
          {task.description && (
            <p className={`text-sm mt-1 line-clamp-2 ${task.status === 'completed' ? 'text-slate-400' : 'text-slate-500'}`}>
              {task.description}
            </p>
          )}
          
          <div className="flex flex-wrap gap-3 mt-3">
            {task.dueDate && (
              <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg ${
                new Date(task.dueDate) < new Date() && task.status !== 'completed' 
                  ? 'bg-red-50 text-red-600' 
                  : 'bg-slate-100 text-slate-600'
              }`}>
                <CalendarIcon size={12} />
                {new Date(task.dueDate).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            
            {task.reminderTime ? (
              <button 
                onClick={() => setSettingReminderFor(task)}
                className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors cursor-pointer"
              >
                <Bell size={12} />
                {new Date(task.reminderTime).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </button>
            ) : (
              <button 
                onClick={() => setSettingReminderFor(task)}
                className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-500 transition-colors cursor-pointer"
              >
                <Bell size={12} />
                Ajouter un rappel
              </button>
            )}

            {task.status === 'in_progress' && (
              <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-600">
                <Clock size={12} /> En cours
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:ml-auto">
        {task.status === 'todo' && (
          <button 
            onClick={() => updateTaskStatus(task, 'in_progress')}
            className="px-3 py-1.5 bg-slate-100 hover:bg-amber-100 hover:text-amber-700 text-slate-600 text-xs font-bold rounded-xl transition-colors flex items-center gap-1"
          >
            Commencer <ArrowRight size={12} />
          </button>
        )}
        {task.status === 'in_progress' && (
          <button 
            onClick={() => updateTaskStatus(task, 'todo')}
            className="px-3 py-1.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-xl transition-colors"
          >
            En pause
          </button>
        )}
        {task.isArchived === 1 ? (
          <button 
            onClick={() => toggleArchive(task)}
            className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-colors"
            title="Restaurer"
          >
            <ArchiveRestore size={16} />
          </button>
        ) : (
          <>
            <button 
              onClick={() => startEditing(task)}
              className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-colors"
              title="Modifier"
            >
              <Pencil size={16} />
            </button>
            <button 
              onClick={() => toggleArchive(task)}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              title="Archiver"
            >
              <Archive size={16} />
            </button>
          </>
        )}
        <button 
          onClick={() => deleteTask(task.id)}
          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
          title="Supprimer"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-6 mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Gestion des Tâches</h2>
          <p className="text-slate-500 font-medium text-sm">Organisez et planifiez vos priorités</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto justify-center">
            <button 
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-all ${viewMode === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <LayoutList size={16} /> Liste
            </button>
            <button 
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-all ${viewMode === 'week' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <CalendarDays size={16} /> Semaine
            </button>
          </div>
          <button 
            onClick={() => openTaskModal()}
            className="w-full sm:w-auto flex justify-center items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-2xl font-bold hover:bg-primary transition-all shadow-xl shadow-slate-200 hover:shadow-primary/20 transform hover:-translate-y-1"
          >
            <Plus size={18} /> Nouvelle Tâche
          </button>
        </div>
      </div>

      {viewMode === 'list' && (
        <div className="flex flex-wrap gap-4 items-center bg-slate-50 p-3 rounded-2xl border border-slate-100 mb-6">
          <div className="flex items-center gap-2 text-slate-700 font-bold px-2"><Filter size={18} /> Filtres:</div>
          
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-white border text-sm font-bold border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          >
            <option value="all">Tous les statuts</option>
            <option value="todo">À faire</option>
            <option value="in_progress">En cours</option>
            <option value="completed">Terminées</option>
            <option value="archived">Historique (Archivées)</option>
          </select>
          
          <select 
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="bg-white border text-sm font-bold border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          >
            <option value="all">Toutes les dates</option>
            <option value="today">Aujourd'hui</option>
            <option value="upcoming">À venir</option>
            <option value="overdue">En retard</option>
            <option value="nodate">Sans échéance</option>
          </select>
        </div>
      )}

      <AnimatePresence>
        {isAdding && (
          <motion.form 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAddTask}
            className="bg-white border-2 border-primary/20 p-6 rounded-[24px] shadow-sm mb-6 space-y-4 overflow-hidden"
          >
            <input 
              type="text" 
              autoFocus
              placeholder="Titre de la tâche..." 
              className="w-full text-xl font-bold bg-transparent border-none placeholder-slate-300 focus:ring-0 px-0"
              value={newTask.title}
              onChange={(e) => setNewTask({...newTask, title: e.target.value})}
              required
            />
            <hr className="border-slate-100" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-1">Échéance</label>
                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <CalendarIcon size={18} className="text-slate-400" />
                  <input 
                    type="datetime-local" 
                    className="bg-transparent border-none w-full text-sm font-bold text-slate-700 focus:ring-0"
                    value={newTask.dueDate || ''}
                    onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-1">Rappel</label>
                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <Bell size={18} className="text-slate-400" />
                  <input 
                    type="datetime-local" 
                    className="bg-transparent border-none w-full text-sm font-bold text-slate-700 focus:ring-0"
                    value={newTask.reminderTime || ''}
                    onChange={(e) => setNewTask({...newTask, reminderTime: e.target.value})}
                  />
                </div>
              </div>
            </div>
            <div>
              <textarea 
                placeholder="Description ou notes (optionnel)" 
                className="w-full text-sm bg-slate-50 border border-slate-100 rounded-xl p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none h-20"
                value={newTask.description}
                onChange={(e) => setNewTask({...newTask, description: e.target.value})}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => {
                  setIsAdding(false);
                  setEditingTaskId(null);
                  setNewTask({ title: '', description: '', dueDate: '', reminderTime: '', status: 'todo' });
                }}
                className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
              >
                Annuler
              </button>
              <button 
                type="submit"
                className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20"
              >
                {editingTaskId ? 'Sauvegarder' : 'Ajouter la tâche'}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {viewMode === 'list' ? (
        <div className="space-y-3">
          <AnimatePresence>
            {filteredTasks.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-center py-20 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200"
              >
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <CheckSquare size={24} className="text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-700 mb-1">Aucune tâche trouvée</h3>
                <p className="text-slate-500 text-sm">Ajoutez votre première tâche pour commencer.</p>
              </motion.div>
            ) : (
              filteredTasks.map(task => <TaskCard key={task.id} task={task} />)
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-100 mb-2">
            <button onClick={() => changeWeek(-1)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <ChevronLeft size={20} className="text-slate-500" />
            </button>
            <h3 className="font-bold text-slate-800">
              Semaine du {weekDays[0].getDate()} {weekDays[0].toLocaleString('fr-FR', { month: 'short' })}
            </h3>
            <button onClick={() => changeWeek(1)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <ChevronRight size={20} className="text-slate-500" />
            </button>
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar">
            {weekDays.map(day => {
              const dayTasks = tasks.filter(t => {
                if (t.isArchived === 1) return false;
                if (!t.dueDate) return false;
                const d = new Date(t.dueDate);
                return d.getFullYear() === day.getFullYear() && d.getMonth() === day.getMonth() && d.getDate() === day.getDate();
              });

              const isToday = day.toDateString() === new Date().toDateString();

              return (
                <div key={day.toISOString()} className={`min-w-[320px] snap-center shrink-0 bg-slate-50/50 rounded-[24px] p-4 border flex flex-col h-[65vh] overflow-y-auto ${isToday ? 'border-primary/30 ring-2 ring-primary/5' : 'border-slate-100'}`}>
                  <div className="flex items-center justify-between mb-4 px-1">
                    <div>
                      <h4 className={`font-black text-lg ${isToday ? 'text-primary' : 'text-slate-800'}`}>
                        {day.toLocaleString('fr-FR', { weekday: 'long' })}
                      </h4>
                      <p className="text-xs font-bold text-slate-400 capitalize">
                        {day.getDate()} {day.toLocaleString('fr-FR', { month: 'short' })}
                      </p>
                    </div>
                    <button 
                      onClick={() => openTaskModal(day)}
                      className="p-2 bg-white rounded-xl shadow-sm text-slate-400 hover:text-primary hover:bg-primary/5 transition-colors"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                  <div className="space-y-3 flex-1">
                    {dayTasks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-40 text-center px-4 border-2 border-dashed border-slate-200 rounded-2xl opacity-50">
                        <p className="text-sm font-medium text-slate-400">Rien de prévu</p>
                      </div>
                    ) : (
                      dayTasks.map(task => <TaskCard key={task.id} task={task} />)
                    )}
                  </div>
                </div>
              );
            })}
            
            {/* Colonne À Planifier */}
            <div className="min-w-[320px] snap-center shrink-0 bg-slate-50/50 rounded-[24px] p-4 border border-dashed border-slate-300 flex flex-col h-[65vh] overflow-y-auto">
               <div className="flex items-center justify-between mb-4 px-1">
                 <div>
                   <h4 className="font-black text-lg text-slate-600">À planifier</h4>
                   <p className="text-xs font-bold text-slate-400">Tâches sans date</p>
                 </div>
               </div>
               <div className="space-y-3 flex-1">
                 {tasks.filter(t => !t.isArchived && !t.dueDate).map(task => (
                   <TaskCard key={task.id} task={task} />
                 ))}
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Rappel Modal (Setting) */}
      <AnimatePresence>
        {settingReminderFor && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Bell className="text-blue-500" size={20} /> Programmer un rappel
                </h3>
                <button onClick={() => setSettingReminderFor(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"><X size={20}/></button>
              </div>
              <p className="text-sm text-slate-500 mb-4 truncate font-medium">Tâche : {settingReminderFor.title}</p>
              
              <div className="space-y-3 mb-6">
                 {settingReminderFor.dueDate && (
                  <>
                    <button onClick={() => {
                        const d = new Date(settingReminderFor.dueDate!);
                        d.setMinutes(d.getMinutes() - 15);
                        const pad = (n: number) => n.toString().padStart(2, '0');
                        saveReminder(settingReminderFor.id, `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
                    }} className="w-full p-3 bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 rounded-xl text-left font-bold text-sm text-slate-700 transition">
                      15 min avant l'échéance
                    </button>
                    <button onClick={() => {
                        const d = new Date(settingReminderFor.dueDate!);
                        d.setHours(d.getHours() - 1);
                        const pad = (n: number) => n.toString().padStart(2, '0');
                        saveReminder(settingReminderFor.id, `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
                    }} className="w-full p-3 bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 rounded-xl text-left font-bold text-sm text-slate-700 transition">
                      1 heure avant
                    </button>
                    <button onClick={() => {
                        const d = new Date(settingReminderFor.dueDate!);
                        d.setDate(d.getDate() - 1);
                        const pad = (n: number) => n.toString().padStart(2, '0');
                        saveReminder(settingReminderFor.id, `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
                    }} className="w-full p-3 bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 rounded-xl text-left font-bold text-sm text-slate-700 transition">
                      1 jour avant
                    </button>
                  </>
                 )}
                 <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-1">Heure personnalisée</label>
                   <input type="datetime-local" 
                     className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500/20"
                     value={customReminderTime}
                     onChange={(e) => setCustomReminderTime(e.target.value)}
                   />
                   <button onClick={() => saveReminder(settingReminderFor.id, customReminderTime)} className="mt-2 w-full p-3 bg-blue-500 text-white rounded-xl font-bold text-sm hover:bg-blue-600 transition">
                     Enregistrer cette date
                   </button>
                 </div>
              </div>
              {settingReminderFor.reminderTime && (
                 <button onClick={() => saveReminder(settingReminderFor.id, null)} className="w-full p-3 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 transition">
                   Supprimer le rappel
                 </button>
              )}
            </motion.div>
          </div>
        )}

        {/* Active Reminder Popup */}
        {activeReminder && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm w-full text-center relative overflow-hidden border border-slate-100"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 to-indigo-500"></div>
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Bell className="text-blue-500 animate-bounce" size={40} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">C'est l'heure !</h2>
              <h3 className="text-lg font-bold text-blue-600 mb-4">{activeReminder.title}</h3>
              {activeReminder.description && (
                <p className="text-slate-500 text-sm mb-6 bg-slate-50 p-4 rounded-xl">{activeReminder.description}</p>
              )}
              <div className="flex gap-3 mt-8">
                <button 
                  onClick={() => {
                    setActiveReminder(null);
                    if (activeReminder.status === 'todo') updateTaskStatus(activeReminder, 'in_progress');
                  }} 
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-900 px-4 py-3 rounded-xl font-bold transition-colors"
                >
                  Commencer
                </button>
                <button 
                  onClick={() => setActiveReminder(null)} 
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all"
                >
                  J'ai compris
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
