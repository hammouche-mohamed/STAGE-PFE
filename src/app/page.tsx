import Image from "next/image";
import Link from "next/link";
import { 
  Users, 
  BookOpen, 
  Briefcase, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  UserPlus 
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      {/* Top Navbar */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 flex items-center justify-center flex-shrink-0">
              <img 
                src="/esst-logo.png" 
                alt="ESST Logo" 
                className="h-full w-full object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-[15px] font-bold tracking-tight text-gray-900 leading-none">ESST - Alger</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mt-1">PFE Management Portal</span>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <a href="#process" className="text-[13px] font-medium text-gray-600 hover:text-indigo-600 transition-colors">How it works</a>
            <a href="#roles" className="text-[13px] font-medium text-gray-600 hover:text-indigo-600 transition-colors">Portals</a>
            <Link 
              href="/login" 
              className="px-4 py-2 bg-indigo-600 text-white text-[13px] font-semibold rounded-md hover:bg-indigo-700 transition-all shadow-sm"
            >
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      <main className="pt-32">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 mb-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100 mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              <span className="text-[12px] font-bold uppercase tracking-wider">Academic Year 2024-2025</span>
            </div>
            
            <h1 className="text-[44px] md:text-[56px] font-extrabold leading-[1.1] text-gray-900 tracking-tight mb-8">
              Simplified Internship <br/>
              <span className="text-indigo-600">Management System.</span>
            </h1>
            
            <p className="text-lg text-gray-600 leading-relaxed mb-10 max-w-2xl">
              The official platform for the École Supérieure des Sciences et Technologies d’Alger. 
              Modernizing the PFE lifecycle from topic proposals to final defense evaluations.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link 
                href="/register" 
                className="w-full sm:w-auto px-8 h-14 bg-gray-900 text-white rounded-lg flex items-center justify-center font-bold text-[15px] hover:bg-black transition-all shadow-xl group"
              >
                Register for PFE
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                href="/login" 
                className="w-full sm:w-auto px-8 h-14 bg-white text-gray-900 border border-gray-200 rounded-lg flex items-center justify-center font-bold text-[15px] hover:bg-gray-50 transition-all shadow-sm"
              >
                Member Login
              </Link>
            </div>
          </div>
        </section>

        {/* Role Gateways */}
        <section id="roles" className="bg-gray-50 py-24 border-y border-gray-100">
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-16">
              <h2 className="text-[28px] font-bold text-gray-900 mb-4">Dedicated User Portals</h2>
              <p className="text-gray-500">Select your role to access your personalized workspace.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Student Portal */}
              <div className="group bg-white p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all">
                <div className="h-14 w-14 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Users className="h-7 w-7" />
                </div>
                <h3 className="text-[19px] font-bold text-gray-900 mb-3">Student Portal</h3>
                <p className="text-gray-500 text-[14px] leading-relaxed mb-8">
                  Find topics, build your binôme, communicate with supervisors, and submit your reports.
                </p>
                <Link href="/login" className="inline-flex items-center text-indigo-600 font-bold text-[14px] hover:underline">
                  Go to dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>

              {/* Teacher Portal */}
              <div className="group bg-white p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all">
                <div className="h-14 w-14 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <BookOpen className="h-7 w-7" />
                </div>
                <h3 className="text-[19px] font-bold text-gray-900 mb-3">Supervison Portal</h3>
                <p className="text-gray-500 text-[14px] leading-relaxed mb-8">
                  Manage your supervisions, review documents, participate in juries, and submit final grades.
                </p>
                <Link href="/login" className="inline-flex items-center text-emerald-600 font-bold text-[14px] hover:underline">
                  Manage supervisions <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>

              {/* Company Portal */}
              <div className="group bg-white p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-amber-200 transition-all">
                <div className="h-14 w-14 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Briefcase className="h-7 w-7" />
                </div>
                <h3 className="text-[19px] font-bold text-gray-900 mb-3">Industry Partner</h3>
                <p className="text-gray-500 text-[14px] leading-relaxed mb-8">
                  Propose innovative topics, track intern progress, and collaborate with the university.
                </p>
                <Link href="/login" className="inline-flex items-center text-amber-600 font-bold text-[14px] hover:underline">
                  Submit topic <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Process Timeline */}
        <section id="process" className="py-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-20">
              <h2 className="text-[32px] font-extrabold text-gray-900">Internship Roadmap</h2>
              <p className="text-gray-500 max-w-xl mx-auto mt-4">A structured path from registration to professional graduation.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 relative">
              {/* Connector Line */}
              <div className="hidden md:block absolute top-[44px] left-[50px] right-[50px] h-0.5 bg-gray-100 -z-10"></div>

              {[
                { step: "01", icon: UserPlus, title: "Enrollment", desc: "Register and specify your speciality" },
                { step: "02", icon: Clock, title: "Topic Selection", desc: "Apply for company or student topics" },
                { step: "03", icon: CheckCircle2, title: "Validation", desc: "Get approved by Admin and Supervisor" },
                { step: "04", icon: ShieldCheck, title: "Defense", desc: "Schedule and hold your final defense" },
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col items-center text-center">
                  <div className="h-[90px] w-[90px] rounded-full bg-white border-4 border-gray-50 shadow-md flex items-center justify-center mb-6 relative">
                    <item.icon className="h-8 w-8 text-indigo-600" />
                    <span className="absolute -top-1 -right-1 h-7 w-7 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[11px] font-bold">
                      {item.step}
                    </span>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">{item.title}</h4>
                  <p className="text-[13px] text-gray-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 text-gray-400 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-16 px-8">
            <div className="max-w-sm">
              <div className="flex items-center gap-3 mb-6">
                <img 
                  src="/esst-logo.png" 
                  alt="ESST Logo" 
                  className="h-10 w-10 object-contain"
                />
                <span className="text-white font-bold">ESST - Alger</span>
              </div>
              <p className="text-[13px] leading-relaxed">
                École Supérieure des Sciences et Technologies d’Alger. <br/>
                Empowering the next generation of engineers and technologists.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-24">
              <div>
                <h5 className="text-white font-bold mb-6">Portal Access</h5>
                <ul className="space-y-4 text-[13px]">
                  <li><Link href="/login?role=STUDENT" className="hover:text-white transition-colors">Student Login</Link></li>
                  <li><Link href="/login?role=TEACHER" className="hover:text-white transition-colors">Teacher Login</Link></li>
                  <li><Link href="/login?role=COMPANY" className="hover:text-white transition-colors">Company Access</Link></li>
                </ul>
              </div>
              <div>
                <h5 className="text-white font-bold mb-6">Support</h5>
                <ul className="space-y-4 text-[13px]">
                  <li><Link href="#" className="hover:text-white transition-colors">Documentation</Link></li>
                  <li><Link href="#" className="hover:text-white transition-colors">Technical Help</Link></li>
                  <li><Link href="#" className="hover:text-white transition-colors">Guidelines</Link></li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[12px]">
            <p>© 2024 ESST - PFE Management. All rights reserved.</p>
            <div className="flex items-center gap-8">
              <a href="#" className="hover:text-white">Privacy Policy</a>
              <a href="#" className="hover:text-white">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
