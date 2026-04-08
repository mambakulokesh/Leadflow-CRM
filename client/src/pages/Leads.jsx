import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, ChevronLeft, ChevronRight, Edit2, Trash2, Mail, Phone, X, UserCheck, Upload, Download, RefreshCw, UserCog } from 'lucide-react';
import { Tooltip } from 'react-tooltip';
import { getLeads, getLeadCounts, createLead, updateLead, deleteLead, deleteLeads, convertLead, importLeads, getUsers, assignLead, bulkAssignLeads } from '../api/axios';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { FeedbackModal, ConfirmModal } from '../components/FeedbackModals';

const STATUSES = [
    { key: 'all', label: 'All' },
    { key: 'new', label: 'New' },
    { key: 'contacted', label: 'Contacted' },
    { key: 'interested', label: 'Interested' },
    { key: 'not_interested', label: 'Not Interested' },
    { key: 'converted', label: 'Converted' },
];

const STATUS_COLORS = {
    new: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    contacted: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    interested: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    not_interested: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    converted: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

const StatusBadge = ({ status }) => (
    <span className={`px-2 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider border ${STATUS_COLORS[status] || STATUS_COLORS.new}`}>
        {status.replace('_', ' ')}
    </span>
);

const Field = ({ label, error, children }) => (
    <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-500 uppercase ml-1">
            {label} <span className="text-rose-400">*</span>
        </label>
        {children}
        {error && <p className="text-xs text-rose-400 ml-1">{error}</p>}
    </div>
);

const inputCls = (err) =>
    `w-full bg-slate-900/50 border rounded-xl py-3 px-4 text-sm text-slate-200 outline-none transition-all ${err ? 'border-rose-500/50 focus:border-rose-500' : 'border-white/10 focus:border-blue-500/50'}`;

const Leads = () => {
    const { user: currentUser } = useAuth();
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
    const [editingLead, setEditingLead] = useState(null);
    const [convertingLead, setConvertingLead] = useState(null);
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', status: 'new' });
    const [errors, setErrors] = useState({});
    const [convertForm, setConvertForm] = useState({ name: '', email: '', phone: '', plan: 'basic', paymentStatus: 'pending', startDate: '' });
    const [selectedIds, setSelectedIds] = useState([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const [fetchTick, setFetchTick] = useState(0);
    const [isImporting, setIsImporting] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [importError, setImportError] = useState('');
    const [pageSize, setPageSize] = useState(10);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [statusLead, setStatusLead] = useState(null);
    const [newStatus, setNewStatus] = useState('');
    const [statusCounts, setStatusCounts] = useState({});
    const [feedback, setFeedback] = useState(null);
    const [confirmAction, setConfirmAction] = useState(null);
    const [salesUsers, setSalesUsers] = useState([]);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [assigningLead, setAssigningLead] = useState(null); // null = bulk
    const [assignUserId, setAssignUserId] = useState('');
    const fileInputRef = useRef(null);

    // Fetch non-admin users for admin assign feature
    useEffect(() => {
        if (currentUser?.role !== 'admin') return;
        getUsers('', 1, 10).then(res => setSalesUsers(res.data.data.filter(u => u.role !== 'admin'))).catch(() => {});
    }, [currentUser]);

    // Fetch status counts — single aggregation call
    useEffect(() => {
        let active = true;
        const id = setTimeout(async () => {
            try {
                const res = await getLeadCounts(search);
                if (active) setStatusCounts(res.data.data);
            } catch {}
        }, 400);
        return () => { active = false; clearTimeout(id); };
    }, [search, fetchTick]);

    // Single effect — prevents duplicate calls
    useEffect(() => {
        let active = true;
        const id = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await getLeads(search, page, pageSize, statusFilter === 'all' ? '' : statusFilter);
                if (active) {
                    setLeads(res.data.data);
                    setTotalPages(res.data.totalPages || 1);
                }
            } catch (err) {
                console.error('Error fetching leads', err);
            } finally {
                if (active) setLoading(false);
            }
        }, 400);
        return () => { active = false; clearTimeout(id); };
    }, [search, page, pageSize, statusFilter, fetchTick]);

    const handleStatusFilter = (key) => {
        setStatusFilter(key);
        setPage(1);
    };

    const handleSearch = (val) => {
        setSearch(val);
        setPage(1);
    };

    const handlePageSizeChange = (val) => {
        setPageSize(Number(val));
        setPage(1);
    };

    const refetch = () => setFetchTick(t => t + 1);

    const validate = () => {
        const e = {};
        if (!formData.name.trim()) e.name = 'Full name is required';
        if (!formData.email.trim()) e.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Enter a valid email address';
        if (!formData.phone.trim()) e.phone = 'Phone number is required';
        else if (!/^\d{10}$/.test(formData.phone.replace(/\s/g, ''))) e.phone = 'Phone must be exactly 10 digits';
        return e;
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }
        setErrors({});
        try {
            if (editingLead) {
                await updateLead(editingLead._id, formData);
                setFeedback({ type: 'success', title: 'Lead Updated', message: `${formData.name}'s details have been saved.` });
            } else {
                await createLead({ name: formData.name, email: formData.email, phone: formData.phone });
                setFeedback({ type: 'success', title: 'Lead Created', message: `${formData.name} has been added as a new lead.` });
            }
            setIsModalOpen(false);
            setEditingLead(null);
            setFormData({ name: '', email: '', phone: '', status: 'new' });
            refetch();
        } catch (err) {
            setFeedback({ type: 'error', title: 'Save Failed', message: err.response?.data?.message || 'Could not save lead.' });
        }
    };

    const handleDelete = (id) => {
        setConfirmAction({
            title: 'Delete Lead',
            message: 'Are you sure you want to delete this lead? This cannot be undone.',
            confirmLabel: 'Yes, Delete',
            confirmColor: 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border-rose-500/20',
            onConfirm: async () => {
                setConfirmAction(null);
                try {
                    await deleteLead(id);
                    setSelectedIds(ids => ids.filter(i => i !== id));
                    refetch();
                    setFeedback({ type: 'success', title: 'Lead Deleted', message: 'The lead has been removed successfully.' });
                } catch (err) {
                    setFeedback({ type: 'error', title: 'Delete Failed', message: err.response?.data?.message || 'Could not delete lead.' });
                }
            },
        });
    };

    const handleBulkDelete = () => {
        setConfirmAction({
            title: `Delete ${selectedIds.length} Lead${selectedIds.length > 1 ? 's' : ''}`,
            message: `This will permanently remove ${selectedIds.length} selected lead${selectedIds.length > 1 ? 's' : ''}. This cannot be undone.`,
            confirmLabel: 'Yes, Delete All',
            confirmColor: 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border-rose-500/20',
            onConfirm: async () => {
                setConfirmAction(null);
                setIsDeleting(true);
                try {
                    await deleteLeads(selectedIds);
                    setSelectedIds([]);
                    refetch();
                    setFeedback({ type: 'success', title: 'Leads Deleted', message: 'Selected leads have been removed successfully.' });
                } catch (err) {
                    setFeedback({ type: 'error', title: 'Bulk Delete Failed', message: err.response?.data?.message || 'Could not delete selected leads.' });
                } finally {
                    setIsDeleting(false);
                }
            },
        });
    };

    const toggleSelect = (id) =>
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

    const allSelected = leads.length > 0 && leads.every(l => selectedIds.includes(l._id));
    const toggleSelectAll = () =>
        setSelectedIds(allSelected ? [] : leads.map(l => l._id));

    const handleConvertSubmit = async (e) => {
        e.preventDefault();
        try {
            await convertLead(convertingLead._id, convertForm);
            setIsConvertModalOpen(false);
            setConvertingLead(null);
            refetch();
            setFeedback({ type: 'success', title: 'Lead Converted!', message: `${convertForm.name} has been successfully converted to a customer.` });
        } catch (err) {
            setFeedback({ type: 'error', title: 'Conversion Failed', message: err.response?.data?.message || 'Could not convert lead.' });
        }
    };

    const ALLOWED_TYPES = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'];
    const MAX_SIZE = 10 * 1024 * 1024;

    const validateImportFile = (file) => {
        if (!file) return 'Please select a file.';
        const ext = file.name.split('.').pop().toLowerCase();
        if (!['xlsx', 'xls', 'csv'].includes(ext)) return 'Only .xlsx, .xls, or .csv files are allowed.';
        if (file.size > MAX_SIZE) return 'File size must not exceed 10MB.';
        return '';
    };

    const handleFileSelect = (file) => {
        const err = validateImportFile(file);
        setImportError(err);
        setImportFile(err ? null : file);
    };

    const openAssignModal = (lead = null) => {
        setAssigningLead(lead);
        setAssignUserId(lead?.assignedTo?._id || '');
        setIsAssignModalOpen(true);
    };

    const handleAssignSubmit = async () => {
        if (!assignUserId) return;
        try {
            if (assigningLead) {
                await assignLead(assigningLead._id, assignUserId);
                setFeedback({ type: 'success', title: 'Lead Assigned', message: `${assigningLead.name} has been assigned successfully.` });
            } else {
                await bulkAssignLeads(selectedIds, assignUserId);
                setSelectedIds([]);
                setFeedback({ type: 'success', title: 'Leads Assigned', message: `${selectedIds.length} leads have been assigned successfully.` });
            }
            setIsAssignModalOpen(false);
            refetch();
        } catch (err) {
            setFeedback({ type: 'error', title: 'Assign Failed', message: err.response?.data?.message || 'Could not assign lead(s).' });
        }
    };

    const handleExcelImport = async () => {
        if (!importFile) return;
        setIsImporting(true);
        try {
            const data = await importFile.arrayBuffer();
            const wb = XLSX.read(data);
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(ws);
            const VALID_STATUSES = ['new', 'contacted', 'interested', 'not_interested', 'converted'];
            const leads = rows.map(r => {
                const rawStatus = (r['Status'] || r['status'] || 'new').toString().toLowerCase().trim().replace(/\s+/g, '_');
                return {
                    name: (r['Name'] || r['name'] || '').toString().trim(),
                    email: (r['Email'] || r['email'] || '').toString().trim(),
                    phone: String(r['Phone'] || r['phone'] || '').replace(/\D/g, ''),
                    status: VALID_STATUSES.includes(rawStatus) ? rawStatus : 'new',
                };
            }).filter(l => l.name && l.email);
            if (leads.length === 0) {
                setImportError('No valid leads found. Ensure columns: Name, Email, Phone, Status');
                return;
            }
            const res = await importLeads({ leads });
            setIsImportModalOpen(false);
            setImportFile(null);
            refetch();
            setFeedback({ type: 'success', title: 'Import Successful', message: `${res.data.count} leads have been imported successfully.` });
        } catch (err) {
            setImportError(err.response?.data?.message || 'Import failed');
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const openModal = (lead = null) => {
        setErrors({});
        setEditingLead(lead);
        setFormData(lead
            ? { name: lead.name, email: lead.email, phone: lead.phone, status: lead.status }
            : { name: '', email: '', phone: '' }
        );
        setIsModalOpen(true);
    };

    const openStatusModal = (lead) => {
        setStatusLead(lead);
        setNewStatus(lead.status);
        setIsStatusModalOpen(true);
    };

    const handleStatusUpdate = async () => {
        try {
            await updateLead(statusLead._id, { status: newStatus });
            setIsStatusModalOpen(false);
            refetch();
            setFeedback({ type: 'success', title: 'Status Updated', message: `${statusLead.name}'s status changed to ${newStatus.replace('_', ' ')}.` });
        } catch (err) {
            setFeedback({ type: 'error', title: 'Update Failed', message: err.response?.data?.message || 'Could not update status.' });
        }
    };

    const handleExport = async () => {
        try {
            const res = await getLeads(search, 1, 10000, statusFilter === 'all' ? '' : statusFilter);
            const rows = res.data.data.map(l => ({
                Name: l.name,
                Email: l.email,
                Phone: l.phone,
                Status: l.status,
                'Assigned To': l.assignedTo?.name || '',
                'Created At': new Date(l.createdAt).toLocaleDateString(),
            }));
            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Leads');
            XLSX.writeFile(wb, `leads_export_${Date.now()}.xlsx`);
        } catch (err) {
            setFeedback({ type: 'error', title: 'Export Failed', message: 'Could not export leads. Please try again.' });
        }
    };

    const openConvertModal = (lead) => {
        setConvertingLead(lead);
        setConvertForm({
            name: lead.name, email: lead.email, phone: lead.phone,
            plan: 'basic', paymentStatus: 'pending',
            startDate: new Date().toISOString().split('T')[0],
        });
        setIsConvertModalOpen(true);
    };

    const handlePhoneInput = (val, target = 'lead') => {
        const digits = val.replace(/\D/g, '').slice(0, 10);
        if (target === 'lead') setFormData(p => ({ ...p, phone: digits }));
        else setConvertForm(p => ({ ...p, phone: digits }));
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Leads Management</h1>
                    <p className="text-slate-400 text-sm">Track and manage your potential business opportunities</p>
                </div>
            </div>

            {/* Search + Action Buttons */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-3 text-slate-500" size={18} />
                    <input
                        type="text"
                        placeholder="Search leads by name or email..."
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-2.5 pl-12 pr-4 text-sm text-slate-200 outline-none focus:border-blue-500/50 transition-all"
                    />
                </div>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => handleFileSelect(e.target.files[0])} />
                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 glass border border-white/10 hover:border-blue-500/30 text-slate-400 hover:text-blue-400 px-4 py-2.5 rounded-xl transition-all text-sm font-semibold"
                >
                    <Download size={16} />
                    Export
                </button>
                <button
                    onClick={() => { setImportFile(null); setImportError(''); setIsImportModalOpen(true); }}
                    className="flex items-center gap-2 glass border border-white/10 hover:border-emerald-500/30 text-slate-400 hover:text-emerald-400 px-4 py-2.5 rounded-xl transition-all text-sm font-semibold"
                >
                    <Upload size={16} />
                    Import
                </button>
                <button onClick={() => openModal()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-500/20">
                    <Plus size={18} />
                    <span className="font-semibold text-sm">Add New Lead</span>
                </button>
            </div>

            {/* Status Tabs with counts */}
            <div className="flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                    <button
                        key={s.key}
                        onClick={() => handleStatusFilter(s.key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                            statusFilter === s.key
                                ? 'bg-blue-600 text-white border-blue-500'
                                : 'glass border-white/10 text-slate-400 hover:text-white'
                        }`}
                    >
                        {s.label}
                        <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                            statusFilter === s.key ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-500'
                        }`}>
                            {statusCounts[s.key] ?? 0}
                        </span>
                    </button>
                ))}
            </div>

            {/* Bulk action bar — delete + assign */}
            {currentUser?.role === 'admin' && selectedIds.length > 0 && (
                <div className="flex items-center justify-between glass border border-rose-500/20 rounded-2xl px-5 py-3">
                    <span className="text-sm text-slate-300">{selectedIds.length} lead{selectedIds.length > 1 ? 's' : ''} selected</span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => openAssignModal(null)}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all"
                        >
                            <UserCog size={15} />
                            Assign
                        </button>
                        <button
                            onClick={handleBulkDelete}
                            disabled={isDeleting}
                            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all"
                        >
                            <Trash2 size={15} />
                            {isDeleting ? 'Deleting...' : `Delete ${selectedIds.length} Selected`}
                        </button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="glass rounded-3xl border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/5">
                                {currentUser?.role === 'admin' && (
                                    <th className="pl-6 py-4 w-10">
                                        <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="accent-blue-500 w-4 h-4 cursor-pointer" />
                                    </th>
                                )}
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Lead Info</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Assigned To</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr><td colSpan="4" className="px-6 py-10 text-center text-slate-500 text-sm">Loading leads...</td></tr>
                            ) : leads.length === 0 ? (
                                <tr><td colSpan="4" className="px-6 py-10 text-center text-slate-500 text-sm">No leads found.</td></tr>
                            ) : leads.map((lead) => (
                                <tr key={lead._id} className="hover:bg-white/[0.02] transition-colors group">
                                    {currentUser?.role === 'admin' && (
                                        <td className="pl-6 py-4 w-10">
                                            <input type="checkbox" checked={selectedIds.includes(lead._id)} onChange={() => toggleSelect(lead._id)} className="accent-blue-500 w-4 h-4 cursor-pointer" />
                                        </td>
                                    )}
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold text-white">{lead.name}</span>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="flex items-center gap-1 text-[11px] text-slate-500"><Mail size={10} /> {lead.email}</span>
                                                <span className="flex items-center gap-1 text-[11px] text-slate-500"><Phone size={10} /> {lead.phone}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4"><StatusBadge status={lead.status} /></td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-[10px] text-slate-400 uppercase font-bold">
                                                {lead.assignedTo?.name?.[0]}
                                            </div>
                                            <span className="text-xs text-slate-400">{lead.assignedTo?.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {lead.status === 'interested' && (
                                                <button data-tooltip-id="tip" data-tooltip-content="Convert to Customer" onClick={() => openConvertModal(lead)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-400 hover:bg-emerald-400/10 border border-emerald-500/20 transition-all">
                                                    <UserCheck size={14} /> Convert
                                                </button>
                                            )}
                                            {!['converted', 'not_interested'].includes(lead.status) && (
                                                <button data-tooltip-id="tip" data-tooltip-content="Update Status" onClick={() => openStatusModal(lead)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-400 hover:bg-blue-400/10 border border-blue-500/20 transition-all">
                                                    <RefreshCw size={13} /> Status
                                                </button>
                                            )}
                                            {currentUser?.role === 'admin' && (
                                                <button data-tooltip-id="tip" data-tooltip-content="Assign Sales Person" onClick={() => openAssignModal(lead)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 transition-all">
                                                    <UserCog size={16} />
                                                </button>
                                            )}
                                            <button data-tooltip-id="tip" data-tooltip-content="Edit Lead" onClick={() => openModal(lead)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                                                <Edit2 size={16} />
                                            </button>
                                            {currentUser?.role === 'admin' && (
                                                <button data-tooltip-id="tip" data-tooltip-content="Delete Lead" onClick={() => handleDelete(lead._id)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 transition-all">
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500">Rows per page:</span>
                        <select
                            value={pageSize}
                            onChange={(e) => handlePageSizeChange(e.target.value)}
                            className="bg-slate-900/50 border border-white/10 rounded-lg px-2 py-1 text-xs text-slate-300 outline-none focus:border-blue-500/50"
                        >
                            {[10, 25, 50, 75, 100].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        {leads.length > 0 && <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>}
                    </div>
                    {leads.length > 0 && (
                        <div className="flex items-center gap-1.5">
                            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-all"><ChevronLeft size={18} /></button>
                            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                                const n = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i;
                                return (
                                    <button key={n} onClick={() => setPage(n)} className={`w-8 h-8 rounded-lg text-xs font-semibold border transition-all ${page === n ? 'bg-blue-600 text-white border-blue-500' : 'border-white/10 text-slate-400 hover:text-white hover:bg-white/5'}`}>{n}</button>
                                );
                            })}
                            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-all"><ChevronRight size={18} /></button>
                        </div>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {/* Add/Edit Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-[#020617]/80 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg glass p-8 rounded-3xl border border-white/10 shadow-2xl">
                            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X size={20} /></button>
                            <h2 className="text-2xl font-bold text-white mb-2">{editingLead ? 'Edit Lead' : 'Add New Lead'}</h2>
                            <p className="text-slate-400 text-sm mb-6">Fields marked with <span className="text-rose-400">*</span> are required.</p>
                            <form onSubmit={handleFormSubmit} className="space-y-5" noValidate>
                                <Field label="Full Name" error={errors.name}>
                                    <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={inputCls(errors.name)} placeholder="John Doe" />
                                </Field>
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="Email" error={errors.email}>
                                        <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={inputCls(errors.email)} placeholder="john@example.com" />
                                    </Field>
                                    <Field label="Phone (10 digits)" error={errors.phone}>
                                        <input type="text" value={formData.phone} onChange={(e) => handlePhoneInput(e.target.value)} className={inputCls(errors.phone)} placeholder="9876543210" maxLength={10} />
                                    </Field>
                                </div>
                                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20">
                                    {editingLead ? 'Update Lead' : 'Create Lead'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}

                {/* Update Status Modal */}
                {isStatusModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsStatusModalOpen(false)} className="absolute inset-0 bg-[#020617]/80 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-sm glass p-8 rounded-3xl border border-white/10 shadow-2xl">
                            <button onClick={() => setIsStatusModalOpen(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X size={20} /></button>
                            <h2 className="text-xl font-bold text-white mb-1">Update Status</h2>
                            <p className="text-slate-400 text-sm mb-6"><span className="text-white font-semibold">{statusLead?.name}</span></p>
                            <div className="space-y-2 mb-6">
                                {(() => {
                                    const ORDER = ['new', 'contacted', 'interested', 'not_interested'];
                                    const currentIdx = ORDER.indexOf(statusLead?.status);
                                    return ORDER.map((key, idx) => {
                                        const disabled = idx <= currentIdx;
                                        const label = STATUSES.find(s => s.key === key)?.label;
                                        return (
                                            <button
                                                key={key}
                                                disabled={disabled}
                                                onClick={() => !disabled && setNewStatus(key)}
                                                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold border transition-all ${
                                                    newStatus === key
                                                        ? 'bg-blue-600 text-white border-blue-500'
                                                        : disabled
                                                        ? 'border-white/5 text-slate-600 cursor-not-allowed'
                                                        : 'glass border-white/10 text-slate-400 hover:text-white'
                                                }`}
                                            >
                                                {label}
                                            </button>
                                        );
                                    });
                                })()}
                            </div>
                            <button onClick={handleStatusUpdate} disabled={newStatus === statusLead?.status} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-all">
                                Save Status
                            </button>
                        </motion.div>
                    </div>
                )}

                {/* Import Modal */}
                {isImportModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsImportModalOpen(false)} className="absolute inset-0 bg-[#020617]/80 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-md glass p-8 rounded-3xl border border-white/10 shadow-2xl">
                            <button onClick={() => setIsImportModalOpen(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X size={20} /></button>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                    <Upload size={20} className="text-emerald-400" />
                                </div>
                                <h2 className="text-2xl font-bold text-white">Import Leads</h2>
                            </div>
                            <p className="text-slate-400 text-sm mb-6">Upload an Excel or CSV file. Max size: <span className="text-white">10MB</span>. Columns: <span className="text-white">Name, Email, Phone, Status</span>.</p>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => { e.preventDefault(); handleFileSelect(e.dataTransfer.files[0]); }}
                                className="border-2 border-dashed border-white/10 hover:border-emerald-500/40 rounded-2xl p-8 text-center cursor-pointer transition-all"
                            >
                                <Upload size={28} className="mx-auto mb-3 text-slate-500" />
                                {importFile ? (
                                    <p className="text-sm text-emerald-400 font-semibold">{importFile.name}</p>
                                ) : (
                                    <>
                                        <p className="text-sm text-slate-400">Click or drag & drop your file here</p>
                                        <p className="text-xs text-slate-600 mt-1">.xlsx, .xls, .csv — max 10MB</p>
                                    </>
                                )}
                            </div>
                            {importError && <p className="text-xs text-rose-400 mt-3">{importError}</p>}
                            <button
                                onClick={handleExcelImport}
                                disabled={!importFile || isImporting}
                                className="w-full mt-5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-all"
                            >
                                {isImporting ? 'Importing...' : 'Import'}
                            </button>
                        </motion.div>
                    </div>
                )}

                {/* Assign Modal */}
                {isAssignModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAssignModalOpen(false)} className="absolute inset-0 bg-[#020617]/80 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-sm glass p-8 rounded-3xl border border-white/10 shadow-2xl">
                            <button onClick={() => setIsAssignModalOpen(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X size={20} /></button>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                    <UserCog size={20} className="text-blue-400" />
                                </div>
                                <h2 className="text-xl font-bold text-white">Assign Lead{!assigningLead && 's'}</h2>
                            </div>
                            <p className="text-slate-400 text-sm mb-6">
                                {assigningLead
                                    ? <>Assigning <span className="text-white font-semibold">{assigningLead.name}</span> to a sales person.</>  
                                    : <>Assigning <span className="text-white font-semibold">{selectedIds.length} leads</span> to a sales person.</>
                                }
                            </p>
                            <div className="mb-6">
                                <select
                                    value={assignUserId}
                                    onChange={e => setAssignUserId(e.target.value)}
                                    className="w-full bg-slate-900 border border-white/10 rounded-xl py-3 px-4 text-sm text-slate-200 outline-none focus:border-blue-500/50 appearance-none"
                                >
                                    <option value="">Select a sales person...</option>
                                    {salesUsers.map(u => (
                                        <option key={u._id} value={u._id}>{u.name} — {u.email}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={handleAssignSubmit}
                                disabled={!assignUserId}
                                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-all"
                            >
                                Assign
                            </button>
                        </motion.div>
                    </div>
                )}

                {/* Convert to Customer Modal */}
                {isConvertModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsConvertModalOpen(false)} className="absolute inset-0 bg-[#020617]/80 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg glass p-8 rounded-3xl border border-white/10 shadow-2xl">
                            <button onClick={() => setIsConvertModalOpen(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X size={20} /></button>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                    <UserCheck size={20} className="text-emerald-400" />
                                </div>
                                <h2 className="text-2xl font-bold text-white">Convert to Customer</h2>
                            </div>
                            <p className="text-slate-400 text-sm mb-6">Converting <span className="text-white font-semibold">{convertingLead?.name}</span> into a customer.</p>
                            <form onSubmit={handleConvertSubmit} className="space-y-5">
                                <Field label="Name" error={null}>
                                    <input type="text" required value={convertForm.name} onChange={(e) => setConvertForm({ ...convertForm, name: e.target.value })} className={inputCls(false)} />
                                </Field>
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="Email" error={null}>
                                        <input type="email" required value={convertForm.email} onChange={(e) => setConvertForm({ ...convertForm, email: e.target.value })} className={inputCls(false)} />
                                    </Field>
                                    <Field label="Phone (10 digits)" error={null}>
                                        <input type="text" required value={convertForm.phone} onChange={(e) => handlePhoneInput(e.target.value, 'convert')} className={inputCls(false)} maxLength={10} />
                                    </Field>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="Plan" error={null}>
                                        <select required value={convertForm.plan} onChange={(e) => setConvertForm({ ...convertForm, plan: e.target.value })} className={inputCls(false) + ' appearance-none'}>
                                            <option value="basic">Basic</option>
                                            <option value="premium">Premium</option>
                                            <option value="enterprise">Enterprise</option>
                                        </select>
                                    </Field>
                                    <Field label="Payment Status" error={null}>
                                        <select required value={convertForm.paymentStatus} onChange={(e) => setConvertForm({ ...convertForm, paymentStatus: e.target.value })} className={inputCls(false) + ' appearance-none'}>
                                            <option value="pending">Pending</option>
                                            <option value="paid">Paid</option>
                                        </select>
                                    </Field>
                                </div>
                                <Field label="Start Date" error={null}>
                                    <input type="date" required value={convertForm.startDate} onChange={(e) => setConvertForm({ ...convertForm, startDate: e.target.value })} className={inputCls(false)} />
                                </Field>
                                <button type="submit" className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20">
                                    Convert to Customer
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            <Tooltip id="tip" place="top" offset={32} style={{ backgroundColor: '#0f172a', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px', fontWeight: '600', padding: '5px 10px', letterSpacing: '0.02em', boxShadow: '0 4px 20px rgba(0,0,0,0.4)', zIndex: 9999 }} />
            <AnimatePresence>
                {confirmAction && (
                    <ConfirmModal
                        title={confirmAction.title}
                        message={confirmAction.message}
                        confirmLabel={confirmAction.confirmLabel}
                        confirmColor={confirmAction.confirmColor}
                        onConfirm={confirmAction.onConfirm}
                        onCancel={() => setConfirmAction(null)}
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

export default Leads;
