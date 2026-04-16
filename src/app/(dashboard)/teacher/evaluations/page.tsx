"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/utils/formatDate";
import { ShieldCheck, FileText, Activity, Volume2 } from "lucide-react";

export default function TeacherEvaluationsPage() {
  const [defenses, setDefenses] = useState([]);
  const [selectedDefense, setSelectedDefense] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [scores, setScores] = useState({
    report: 0,
    technical: 0,
    oral: 0,
    feedback: "",
  });

  useEffect(() => {
    const fetchDefenses = async () => {
      try {
        const res = await fetch("/api/defenses");
        const data = await res.json();
        setDefenses(data.data || []);
      } catch (error) {
        toast.error("Failed to load defenses");
      } finally {
        setIsLoading(false);
      }
    };
    fetchDefenses();
  }, []);

  const calculatedGrade = (scores.report * 0.4 + scores.technical * 0.3 + scores.oral * 0.3).toFixed(2);

  const handleSubmit = async () => {
    if (!selectedDefense) return;
    try {
      const res = await fetch("/api/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defenseId: selectedDefense.id,
          reportScore: Number(scores.report),
          technicalScore: Number(scores.technical),
          oralScore: Number(scores.oral),
          feedback: scores.feedback,
        }),
      });

      if (!res.ok) throw new Error("Grading failed");
      toast.success("Evaluation submitted successfully");
      setSelectedDefense(null);
    } catch (error) {
      toast.error("Failed to submit grades");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900">Jury Evaluations</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Submit scores and feedback for the defenses you are presiding or examining.</p>
        </div>
      </div>

      {!selectedDefense ? (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead className="admin-table-header">
              <tr>
                <th>Topic</th>
                <th>Students</th>
                <th>Time & Room</th>
                <th>Your Role</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">Loading...</td></tr>
              ) : defenses.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">No defenses assigned to you.</td></tr>
              ) : (
                defenses.map((def: any) => (
                  <tr key={def.id} className="admin-table-row">
                    <td className="font-medium text-gray-900 truncate max-w-[300px]">{def.internship.topic.title}</td>
                    <td className="text-[12px]">{def.internship.students.map((s: any) => s.student.name).join(", ")}</td>
                    <td><span className="text-[12px]">{formatDateTime(def.scheduledAt)} - {def.room}</span></td>
                    <td>
                      <span className="text-[12px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {def.juryMembers.find((m: any) => m.userId === "current-user-id")?.role || "Jury Member"}
                      </span>
                    </td>
                    <td className="text-right">
                      <Button size="sm" onClick={() => setSelectedDefense(def)}>Grade Session</Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="max-w-[800px] bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2">
          <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <div>
              <h2 className="text-[14px] font-semibold text-gray-900">{selectedDefense.internship.topic.title}</h2>
              <p className="text-[11px] text-gray-500 uppercase tracking-widest mt-0.5">Final Evaluation Form</p>
            </div>
            <button onClick={() => setSelectedDefense(null)} className="text-[13px] text-gray-500 hover:text-gray-900">Cancel</button>
          </div>
          
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <Input 
                  label="Report Score (/20) - 40%" 
                  type="number" 
                  step="0.25"
                  icon={FileText}
                  value={scores.report}
                  onChange={(e) => setScores({...scores, report: Number(e.target.value)})}
                />
                <Input 
                  label="Technical Work (/20) - 30%" 
                  type="number" 
                  step="0.25"
                  icon={Activity}
                  value={scores.technical}
                  onChange={(e) => setScores({...scores, technical: Number(e.target.value)})}
                />
                <Input 
                  label="Oral Presentation (/20) - 30%" 
                  type="number" 
                  step="0.25"
                  icon={Volume2}
                  value={scores.oral}
                  onChange={(e) => setScores({...scores, oral: Number(e.target.value)})}
                />
              </div>
            </div>

            <div className="flex flex-col">
              <div className="flex-1 space-y-4">
                <label className="admin-form-label">Constructive Feedback</label>
                <textarea 
                  className="admin-input h-[120px] py-2"
                  placeholder="Points of strength, areas of improvement..."
                  value={scores.feedback}
                  onChange={(e) => setScores({...scores, feedback: e.target.value})}
                />
              </div>
              
              <div className="mt-8 p-4 bg-indigo-50 border border-indigo-100 rounded flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[11px] text-indigo-700 font-bold uppercase tracking-widest">Calculated Grade</span>
                  <span className="text-[24px] font-black text-indigo-900">{calculatedGrade}</span>
                </div>
                <Button onClick={handleSubmit} size="lg">Submit Final Scores</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
