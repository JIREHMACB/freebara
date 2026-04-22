import React, { useState, useMemo, useEffect } from 'react';
import { X, Plus, Download, Calendar, ArrowUpRight, ArrowDownLeft, PiggyBank, CreditCard, Eye, EyeOff, Filter, ArrowUpDown, Wallet, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { api, socket } from '../lib/api';

const CATEGORIES = ['Salaires', 'Loyer', 'Alimentation', 'Vente', 'Fournitures', 'Autre'];

export default function FinancePage({ onBack }: { onBack: () => void }) {
  const [showBalance, setShowBalance] = useState(true);
  const [showOperationModal, setShowOperationModal] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filter, setFilter] = useState({ category: 'Tous', type: 'Tous' });
  const [sort, setSort] = useState({ key: 'date', direction: 'desc' });
  const [loading, setLoading] = useState(true);
  const [budgetProposals, setBudgetProposals] = useState<any[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [newOp, setNewOp] = useState({
    description: '',
    amount: '',
    category: CATEGORIES[0],
    type: 'income'
  });

  const fetchTransactions = async () => {
    try {
      const data = await api.users.getTransactions();
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();

    const handleTransactionUpdate = (newTransaction: any) => {
      setTransactions(prev => {
        // Check if transaction already exists to avoid duplicates
        if (prev.find(t => t.id === newTransaction.id)) return prev;
        return [newTransaction, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      });
    };

    socket.on('transaction_update', handleTransactionUpdate);

    return () => {
      socket.off('transaction_update', handleTransactionUpdate);
    };
  }, []);

  const filteredTransactions = useMemo(() => {
    let data = [...transactions];
    if (filter.category !== 'Tous') data = data.filter(t => t.category === filter.category);
    if (filter.type !== 'Tous') data = data.filter(t => t.type === filter.type);
    
    data.sort((a, b) => {
      const aVal = a[sort.key as keyof typeof a];
      const bVal = b[sort.key as keyof typeof b];
      if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return data;
  }, [transactions, filter, sort]);

  const balance = useMemo(() => transactions.reduce((acc, t) => t.type === 'income' ? acc + t.amount : t.type === 'expense' ? acc - t.amount : acc, 0), [transactions]);
  const totalIncome = useMemo(() => transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0), [transactions]);
  const totalExpense = useMemo(() => transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0), [transactions]);

  const handleAddOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOp.description || !newOp.amount) return;
    
    try {
      await api.users.addTransaction({
        date: new Date().toISOString().split('T')[0],
        description: newOp.description,
        category: newOp.category,
        amount: Number(newOp.amount),
        type: newOp.type
      });
      
      toast.success('Opération enregistrée');
      setShowOperationModal(false);
      setNewOp({ description: '', amount: '', category: CATEGORIES[0], type: 'income' });
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-20">
      <button onClick={onBack} className="text-slate-500 hover:text-slate-900 font-medium">← Retour</button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Mon Portefeuille</h1>
          <p className="text-sm sm:text-base text-slate-500">Gérez vos entrées et sorties d'argent en temps réel.</p>
        </div>
        <button onClick={() => setShowOperationModal(true)} className="w-full sm:w-auto bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors">
          <Plus size={20} /> Nouvelle opération
        </button>
      </div>

      {/* Virtual Card & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col justify-between h-56 sm:h-64">
          <div className="flex justify-between items-start">
            <span className="font-bold text-sm sm:text-base">FreeBara <span className="text-yellow-400">BLACK ELITE</span></span>
            <button onClick={() => setShowBalance(!showBalance)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              {showBalance ? <Eye size={20} /> : <EyeOff size={20} />}
            </button>
          </div>
          <div>
            <p className="text-slate-400 text-xs sm:text-sm mb-1">SOLDE COURANT</p>
            <p className="text-2xl sm:text-3xl font-black">{showBalance ? `${balance.toLocaleString()} FCFA` : '**** FCFA'}</p>
          </div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center">
            <ArrowDownLeft className="text-emerald-500 mb-2" size={24} />
            <p className="text-slate-500 text-xs sm:text-sm">Total Entrées</p>
            <p className="text-xl sm:text-2xl font-black text-slate-900">{totalIncome.toLocaleString()} FCFA</p>
          </div>
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center">
            <ArrowUpRight className="text-rose-500 mb-2" size={24} />
            <p className="text-slate-500 text-xs sm:text-sm">Total Sorties</p>
            <p className="text-xl sm:text-2xl font-black text-slate-900">{totalExpense.toLocaleString()} FCFA</p>
          </div>
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center">
            <PiggyBank className="text-indigo-500 mb-2" size={24} />
            <p className="text-slate-500 text-xs sm:text-sm">Solde actuel</p>
            <p className="text-xl sm:text-2xl font-black text-slate-900">{balance.toLocaleString()} FCFA</p>
          </div>
        </div>
      </div>

      {/* Budget Planner with AI */}
      <div className="bg-slate-900 p-6 sm:p-8 rounded-[32px] text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-primary/20 blur-3xl rounded-full"></div>
        <div className="relative z-10">
          <h2 className="text-xl sm:text-2xl font-black mb-2 flex items-center gap-3">
            <Sparkles className="text-amber-400" size={24} /> Planifier mon budget (IA)
          </h2>
          <p className="text-slate-400 mb-6 text-sm sm:text-base">
            Obtenez une planification budgétaire optimisée basée sur vos habitudes de dépenses.
          </p>
          <button 
            className="bg-white text-slate-900 px-6 py-3 rounded-2xl font-bold text-sm hover:bg-slate-100 transition-all shadow-lg"
            onClick={async () => {
              toast.loading("Analyse de vos finances en cours...", { id: 'ai-budget' });
              try {
                const { safeGenerateContent } = await import('../lib/gemini');
                const response = await safeGenerateContent({
                  model: 'gemini-3-flash-preview',
                  contents: `Analyse les transactions suivantes. Propose un budget mensuel sous forme d'un tableau JSON : [{id, category, amount, note}].
                  Transactions : ${JSON.stringify(transactions.slice(0, 20))}
                  Solde actuel : ${balance}`,
                  config: { responseMimeType: "application/json" }
                });
                const proposals = JSON.parse(response?.text || '[]');
                setBudgetProposals(proposals);
                toast.dismiss('ai-budget');
                toast.success('Budget analysé !');
              } catch (e) {
                toast.dismiss('ai-budget');
                toast.error("Erreur lors de l'analyse.");
              }
            }}
          >
            Lancer l'analyse IA
          </button>
        </div>
      </div>

      {/* AI Budget Proposals Display & Edit */}
      {budgetProposals.length > 0 && (
        <div className="bg-white p-6 sm:p-8 rounded-[32px] shadow-sm border border-slate-100 mt-6 transition-all duration-300">
          <div 
            className="flex justify-between items-center cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <h3 className="text-xl font-bold flex items-center gap-3">
              <Sparkles className="text-amber-500" size={24} /> 
              Propositions de l'Assistant IA
              <span className="text-sm font-normal text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{budgetProposals.length} suggestions</span>
            </h3>
            {isExpanded ? <ChevronUp size={24} className="text-slate-400" /> : <ChevronDown size={24} className="text-slate-400" />}
          </div>
          
          <motion.div 
            initial={false}
            animate={{ height: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 mt-6">
              {budgetProposals.map((prop, index) => (
                <div key={prop.id || index} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center bg-slate-50 p-5 rounded-2xl border border-slate-100 hover:border-primary/20 transition-colors">
                  <input 
                    className="bg-transparent font-bold text-slate-900 border-b border-transparent focus:border-primary outline-none" 
                    value={prop.category} 
                    onChange={(e) => {
                      const newProposals = [...budgetProposals];
                      newProposals[index].category = e.target.value;
                      setBudgetProposals(newProposals);
                    }}
                  />
                  <input 
                    type="number"
                    className="bg-transparent font-black text-primary border-b border-transparent focus:border-primary outline-none" 
                    value={prop.amount} 
                    onChange={(e) => {
                      const newProposals = [...budgetProposals];
                      newProposals[index].amount = Number(e.target.value);
                      setBudgetProposals(newProposals);
                    }}
                  />
                  <input 
                    className="bg-transparent text-slate-500 col-span-2 text-sm border-b border-transparent focus:border-primary outline-none" 
                    value={prop.note} 
                    onChange={(e) => {
                      const newProposals = [...budgetProposals];
                      newProposals[index].note = e.target.value;
                      setBudgetProposals(newProposals);
                    }}
                  />
                </div>
              ))}
              <div className="flex justify-end pt-2">
                <button 
                  disabled={isSaving}
                  onClick={async () => {
                    setIsSaving(true);
                    try {
                      await Promise.all(budgetProposals.map(prop => api.users.updateBudgetProposal(prop.id, prop)));
                      toast.success('Budget mis à jour');
                    } catch (e) { toast.error('Erreur sauvegarde'); }
                    finally { setIsSaving(false); }
                  }}
                  className="bg-slate-900 text-white rounded-2xl px-6 py-3 font-bold hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Sauvegarde...' : 'Sauvegarder tout le budget'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* History */}
      <div className="bg-white p-4 sm:p-8 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">Historique des transactions</h2>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <select className="w-full sm:w-auto p-2.5 sm:p-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:ring-2 focus:ring-primary/20 outline-none" onChange={(e) => setFilter({...filter, category: e.target.value})}>
              <option value="Tous">Toutes catégories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="w-full sm:w-auto p-2.5 sm:p-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:ring-2 focus:ring-primary/20 outline-none" onChange={(e) => setFilter({...filter, type: e.target.value})}>
              <option value="Tous">Tous types</option>
              <option value="income">Entrées</option>
              <option value="expense">Sorties</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <table className="w-full text-left min-w-[600px]">
            <thead>
              <tr className="text-slate-400 text-xs sm:text-sm border-b border-slate-100">
                <th className="pb-4 cursor-pointer hover:text-slate-600 transition-colors" onClick={() => setSort({key: 'date', direction: sort.direction === 'asc' ? 'desc' : 'asc'})}>DATE <ArrowUpDown size={14} className="inline"/></th>
                <th className="pb-4">DESCRIPTION</th>
                <th className="pb-4">CATÉGORIE</th>
                <th className="pb-4 cursor-pointer hover:text-slate-600 transition-colors" onClick={() => setSort({key: 'amount', direction: sort.direction === 'asc' ? 'desc' : 'asc'})}>MONTANT <ArrowUpDown size={14} className="inline"/></th>
                <th className="pb-4">TYPE</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">Aucune transaction trouvée.</td>
                </tr>
              ) : (
                filteredTransactions.map(t => (
                  <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 text-sm">{t.date}</td>
                    <td className="py-4 font-bold text-sm text-slate-900">{t.description}</td>
                    <td className="py-4"><span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">{t.category}</span></td>
                    <td className={`py-4 font-bold text-sm ${t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {t.type === 'expense' ? '-' : '+'}{t.amount.toLocaleString()} FCFA
                    </td>
                    <td className="py-4 capitalize text-sm text-slate-600">
                      {t.type === 'income' ? 'Entrée' : 'Sortie'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Operation Modal */}
      {showOperationModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[32px] w-full max-w-md p-6 sm:p-8 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Nouvelle opération</h2>
              <button onClick={() => setShowOperationModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            
            <form onSubmit={handleAddOperation} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                <input 
                  required 
                  value={newOp.description}
                  onChange={e => setNewOp({...newOp, description: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-900" 
                  placeholder="Ex: Vente de produit" 
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Montant (FCFA)</label>
                <input 
                  required 
                  type="number" 
                  min="0"
                  value={newOp.amount}
                  onChange={e => setNewOp({...newOp, amount: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-900" 
                  placeholder="Ex: 15000" 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Catégorie</label>
                  <select 
                    value={newOp.category}
                    onChange={e => setNewOp({...newOp, category: e.target.value})}
                    className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-900 appearance-none"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type</label>
                  <select 
                    value={newOp.type}
                    onChange={e => setNewOp({...newOp, type: e.target.value})}
                    className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-900 appearance-none"
                  >
                    <option value="income">Entrée</option>
                    <option value="expense">Sortie</option>
                  </select>
                </div>
              </div>
              
              <div className="flex gap-3 pt-6">
                <button 
                  type="button" 
                  onClick={() => setShowOperationModal(false)} 
                  className="flex-1 py-3.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-2xl font-bold transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3.5 bg-primary text-white hover:bg-primary/90 rounded-2xl font-bold shadow-lg shadow-primary/25 transition-all"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
