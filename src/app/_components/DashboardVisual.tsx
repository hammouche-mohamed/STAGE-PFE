"use client";

import React from "react";
import { 
  Search, Calendar, FileText, CheckCircle2, 
  TrendingUp, Users, Briefcase, Plus 
} from "lucide-react";

export default function DashboardVisual() {
  return (
    <div className="relative w-full max-w-6xl mx-auto h-auto md:h-[600px] mt-8 md:mt-12">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] md:w-[800px] h-[200px] md:h-[400px] bg-brand-purple/10 blur-[60px] md:blur-[120px] -z-10" />

      {/* Main Container for Cards */}
      <div className="relative grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-16 p-4 md:p-8">
        
        {/* Card 1: Internship Proposals (Top Left) */}
        <div className="md:col-span-4 bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:transform md:-rotate-1 md:hover:rotate-0 transition-all duration-500 hover:scale-105 z-20">
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-bold text-gray-900">Internship Proposals</h4>
            <div className="h-8 w-8 bg-brand-purple/10 rounded-lg flex items-center justify-center text-brand-purple">
              <Plus className="h-4 w-4" />
            </div>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="h-10 w-10 bg-white rounded-lg border border-gray-200 flex items-center justify-center text-gray-400">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="h-2 w-24 bg-gray-200 rounded-full mb-2" />
                  <div className="h-1.5 w-16 bg-gray-100 rounded-full" />
                </div>
                <div className="h-6 w-12 bg-emerald-50 rounded-full border border-emerald-100" />
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: Career Trends (Top Middle) */}
        <div className="md:col-span-3 bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:mt-20 hover:scale-105 transition-all duration-500 z-10 hidden md:block">
          <div className="flex items-center gap-2 mb-6 text-brand-pink">
            <TrendingUp className="h-5 w-5" />
            <h4 className="font-bold text-gray-900">Placement Rate</h4>
          </div>
          <div className="flex items-end gap-2 h-32 mb-4">
            {[40, 60, 35, 90, 55, 75].map((h, i) => (
              <div 
                key={i} 
                className="flex-1 bg-brand-pink/20 rounded-t-lg transition-all duration-1000 hover:bg-brand-pink/40"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase">
            <span>Oct</span>
            <span>Nov</span>
            <span>Dec</span>
            <span>Jan</span>
          </div>
        </div>

        {/* Card 3: Active Offers (Top Right) */}
        <div className="md:col-span-5 bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:transform md:rotate-1 md:hover:rotate-0 transition-all duration-500 hover:scale-105 z-20 hidden md:block">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900">Premium Offers</h4>
              <p className="text-[11px] text-gray-500">Live recruitment</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3 border border-gray-100 rounded-xl bg-gray-50/50">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-6 w-6 bg-white rounded-md border border-gray-200" />
                  <div className="h-1.5 w-12 bg-gray-300 rounded-full" />
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Card 4: Hello Alumni (Bottom Left) */}
        <div className="md:col-span-4 bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:-mt-8 hover:scale-105 transition-all duration-500 z-30 hidden md:block">
          <h4 className="font-bold text-gray-900 mb-4 text-[18px]">Meet your Mentor</h4>
          <p className="text-gray-500 text-[13px] mb-6">Connect with alumni for guidance and feedback on your project.</p>
          <div className="flex -space-x-2 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 w-10 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-400">
                M{i}
              </div>
            ))}
            <div className="h-10 w-10 rounded-full border-2 border-white bg-brand-purple text-white flex items-center justify-center text-[10px] font-bold">
              +12
            </div>
          </div>
          <button className="w-full py-3 bg-brand-deep text-white rounded-xl text-[13px] font-bold hover:bg-black transition-colors">
            View Mentors
          </button>
        </div>

        {/* Card 5: Schedule (Bottom Right) */}
        <div className="md:col-span-4 bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:mt-12 md:ml-12 md:transform md:-rotate-1 md:hover:rotate-0 transition-all duration-500 z-20">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="h-5 w-5 text-brand-purple" />
            <h4 className="font-bold text-gray-900">Your Schedule</h4>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 bg-brand-purple/5 rounded-xl border border-brand-purple/10">
              <div className="text-center">
                <span className="block text-[10px] font-bold text-brand-purple uppercase">Feb</span>
                <span className="block text-[18px] font-black text-brand-purple">21</span>
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-bold text-gray-900">Mid-term Evaluation</p>
                <p className="text-[11px] text-gray-500">10:00 AM — 11:30 AM</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 opacity-50">
              <div className="text-center">
                <span className="block text-[10px] font-bold text-gray-400 uppercase">Feb</span>
                <span className="block text-[18px] font-black text-gray-400">24</span>
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-bold text-gray-900">Project Submission</p>
              </div>
            </div>
          </div>
        </div>

        {/* Card 6: Candidate Search (Bottom Middle) */}
        <div className="md:col-span-4 bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:-mt-12 hover:scale-105 transition-all duration-500 z-30 hidden md:block">
           <div className="relative mb-6">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
             <div className="w-full h-10 bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-4 flex items-center">
               <div className="h-2 w-32 bg-gray-200 rounded-full" />
             </div>
           </div>
           <div className="space-y-3">
             {[1, 2].map((i) => (
               <div key={i} className="flex items-center gap-3 p-2">
                 <div className="h-10 w-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
                   <Users className="h-5 w-5" />
                 </div>
                 <div className="flex-1">
                   <div className="h-2 w-24 bg-gray-300 rounded-full mb-2" />
                   <div className="h-1.5 w-16 bg-gray-100 rounded-full" />
                 </div>
               </div>
             ))}
           </div>
        </div>

      </div>
    </div>
  );
}
