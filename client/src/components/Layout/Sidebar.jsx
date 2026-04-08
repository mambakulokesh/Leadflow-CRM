import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  LogOut, 
  User as UserIcon,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Leads', icon: Briefcase, path: '/leads' },
    { name: 'Customers', icon: Users, path: '/customers' },
    ...(user?.role === 'admin' ? [{ name: 'Users', icon: UserIcon, path: '/users' }] : []),
  ];

  return (
    <div className="w-64 h-screen glass flex flex-col items-center py-8 fixed left-0 top-0 border-r border-white/10">
      <div className="mb-12 text-center">
        <h1 className="text-2xl font-bold gradient-text">LeadFlow</h1>
        <p className="text-[11px] text-slate-500 mt-1">Manage Leads. Close Deals.</p>
      </div>

      <nav className="flex-1 w-full px-4 space-y-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => twMerge(
              "flex items-center justify-between w-full px-4 py-3 rounded-xl transition-all duration-300 group",
              isActive 
                ? "bg-blue-600/20 text-blue-400 border border-blue-500/20" 
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            )}
          >
            <div className="flex items-center gap-3">
              <item.icon size={20} />
              <span className="font-medium">{item.name}</span>
            </div>
            <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </NavLink>
        ))}
      </nav>

      <div className="w-full px-4 pt-4 border-t border-white/10 mt-auto">
        <div className="flex items-center gap-3 px-4 py-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
            <UserIcon size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold truncate w-24">{user?.name}</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">{user?.role}</span>
          </div>
        </div>
        
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-300"
        >
          <LogOut size={20} />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
