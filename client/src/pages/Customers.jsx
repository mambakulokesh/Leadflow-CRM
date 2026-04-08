import React, { useState, useEffect, useRef } from 'react';
import { Building2, Search, Edit2, Mail, Phone, CreditCard, Crown, Zap, Clock, X, UserCheck, ToggleLeft, ToggleRight, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Tooltip } from 'react-tooltip';
import { getCustomers, updateCustomer } from '../api/axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/Pagination';
import { FeedbackModal, ConfirmModal } from '../components/FeedbackModals';

const PlanBadge = ({ plan }) => {
    const configs = {
        basic: { icon: Clock, color: 'text-slate-400 bg-slate-500/10 border-white/5' },
        premium: { icon: Zap, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
        enterprise: { icon: Crown, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    };
    const { icon: Icon, color } = configs[plan] || configs.basic;
    return (
        <span className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${color}`}>
            <Icon size={12} /> {plan}
        </span>
    );
};

const PaymentBadge = ({ status }) => (
    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>
        {status}
    </span>
);

const TABS = ['active', 'inactive'];

const Customers = () => {
    const { user: currentUser } = useAuth();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [activeTab, setActiveTab] = useState('active');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', plan: 'basic', paymentStatus: 'pending' });
    const searchTimeout = useRef(null);
    const [refetchKey, setRefetchKey] = useState(0);
    const [feedback, setFeedback] = useState(null);
    const [confirmCustomer, setConfirmCustomer] = useState(null);

    useEffect(() => {
        let active = true;
        setLoading(true);
        clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(async () => {
            try {
                const res = await getCustomers(page, 9, search, activeTab);
                if (active) {
                    setCustomers(res.data.data);
                    setTotalPages(res.data.totalPages || 1);
                }
            } catch (err) {
                console.error('Error fetching customers', err);
            } finally {
                if (active) setLoading(false);
            }
        }, 400);
        return () => { active = false; clearTimeout(searchTimeout.current); };
    }, [page, search, activeTab, refetchKey]);

    const refetch = () => setRefetchKey(k => k + 1);

    const handleSearch = (val) => { setSearch(val); setPage(1); };

    const handleTabChange = (tab) => { setActiveTab(tab); setPage(1); setSearch(''); };

    const handleToggleActive = (customer) => {
        const toActive = !customer.isActive;
        setConfirmCustomer({
            title: toActive ? 'Activate Customer?' : 'Deactivate Customer?',
            message: `Are you sure you want to mark ${customer.name} as ${toActive ? 'active' : 'inactive'}?`,
            confirmLabel: toActive ? 'Yes, Activate' : 'Yes, Deactivate',
            confirmColor: toActive
                ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20'
                : 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border-orange-500/20',
            customer,
        });
    };

    const confirmToggle = async () => {
        const { customer } = confirmCustomer;
        const next = !customer.isActive;
        setConfirmCustomer(null);
        try {
            await updateCustomer(customer._id, { isActive: next });
            refetch();
            setFeedback({ type: 'success', title: 'Status Updated', message: `${customer.name} has been marked ${next ? 'active' : 'inactive'}.` });
        } catch (err) {
            setFeedback({ type: 'error', title: 'Update Failed', message: err.response?.data?.message || 'Could not update customer status.' });
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        try {
            await updateCustomer(editingCustomer._id, formData);
            setIsModalOpen(false);
            refetch();
            setFeedback({ type: 'success', title: 'Customer Updated', message: `${formData.name}'s details have been saved successfully.` });
        } catch (err) {
            setFeedback({ type: 'error', title: 'Save Failed', message: err.response?.data?.message || 'Could not save customer details.' });
        }
    };

    const handleExport = async () => {
        try {
            const res = await getCustomers(1, 10000, search, activeTab);
            const rows = res.data.data.map(c => ({
                Name: c.name,
                Email: c.email,
                Phone: c.phone,
                Plan: c.plan,
                'Payment Status': c.paymentStatus,
                Status: c.isActive ? 'Active' : 'Inactive',
                'Created At': new Date(c.createdAt).toLocaleDateString(),
            }));
            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Customers');
            XLSX.writeFile(wb, `customers_export_${Date.now()}.xlsx`);
        } catch (err) {
            setFeedback({ type: 'error', title: 'Export Failed', message: 'Could not export customers. Please try again.' });
        }
    };

    const openModal = (customer) => {
        setEditingCustomer(customer);
        setFormData({ name: customer.name, email: customer.email, phone: customer.phone, plan: customer.plan, paymentStatus: customer.paymentStatus });
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Customers</h1>
                <p className="text-slate-400 text-sm">Managing your value-adding client base and subscriptions</p>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-900/50 border border-white/10 rounded-xl w-fit">
                {TABS.map(tab => (
                    <button
                        key={tab}
                        onClick={() => handleTabChange(tab)}
                        className={`px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="flex items-center gap-3">
            <div className="relative max-w-sm flex-1">
                <Search className="absolute left-4 top-3 text-slate-500" size={18} />
                <input
                    type="text"
                    placeholder="Search customers..."
                    value={search}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-2.5 pl-12 pr-4 text-sm text-slate-200 outline-none focus:border-blue-500/50 transition-all"
                />
            </div>
            <button
                onClick={handleExport}
                className="flex items-center gap-2 glass border border-white/10 hover:border-blue-500/30 text-slate-400 hover:text-blue-400 px-4 py-2.5 rounded-xl transition-all text-sm font-semibold"
            >
                <Download size={16} />
                Export
            </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-20 text-center text-slate-500">Loading customers...</div>
                ) : customers.length === 0 ? (
                    <div className="col-span-full py-20 text-center text-slate-500">No {activeTab} customers found.</div>
                ) : customers.map((customer) => (
                    <motion.div
                        key={customer._id}
                        whileHover={{ y: -5 }}
                        className="glass p-6 rounded-3xl border border-white/10 group flex flex-col justify-between"
                    >
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 rounded-2xl bg-slate-800 border border-white/5 text-slate-400">
                                    <Building2 size={24} />
                                </div>
                                <div className="flex items-center gap-2">
                                    {customer.convertedFromLead && (
                                        <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                                            <UserCheck size={10} /> {customer.convertedFromLead?.assignedTo?.name || 'Converted'}
                                        </span>
                                    )}
                                    <PlanBadge plan={customer.plan} />
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-white mb-1">{customer.name}</h3>
                            <div className="flex flex-col gap-2 mb-6">
                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                    <Mail size={14} className="text-blue-500/50" />
                                    <span>{customer.email}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                    <Phone size={14} className="text-blue-500/50" />
                                    <span>{customer.phone}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
                            <div className="flex items-center gap-2">
                                <CreditCard size={14} className="text-slate-500" />
                                <PaymentBadge status={customer.paymentStatus} />
                            </div>
                            {currentUser?.role === 'admin' && (
                                <div className="flex items-center gap-1">
                                    <button onClick={() => openModal(customer)} data-tooltip-id="tip" data-tooltip-content="Edit Customer" className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10">
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleToggleActive(customer)}
                                        data-tooltip-id="tip"
                                        data-tooltip-content={customer.isActive ? 'Mark Inactive' : 'Mark Active'}
                                        className={`p-2 rounded-lg transition-colors ${customer.isActive ? 'text-emerald-400 hover:bg-emerald-400/10' : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10'}`}
                                    >
                                        {customer.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>

            {totalPages > 1 && (
                <div className="glass rounded-2xl border border-white/10 overflow-hidden">
                    <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                </div>
            )}

            <Tooltip id="tip" place="top" offset={32} style={{ backgroundColor: '#0f172a', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px', fontWeight: '600', padding: '5px 10px', letterSpacing: '0.02em', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }} />
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-[#020617]/80 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="relative w-full max-w-lg glass p-8 rounded-3xl border border-white/10 shadow-2xl">
                            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X size={20} /></button>
                            <h2 className="text-2xl font-bold text-white mb-2">Edit Customer</h2>
                            <p className="text-slate-400 text-sm mb-8">Update subscription and profile details.</p>
                            <form onSubmit={handleFormSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Customer Name</label>
                                    <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-xl py-3 px-4 text-sm text-slate-200 outline-none" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Email</label>
                                        <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-xl py-3 px-4 text-sm text-slate-200 outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Phone</label>
                                        <input type="text" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-xl py-3 px-4 text-sm text-slate-200 outline-none" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Plan Type</label>
                                        <select value={formData.plan} onChange={(e) => setFormData({ ...formData, plan: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-xl py-3 px-4 text-sm text-slate-200 outline-none appearance-none">
                                            <option value="basic">Basic</option>
                                            <option value="premium">Premium</option>
                                            <option value="enterprise">Enterprise</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Payment Status</label>
                                        <select value={formData.paymentStatus} onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-xl py-3 px-4 text-sm text-slate-200 outline-none appearance-none">
                                            <option value="pending">Pending</option>
                                            <option value="paid">Paid</option>
                                        </select>
                                    </div>
                                </div>
                                <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3 rounded-xl mt-4">
                                    Update Customer
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {confirmCustomer && (
                    <ConfirmModal
                        title={confirmCustomer.title}
                        message={confirmCustomer.message}
                        confirmLabel={confirmCustomer.confirmLabel}
                        confirmColor={confirmCustomer.confirmColor}
                        onConfirm={confirmToggle}
                        onCancel={() => setConfirmCustomer(null)}
                    />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {feedback && (
                    <FeedbackModal
                        type={feedback.type}
                        title={feedback.title}
                        message={feedback.message}
                        onClose={() => setFeedback(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default Customers;
