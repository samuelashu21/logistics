import React, { useState, useEffect, useCallback } from 'react';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  suspendUser,
  activateUser,
} from '../../services/api';
import Spinner from '../common/Spinner';
import Pagination from '../common/Pagination';

const ROLES = ['admin', 'owner', 'driver', 'customer'];

const roleBadge = (role) => {
  const map = {
    admin: 'badge-danger',
    owner: 'badge-info',
    driver: 'badge-warning',
    customer: 'badge-success',
  };
  return map[role] || 'badge-info';
};

const emptyForm = {
  name: '',
  email: '',
  password: '',
  role: 'customer',
  phone: '',
};

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      clearMessages();
      const params = { page, limit: 10 };
      if (roleFilter) params.role = roleFilter;
      if (search) params.search = search;
      const res = await getUsers(params);
      const data = res.data;
      setUsers(data.data || data.users || []);
      setTotalPages(data.totalPages || Math.ceil((data.total || 0) / 10) || 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [roleFilter, search]);

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (u) => {
    setEditingUser(u);
    setForm({
      name: u.name || '',
      email: u.email || '',
      password: '',
      role: u.role || 'customer',
      phone: u.phone || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      clearMessages();
      if (editingUser) {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        await updateUser(editingUser._id, payload);
        setSuccess('User updated successfully');
      } else {
        await createUser(form);
        setSuccess('User created successfully');
      }
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuspend = async (u) => {
    if (!window.confirm(`Suspend user ${u.name || u.email}?`)) return;
    try {
      clearMessages();
      await suspendUser(u._id);
      setSuccess('User suspended');
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to suspend user');
    }
  };

  const handleActivate = async (u) => {
    try {
      clearMessages();
      await activateUser(u._id);
      setSuccess('User activated');
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to activate user');
    }
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`Delete user ${u.name || u.email}? This cannot be undone.`)) return;
    try {
      clearMessages();
      await deleteUser(u._id);
      setSuccess('User deleted');
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const isSuspended = (u) =>
    u.status === 'suspended' || u.isActive === false || u.suspended === true;

  return (
    <div className="container">
      <div className="page-header mb-2">
        <div className="flex-between">
          <h1>User Management</h1>
          <button className="btn btn-primary" onClick={openCreate}>
            + Create User
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger mb-2">{error}</div>}
      {success && <div className="alert alert-success mb-2">{success}</div>}

      {/* Filters */}
      <div className="card mb-2">
        <div className="card-body">
          <div className="flex gap-2 flex-wrap">
            <div className="form-group" style={{ minWidth: 200 }}>
              <label className="form-label">Search</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ minWidth: 160 }}>
              <label className="form-label">Role</label>
              <select
                className="form-control"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="">All Roles</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <Spinner />
      ) : (
        <div className="card">
          <div className="card-body">
            {users.length === 0 ? (
              <p className="text-muted text-center">No users found</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u._id}>
                        <td>{u.name || '—'}</td>
                        <td>{u.email}</td>
                        <td>
                          <span className={`badge ${roleBadge(u.role)}`}>
                            {u.role}
                          </span>
                        </td>
                        <td>
                          {isSuspended(u) ? (
                            <span className="badge badge-danger">Suspended</span>
                          ) : (
                            <span className="badge badge-success">Active</span>
                          )}
                        </td>
                        <td>
                          <div className="flex gap-1">
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={() => openEdit(u)}
                            >
                              Edit
                            </button>
                            {isSuspended(u) ? (
                              <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => handleActivate(u)}
                              >
                                Activate
                              </button>
                            ) : (
                              <button
                                className="btn btn-sm btn-warning"
                                onClick={() => handleSuspend(u)}
                              >
                                Suspend
                              </button>
                            )}
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDelete(u)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="card"
            style={{ width: 480, maxHeight: '90vh', overflow: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header">
              <div className="flex-between">
                <h3>{editingUser ? 'Edit User' : 'Create User'}</h3>
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => setShowModal(false)}
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="form-group mb-2">
                  <label className="form-label">Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group mb-2">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group mb-2">
                  <label className="form-label">
                    Password{editingUser ? ' (leave blank to keep current)' : ''}
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    {...(!editingUser && { required: true, minLength: 6 })}
                  />
                </div>
                <div className="form-group mb-2">
                  <label className="form-label">Role</label>
                  <select
                    className="form-control"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group mb-2">
                  <label className="form-label">Phone</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="flex gap-1 mt-2">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting
                      ? 'Saving...'
                      : editingUser
                        ? 'Update User'
                        : 'Create User'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;
