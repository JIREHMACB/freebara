import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, ShoppingCart, Package, Users, 
  Plus, Edit3, Trash2, ChevronRight, 
  ArrowUpRight, ArrowDownRight, DollarSign,
  Clock, CheckCircle2, XCircle, MoreVertical,
  Image as ImageIcon, X, Search, Sparkles, Tag, Loader2, Lightbulb, Check, Award, Star
} from 'lucide-react';
import { api, socket } from '../lib/api';
import { getAI, safeGenerateContent, Type } from '../lib/gemini';
import { toast } from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area,
  BarChart, Bar
} from 'recharts';
import SaleCelebration from './SaleCelebration';

interface ShopDashboardProps {
  company: any;
  onClose: () => void;
}

const MotionDiv = motion.div;

function AssistantTab({ insights, orders, catalog, stock, company, transactions }: { 
  insights: any, 
  orders: any[], 
  catalog: any[], 
  stock: any[], 
  company: any,
  transactions: any[]
}) {
  const [activeSubTab, setActiveSubTab] = useState<'operations' | 'orders' | 'shops' | 'stock'>('operations');
  const [mode, setMode] = useState<'analysis' | 'mentor'>('analysis');
  const [autoPilot, setAutoPilot] = useState(false);
  const [analysis, setAnalysis] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [selectedExpertAction, setSelectedExpertAction] = useState<any>(null);
  const [isAnalyzingExpert, setIsAnalyzingExpert] = useState(false);
  const [expertActions, setExpertActions] = useState<any[]>([]);
  const [loadingMentor, setLoadingMentor] = useState(false);

  const iconMap: Record<string, any> = {
    'Users': Users,
    'Package': Package,
    'Tag': Tag,
    'TrendingUp': TrendingUp,
    'ShoppingCart': ShoppingCart,
    'DollarSign': DollarSign
  };

  const fetchMentorInsights = async () => {
    if (loadingMentor) return;
    try {
      setLoadingMentor(true);
      
      const shopContext = {
        name: company.name,
        sector: company.sector,
        insights,
        catalog: catalog.map(p => ({ name: p.name, price: p.price, tag: p.tag })),
        recentOrders: orders.slice(0, 10),
        lowStock: stock.filter(s => s.quantity <= s.minQuantity),
        financials: {
          balance: transactions.reduce((acc, t) => t.type === 'income' ? acc + t.amount : acc - t.amount, 0),
          recentTransactions: transactions.slice(0, 10)
        }
      };

      const prompt = `En tant que Mentor en Business Intelligence EXTRÊMEMENT PRÉCIS pour la boutique "${company.name}", analyse les données opérationnelles et financières RÉELLES suivantes pour générer 3 actions stratégiques prioritaires.
      
      DONNÉES OPÉRATIONNELLES ET FINANCIÈRES :
      ${JSON.stringify(shopContext)}

      DIRECTIVES :
      - Analyse le ratio stock/ventes pour identifier les surstocks ou ruptures imminentes.
      - Examine les flux de trésorerie récents pour suggérer des optimisations de budget.
      - Identifie les produits "vaches à lait" vs les "poids morts".
      - Propose des recommandations strictement basées sur les chiffres fournis.

      RETOURNE UNIQUEMENT UN JSON :
      {
        "actions": [
          {
            "id": "unique_id",
            "title": "Titre court",
            "desc": "Description concise",
            "iconName": "Users | Package | Tag | TrendingUp | ShoppingCart | DollarSign",
            "impact": "Critique | Haut | Moyen",
            "complexity": "Basse | Moyenne | Haute",
            "roi": "Gain estimé (ex: +15% CA)",
            "deepAnalysis": "Analyse détaillée expliquant l'opportunité chiffrée",
            "steps": ["Étape 1", "Étape 2"]
          }
        ]
      }`;

      const response = await safeGenerateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              actions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    desc: { type: Type.STRING },
                    iconName: { type: Type.STRING },
                    impact: { type: Type.STRING },
                    complexity: { type: Type.STRING },
                    roi: { type: Type.STRING },
                    deepAnalysis: { type: Type.STRING },
                    steps: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ["id", "title", "desc", "iconName", "impact", "complexity", "roi", "deepAnalysis", "steps"]
                }
              }
            }
          }
        }
      });

      const result = JSON.parse(response?.text || '{"actions": []}');
      setExpertActions(result.actions);
    } catch (err) {
      console.error(err);
      toast.error('Erreur Mentor IA');
    } finally {
      setLoadingMentor(false);
    }
  };

  useEffect(() => {
    if (mode === 'mentor' && expertActions.length === 0 && !loadingMentor) {
      fetchMentorInsights();
    }
  }, [mode]);

  const handleAnalysExpert = (action: any) => {
    setIsAnalyzingExpert(true);
    setSelectedExpertAction(null);
    
    // Simulate deep AI thinking (the analysis is already in action.deepAnalysis)
    setTimeout(() => {
      setIsAnalyzingExpert(false);
      setSelectedExpertAction(action);
    }, 1500);
  };

  const runAnalysis = async (tab: 'operations' | 'orders' | 'shops' | 'stock') => {
    if (loading) return;
    try {
      setLoading(true);
      
      let dataToAnalyze = "";
      let focus = "";
      
      const financialContext = `Données financières (CA, Dépenses) : ${JSON.stringify(transactions.slice(0, 20))}`;
      
      if (tab === 'operations') {
        dataToAnalyze = `Insights Globaux : ${JSON.stringify(insights)}\n${financialContext}`;
        focus = "les KPIs de performance, la rentabilité financière et l'efficacité opérationnelle";
      } else if (tab === 'orders') {
        dataToAnalyze = `Historique Commandes : ${JSON.stringify(orders.slice(0, 30))}\n${financialContext}`;
        focus = "le comportement d'achat et l'optimisation des revenus par client";
      } else if (tab === 'stock') {
        dataToAnalyze = `État Stock : ${JSON.stringify(stock.map(s => ({ productName: s.productName, quantity: s.quantity, minQty: s.minQuantity })))}
        \nArticles Catalogue : ${JSON.stringify(catalog.map(p => ({ name: p.name, price: p.price })))}
        \nTransactions liées au stock : ${JSON.stringify(transactions.filter(t => t.category === 'Fournitures' || t.category === 'Autre').slice(0, 10))}`;
        focus = "la gestion de l'inventaire et l'impact financier des ruptures/surstocks";
      } else {
        dataToAnalyze = `Catalogue : ${JSON.stringify(catalog.map(p => ({ name: p.name, price: p.price, category: p.category, tag: p.tag })))}\nPerformances par Produit : ${JSON.stringify(insights?.topProducts || [])}`;
        focus = "la stratégie de prix, le merchandising, l'attractivité des offres promotionnelles et le positionnement marché";
      }

      const prompt = `Expert Strategique IA pour "${company.name}". Secteur: ${company.sector}. 
      Analyse ces données OPÉRATIONNELLES ET FINANCIÈRES pour fournir des recommandations stratégiques.
      
      FOCUS : ${focus}.
      
      DONNÉES :
      ${dataToAnalyze}
      
      CONSIGNES :
      - Sois extrêmement précis. Cite des chiffres (CA, montants de transactions, volumes de stock).
      - Propose des actions pour augmenter le profit net.
      
      FORMAT DE RÉPONSE (JSON uniquement) :
      {
        "summary": "Résumé analytique contextuel",
        "solutions": "Paragraphe de recommandations",
        "challenges": [
          {
            "title": "...",
            "description": "...",
            "action": "...",
            "deadline": "...",
            "impact": "Haut | Moyen | Bas"
          }
        ]
      }`;

      const response = await safeGenerateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              solutions: { type: Type.STRING },
              challenges: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    action: { type: Type.STRING },
                    deadline: { type: Type.STRING },
                    impact: { type: Type.STRING }
                  },
                  required: ["title", "description", "action", "deadline", "impact"]
                }
              }
            },
            required: ["summary", "solutions", "challenges"]
          }
        }
      });

      const analysisResult = JSON.parse(response?.text || '{}');
      setAnalysis(prev => ({ ...prev, [tab]: analysisResult }));
    } catch (err) {
      console.error(err);
      toast.error('Erreur Analyse IA');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!analysis[activeSubTab] && !loading) {
      runAnalysis(activeSubTab);
    }
  }, [activeSubTab]);

  const currentAnalysis = analysis[activeSubTab];

  return (
    <div className="space-y-8">
      <MotionDiv
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div className="bg-gradient-to-br from-primary/10 to-blue-500/10 p-8 rounded-[32px] border border-primary/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Sparkles size={120} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                  <Sparkles size={24} />
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Assistant Stratégique IA</h2>
              </div>
              
              <div className="flex p-1 bg-white/40 backdrop-blur-sm rounded-xl border border-white/50">
                <button onClick={() => setMode('analysis')} className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${mode === 'analysis' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-white/50'}`}>Analyse rapide</button>
                <button onClick={() => setMode('mentor')} className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${mode === 'mentor' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-white/50'}`}>Mentor</button>
              </div>
            </div>
            
            {mode === 'analysis' && (
              <>
                <p className="text-slate-600 font-medium max-w-2xl mb-6">
                  L'IA analyse vos données pour vous proposer des stratégies ciblées par section.
                </p>
                
                <div className="flex gap-2 p-1 bg-white/50 backdrop-blur-sm rounded-xl w-fit mt-6 border border-white/50">
                  {[
                    { id: 'operations', label: 'Opérations', icon: TrendingUp },
                    { id: 'orders', label: 'Commandes', icon: ShoppingCart },
                    { id: 'shops', label: 'Boutique', icon: Package },
                    { id: 'stock', label: 'Stock', icon: Package }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveSubTab(tab.id as any)}
                      className={`px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-2 ${
                        activeSubTab === tab.id ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:bg-white/30'
                      }`}
                    >
                      <tab.icon size={14} />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {mode === 'mentor' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-slate-900 font-bold text-lg">
                      Business Intelligence Mentor
                    </p>
                    <p className="text-slate-500 text-sm font-medium flex items-center gap-2">
                      Analyse prédictive en temps réel • {autoPilot ? 'Mode Autonome' : 'Mode Conseil'}
                      <button 
                        onClick={fetchMentorInsights} 
                        disabled={loadingMentor}
                        className="ml-2 p-1 hover:bg-slate-100 rounded-md transition-colors text-primary"
                        title="Rafraîchir les analyses"
                      >
                        <Loader2 size={14} className={loadingMentor ? 'animate-spin' : ''} />
                      </button>
                    </p>
                  </div>
                  <div className="flex items-center gap-3 bg-white/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/50 shadow-sm">
                    <div className="flex flex-col items-end">
                      <span className={`text-[10px] font-black uppercase tracking-tighter ${autoPilot ? 'text-primary' : 'text-slate-400'}`}>
                        Auto-Pilot Engine
                      </span>
                      <span className="text-[9px] text-slate-400 font-bold">V 2.4.0 High-Perf</span>
                    </div>
                    <button 
                      onClick={() => setAutoPilot(!autoPilot)} 
                      className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${autoPilot ? 'bg-primary' : 'bg-slate-300'}`}
                    >
                       <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 ${autoPilot ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {loadingMentor ? (
                    [1, 2, 3].map(i => (
                      <div key={i} className="bg-white/40 h-48 rounded-[32px] animate-pulse"></div>
                    ))
                  ) : (
                    expertActions.map((act, idx) => {
                      const Icon = iconMap[act.iconName] || Lightbulb;
                      return (
                        <motion.div 
                          key={`${act.id}-${idx}`} 
                          whileHover={{ y: -4 }}
                          className="bg-white/80 backdrop-blur-sm p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all space-y-4 group"
                        >
                          <div className="flex justify-between items-start">
                             <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                               selectedExpertAction?.id === act.id ? 'bg-primary text-white' : 'bg-primary/5 text-primary group-hover:bg-primary/10'
                             }`}>
                                <Icon size={24} />
                             </div>
                             <div className="flex flex-col items-end gap-1">
                               <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                 act.impact === 'Critique' ? 'bg-red-100 text-red-600' : 
                                 act.impact === 'Haut' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                               }`}>
                                 {act.impact}
                               </span>
                               <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">ROI: {act.roi}</span>
                             </div>
                          </div>

                          <div>
                            <h4 className="font-black text-slate-900 text-lg tracking-tight mb-1 line-clamp-1">{act.title}</h4>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2">{act.desc}</p>
                          </div>

                          <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                             <div className="flex flex-col">
                               <span className="text-[9px] font-black text-slate-400 uppercase">Complexité</span>
                               <span className="text-xs font-bold text-slate-700">{act.complexity}</span>
                             </div>
                             {autoPilot ? (
                               <div className="flex items-center gap-1.5 text-primary animate-pulse">
                                 <CheckCircle2 size={14} />
                                 <span className="text-[10px] font-black uppercase">Optimisé</span>
                               </div>
                             ) : (
                               <button 
                                 onClick={() => handleAnalysExpert(act)}
                                 disabled={isAnalyzingExpert}
                                 className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                   selectedExpertAction?.id === act.id 
                                   ? 'bg-slate-900 text-white' 
                                   : 'bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95'
                                 }`}
                               >
                                 {isAnalyzingExpert ? 'Analyse...' : 'Analyser & Valider'}
                               </button>
                             )}
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>

                <AnimatePresence mode="wait">
                  {isAnalyzingExpert && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-slate-950 text-white p-8 rounded-[38px] flex flex-col items-center justify-center space-y-6"
                    >
                      <div className="relative">
                        <div className="w-16 h-16 border-2 border-white/10 border-t-primary rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Sparkles size={20} className="text-primary animate-pulse" />
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-2">Neural Engine Processing</p>
                        <h3 className="text-xl font-bold italic serif">Extraction d'insights haute-fidelité...</h3>
                      </div>
                    </motion.div>
                  )}

                  {selectedExpertAction && !isAnalyzingExpert && (() => {
                    const ActionIcon = iconMap[selectedExpertAction.iconName] || Lightbulb;
                    return (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-8 bg-slate-900 text-white p-10 rounded-[40px] border border-white/10 shadow-2xl relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 p-10 opacity-5">
                          <ActionIcon size={200} />
                        </div>

                        <div className="md:col-span-2 space-y-8 relative z-10">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-primary text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/40">
                              <ActionIcon size={28} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Analyse Experte Confirmée</span>
                                <div className="w-1 h-1 rounded-full bg-primary animate-ping"></div>
                              </div>
                              <h3 className="text-3xl font-black tracking-tighter">{selectedExpertAction.title}</h3>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <p className="text-slate-400 text-sm font-black uppercase tracking-widest italic">Diagnostic Profond</p>
                            <p className="text-xl text-slate-100 font-medium leading-relaxed">
                              "{selectedExpertAction.deepAnalysis}"
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                              <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Gain Temporel</p>
                              <p className="text-lg font-bold">~140 min/semaine</p>
                            </div>
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                              <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Impact Chiffre</p>
                              <p className="text-lg font-bold text-green-400">{selectedExpertAction.roi}</p>
                            </div>
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                              <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Statut IA</p>
                              <p className="text-lg font-bold">Prêt à exécuter</p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[32px] border border-white/10 space-y-6 flex flex-col relative z-10">
                          <h4 className="text-sm font-black uppercase tracking-widest text-primary">Plan d'action IA</h4>
                          <div className="space-y-4 flex-1">
                            {selectedExpertAction.steps.map((step: string, i: number) => (
                              <div key={i} className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-[10px] font-black flex items-center justify-center shrink-0">
                                  {i + 1}
                                </div>
                                <p className="text-xs text-slate-300 font-medium">{step}</p>
                              </div>
                            ))}
                          </div>
                          <button 
                            onClick={() => {
                              toast.success("Action transmise à l'IA pour exécution immédiate.");
                              setSelectedExpertAction(null);
                            }}
                            className="w-full py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary-hover active:scale-95 transition-all"
                          >
                            Lancer l'Exécution
                          </button>
                        </div>
                      </motion.div>
                    );
                  })()}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </MotionDiv>

      {mode === 'analysis' && (
        loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[32px] border border-slate-100 shadow-sm space-y-6">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-primary">
                <Sparkles size={24} className="animate-pulse" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-slate-900">Analyse en cours...</h3>
              <p className="text-slate-500 font-medium max-w-xs mx-auto">
                L'IA examine vos données de {activeSubTab === 'operations' ? 'performance' : activeSubTab === 'orders' ? 'commandes' : 'catalogue'} pour générer des recommandations stratégiques.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full px-8 opacity-40">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-slate-50 rounded-2xl animate-pulse"></div>
              ))}
            </div>
          </div>
        ) : currentAnalysis ? (
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <CheckCircle2 className="text-green-500" size={20} />
                Résumé de l'analyse : {activeSubTab === 'operations' ? 'Opérations' : activeSubTab === 'orders' ? 'Commandes' : 'Boutique'}
              </h3>
              <p className="text-slate-600 leading-relaxed font-medium mb-8">
                {currentAnalysis.summary}
              </p>
              
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Sparkles className="text-primary" size={20} />
                Solutions Stratégiques
              </h3>
              <p className="text-slate-600 leading-relaxed font-medium">
                {currentAnalysis.solutions}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {currentAnalysis.challenges.map((challenge: any, idx: number) => (
                <motion.div
                  key={idx}
                  whileHover={{ y: -5 }}
                  className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col group"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      challenge.impact === 'Haut' ? 'bg-orange-100 text-orange-600' : 
                      challenge.impact === 'Moyen' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'
                    }`}>
                      Impact {challenge.impact}
                    </div>
                    <div className="text-slate-400 group-hover:text-primary transition-colors">
                      <TrendingUp size={24} />
                    </div>
                  </div>
                  <h4 className="text-xl font-black text-slate-900 mb-3 tracking-tight">{challenge.title}</h4>
                  <p className="text-sm text-slate-500 mb-6 flex-1 leading-relaxed">
                    {challenge.description}
                  </p>
                  <div className="space-y-4 pt-6 border-t border-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                        <Clock size={16} />
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Délai</div>
                        <div className="text-sm font-bold text-slate-900">{challenge.deadline}</div>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl">
                      <div className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Action recommandée</div>
                      <p className="text-xs font-bold text-slate-700 leading-relaxed">
                        {challenge.action}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <button 
              onClick={() => runAnalysis(activeSubTab)}
              disabled={loading}
              className="mt-6 px-6 py-3 bg-white text-primary rounded-xl font-bold text-sm shadow-sm border border-primary/10 hover:bg-primary/5 transition-all flex items-center gap-2"
            >
              <TrendingUp size={18} />
              Relancer l'analyse {activeSubTab === 'operations' ? 'Opérations' : activeSubTab === 'orders' ? 'Commandes' : 'Boutique'}
            </button>
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-[32px] border border-slate-100">
            <Sparkles className="mx-auto mb-4 text-slate-200" size={48} />
            <p className="text-slate-500 font-medium">Cliquez sur le bouton pour lancer l'analyse stratégique.</p>
            <button 
              onClick={() => runAnalysis(activeSubTab)}
              className="mt-6 px-8 py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all"
            >
              Lancer l'Assistant IA
            </button>
          </div>
        )
      )}
    </div>
  );
}

// Assurez-vous que le composant est bien fermé avant la suite
export default function ShopDashboard({ company, onClose }: ShopDashboardProps) {
  const [activeTab, setActiveTab] = useState<'operations' | 'orders' | 'shops' | 'assistant' | 'stock'>('shops');
  const [insights, setInsights] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [stock, setStock] = useState<any[]>([]);
  const [productMovements, setProductMovements] = useState<Record<number, any[]>>({});
  const [addQtys, setAddQtys] = useState<Record<number, number>>({});
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);

  const triggerCelebration = () => {
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 3000);
  };

  const exportToPDF = (productName: string, movements: any[]) => {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text(`Historique des approvisionnements - ${productName}`, 14, 15);
      autoTable(doc, {
          startY: 25,
          head: [['Date', 'Heure', 'Quantité']],
          body: movements
              .filter(m => m.type === 'purchase')
              .map(m => [
                  new Date(m.createdAt).toLocaleDateString(),
                  new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  `+${m.quantity}`
              ]),
      });
      doc.save(`approvisionnements_${productName.replace(/ /g, '_')}.pdf`);
  };
  const [productToDelete, setProductToDelete] = useState<number | null>(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [assistantData, setAssistantData] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  
  // Product Form State
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    imageUrls: [] as string[],
    tag: '',
    tagValue: ''
  });
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [selectedTagProducts, setSelectedTagProducts] = useState<number[]>([]);
  const [tagForm, setTagForm] = useState({ tag: '', tagValue: '' });
  const [expandedProducts, setExpandedProducts] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchDashboardData();

    // Socket listeners for real-time updates
    const handleNewOrder = (data: any) => {
      if (Number(data.companyId) === Number(company.id)) {
        setOrders(prev => [data.order, ...prev]);
        toast.success('Nouvelle commande reçue !', { icon: '🛍️' });
        // Refresh insights to update charts/stats
        api.companies.getInsights(company.id).then(setInsights);
      }
    };

    const handleOrderStatusUpdate = (data: any) => {
      if (Number(data.companyId) === Number(company.id)) {
        let shouldTrigger = false;
        
        setOrders(prev => {
          const updatedOrders = prev.map(o => o.id === Number(data.orderId) ? { ...o, status: data.status } : o);
          
          const oldOrder = prev.find(o => o.id === Number(data.orderId));
          
          if (data.status === 'confirmed' && oldOrder?.status !== 'confirmed') {
            const confirmedCount = updatedOrders.filter(o => o.status === 'confirmed').length;
            if (confirmedCount === 1 || confirmedCount % 100 === 0) {
              shouldTrigger = true;
            }
          }
          return updatedOrders;
        });

        if (shouldTrigger) {
          triggerCelebration();
        }
      }
    };

    const handleStockAlert = (data: any) => {
      toast.error(`Alerte stock : Un produit atteint son seuil critique (${data.quantity} restants)`, { icon: '⚠️', duration: 8000 });
      fetchDashboardData();
    };

    socket.on('new_shop_order', handleNewOrder);
    socket.on('shop_order_status_updated', handleOrderStatusUpdate);
    socket.on('stock_alert', handleStockAlert);

    return () => {
      socket.off('new_shop_order', handleNewOrder);
      socket.off('shop_order_status_updated', handleOrderStatusUpdate);
      socket.off('stock_alert', handleStockAlert);
    };
  }, [company.id]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [insightsData, ordersData, catalogData, stockData, transactionsData] = await Promise.all([
        api.companies.getInsights(company.id),
        api.companies.getOrders(company.id),
        api.companies.getCatalog(company.id),
        api.companies.getStock(company.id),
        api.users.getTransactions()
      ]);
      setInsights(insightsData);
      setOrders(ordersData);
      setCatalog(catalogData);
      setStock(stockData);
      setTransactions(transactionsData);
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors du chargement du tableau de bord');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: number, status: string) => {
    try {
      await api.companies.updateOrderStatus(orderId, status);
      setOrders(prev => {
        const updated = prev.map(o => o.id === orderId ? { ...o, status } : o);
        const confirmedOrders = updated.filter(o => o.status === 'confirmed');
        if (status === 'confirmed' && confirmedOrders.length === 1) {
          triggerCelebration();
        }
        return updated;
      });
      toast.success('Statut de la commande mis à jour');
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProduct(true);
    try {
      const data = {
        ...productForm,
        price: parseFloat(productForm.price),
        imageUrls: productForm.imageUrls
      };

      if (editingProduct) {
        await api.companies.updateProduct(company.id, editingProduct.id, data);
        toast.success('Produit mis à jour');
      } else {
        await api.companies.addProduct(company.id, data);
        toast.success('Produit ajouté');
      }
      
      setShowProductModal(false);
      setEditingProduct(null);
      setProductForm({ name: '', description: '', price: '', category: '', imageUrls: [], tag: '', tagValue: '' });
      fetchDashboardData();
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de l\'enregistrement du produit');
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    try {
      await api.companies.deleteProduct(company.id, productId);
      setCatalog(prev => prev.filter(p => p.id !== productId));
      toast.success('Produit supprimé');
      setProductToDelete(null);
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setProductForm(prev => ({
            ...prev,
            imageUrls: [...prev.imageUrls, reader.result as string].slice(0, 4)
          }));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleApplyTags = async () => {
    if (selectedTagProducts.length === 0) {
      toast.error('Veuillez sélectionner au moins un produit');
      return;
    }
    if (!tagForm.tag) {
      toast.error('Veuillez sélectionner un tag');
      return;
    }
    try {
      for (const productId of selectedTagProducts) {
        const product = catalog.find(p => p.id === productId);
        if (product) {
          await api.companies.updateProduct(company.id, productId, {
            ...product,
            tag: tagForm.tag,
            tagValue: tagForm.tagValue
          });
        }
      }
      toast.success('Tags appliqués avec succès');
      setTagModalOpen(false);
      setSelectedTagProducts([]);
      setTagForm({ tag: '', tagValue: '' });
      fetchDashboardData();
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de l\'application des tags');
    }
  };

  if (loading && !insights) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen -mx-4 sm:-mx-8 p-4 sm:p-8">
      {showCelebration && <SaleCelebration onClose={() => setShowCelebration(false)} />}
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900">Tableau de Bord</h1>
            <p className="text-slate-500 font-medium">Gérez votre boutique {company.name}</p>
          </div>
          <button 
            onClick={onClose}
            className="px-6 py-3 bg-white text-slate-900 rounded-2xl font-bold shadow-sm border border-slate-200 hover:bg-slate-50 transition-all"
          >
            Retour à la page publique
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1.5 bg-white rounded-2xl w-full sm:w-fit shadow-sm border border-slate-100 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('shops')}
            className={`px-4 sm:px-6 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'shops' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Package size={18} />
            Catalogue
          </button>
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-4 sm:px-6 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'stock' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Package size={18} />
            Stock
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 sm:px-6 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'orders' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <ShoppingCart size={18} />
            Commandes
          </button>
          <button
            onClick={() => setActiveTab('operations')}
            className={`px-4 sm:px-6 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'operations' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <TrendingUp size={18} />
            Opérations
          </button>
          <button
            onClick={() => setActiveTab('assistant')}
            className={`px-4 sm:px-6 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'assistant' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Sparkles size={18} />
            Assistant IA
          </button>
        </div>

        {/* Celebration Overlay */}
        <AnimatePresence>
          {showCelebration && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
            >
              <div className="relative">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 bg-yellow-400 rounded-full blur-3xl opacity-50"
                />
                <Award size={128} className="text-yellow-400 fill-yellow-400 drop-shadow-2xl" />
                <motion.div
                  initial={{ opacity: 0, y: 0 }}
                  animate={{ opacity: [0, 1, 0], y: -100 }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute -top-10 -right-10 text-yellow-300"
                >
                  <Star size={32} fill="currentColor" />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 0 }}
                  animate={{ opacity: [0, 1, 0], y: -100 }}
                  transition={{ duration: 1.5, delay: 0.5, repeat: Infinity }}
                  className="absolute -top-10 -left-10 text-yellow-300"
                >
                  <Star size={32} fill="currentColor" />
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'stock' && (
            <motion.div
              key="stock"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-8"
            >
              <h3 className="text-xl font-bold text-slate-900 mb-6">Gestion des Stocks</h3>
              <div className="space-y-4">
                {catalog.map(product => {
                  const s = stock.find(st => st.productId === product.id);
                  const isExpanded = expandedProducts.has(product.id);
                  const quantity = s?.quantity || 0;
                  const isCrit = quantity <= (s?.minQuantity || 5);
                  
                  return (
                    <div key={product.id} className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                      <div 
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-100/50 transition-colors"
                        onClick={() => {
                          if (!isExpanded) {
                            api.companies.getStockMovements(company.id, product.id).then(movements => {
                                setProductMovements(prev => ({ ...prev, [product.id]: movements }));
                            });
                          }
                          setExpandedProducts(prev => {
                            const next = new Set(prev);
                            if (next.has(product.id)) next.delete(product.id);
                            else next.add(product.id);
                            return next;
                          });
                        }}
                      >
                       <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-white rounded-xl overflow-hidden shrink-0">
                           {product.imageUrls && JSON.parse(product.imageUrls).length > 0 ? (
                             <img src={JSON.parse(product.imageUrls)[0]} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-100"><Package size={24} /></div>
                           )}
                         </div>
                         <div>
                           <p className="font-bold text-slate-900">{product.name}</p>
                           <div className="flex items-center gap-2 mt-1">
                             <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${isCrit ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                               {isCrit ? 'Critique' : 'En stock'}
                             </span>
                             <p className="text-xs text-slate-500 font-medium">Stock: {quantity}</p>
                           </div>
                         </div>
                      </div>
                      <ChevronRight size={20} className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                    {isExpanded && (
                        <div className="p-4 border-t border-slate-100 bg-white">
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Historique des approvisionnements</p>
                                <button 
                                   onClick={() => exportToPDF(product.name, productMovements[product.id] || [])}
                                   className="text-xs text-primary font-bold hover:underline"
                                >
                                    Exporter PDF
                                </button>
                            </div>
                            <div className="space-y-2 mb-6">
                                {(productMovements[product.id] || []).filter(m => m.type === 'purchase').slice(0, 5).map((m, i) => (
                                    <div key={i} className="flex items-center justify-between text-sm py-2 px-3 bg-slate-50 border border-slate-100 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-emerald-600">+{m.quantity}</span>
                                            <span className="text-slate-600 font-medium">unités ajoutées</span>
                                        </div>
                                        <span className="text-slate-400 text-xs">
                                            {new Date(m.createdAt).toLocaleDateString()} {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                ))}
                                {(productMovements[product.id] || []).filter(m => m.type === 'purchase').length === 0 && (
                                     <p className="text-xs text-slate-400 italic">Aucun approvisionnement historique disponible.</p>
                                )}
                            </div>
                            <div className="mt-4 p-4 bg-slate-100 rounded-xl">
                                <label className="text-xs font-bold text-slate-500 mb-2 block">Ajouter au stock</label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="number" 
                                        value={addQtys[product.id] || ''}
                                        onChange={(e) => setAddQtys(prev => ({ ...prev, [product.id]: parseInt(e.target.value) || 0 }))}
                                        className="w-full p-2 rounded-lg border border-slate-200 text-sm"
                                        placeholder="Quantité"
                                    />
                                    <button 
                                        onClick={async () => {
                                            const qtyToAdd = addQtys[product.id] || 0;
                                            if (qtyToAdd <= 0) return;
                                            const newQty = (s?.quantity || 0) + qtyToAdd;
                                            await api.companies.updateStock(company.id, product.id, { quantity: newQty, minQuantity: s?.minQuantity || 5, reason: 'purchase' });
                                            setStock(prev => {
                                              const exists = prev.find(st => st.productId === product.id);
                                              if (exists) return prev.map(item => item.productId === product.id ? {...item, quantity: newQty} : item);
                                              return [...prev, { productId: product.id, quantity: newQty, minQuantity: 5 }];
                                            });
                                            // Rafraichir les mouvements automatiquement
                                            const movements = await api.companies.getStockMovements(company.id, product.id);
                                            setProductMovements(prev => ({ ...prev, [product.id]: movements }));
                                            setAddQtys(prev => ({ ...prev, [product.id]: 0 }));
                                        }}
                                        className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors"
                                    >
                                        Valider
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === 'operations' && (
            <motion.div
              key="operations"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                <StatCard 
                  title="Ventes" 
                  value={`${insights?.totalSales.toLocaleString()} FCFA`} 
                  icon={DollarSign} 
                  trend="+12%" 
                  color="blue"
                />
                <StatCard 
                  title="Commandes" 
                  value={insights?.ordersCount} 
                  icon={ShoppingCart} 
                  trend="+5%" 
                  color="purple"
                />
                <StatCard 
                  title="Clients" 
                  value={insights?.customersCount} 
                  icon={Users} 
                  trend="+8%" 
                  color="green"
                />
                <StatCard 
                  title="Produits" 
                  value={catalog.length} 
                  icon={Package} 
                  trend="Stable" 
                  color="orange"
                />
              </div>

              {/* Tags Management Section */}
              <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Gestion des Tags (Vitrine)</h3>
                    <p className="text-sm text-slate-500">Mettez en avant vos produits avec des tags spéciaux</p>
                  </div>
                  <button 
                    onClick={() => setTagModalOpen(true)}
                    className="px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all flex items-center gap-2"
                  >
                    <Tag size={18} />
                    Attribuer des tags
                  </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {['Nouveautés', 'Promotion', 'Offre flash'].map(tag => {
                    const count = catalog.filter(p => p.tag === tag).length;
                    return (
                      <div key={tag} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${
                            tag === 'Nouveautés' ? 'bg-blue-500' :
                            tag === 'Promotion' ? 'bg-orange-500' :
                            'bg-red-500'
                          }`}>
                            <Tag size={18} />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900">{tag}</h4>
                            <p className="text-xs text-slate-500">{count} produit(s)</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chart Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">Évolution des ventes</h3>
                      <p className="text-sm text-slate-500">Chiffre d'affaires sur les 30 derniers jours</p>
                    </div>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={insights?.salesByDay}>
                        <defs>
                          <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="date" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#64748b', fontSize: 12 }}
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#64748b', fontSize: 12 }}
                          tickFormatter={(value) => `${value / 1000}k`}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            borderRadius: '16px', 
                            border: 'none', 
                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="amount" 
                          stroke="#3b82f6" 
                          strokeWidth={3}
                          fillOpacity={1} 
                          fill="url(#colorSales)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Pic des ventes</h3>
                    {insights?.peakSalesDay ? (
                      <div>
                        <p className="text-sm text-slate-500 mb-4">Le jour le plus rentable</p>
                        <div className="text-3xl font-black text-primary mb-1">
                          {insights.peakSalesDay.amount.toLocaleString()} FCFA
                        </div>
                        <div className="text-sm font-bold text-slate-400">
                          {new Date(insights.peakSalesDay.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">Pas assez de données</p>
                    )}
                  </div>

                  <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 flex-1">
                    <h3 className="text-xl font-bold text-slate-900 mb-6">Top Produits</h3>
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={insights?.topProducts} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} width={100} />
                          <Tooltip 
                            cursor={{fill: 'transparent'}}
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          />
                          <Bar dataKey="totalQuantity" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'orders' && (
            <motion.div
              key="orders"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 sm:p-8 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h3 className="text-xl font-bold text-slate-900">Gestion des Commandes</h3>
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                    <Search size={18} className="text-slate-400" />
                    <input type="text" placeholder="Rechercher..." className="bg-transparent border-none outline-none text-sm font-medium w-full" />
                  </div>
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                        <th className="px-8 py-4">Client</th>
                        <th className="px-8 py-4">Produit</th>
                        <th className="px-8 py-4">Total</th>
                        <th className="px-8 py-4">Date</th>
                        <th className="px-8 py-4">Statut</th>
                        <th className="px-8 py-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {orders.map((order) => (
                        <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-5">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900">{order.customerName}</span>
                              <span className="text-xs text-slate-500">{order.customerWhatsapp}</span>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <span className="font-medium text-slate-700">{order.productName}</span>
                          </td>
                          <td className="px-8 py-5">
                            <span className="font-black text-slate-900">{order.totalPrice.toLocaleString()} FCFA</span>
                          </td>
                          <td className="px-8 py-5">
                            <span className="text-sm text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</span>
                          </td>
                          <td className="px-8 py-5">
                            <StatusBadge status={order.status} />
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => handleUpdateOrderStatus(order.id, 'confirmed')}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Confirmer"
                              >
                                <CheckCircle2 size={18} />
                              </button>
                              <button 
                                onClick={() => handleUpdateOrderStatus(order.id, 'cancelled')}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Annuler"
                              >
                                <XCircle size={18} />
                              </button>
                              <button 
                                onClick={() => window.open(`https://wa.me/${order.customerWhatsapp?.replace(/[^0-9]/g, '')}`, '_blank')}
                                className="p-2 text-primary hover:bg-primary/5 rounded-lg transition-colors"
                                title="Contacter"
                              >
                                <MoreVertical size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-slate-50">
                  {orders.map((order) => (
                    <div key={order.id} className="p-6 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-slate-900">{order.customerName}</div>
                          <div className="text-xs text-slate-500">{order.customerWhatsapp}</div>
                        </div>
                        <StatusBadge status={order.status} />
                      </div>
                      
                      <div className="flex justify-between items-end">
                        <div>
                          <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Produit</div>
                          <div className="text-sm font-medium text-slate-700">{order.productName}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total</div>
                          <div className="font-black text-slate-900">{order.totalPrice.toLocaleString()} FCFA</div>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button 
                          onClick={() => handleUpdateOrderStatus(order.id, 'confirmed')}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-50 text-green-600 rounded-xl text-xs font-bold"
                        >
                          <CheckCircle2 size={16} /> Confirmer
                        </button>
                        <button 
                          onClick={() => handleUpdateOrderStatus(order.id, 'cancelled')}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-50 text-red-600 rounded-xl text-xs font-bold"
                        >
                          <XCircle size={16} /> Annuler
                        </button>
                        <button 
                          onClick={() => window.open(`https://wa.me/${order.customerWhatsapp?.replace(/[^0-9]/g, '')}`, '_blank')}
                          className="px-4 py-2.5 bg-primary/10 text-primary rounded-xl"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'shops' && (
            <motion.div
              key="shops"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {/* Add Product Card */}
              <button 
                onClick={() => {
                  setEditingProduct(null);
                  setProductForm({ name: '', description: '', price: '', category: '', imageUrls: [], tag: '', tagValue: '' });
                  setShowProductModal(true);
                }}
                className="bg-white border-2 border-dashed border-slate-200 rounded-[32px] p-8 flex flex-col items-center justify-center gap-4 hover:border-primary/50 hover:bg-primary/5 transition-all group min-h-[300px]"
              >
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-primary/20 group-hover:text-primary transition-all">
                  <Plus size={32} />
                </div>
                <span className="font-black text-slate-900 uppercase tracking-widest text-sm">Ajouter un produit</span>
              </button>

              {catalog.map((product) => {
                let images: string[] = [];
                try {
                  const parsed = product.imageUrls ? JSON.parse(product.imageUrls) : [];
                  images = Array.isArray(parsed) ? parsed : [];
                } catch (e) {
                  images = [];
                }
                return (
                  <div key={product.id} className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-slate-100 group">
                    <div className="aspect-square bg-slate-100 relative">
                      {images.length > 0 ? (
                        <img src={images[0]} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <Package size={48} />
                        </div>
                      )}
                      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setEditingProduct(product);
                            setProductForm({
                              name: product.name,
                              description: product.description,
                              price: product.price.toString(),
                              category: product.category,
                              imageUrls: Array.isArray(images) ? [...images] : [],
                              tag: product.tag || '',
                              tagValue: product.tagValue || ''
                            });
                            setShowProductModal(true);
                          }}
                          className="p-2 bg-white rounded-full shadow-lg text-slate-700 hover:text-primary transition-colors"
                        >
                          <Edit3 size={18} />
                        </button>
                        <button 
                          onClick={() => setProductToDelete(product.id)}
                          className="p-2 bg-white rounded-full shadow-lg text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <div className="absolute bottom-4 left-4 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-2xl text-sm font-black text-slate-900 shadow-sm">
                        {product.price.toLocaleString()} FCFA
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">{product.category}</div>
                      <h3 className="font-bold text-slate-900 mb-2">{product.name}</h3>
                      <div className="relative">
                        <p className={`text-xs text-slate-500 ${!expandedProducts.has(product.id) ? 'line-clamp-3' : ''}`}>
                          {product.description}
                        </p>
                        {product.description && product.description.length > 100 && (
                          <button 
                            onClick={() => {
                              const newSet = new Set(expandedProducts);
                              if (newSet.has(product.id)) {
                                newSet.delete(product.id);
                              } else {
                                newSet.add(product.id);
                              }
                              setExpandedProducts(newSet);
                            }}
                            className="text-primary font-bold text-[10px] mt-1 hover:underline uppercase tracking-wider"
                          >
                            {expandedProducts.has(product.id) ? 'Réduire' : 'Tout lire'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}

          {activeTab === 'assistant' && (
            <AssistantTab 
              insights={insights} 
              orders={orders} 
              catalog={catalog} 
              stock={stock}
              company={company}
              transactions={transactions || []}
            />
          )}
        </AnimatePresence>

        {/* Product Modal */}
        {showProductModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-t-[40px] sm:rounded-[40px] w-full max-w-2xl p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[95vh]"
            >
              <div className="flex items-center justify-between mb-6 sm:mb-8">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  {editingProduct ? 'Modifier le produit' : 'Nouveau produit'}
                </h2>
                <button onClick={() => setShowProductModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleProductSubmit} className="space-y-6">
                {/* Image Upload */}
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Images (Max 4)</label>
                  <div className="grid grid-cols-4 gap-4">
                    {Array.isArray(productForm.imageUrls) && productForm.imageUrls.map((url, idx) => (
                      <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200">
                        <img src={url} alt="Preview" className="w-full h-full object-cover" />
                        <button 
                          type="button"
                          onClick={() => setProductForm(prev => ({ ...prev, imageUrls: (prev.imageUrls || []).filter((_, i) => i !== idx) }))}
                          className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    {Array.isArray(productForm.imageUrls) && productForm.imageUrls.length < 4 && (
                      <label className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 transition-all">
                        <ImageIcon size={24} className="text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-400">Ajouter</span>
                        <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </label>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nom du produit</label>
                    <input 
                      required
                      type="text" 
                      value={productForm.name}
                      onChange={e => setProductForm({...productForm, name: e.target.value})}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Prix (FCFA)</label>
                    <input 
                      required
                      type="number" 
                      value={productForm.price}
                      onChange={e => setProductForm({...productForm, price: e.target.value})}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Catégorie</label>
                  <select 
                    required
                    value={productForm.category}
                    onChange={e => setProductForm({...productForm, category: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none font-medium appearance-none"
                  >
                    <option value="">Choisir une catégorie</option>
                    {(company.categories ? (Array.isArray(company.categories) ? company.categories : company.categories.split(',')) : []).map((cat: string) => (
                      <option key={cat} value={typeof cat === 'string' ? cat.trim() : cat}>
                        {typeof cat === 'string' ? cat.trim() : cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Description</label>
                  <textarea 
                    required
                    rows={4}
                    value={productForm.description}
                    onChange={e => setProductForm({...productForm, description: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none font-medium resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Tag (Optionnel)</label>
                    <select 
                      value={productForm.tag}
                      onChange={e => setProductForm({...productForm, tag: e.target.value, tagValue: ''})}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none font-medium appearance-none"
                    >
                      <option value="">Aucun tag</option>
                      <option value="Nouveautés">Nouveautés</option>
                      <option value="Promotion">Promotion</option>
                      <option value="Offre flash">Offre flash</option>
                      <option value="Best-seller">Best-seller</option>
                    </select>
                  </div>
                  
                  {productForm.tag === 'Promotion' && (
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Pourcentage de réduction (%)</label>
                      <input 
                        type="number" 
                        placeholder="Ex: 20"
                        value={productForm.tagValue}
                        onChange={e => setProductForm({...productForm, tagValue: e.target.value})}
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                      />
                    </div>
                  )}
                  
                  {productForm.tag === 'Offre flash' && (
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nouveau prix (FCFA)</label>
                      <input 
                        type="number" 
                        placeholder="Ex: 5000"
                        value={productForm.tagValue}
                        onChange={e => setProductForm({...productForm, tagValue: e.target.value})}
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowProductModal(false)}
                    className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-black uppercase tracking-widest text-sm"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit"
                    disabled={isSavingProduct}
                    className="flex-1 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {isSavingProduct ? <Loader2 size={18} className="animate-spin" /> : null}
                    Enregistrer
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {productToDelete && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-[32px] w-full max-w-sm p-8 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Supprimer le produit ?</h3>
              <p className="text-slate-500 text-sm mb-8">Cette action est irréversible.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setProductToDelete(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold"
                >
                  Annuler
                </button>
                <button 
                  onClick={() => handleDeleteProduct(productToDelete)}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-500/20"
                >
                  Supprimer
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Tag Assignment Modal */}
        {tagModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0 z-10">
                <h2 className="text-xl font-black text-slate-900">Attribuer des tags</h2>
                <button onClick={() => setTagModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">1. Choisir un tag</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {['Nouveautés', 'Promotion', 'Offre flash', 'Best-seller'].map(tag => (
                      <button
                        key={tag}
                        onClick={() => setTagForm({ ...tagForm, tag, tagValue: '' })}
                        className={`p-3 rounded-xl border-2 text-sm font-bold transition-all ${
                          tagForm.tag === tag 
                            ? 'border-primary bg-primary/5 text-primary' 
                            : 'border-slate-100 text-slate-600 hover:border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {tagForm.tag === 'Promotion' && (
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Pourcentage de réduction (%)</label>
                    <input 
                      type="number" 
                      placeholder="Ex: 20"
                      value={tagForm.tagValue}
                      onChange={e => setTagForm({...tagForm, tagValue: e.target.value})}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                    />
                  </div>
                )}
                
                {tagForm.tag === 'Offre flash' && (
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nouveau prix (FCFA)</label>
                    <input 
                      type="number" 
                      placeholder="Ex: 5000"
                      value={tagForm.tagValue}
                      onChange={e => setTagForm({...tagForm, tagValue: e.target.value})}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">2. Sélectionner les produits</label>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {catalog.map(product => (
                      <label key={product.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-100 transition-colors">
                        <input 
                          type="checkbox" 
                          checked={selectedTagProducts.includes(product.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTagProducts([...selectedTagProducts, product.id]);
                            } else {
                              setSelectedTagProducts(selectedTagProducts.filter(id => id !== product.id));
                            }
                          }}
                          className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                        />
                        <div className="w-10 h-10 bg-slate-100 rounded-lg overflow-hidden shrink-0">
                          {product.imageUrls && JSON.parse(product.imageUrls).length > 0 ? (
                            <img src={JSON.parse(product.imageUrls)[0]} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package size={20} className="m-auto mt-2.5 text-slate-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-900 text-sm truncate">{product.name}</h4>
                          <p className="text-xs text-slate-500">{product.price} FCFA</p>
                        </div>
                        {product.tag && (
                          <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                            {product.tag}
                          </span>
                        )}
                      </label>
                    ))}
                    {catalog.length === 0 && (
                      <div className="text-center py-8 text-slate-500">
                        Aucun produit dans le catalogue.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-white sticky bottom-0 z-10 flex gap-4">
                <button 
                  onClick={() => {
                    setTagModalOpen(false);
                    setSelectedTagProducts([]);
                    setTagForm({ tag: '', tagValue: '' });
                  }}
                  className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-black uppercase tracking-widest text-sm"
                >
                  Annuler
                </button>
                <button 
                  onClick={handleApplyTags}
                  disabled={selectedTagProducts.length === 0 || !tagForm.tag}
                  className="flex-1 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Appliquer les tags
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend, color }: any) {
  const colors: any = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600'
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className={`w-10 h-10 sm:w-12 sm:h-12 ${colors[color]} rounded-xl sm:rounded-2xl flex items-center justify-center`}>
          <Icon size={20} className="sm:w-6 sm:h-6" />
        </div>
        <div className={`flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs font-bold ${trend.startsWith('+') ? 'text-green-500' : 'text-slate-400'}`}>
          {trend.startsWith('+') ? <ArrowUpRight size={12} className="sm:w-3.5 sm:h-3.5" /> : null}
          {trend}
        </div>
      </div>
      <div className="text-base sm:text-2xl font-black text-slate-900 mb-0.5 sm:mb-1 truncate">{value}</div>
      <div className="text-[9px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest truncate">{title}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: any = {
    pending: { label: 'En attente', class: 'bg-orange-100 text-orange-600' },
    confirmed: { label: 'Confirmée', class: 'bg-blue-100 text-blue-600' },
    delivered: { label: 'Livrée', class: 'bg-green-100 text-green-600' },
    cancelled: { label: 'Annulée', class: 'bg-red-100 text-red-600' }
  };

  const config = configs[status] || configs.pending;

  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${config.class}`}>
      {config.label}
    </span>
  );
}
