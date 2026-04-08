import React, { useState, useEffect } from 'react';
import { Users, Briefcase, TrendingUp, Activity, Clock, UserCheck, Target, PhoneCall, Star } from 'lucide-react';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { getDashboardStats } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

const COLORS = ['#3b82f6', '#a855f7', '#10b981', '#f97316', '#f43f5e'];

const toLabel = (str) => str?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) ?? str;

const StatCard = ({ title, value, icon: Icon, color, sub }) => (
    <motion.div whileHover={{ y: -4 }} className="glass p-6 rounded-3xl border border-white/10">
        <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-2xl ${color}/10 border ${color.replace('text-', 'border-')}/20`}>
                <Icon size={22} className={color} />
            </div>
        </div>
        <h3 className="text-slate-400 text-sm font-medium mb-1">{title}</h3>
        <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
        {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </motion.div>
);

const tooltipStyle = {
    contentStyle: { backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' },
    itemStyle: { color: '#fff' },
};

const Dashboard = () => {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await getDashboardStats();
                setData(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        </div>
    );

    const isAdmin = data?.role === 'admin';
    const d = data?.data || {};

    return (
        <div className="space-y-8">
            <header className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold text-white tracking-tight">
                    {isAdmin ? 'Admin Overview' : 'My Performance'}
                </h1>
                <p className="text-slate-400 text-sm flex items-center gap-2">
                    <Clock size={14} />
                    {isAdmin ? 'Full system analytics and team performance' : `Your personal leads and conversion analytics`}
                </p>
            </header>

            {isAdmin ? (
                <>
                    {/* Admin Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard title="Total Leads" value={d.totalLeads} icon={Briefcase} color="text-blue-400" sub="All leads in system" />
                        <StatCard title="Total Customers" value={d.totalCustomers} icon={Users} color="text-purple-400" sub="Converted customers" />
                        <StatCard title="Conversion Rate" value={d.conversionRate} icon={TrendingUp} color="text-emerald-400" sub={`${d.convertedLeads} leads converted`} />
                        <StatCard title="Total Users" value={d.totalUsers} icon={Activity} color="text-orange-400" sub="Team members" />
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Monthly Leads vs Converted */}
                        <div className="glass p-8 rounded-3xl border border-white/10 h-[380px]">
                            <h3 className="text-lg font-bold text-white mb-6">Monthly Leads vs Converted</h3>
                            <ResponsiveContainer width="100%" height="85%">
                                <AreaChart data={d.chartData}>
                                    <defs>
                                        <linearGradient id="gLeads" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="gConverted" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip {...tooltipStyle} />
                                    <Area type="monotone" dataKey="leads" stroke="#3b82f6" fill="url(#gLeads)" dot={{ r: 3, fill: '#3b82f6' }} name="Leads" />
                                    <Area type="monotone" dataKey="converted" stroke="#10b981" fill="url(#gConverted)" dot={{ r: 3, fill: '#10b981' }} name="Converted" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Lead Status Breakdown */}
                        <div className="glass p-8 rounded-3xl border border-white/10 h-[380px]">
                            <h3 className="text-lg font-bold text-white mb-6">Lead Status Breakdown</h3>
                            <ResponsiveContainer width="100%" height="85%">
                                <PieChart>
                                    <Pie data={d.statusBreakdown} dataKey="count" nameKey="_id" cx="50%" cy="50%" outerRadius={100} label={({ _id, percent }) => `${toLabel(_id)} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                                        {d.statusBreakdown?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip {...tooltipStyle} formatter={(v, n) => [v, toLabel(n)]} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Top Sales Persons */}
                    <div className="glass rounded-3xl border border-white/10 overflow-hidden">
                        <div className="px-6 py-5 border-b border-white/5 flex items-center gap-2">
                            <Star size={18} className="text-amber-400" />
                            <h3 className="text-lg font-bold text-white">Top Sales Persons by Conversions</h3>
                        </div>
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-white/5">
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Rank</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Conversions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {d.topSalesPersons?.length === 0 ? (
                                    <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-500 text-sm">No conversions yet.</td></tr>
                                ) : d.topSalesPersons?.map((sp, i) => (
                                    <tr key={i} className="hover:bg-white/[0.02]">
                                        <td className="px-6 py-4">
                                            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-amber-500/20 text-amber-400' : i === 1 ? 'bg-slate-500/20 text-slate-300' : 'bg-orange-500/10 text-orange-400'}`}>
                                                {i + 1}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400 uppercase">
                                                    {sp.name?.[0]}
                                                </div>
                                                <span className="text-sm font-semibold text-white">{sp.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-400">{sp.email}</td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-emerald-400 font-bold text-sm">{sp.converted}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : (
                <>
                    {/* Sales Person Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard title="My Total Leads" value={d.myLeads} icon={Briefcase} color="text-blue-400" sub="Assigned to you" />
                        <StatCard title="Converted" value={d.myConverted} icon={UserCheck} color="text-emerald-400" sub="Successfully closed" />
                        <StatCard title="Conversion Rate" value={d.conversionRate} icon={TrendingUp} color="text-purple-400" sub={`${d.myConverted} of ${d.myLeads} leads`} />
                        <StatCard title="Interested" value={d.myInterested} icon={Target} color="text-orange-400" sub="Ready to convert" />
                    </div>

                    {/* Progress Bar */}
                    <div className="glass p-6 rounded-3xl border border-white/10">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-white font-bold">Conversion Progress</h3>
                            <span className="text-emerald-400 font-bold text-sm">{d.conversionRate}</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-3">
                            <div
                                className="bg-gradient-to-r from-emerald-500 to-teal-500 h-3 rounded-full transition-all duration-700"
                                style={{ width: d.conversionRate }}
                            />
                        </div>
                        <div className="flex justify-between mt-3 text-xs text-slate-500">
                            <span>{d.myConverted} converted</span>
                            <span>{d.myLeads} total leads</span>
                        </div>
                    </div>

                    {/* Lead Status Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { label: 'Contacted', value: d.myContacted, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: PhoneCall },
                            { label: 'Interested', value: d.myInterested, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: Target },
                            { label: 'Converted', value: d.myConverted, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', icon: UserCheck },
                        ].map((item) => (
                            <motion.div key={item.label} whileHover={{ y: -4 }} className={`glass p-6 rounded-3xl border ${item.border} flex items-center gap-4`}>
                                <div className={`p-3 rounded-2xl ${item.bg}`}>
                                    <item.icon size={22} className={item.color} />
                                </div>
                                <div>
                                    <p className="text-slate-400 text-sm">{item.label}</p>
                                    <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Monthly Chart */}
                    <div className="glass p-8 rounded-3xl border border-white/10 h-[380px]">
                        <h3 className="text-lg font-bold text-white mb-6">My Monthly Performance</h3>
                        <ResponsiveContainer width="100%" height="85%">
                            <BarChart data={d.chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip {...tooltipStyle} />
                                <Bar dataKey="leads" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={16} name="Leads" />
                                <Bar dataKey="converted" fill="#10b981" radius={[4, 4, 0, 0]} barSize={16} name="Converted" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </>
            )}
        </div>
    );
};

export default Dashboard;
