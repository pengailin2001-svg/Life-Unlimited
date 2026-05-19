import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Check, Trash2, Edit2, ChevronRight, ChevronLeft, Calendar, Settings as SettingsIcon, MessageSquare, BookOpen, Clock } from 'lucide-react';
import { format, addDays, subDays, parseISO, startOfDay, isBefore, isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths, isSameMonth } from 'date-fns';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import { cn } from './lib/utils.ts';
import { useAppStore } from './store.ts';
import { Task } from './types.ts';

// Theme Definitions
const MORANDI_PALETTES: Record<string, { yesterday: string, today: string, tomorrow: string, textYesterday: string, textToday: string, textTomorrow: string }> = {
  '#A3B18A': { // Sage Green
    yesterday: '#DAD7CD',
    today: '#A3B18A',
    tomorrow: '#588157',
    textYesterday: '#FFFFFF',
    textToday: '#FFFFFF',
    textTomorrow: '#FFFFFF'
  },
  '#9DB4C0': { // Dusty Blue
    yesterday: '#E0E7EA',
    today: '#9DB4C0',
    tomorrow: '#5C677D',
    textYesterday: '#5C677D',
    textToday: '#FFFFFF',
    textTomorrow: '#FFFFFF'
  },
  '#B1A7B6': { // Lavender Grey
    yesterday: '#E5E1E6',
    today: '#B1A7B6',
    tomorrow: '#80727B',
    textYesterday: '#80727B',
    textToday: '#FFFFFF',
    textTomorrow: '#FFFFFF'
  },
  '#D6CCC2': { // Warm Earth
    yesterday: '#F5EBE0',
    today: '#D6CCC2',
    tomorrow: '#AF9B84',
    textYesterday: '#AF9B84',
    textToday: '#FFFFFF',
    textTomorrow: '#FFFFFF'
  }
};

const getThemeVariants = (base: string) => {
  return MORANDI_PALETTES[base] || MORANDI_PALETTES['#A3B18A'];
};

// Layout Component
const Layout = ({ children, activeTab }: { children: React.ReactNode, activeTab: string }) => {
  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#1D1D1F] font-sans selection:bg-black/5">
      <div className="max-w-md mx-auto min-h-screen pb-24 relative flex flex-col">
        {children}
        
        {/* Navigation Bar */}
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm backdrop-blur-2xl bg-white/80 border border-white/40 rounded-3xl shadow-2xl z-50 flex items-center justify-around py-4 px-6">
          <NavItem icon={<Clock size={20} />} active={activeTab === 'home'} label="主页" onClick={() => window.dispatchEvent(new CustomEvent('nav', { detail: 'home' }))} />
          <NavItem icon={<Calendar size={20} />} active={activeTab === 'medal'} label="日历" onClick={() => window.dispatchEvent(new CustomEvent('nav', { detail: 'medal' }))} />
          <NavItem icon={<SettingsIcon size={20} />} active={activeTab === 'settings'} label="设定" onClick={() => window.dispatchEvent(new CustomEvent('nav', { detail: 'settings' }))} />
        </nav>
      </div>
    </div>
  );
};

const NavItem = ({ icon, active, label, onClick }: { icon: React.ReactNode, active: boolean, label: string, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex flex-col items-center gap-1 transition-all duration-300",
      active ? "text-primary scale-110" : "text-gray-400 hover:text-gray-600"
    )}
  >
    {icon}
    <span className="text-[10px] font-medium tracking-tight uppercase">{label}</span>
  </button>
);

// Main Application Component
export default function App() {
  const store = useAppStore();
  const [activeTab, setActiveTab] = useState('home');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isCalendarView, setIsCalendarView] = useState(false);

  React.useEffect(() => {
    const handleNav = (e: any) => {
      setSelectedDate(null);
      setActiveTab(e.detail);
    };
    window.addEventListener('nav', handleNav);
    return () => window.removeEventListener('nav', handleNav);
  }, []);

  // Theme support
  const themeStyles = useMemo(() => {
    const base = store.state.theme;
    const variants = getThemeVariants(base);
    return {
      '--primary': variants.today,
      '--primary-soft': variants.yesterday,
      '--primary-deep': variants.tomorrow,
      '--text-soft': variants.textYesterday,
      '--text-main': variants.textToday,
    } as React.CSSProperties;
  }, [store.state.theme]);

  const variants = getThemeVariants(store.state.theme);

  return (
    <div style={themeStyles}>
      <style>{`
        :root {
          --primary: ${variants.today};
        }
        .text-primary { color: var(--primary); }
        .bg-primary { background-color: var(--primary); }
        .border-primary { border-color: var(--primary); }
        .pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
      `}</style>
      
      <Layout activeTab={activeTab}>
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <Home 
              key="home" 
              store={store} 
              variants={variants}
              onDetail={(date) => { 
                setSelectedDate(date); 
                setIsCalendarView(false);
                setActiveTab('detail'); 
              }} 
            />
          )}
          {activeTab === 'medal' && (
            <MedalView 
              key="medal" 
              store={store} 
              onDateSelect={(date) => { 
                setSelectedDate(date); 
                setIsCalendarView(true);
                setActiveTab('detail'); 
              }} 
            />
          )}
          {activeTab === 'detail' && selectedDate && (
            <DayDetail 
              key="detail" 
              date={selectedDate} 
              store={store} 
              isArchiveMode={isCalendarView}
              onBack={() => setActiveTab(isCalendarView ? 'medal' : 'home')} 
            />
          )}
          {activeTab === 'settings' && (
            <Settings key="settings" store={store} />
          )}
        </AnimatePresence>
      </Layout>
    </div>
  );
}

// HOME PAGE
function Home({ store, onDetail, variants }: { store: any, onDetail: (date: string) => void, variants: any, key?: string }) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="px-6 pt-12 flex flex-col gap-8"
    >
      <header className="mb-4">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
          {format(new Date(), 'yyyy年MM月dd日')}
        </h1>
        <p className="text-gray-400 font-medium">
          {format(new Date(), 'EEEE')}
        </p>
      </header>

      {/* THREE CARDS */}
      <div className="flex flex-col gap-6">
        <TimeCard 
          title="昨天" 
          date={yesterday}
          store={store} 
          onClick={() => onDetail(yesterday)}
          style={{ backgroundColor: variants.yesterday, color: variants.textYesterday }}
        />
        <TimeCard 
          title="今天" 
          date={today}
          store={store} 
          onClick={() => onDetail(today)}
          style={{ backgroundColor: variants.today, color: variants.textToday }}
        />
        <TimeCard 
          title="明天" 
          date={tomorrow}
          store={store} 
          onClick={() => onDetail(tomorrow)}
          style={{ backgroundColor: variants.tomorrow, color: variants.textTomorrow }}
        />
      </div>
    </motion.div>
  );
}

function TimeCard({ title, date, store, onClick, style, footer }: any) {
  const tasks = store.state.tasks.filter((t: Task) => t.date === date).slice(0, 7);
  const completedCount = tasks.filter((t: Task) => t.completed).length;

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      style={style}
      className="relative w-full p-8 rounded-[32px] text-left shadow-lg overflow-hidden flex flex-col gap-4 transition-all duration-500"
    >
      <div className="cursor-pointer" onClick={onClick}>
        <div className="flex justify-between items-center text-current/80">
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          <ChevronRight size={20} className="opacity-50" />
        </div>

        <div className="flex flex-col gap-2 mt-4">
          {tasks.length > 0 ? (
            tasks.map((task: Task) => (
              <div key={task.id} className="flex items-center gap-2 text-sm opacity-90 truncate">
                <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", task.completed ? "bg-current" : "bg-current/30")} />
                <span className={cn(task.completed && "line-through opacity-50")}>{task.title}</span>
              </div>
            ))
          ) : null}
        </div>

        {tasks.length > 0 && (
          <div className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
            FINISHED {completedCount} / {tasks.length}
          </div>
        )}
      </div>

      {footer}
    </motion.div>
  );
}

// DETAIL PAGE
function DayDetail({ date, store, onBack, isArchiveMode }: { date: string, store: any, onBack: () => void, isArchiveMode?: boolean, key?: string }) {
  const [activeTab, setActiveTab] = useState<'tasks' | 'diary'>('tasks');
  const [diaryValue, setDiaryValue] = useState(store.state.diaries.find((d: any) => d.date === date)?.content || '');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const tasks = store.state.tasks.filter((t: Task) => t.date === date);
  const isPast = isBefore(parseISO(date), startOfDay(new Date()));
  const isToday = isSameDay(parseISO(date), startOfDay(new Date()));
  const isTomorrow = isSameDay(parseISO(date), addDays(startOfDay(new Date()), 1));
  const isYesterday = isSameDay(parseISO(date), subDays(startOfDay(new Date()), 1));
  
  const headerLabel = useMemo(() => {
    if (isToday) return '今天';
    if (isYesterday) return '昨天';
    if (isTomorrow) return '明天';
    return date;
  }, [date, isToday, isYesterday, isTomorrow]);

  const displayedTasks = (isToday || isTomorrow || !isPast) ? tasks : tasks.filter(t => t.completed);
  const readOnly = !(isToday || isTomorrow || !isPast);
  const coreTasks = displayedTasks.filter((t: Task) => t.type === 'CORE');
  const sideTasks = displayedTasks.filter((t: Task) => t.type === 'SIDE');

  const isEmptyDay = displayedTasks.length === 0 && !diaryValue.trim();

  const handleAddTask = (type: 'CORE' | 'SIDE') => {
    if (!newTaskTitle.trim() || readOnly) return;
    if (type === 'CORE' && coreTasks.length >= 7) return;
    store.addTask(newTaskTitle, date, type);
    setNewTaskTitle('');
  };

  const handleDiaryChange = (val: string) => {
    if (readOnly) return;
    setDiaryValue(val);
    store.saveDiary(date, val);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-6 flex flex-col gap-6"
    >
      <header className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ChevronRight size={24} className="rotate-180" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{headerLabel}</h1>
          <p className="text-sm text-gray-400 font-medium">{format(parseISO(date), 'yyyy年MM月dd日')}</p>
        </div>
      </header>

      {/* Tabs */}
      {!readOnly && !isTomorrow && (
        <div className="flex bg-gray-100 p-1 rounded-2xl">
          <button 
            onClick={() => setActiveTab('tasks')}
            className={cn(
              "flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
              activeTab === 'tasks' ? "bg-white shadow-sm text-primary" : "text-gray-400"
            )}
          >
            <Check size={14} /> 任务
          </button>
          <button 
            onClick={() => setActiveTab('diary')}
            className={cn(
              "flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
              activeTab === 'diary' ? "bg-white shadow-sm text-primary" : "text-gray-400"
            )}
          >
            <BookOpen size={14} /> 小记
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {activeTab === 'tasks' || isTomorrow ? (
          <motion.div 
            key="tasks"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col gap-8"
          >
            {isEmptyDay && readOnly ? (
              <div className="flex-1 flex flex-col items-center justify-center py-32 opacity-20 select-none">
                <div className="w-16 h-16 rounded-full border-2 border-current mb-6 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-current" />
                </div>
                <p className="text-xl font-bold tracking-[0.2em]">今天是纯粹的。</p>
              </div>
            ) : (
              <div className="flex flex-col gap-8">
                <section className="flex flex-col gap-4">
                  <div className="flex justify-between items-end">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      核心任务
                    </h3>
                    <span className="text-xs font-mono text-gray-400">{coreTasks.length}/7</span>
                  </div>
                  <div className="flex flex-col gap-3">
                    {coreTasks.map(t => (
                      <TaskItem 
                        key={t.id} 
                        task={t} 
                        readOnly={readOnly}
                        onToggle={() => store.toggleTask(t.id)} 
                        onDelete={() => store.deleteTask(t.id)} 
                        onUpdate={(title) => store.updateTask(t.id, { title })} 
                      />
                    ))}
                    {!readOnly && coreTasks.length < 7 && (
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="添加核心任务..." 
                          className="flex-1 bg-white border border-gray-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                          value={newTaskTitle}
                          onChange={e => setNewTaskTitle(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleAddTask('CORE')}
                        />
                        <button onClick={() => handleAddTask('CORE')} className="p-3 bg-primary text-white rounded-2xl hover:brightness-110 transition-all">
                          <Plus size={20} />
                        </button>
                      </div>
                    )}
                  </div>
                </section>

                {(sideTasks.length > 0 || !readOnly) && (
                  <section className="flex flex-col gap-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-500">
                      <div className="w-2 h-2 rounded-full bg-gray-300" />
                      副线任务
                    </h3>
                    <div className="flex flex-col gap-3">
                      {sideTasks.map(t => (
                        <TaskItem 
                          key={t.id} 
                          task={t} 
                          readOnly={readOnly}
                          onToggle={() => store.toggleTask(t.id)} 
                          onDelete={() => store.deleteTask(t.id)} 
                          onUpdate={(title) => store.updateTask(t.id, { title })} 
                        />
                      ))}
                      {!readOnly && (
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="添加副线任务..." 
                            className="flex-1 bg-white border border-gray-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                const val = (e.target as HTMLInputElement).value;
                                if (val.trim()) {
                                  store.addTask(val, date, 'SIDE');
                                  (e.target as HTMLInputElement).value = '';
                                }
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* Archive view also shows diary if tasks are visible */}
                {readOnly && diaryValue && (
                  <section className="flex flex-col gap-4 mt-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
                      <BookOpen size={20} />
                      当日小记
                    </h3>
                    <div className="p-6 rounded-[32px] bg-white border border-gray-50 shadow-sm text-sm leading-relaxed text-gray-600 font-medium italic whitespace-pre-wrap">
                      {diaryValue}
                    </div>
                  </section>
                )}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div 
            key="diary"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col gap-4"
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <BookOpen size={20} className="text-primary" />
                小记 / Diary
              </h3>
            </div>
            <textarea 
              className="w-full h-80 bg-white border border-gray-100 rounded-[32px] p-8 text-base font-medium leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none shadow-sm placeholder:text-gray-200"
              placeholder="写点什么..."
              value={diaryValue}
              onChange={e => handleDiaryChange(e.target.value)}
            />
            <p className="text-[10px] text-center font-black text-gray-300 uppercase tracking-widest mt-4">Automated Savings Enabled</p>
          </motion.div>
        )}
      </AnimatePresence>

      {isEmptyDay && !readOnly && activeTab === 'tasks' && (
        <div className="hidden" />
      )}
    </motion.div>
  );
}
function TaskItem({ task, onToggle, onDelete, onUpdate, readOnly }: { task: Task, onToggle: () => void, onDelete: () => void, onUpdate: (title: string) => void, readOnly?: boolean, key?: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);

  const handleUpdate = () => {
    if (editedTitle.trim() && !readOnly) {
      onUpdate(editedTitle);
    }
    setIsEditing(false);
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className={cn(
        "group flex items-center gap-4 p-4 rounded-2xl transition-all border border-transparent",
        task.completed ? "bg-gray-50/50" : "bg-white shadow-sm border-gray-50"
      )}
    >
      <button 
        disabled={readOnly}
        onClick={onToggle}
        className={cn(
          "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
          task.completed ? "bg-primary border-primary text-white" : "border-gray-200 text-transparent",
          readOnly && "opacity-50"
        )}
      >
        <Check size={14} strokeWidth={3} />
      </button>
      
      {isEditing && !readOnly ? (
        <input 
          autoFocus
          className="flex-1 text-sm font-medium bg-transparent outline-none border-b border-primary"
          value={editedTitle}
          onChange={e => setEditedTitle(e.target.value)}
          onBlur={handleUpdate}
          onKeyDown={e => e.key === 'Enter' && handleUpdate()}
        />
      ) : (
        <span 
          onClick={() => !readOnly && setIsEditing(true)}
          className={cn(
            "flex-1 text-sm font-medium transition-all",
            task.completed ? "text-gray-300 line-through" : "text-gray-700",
            !readOnly && "cursor-text"
          )}
        >
          {task.title}
        </span>
      )}
      
      {!readOnly && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
          <button onClick={() => setIsEditing(true)} className="p-2 text-gray-300 hover:text-primary">
            <Edit2 size={14} />
          </button>
          <button onClick={onDelete} className="p-2 text-gray-300 hover:text-red-400">
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </motion.div>
  );
}

// MEDAL VIEW (CALENDAR)
function MedalView({ store, onDateSelect }: { store: any, onDateSelect: (date: string) => void, key?: string }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [direction, setDirection] = useState(0);
  const today = startOfDay(new Date());
  
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate));
    const end = endOfWeek(endOfMonth(currentDate));
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const variants = getThemeVariants(store.state.theme);

  const getDayStyle = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const tasks = store.state.tasks.filter((t: any) => t.date === dateStr);
    const completed = tasks.filter((t: any) => t.completed).length;
    const isToday = isSameDay(date, today);
    const isPast = isBefore(date, today);
    const inMonth = isSameMonth(date, currentDate);
    
    if (!inMonth) {
      return { backgroundColor: 'transparent', color: '#EBEBEB' };
    }

    if (isToday) {
      return { 
        backgroundColor: variants.today, 
        color: '#FFFFFF',
        boxShadow: `0 10px 20px -5px ${variants.today}40`,
        zIndex: 1
      };
    }
    
    if (!isPast || completed === 0) {
      return { backgroundColor: '#FDFDFD', color: '#B0B0B0', border: '1px solid #F0F0F0' };
    }

    // Gradient based on completion
    const intensity = Math.min(0.3 + (completed / 7) * 0.7, 1);
    return { 
      backgroundColor: variants.today, 
      opacity: intensity,
      color: '#FFFFFF' 
    };
  };

  const nextMonth = () => {
    setDirection(1);
    setCurrentDate(prev => addMonths(prev, 1));
  };
  
  const prevMonth = () => {
    setDirection(-1);
    setCurrentDate(prev => subMonths(prev, 1));
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 100 : -100,
      opacity: 0
    })
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 pb-32 flex flex-col gap-8"
    >
      <header className="flex items-center justify-between px-2">
        <div className="flex flex-col">
          <h2 className="text-3xl font-black tracking-tighter uppercase text-gray-900">{format(currentDate, 'yyyy年')}</h2>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-primary">{format(currentDate, 'MM月')}</span>
            <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />
            <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{format(currentDate, 'MMM')}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="p-3 hover:bg-white hover:shadow-sm rounded-2xl transition-all active:scale-95">
            <ChevronLeft size={20} className="text-gray-400" />
          </button>
          <button onClick={nextMonth} className="p-3 hover:bg-white hover:shadow-sm rounded-2xl transition-all active:scale-95">
            <ChevronRight size={20} className="text-gray-400" />
          </button>
        </div>
      </header>

      <div className="relative overflow-hidden min-h-[350px]">
        <div className="grid grid-cols-7 mb-6">
          {['日', '一', '二', '三', '四', '五', '六'].map(d => (
            <div key={d} className="text-center text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">{d}</div>
          ))}
        </div>
        
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={format(currentDate, 'yyyy-MM')}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 }
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(e, { offset, velocity }) => {
              const swipe = Math.abs(offset.x) > 50;
              if (swipe && offset.x > 0) prevMonth();
              else if (swipe && offset.x < 0) nextMonth();
            }}
            className="grid grid-cols-7 gap-3 w-full"
          >
            {days.map((d) => {
              const dateStr = format(d, 'yyyy-MM-dd');
              const style = getDayStyle(d);
              const inMonth = isSameMonth(d, currentDate);
              const hasTasks = store.state.tasks.filter((t: any) => t.date === dateStr).length > 0;
              
              return (
                <button
                  key={dateStr}
                  disabled={!inMonth}
                  onClick={() => onDateSelect(dateStr)}
                  style={style}
                  className={cn(
                    "aspect-square rounded-2xl flex items-center justify-center text-[13px] font-bold transition-all relative overflow-hidden",
                    !inMonth && "cursor-default opacity-20",
                    inMonth && "hover:shadow-md hover:scale-105 active:scale-90"
                  )}
                >
                  {format(d, 'd')}
                  {inMonth && hasTasks && (
                    <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-400 shadow-sm ring-2 ring-white" />
                  )}
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

    </motion.div>
  );
}

// SETTINGS PAGE
function Settings({ store }: { store: any, key?: string }) {
  const themes = [
    { name: '森郁绿', color: '#A3B18A' },
    { name: '极境蓝', color: '#9DB4C0' },
    { name: '影夜紫', color: '#B1A7B6' },
    { name: '琥珀棕', color: '#D6CCC2' },
  ];

  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const dates = eachDayOfInterval({
        start: parseISO(startDate),
        end: parseISO(endDate)
      });

      const children: any[] = [
        new Paragraph({
          text: "人生无限 - 任务与小记导出",
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
        new Paragraph({
          text: `导出范围: ${startDate} 至 ${endDate}`,
          alignment: AlignmentType.CENTER,
          spacing: { after: 800 },
        }),
      ];

      dates.forEach(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const tasks = store.state.tasks.filter((t: Task) => t.date === dateStr);
        const diary = store.state.diaries.find((d: any) => d.date === dateStr);

        if (tasks.length > 0 || diary) {
          children.push(
            new Paragraph({
              text: format(date, 'yyyy年MM月dd日 (EEEE)'),
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 400, after: 200 },
            })
          );

          if (tasks.length > 0) {
            children.push(new Paragraph({ text: "【任务清单】", heading: HeadingLevel.HEADING_3, spacing: { before: 200 } }));
            tasks.forEach((t: Task) => {
              children.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: t.completed ? " [已完成] " : " [未完成] ",
                      bold: true,
                    }),
                    new TextRun(t.title),
                  ],
                })
              );
            });
          }

          if (diary && diary.content.trim()) {
            children.push(new Paragraph({ text: "【当日小记】", heading: HeadingLevel.HEADING_3, spacing: { before: 200 } }));
            children.push(
              new Paragraph({
                text: diary.content,
                spacing: { before: 100 },
              })
            );
          }

          children.push(new Paragraph({ text: "", spacing: { after: 200 } }));
        }
      });

      const doc = new Document({
        sections: [{
          properties: {},
          children: children,
        }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `人生无限_导出_${startDate}_${endDate}.docx`);
    } catch (error) {
      console.error("Export failed", error);
    } finally {
      setIsExporting(false);
    }
  };

  const setRangeLastMonth = () => {
    setStartDate(format(startOfMonth(subMonths(new Date(), 0)), 'yyyy-MM-dd'));
    setEndDate(format(endOfMonth(subMonths(new Date(), 0)), 'yyyy-MM-dd'));
  };

  const setRangeToday = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    setStartDate(today);
    setEndDate(today);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-8 pb-32 flex flex-col gap-10"
    >
      <header>
        <h2 className="text-3xl font-black tracking-tighter uppercase mb-2">设定</h2>
        <p className="text-sm text-gray-400 font-medium tracking-wide">MORANDI THEMES</p>
      </header>

      <section className="flex flex-col gap-6">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <SettingsIcon size={14} /> 数据导出 (WORD)
        </h3>
        <div className="p-6 rounded-[32px] bg-white shadow-sm border border-gray-50 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest pl-2">开始日期</label>
            <input 
              type="date" 
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest pl-2">结束日期</label>
            <input 
              type="date" 
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
            />
          </div>
          
          <div className="flex gap-2 mt-2">
            <button 
              onClick={setRangeToday}
              className="flex-1 py-3 bg-gray-50 text-gray-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all"
            >
              仅今天
            </button>
            <button 
              onClick={setRangeLastMonth}
              className="flex-1 py-3 bg-gray-50 text-gray-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all"
            >
              本月
            </button>
          </div>

          <button 
            onClick={handleExport}
            disabled={isExporting}
            className={cn(
              "mt-4 w-full py-4 bg-primary text-white rounded-[24px] text-sm font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2",
              isExporting && "opacity-50 cursor-not-allowed"
            )}
          >
            {isExporting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <BookOpen size={18} />}
            导出已选择范围
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">主题色调</h3>
        <div className="grid grid-cols-2 gap-4">
          {themes.map(t => (
            <button 
              key={t.color}
              onClick={() => store.setTheme(t.color)}
              className={cn(
                "p-4 rounded-3xl border-2 flex flex-col items-center gap-3 transition-all",
                store.state.theme === t.color ? "border-primary bg-primary/5 shadow-sm" : "border-gray-100 hover:border-gray-200"
              )}
            >
              <div className="w-12 h-12 rounded-full shadow-inner" style={{ backgroundColor: t.color }} />
              <span className="text-xs font-bold leading-none">{t.name}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">关于</h3>
        <div className="p-6 rounded-3xl bg-white shadow-sm border border-gray-50 text-sm leading-relaxed text-gray-600 font-medium">
          《人生无限》是一款关于时间的诗意复盘。通过莫兰迪色系的柔和触感，我们试图在嘈杂的世界中，为你留出一片纯粹的思考空间。
        </div>
      </section>
      
      <div className="mt-auto pt-10 text-center">
        <p className="text-[10px] font-black text-gray-200 uppercase tracking-widest">Morandi Edition v2.0</p>
      </div>
    </motion.div>
  );
}
