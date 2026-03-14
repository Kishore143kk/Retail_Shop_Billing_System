import { Search, Bell, User } from 'lucide-react';

export default function Topbar() {
  return (
    <header className="h-16 bg-white border-bottom border-slate-200 flex items-center justify-between px-8 z-10">
      <div className="relative w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search for products, bills..."
          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
        />
      </div>

      <div className="flex items-center gap-4">
        <button className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-all relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        
        <div className="h-8 w-px bg-slate-200 mx-2"></div>

        <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1 pr-3 rounded-lg transition-all">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <User className="text-blue-600 w-5 h-5" />
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-bold text-slate-900 leading-none">Admin User</p>
            <p className="text-[10px] text-slate-500 mt-1">Shop Owner</p>
          </div>
        </div>
      </div>
    </header>
  );
}
