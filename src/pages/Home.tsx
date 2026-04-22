// This file was corrupted and deleted, reverting to a basic structure for Home.tsx based on the last known stable state.
import React from 'react';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, ChevronRight, MapPin, UserPlus, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { api } from '../lib/api';
import Stories from '../components/Stories';
import CompaniesCarousel from '../components/CompaniesCarousel';
import PostCard from '../components/PostCard';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();
  const [feedType, setFeedType] = useState('global');

  const { data: posts = [] } = useQuery({
    queryKey: ['posts', feedType],
    queryFn: () => api.posts.getAll(1, 20, 'Tous', 'Tous', undefined, feedType)
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => api.events.getAll()
  });

  const { data: users = [] } = useQuery({
    queryKey: ['suggestedUsers'],
    queryFn: () => api.users.getAll() // Assuming this exists or returns list of users
  });

  const suggestedUsers = users.sort(() => 0.5 - Math.random()).slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Main Feed */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h1 className="text-3xl font-extrabold text-slate-900">Fil d'actualité</h1>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setFeedType('global')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  feedType === 'global' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Global
              </button>
              <button
                onClick={() => setFeedType('network')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  feedType === 'network' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Mon Réseau
              </button>
            </div>
          </div>

          <Stories />
          <CompaniesCarousel />

          <div className="space-y-6">
            {posts.map((post: any) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="hidden lg:block space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
             <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600 flex-shrink-0">
                    <Calendar size={20} />
                  </div>
                  <h3 className="font-bold text-slate-900 leading-tight truncate">Événements récents</h3>
                </div>
                <button 
                  onClick={() => navigate('/events')}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center flex-shrink-0 whitespace-nowrap ml-2"
                >
                  Voir tout
                  <ChevronRight size={16} />
                </button>
             </div>
             
             <div className="space-y-4">
               {events.slice(0, 5).map((event: any) => (
                 <div 
                   key={event.id}
                   className="group cursor-pointer hover:bg-slate-50 p-3 rounded-xl transition-all duration-200 border border-transparent hover:border-slate-100"
                   onClick={() => navigate(`/events/${event.id}`)}
                 >
                   <div className="flex gap-4 items-center">
                     <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 shadow-inner">
                       {event.imageUrl ? (
                         <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center text-slate-400">
                           <Calendar size={24} />
                         </div>
                       )}
                     </div>
                     <div className="flex flex-col justify-center min-w-0">
                       <h4 className="text-sm font-bold text-slate-900 truncate">{event.title}</h4>
                       <p className="text-xs text-blue-600 font-medium mt-0.5">
                         {format(new Date(event.startDate), 'd MMM', { locale: fr })}
                       </p>
                       <div className="flex items-center text-xs text-slate-500 mt-1 truncate">
                         <MapPin size={12} className="mr-1 flex-shrink-0" />
                         <span className="truncate">{event.location}</span>
                       </div>
                     </div>
                   </div>
                 </div>
               ))}
               {events.length === 0 && (
                 <p className="text-sm text-center text-slate-500 py-4">Aucun événement à venir.</p>
               )}
             </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600">
                <Users size={20} />
              </div>
              <h3 className="font-bold text-slate-900">Suggestions</h3>
            </div>
            
            <div className="space-y-4">
              {suggestedUsers.map((user: any) => (
                <div key={user.id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <img 
                      src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} 
                      alt={user.name} 
                      className="w-10 h-10 rounded-full bg-slate-100"
                    />
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 truncate">{user.name}</h4>
                      <p className="text-xs text-slate-500 truncate">{user.title || 'Membre'}</p>
                    </div>
                  </div>
                  <button className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors">
                    <UserPlus size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
