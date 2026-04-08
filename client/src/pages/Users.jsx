import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Shield, Mail, Calendar, Users as UsersIcon, ShieldCheck } from 'lucide-react';
import { Tooltip } from 'react-tooltip';
import { getUsers, createUser, updateUser, deleteUser, getRoles, createRole, updateRole, deleteRole } from '../api/axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/Pagination';
import { FeedbackModal, ConfirmModal } from '../components/FeedbackModals';

const ROLE_COLORS = [
    { color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', dot: 'bg-purple-400' },
    { color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', dot: 'bg-blue-400' },
    { color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-400' },
    { color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', dot: 'bg-orange-400' },
    { color: 'text-rose-400 bg-rose-500/10 border-rose-500/20', dot: 'bg-rose-400' },
    { color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', dot: 'bg-amber-400' },
];

const RoleBadge = ({ role, roles }) => {
    const r = roles?.find((x) => x.key === role);
    const colorSet = ROLE_COLORS[roles?.findIndex((x) => x.key === role) % ROLE_COLORS.length] || ROLE_COLORS[0];
    return (
        <span className={`flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${colorSet.color}`}>
            <Shield size={10} /> {r?.label || role}
        </span>
    );
};

const Users = () => {
    const { user: currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState('members');
    const [selectedRole, setSelectedRole] = useState('all');
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [rolesLoading, setRolesLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [editingRole, setEditingRole] = useState(null);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({ name: '', email: '', password: '', role: '' });
    const [roleForm, setRoleForm] = useState({ key: '', label: '' });
    const [feedback, setFeedback] = useState(null);
    const [confirmAction, setConfirmAction] = useState(null);

    const fetchUsers = async (role, pg) => {
        setLoading(true);
        try {
            const res = await getUsers(role === 'all' ? '' : role, pg);
            setUsers(res.data.data);
            setTotalPages(res.data.totalPages || 1);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchRoles = async () => {
        setRolesLoading(true);
        try {
            const res = await getRoles();
            setRoles(res.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setRolesLoading(false);
        }
    };

    // Fetch roles once on mount, fetch users only when members tab active
    useEffect(() => { fetchRoles(); }, []);

    useEffect(() => {
        if (activeTab !== 'members') return;
        let active = true;
        setLoading(true);
        getUsers(selectedRole === 'all' ? '' : selectedRole, page)
            .then(res => { if (active) { setUsers(res.data.data); setTotalPages(res.data.totalPages || 1); } })
            .catch(console.error)
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [activeTab, selectedRole, page]);

    const handleRoleFilter = (key) => {
        if (key === selectedRole) return;
        setSelectedRole(key);
        setPage(1);
    };

    const handleUserSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (editingUser) {
                await updateUser(editingUser._id, { name: formData.name, role: formData.role });
                setFeedback({ type: 'success', title: 'User Updated', message: `${formData.name}'s details have been saved.` });
            } else {
                await createUser(formData);
                setFeedback({ type: 'success', title: 'User Created', message: `${formData.name} has been added successfully.` });
            }
            setIsModalOpen(false);
            fetchUsers(selectedRole, page);
        } catch (err) {
            setIsModalOpen(false);
            setFeedback({ type: 'error', title: 'Save Failed', message: err.response?.data?.message || 'Could not save user.' });
        }
    };

    const handleDelete = (id, name) => {
        setConfirmAction({
            title: 'Delete User',
            message: `Are you sure you want to delete ${name}? This cannot be undone.`,
            confirmLabel: 'Yes, Delete',
            onConfirm: async () => {
                setConfirmAction(null);
                try {
                    await deleteUser(id);
                    fetchUsers(selectedRole, page);
                    setFeedback({ type: 'success', title: 'User Deleted', message: 'The user has been removed successfully.' });
                } catch (err) {
                    setFeedback({ type: 'error', title: 'Delete Failed', message: err.response?.data?.message || 'Could not delete user.' });
                }
            },
        });
    };

    const handleRoleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (editingRole) {
                await updateRole(editingRole._id, { label: roleForm.label });
                setFeedback({ type: 'success', title: 'Role Updated', message: `Role "${roleForm.label}" has been updated.` });
            } else {
                await createRole(roleForm);
                setFeedback({ type: 'success', title: 'Role Created', message: `Role "${roleForm.label}" has been created.` });
            }
            setIsModalOpen(false);
            fetchRoles();
        } catch (err) {
            setIsModalOpen(false);
            setFeedback({ type: 'error', title: 'Save Failed', message: err.response?.data?.message || 'Could not save role.' });
        }
    };

    const handleDeleteRole = (id, label) => {
        setConfirmAction({
            title: 'Delete Role',
            message: `Are you sure you want to delete the "${label}" role? This cannot be undone.`,
            confirmLabel: 'Yes, Delete',
            onConfirm: async () => {
                setConfirmAction(null);
                try {
                    await deleteRole(id);
                    fetchRoles();
                    setFeedback({ type: 'success', title: 'Role Deleted', message: 'The role has been removed successfully.' });
                } catch (err) {
                    setFeedback({ type: 'error', title: 'Delete Failed', message: err.response?.data?.message || 'Could not delete role.' });
                }
            },
        });
    };

    const openUserModal = (user = null) => {
        setError('');
        setEditingUser(user);
        setFormData(user
            ? { name: user.name, email: user.email, password: '', role: user.role }
            : { name: '', email: '', password: '', role: roles[0]?.key || '' }
        );
        setIsModalOpen(true);
    };

    const openRoleModal = (role = null) => {
        setError('');
        setEditingRole(role);
        setRoleForm(role
            ? { key: role.key, label: role.label }
            : { key: '', label: '' }
        );
        setIsModalOpen(true);
    };

    const tabs = [
        { key: 'members', label: 'Admins', icon: UsersIcon },
        { key: 'roles', label: 'Roles', icon: ShieldCheck },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">User Management</h1>
                    <p className="text-slate-400 text-sm">Manage team members and define access roles</p>
                </div>
                {activeTab === 'members' && (
                    <button
                        onClick={() => openUserModal()}
                        className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-500/20"
                    >
                        <Plus size={18} />
                        <span className="font-semibold text-sm">Add User</span>
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 glass p-1 rounded-2xl w-fit border border-white/10">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === tab.key ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white'}`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Members Tab */}
            {activeTab === 'members' && (
                <div className="space-y-4">
                    {/* Role filter pills */}
                    <div className="flex flex-wrap gap-2">
                        {[{ key: 'all', label: 'All' }, ...roles].map((r) => (
                            <button
                                key={r.key}
                                onClick={() => handleRoleFilter(r.key)}
                                className={`px-4 py-1.5 rounded-xl text-xs font-semibold border transition-all ${selectedRole === r.key ? 'bg-blue-600 text-white border-blue-500' : 'glass border-white/10 text-slate-400 hover:text-white'}`}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>

                    <div className="glass rounded-3xl border border-white/10 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-white/5 bg-white/5">
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">User</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Role</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Joined</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {loading ? (
                                        <tr><td colSpan="4" className="px-6 py-10 text-center text-slate-500 text-sm">Loading...</td></tr>
                                    ) : users.length === 0 ? (
                                        <tr><td colSpan="4" className="px-6 py-10 text-center text-slate-500 text-sm">No users found for this role.</td></tr>
                                    ) : users.map((u) => (
                                        <tr key={u._id} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-sm font-bold text-white uppercase">
                                                        {u.name?.[0]}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-semibold text-white flex items-center gap-2">
                                                            {u.name}
                                                            {u._id === currentUser?.id && (
                                                                <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded-full uppercase tracking-wider">You</span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                                                            <Mail size={10} /> {u.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4"><RoleBadge role={u.role} roles={roles} /></td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                    <Calendar size={12} />
                                                    {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 ">
                                                    <button onClick={() => openUserModal(u)} data-tooltip-id="tip" data-tooltip-content="Edit User" className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                                                        <Edit2 size={16} />
                                                    </button>
                                                    {u._id !== currentUser?.id && (
                                                        <button onClick={() => handleDelete(u._id, u.name)} data-tooltip-id="tip" data-tooltip-content="Delete User" className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 transition-all">
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
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                    </div>
                </div>
            )}

            {/* Roles Tab */}
            {activeTab === 'roles' && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button
                            onClick={() => openRoleModal()}
                            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-500/20"
                        >
                            <Plus size={18} />
                            <span className="font-semibold text-sm">Add Role</span>
                        </button>
                    </div>
                    {rolesLoading ? (
                        <div className="py-20 text-center text-slate-500">Loading roles...</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {roles.map((role, idx) => {
                                const colorSet = ROLE_COLORS[idx % ROLE_COLORS.length];
                                return (
                                    <motion.div
                                        key={role._id}
                                        whileHover={{ y: -4 }}
                                        className="glass p-6 rounded-3xl border border-white/10 flex flex-col gap-4"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2.5 rounded-xl border ${colorSet.color}`}>
                                                    <Shield size={18} />
                                                </div>
                                                <div>
                                                    <h3 className="text-white font-bold text-base">{role.label}</h3>
                                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${colorSet.color.split(' ')[0]}`}>{role.key}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => openRoleModal(role)} data-tooltip-id="tip" data-tooltip-content="Edit Role" className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                                                    <Edit2 size={15} />
                                                </button>
                                                <button onClick={() => handleDeleteRole(role._id, role.label)} data-tooltip-id="tip" data-tooltip-content="Delete Role" className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 transition-all">
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                                            <span className="text-xs text-slate-500">Role key</span>
                                            <RoleBadge role={role.key} roles={roles} />
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* User Modal */}
            <AnimatePresence>
                {isModalOpen && activeTab === 'members' && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-[#020617]/80 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="relative w-full max-w-md glass p-8 rounded-3xl border border-white/10 shadow-2xl">
                            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X size={20} /></button>
                            <h2 className="text-2xl font-bold text-white mb-2">{editingUser ? 'Edit User' : 'Add User'}</h2>
                            <p className="text-slate-400 text-sm mb-6">Manage user details and access role.</p>
                            {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs mb-4 text-center">{error}</div>}
                            <form onSubmit={handleUserSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Full Name</label>
                                    <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-xl py-3 px-4 text-sm text-slate-200 outline-none focus:border-blue-500/50" placeholder="John Doe" />
                                </div>
                                {!editingUser && (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-slate-500 uppercase">Email</label>
                                            <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-xl py-3 px-4 text-sm text-slate-200 outline-none focus:border-blue-500/50" placeholder="john@example.com" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-slate-500 uppercase">Password</label>
                                            <input type="password" required minLength={6} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-xl py-3 px-4 text-sm text-slate-200 outline-none focus:border-blue-500/50" placeholder="Min. 6 characters" />
                                        </div>
                                    </>
                                )}
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Role</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {roles.map((r, idx) => {
                                            const colorSet = ROLE_COLORS[idx % ROLE_COLORS.length];
                                            return (
                                                <label key={r.key}>
                                                    <input type="radio" name="role" value={r.key} checked={formData.role === r.key} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="hidden peer" />
                                                    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border border-white/10 text-xs font-bold uppercase tracking-wider cursor-pointer transition-all text-slate-400 peer-checked:${colorSet.color}`}>
                                                        <div className={`w-2 h-2 rounded-full ${colorSet.dot}`} />
                                                        {r.label}
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                                <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3 rounded-xl mt-2 transition-all">
                                    {editingUser ? 'Update User' : 'Create User'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}

                {/* Role Modal */}
                {isModalOpen && activeTab === 'roles' && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-[#020617]/80 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="relative w-full max-w-md glass p-8 rounded-3xl border border-white/10 shadow-2xl">
                            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X size={20} /></button>
                            <h2 className="text-2xl font-bold text-white mb-2">{editingRole ? 'Edit Role' : 'Add Role'}</h2>
                            <p className="text-slate-400 text-sm mb-6">Define a role name and key.</p>
                            {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs mb-4 text-center">{error}</div>}
                            <form onSubmit={handleRoleSubmit} className="space-y-4">
                                {!editingRole && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Role Key</label>
                                        <input type="text" required value={roleForm.key} onChange={(e) => setRoleForm({ ...roleForm, key: e.target.value.toLowerCase().replace(/\s+/g, '-') })} className="w-full bg-slate-900 border border-white/10 rounded-xl py-3 px-4 text-sm text-slate-200 outline-none focus:border-blue-500/50" placeholder="e.g. sales-person" />
                                        <p className="text-[11px] text-slate-500">Lowercase, hyphen-separated. Cannot be changed after creation.</p>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Label</label>
                                    <input type="text" required value={roleForm.label} onChange={(e) => setRoleForm({ ...roleForm, label: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-xl py-3 px-4 text-sm text-slate-200 outline-none focus:border-blue-500/50" placeholder="e.g. Sales Person" />
                                </div>
                                <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3 rounded-xl transition-all">
                                    {editingRole ? 'Update Role' : 'Create Role'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            <Tooltip id="tip" place="top" offset={32} style={{ backgroundColor: '#0f172a', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px', fontWeight: '600', padding: '5px 10px', letterSpacing: '0.02em', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }} />
            <AnimatePresence>
                {confirmAction && (
                    <ConfirmModal
                        title={confirmAction.title}
                        message={confirmAction.message}
                        confirmLabel={confirmAction.confirmLabel}
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

export default Users;
