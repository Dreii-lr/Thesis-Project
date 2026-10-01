'use client';

import React, { useState, useEffect } from 'react';
import { ListTodo, Plus, Trash2, CheckSquare, ListChecks, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Task } from '@/src/data/mockAssessment';

type QuestionType = 'Multiple Choice' | 'True/False' | 'Matching Type';

interface QuestionItem {
  id: string;
  text?: string;
  options?: string[];
  correctAnswer?: string;
  premise?: string;
  match?: string;
}

interface CategoryConfig {
  id: string;
  type: QuestionType;
  poolSize: number;
  required: number;
  points: number;
  isExpanded: boolean;
  questions: QuestionItem[];
}

export default function AssessmentForm({ type, onSave, onCancel }: { type: 'Exam' | 'Quiz', onSave: (t: Task) => void, onCancel: () => void }) {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('CS201 - Data Structures');
  
  // Schedule & Timers State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [gracePeriod, setGracePeriod] = useState<number>(5);
  const [minDateTime, setMinDateTime] = useState('');

  // Set minimum date to "now" on component mount to prevent past dates
  useEffect(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setMinDateTime(now.toISOString().slice(0, 16));
  }, []);
  
  const [categories, setCategories] = useState<CategoryConfig[]>([{
    id: 'cat_mcq_1',
    type: 'Multiple Choice',
    poolSize: 1,
    required: 1,
    points: 1,
    isExpanded: true,
    questions: [{ id: 'q1', text: '', options: ['', '', '', ''], correctAnswer: 'Option 1' }]
  }]);
  
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);

  const totalPool = categories.reduce((sum, cat) => sum + cat.questions.length, 0);
  const totalRequired = categories.reduce((sum, cat) => sum + cat.required, 0);
  const maxScore = categories.reduce((sum, cat) => sum + (cat.required * cat.points), 0);

  const availableTypes: QuestionType[] = ['Multiple Choice', 'True/False', 'Matching Type'];
  const unaddedTypes = availableTypes.filter(t => !categories.some(c => c.type === t));

  const handleAddCategory = (qType: QuestionType) => {
    const newQuestion = qType === 'Multiple Choice' 
      ? { id: Math.random().toString(36).substr(2, 9), text: '', options: ['', '', '', ''], correctAnswer: 'Option 1' }
      : qType === 'True/False'
      ? { id: Math.random().toString(36).substr(2, 9), text: '', correctAnswer: 'True' }
      : { id: Math.random().toString(36).substr(2, 9), premise: '', match: '' };

    setCategories([...categories, {
      id: Math.random().toString(36).substr(2, 9),
      type: qType,
      poolSize: 1,
      required: 1,
      points: 1,
      isExpanded: true,
      questions: [newQuestion]
    }]);
    setShowCategoryMenu(false);
  };

  const updateCategory = (id: string, field: keyof CategoryConfig, value: any) => {
    setCategories(categories.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const addQuestionToCategory = (catId: string, qType: QuestionType) => {
    setCategories(categories.map(c => {
      if (c.id === catId) {
        const newQuestion = qType === 'Multiple Choice' 
          ? { id: Math.random().toString(36).substr(2, 9), text: '', options: ['', '', '', ''], correctAnswer: 'Option 1' }
          : qType === 'True/False'
          ? { id: Math.random().toString(36).substr(2, 9), text: '', correctAnswer: 'True' }
          : { id: Math.random().toString(36).substr(2, 9), premise: '', match: '' };
        
        return { ...c, questions: [...c.questions, newQuestion], poolSize: c.questions.length + 1 };
      }
      return c;
    }));
  };

  const updateQuestion = (catId: string, qId: string, field: string, value: any, optionIndex?: number) => {
    setCategories(categories.map(c => {
      if (c.id === catId) {
        const updatedQuestions = c.questions.map(q => {
          if (q.id === qId) {
            if (field === 'options' && q.options !== undefined && optionIndex !== undefined) {
              const newOptions = [...q.options];
              newOptions[optionIndex] = value;
              return { ...q, options: newOptions };
            }
            return { ...q, [field]: value };
          }
          return q;
        });
        return { ...c, questions: updatedQuestions };
      }
      return c;
    }));
  };

  const removeQuestion = (catId: string, qId: string) => {
    setCategories(categories.map(c => {
      if (c.id === catId) {
        const filtered = c.questions.filter(q => q.id !== qId);
        return { ...c, questions: filtered, poolSize: filtered.length };
      }
      return c;
    }));
  };

  const removeCategory = (id: string) => setCategories(categories.filter(c => c.id !== id));

  const getCategoryIcon = (qType: QuestionType) => {
    switch (qType) {
      case 'Multiple Choice': return <ListTodo size={16} />;
      case 'True/False': return <CheckSquare size={16} />;
      case 'Matching Type': return <ListChecks size={16} />;
    }
  };

  const handleSave = (status: 'Active' | 'Draft') => {
    if (!title) return alert(`Please enter a title for the ${type.toLowerCase()}.`);
    if (!startDate || !endDate) return alert('Please set both the Start and End dates for the assessment.');
    if (categories.length === 0) return alert('Please add at least one question category.');
    
    // Format the deadline to show up nicely in the dashboard table
    const formattedDeadline = `${new Date(startDate).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} to\n${new Date(endDate).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`;

    onSave({
      id: Math.random().toString(36).substr(2, 9),
      title: title,
      subject: subject,
      type: type,
      deadline: formattedDeadline,
      submissions: 0,
      status: status
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-5 font-sans">
      
      {/* Main Content */}
      <div className="flex-1 space-y-5">
        
        {/* Assessment Setup */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <h2 className="text-[15px] font-semibold text-slate-900 mb-6">Assessment Setup</h2>
          <div className="space-y-5">
            <div>
              <label className="block text-[12px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Assessment Title</label>
              <input 
                type="text" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder={`e.g., Midterm ${type}`} 
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-[13px] text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 placeholder:text-slate-400 transition-all" 
              />
            </div>
            <div>
              <label className="block text-[12px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Subject</label>
              <select 
                value={subject} 
                onChange={(e) => setSubject(e.target.value)} 
                className="w-full md:w-1/2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-[13px] text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all cursor-pointer"
              >
                <option>CS201 - Data Structures</option>
                <option>DB101 - Databases</option>
                <option>ENG101 - Comm Skills</option>
              </select>
            </div>

            {/* SCHEDULE & TIMERS */}
            <div>
              <h3 className="text-[14px] font-semibold text-slate-900 mb-4 mt-8 border-t border-slate-100 pt-6">Schedule & Timers</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[12px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Start Date & Time</label>
                  <input 
                    type="datetime-local" 
                    value={startDate}
                    min={minDateTime}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[13px] text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" 
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-slate-500 mb-2 uppercase tracking-wider">End / Closing Time</label>
                  <input 
                    type="datetime-local" 
                    value={endDate}
                    min={startDate || minDateTime}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[13px] text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" 
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Grace Period (Mins)</label>
                  <input 
                    type="number" 
                    value={gracePeriod}
                    onChange={(e) => setGracePeriod(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[13px] text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" 
                  />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Question Configuration (CORE LOGIC & AUTHORING) */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)] relative overflow-visible">
          <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider shadow-sm">
            Core Logic & Authoring
          </div>
          
          <h2 className="text-[15px] font-semibold text-slate-900 mb-1">Question Configuration</h2>
          <p className="text-[13px] text-slate-500 mb-6">Build your question pool and specify delivery limits.</p>
          
          <div className="space-y-6 mb-4">
            {categories.map((cat) => (
              <div key={cat.id} className="bg-slate-50/50 border border-slate-200 rounded-xl overflow-hidden transition-all hover:border-blue-200 hover:shadow-sm">
                
                {/* Category Header */}
                <div className="p-5 border-b border-slate-200 bg-white">
                  <div className="flex justify-between items-center mb-5">
                    <div className="flex items-center gap-2 text-blue-700 font-bold text-[13px]">
                      {getCategoryIcon(cat.type)} {cat.type}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateCategory(cat.id, 'isExpanded', !cat.isExpanded)} className="text-slate-400 hover:text-blue-600 transition-colors p-1.5 rounded-md hover:bg-blue-50">
                        {cat.isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      <button onClick={() => removeCategory(cat.id)} className="text-slate-400 hover:text-rose-500 transition-colors p-1.5 rounded-md hover:bg-rose-50">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Category Config */}
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 w-32 shadow-sm">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Items Authored</p>
                      <p className="text-2xl font-black text-slate-900 mt-1">{cat.questions.length}</p>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Required Delivery</p>
                      <input type="number" value={cat.required} onChange={(e) => updateCategory(cat.id, 'required', Math.max(1, Number(e.target.value)))} max={cat.questions.length} className="w-16 bg-transparent border-b-2 border-slate-300 text-center text-lg font-bold text-slate-900 focus:outline-none focus:border-blue-600 pb-1 transition-colors" />
                    </div>

                    <div className="text-center">
                      <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Points Each</p>
                      <input type="number" value={cat.points} onChange={(e) => updateCategory(cat.id, 'points', Math.max(1, Number(e.target.value)))} className="w-16 bg-transparent border-b-2 border-slate-300 text-center text-lg font-bold text-slate-900 focus:outline-none focus:border-blue-600 pb-1 transition-colors" />
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Category Total</p>
                      <p className="text-xl font-black text-blue-600 mt-1">{cat.required * cat.points} pts</p>
                    </div>
                  </div>
                </div>

                {/* Authoring Section */}
                {cat.isExpanded && (
                  <div className="p-5 bg-slate-50/50 space-y-6">
                    {cat.questions.map((q, index) => (
                      <div key={q.id} className="bg-white border border-slate-200 rounded-lg p-5 relative shadow-sm">
                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                          Item {index + 1}
                        </div>
                        <button onClick={() => removeQuestion(cat.id, q.id)} className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 transition-colors">
                          <Trash2 size={14} />
                        </button>

                        {cat.type === 'Multiple Choice' && (
                          <div className="mt-2 space-y-4">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Question Text</label>
                              <input type="text" value={q.text} onChange={(e) => updateQuestion(cat.id, q.id, 'text', e.target.value)} placeholder="Enter your question..." className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[13px] text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {q.options?.map((opt, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <span className="text-[11px] font-bold text-slate-400">Opt {i+1}</span>
                                  <input type="text" value={opt} onChange={(e) => updateQuestion(cat.id, q.id, 'options', e.target.value, i)} placeholder={`Option ${i+1}`} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[13px] text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" />
                                </div>
                              ))}
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Correct Answer</label>
                              <select value={q.correctAnswer} onChange={(e) => updateQuestion(cat.id, q.id, 'correctAnswer', e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[13px] font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer">
                                <option>Option 1</option><option>Option 2</option><option>Option 3</option><option>Option 4</option>
                              </select>
                            </div>
                          </div>
                        )}

                        {cat.type === 'True/False' && (
                          <div className="mt-2 space-y-4">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Statement</label>
                              <input type="text" value={q.text} onChange={(e) => updateQuestion(cat.id, q.id, 'text', e.target.value)} placeholder="e.g., The Earth is flat." className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[13px] text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Correct Answer</label>
                              <select value={q.correctAnswer} onChange={(e) => updateQuestion(cat.id, q.id, 'correctAnswer', e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[13px] font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer">
                                <option>True</option><option>False</option>
                              </select>
                            </div>
                          </div>
                        )}

                        {cat.type === 'Matching Type' && (
                          <div className="mt-2 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Premise (Column A)</label>
                                <input type="text" value={q.premise || ''} onChange={(e) => updateQuestion(cat.id, q.id, 'premise', e.target.value)} placeholder="e.g., Stack" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[13px] text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Match (Column B)</label>
                                <input type="text" value={q.match || ''} onChange={(e) => updateQuestion(cat.id, q.id, 'match', e.target.value)} placeholder="e.g., LIFO" className="w-full bg-emerald-50/50 border border-emerald-200 rounded-lg px-3 py-2 text-[13px] text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    
                    <button onClick={() => addQuestionToCategory(cat.id, cat.type)} className="w-full bg-white border-2 border-dashed border-slate-200 text-blue-600 hover:border-blue-300 hover:bg-blue-50 rounded-lg py-3 text-[13px] font-bold flex items-center justify-center gap-2 transition-all">
                      <Plus size={16} /> Add Another Question
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add Category Button */}
          {unaddedTypes.length > 0 && (
            <div className="relative">
              {showCategoryMenu ? (
                <div className="absolute top-0 left-0 w-full bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-10 flex flex-col gap-1">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 py-2">Select Category</p>
                  {unaddedTypes.map((t) => (
                    <button key={t} onClick={() => handleAddCategory(t)} className="w-full text-left px-3 py-2.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 rounded-lg transition-colors flex items-center gap-2">
                      {getCategoryIcon(t)} {t}
                    </button>
                  ))}
                  <button onClick={() => setShowCategoryMenu(false)} className="w-full text-left px-3 py-2 text-[12px] font-semibold text-slate-400 hover:bg-slate-50 rounded-lg mt-1">
                    Cancel
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowCategoryMenu(true)} className="w-full bg-slate-50 border-2 border-dashed border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300 hover:bg-slate-100 rounded-xl py-4 text-[13px] font-bold flex items-center justify-center gap-2 transition-all">
                  <Plus size={16} /> Add Question Category
                </button>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Right Column - Summary */}
      <div className="w-full lg:w-72 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)] h-fit sticky top-8">
        <h2 className="text-[15px] font-semibold text-slate-900 mb-5">Summary</h2>
        <div className="space-y-4 mb-8">
          <div className="flex justify-between items-center text-[13px]">
            <span className="text-slate-500">Total Authored</span>
            <span className="font-semibold text-slate-900">{totalPool} Items</span>
          </div>
          <div className="flex justify-between items-center text-[13px] border-b border-slate-100 pb-4">
            <span className="text-slate-500">Required Delivery</span>
            <span className="font-semibold text-slate-900">{totalRequired} Items</span>
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="text-slate-500 font-bold uppercase text-[11px] tracking-wider">Max Score</span>
            <span className="font-black text-blue-600 text-2xl">{maxScore} pts</span>
          </div>
        </div>
        <div className="space-y-2.5">
          <button onClick={() => handleSave('Draft')} className="w-full inline-flex h-10 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-700 py-2.5 text-[13px] font-semibold transition-colors hover:bg-slate-50 shadow-sm">
            Save Draft
          </button>
          <button onClick={() => handleSave('Active')} className="w-full inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-[13px] font-semibold text-white shadow-sm shadow-blue-600/15 transition-all hover:bg-blue-700 hover:shadow-md focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100">
            Publish {type}
          </button>
          <button onClick={onCancel} className="w-full inline-flex h-10 items-center justify-center rounded-xl bg-transparent text-slate-500 py-2.5 text-[13px] font-semibold transition-colors hover:text-slate-700 mt-2">
            Cancel
          </button>
        </div>
      </div>
      
    </div>
  );
}