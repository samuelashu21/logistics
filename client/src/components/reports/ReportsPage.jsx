import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getVehicleReport,
  getDriverReport,
  getCustomerReport,
  getRevenueReport,
} from '../../services/api';
import Spinner from '../common/Spinner';

const TABS = [
  { key: 'vehicles', label: '🚛 Vehicles' },
  { key: 'drivers', label: '👤 Drivers' },
  { key: 'customers', label: '👥 Customers' },
  { key: 'revenue', label: '💰 Revenue' },
];

const PERIOD_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const EXPORT_FORMATS = [
  { value: 'csv', label: '📄 CSV' },
  { value: 'excel', label: '📊 Excel' },
  { value: 'pdf', label: '📕 PDF' },
];

const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '$0';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
};

const getDefaultDateRange = () => {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 1);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
};

const ReportsPage = () => {
  const { user } = useAuth();
  const defaults = getDefaultDateRange();

  const [activeTab, setActiveTab] = useState('vehicles');
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [period, setPeriod] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Report data
  const [vehicleData, setVehicleData] = useState([]);
  const [driverData, setDriverData] = useState([]);
  const [customerData, setCustomerData] = useState([]);
  const [revenueData, setRevenueData] = useState(null);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = { startDate, endDate, period };

      switch (activeTab) {
        case 'vehicles': {
          const res = await getVehicleReport(params);
          setVehicleData(res.data.data || res.data.vehicles || res.data.report || []);
          break;
        }
        case 'drivers': {
          const res = await getDriverReport(params);
          setDriverData(res.data.data || res.data.drivers || res.data.report || []);
          break;
        }
        case 'customers': {
          const res = await getCustomerReport(params);
          setCustomerData(res.data.data || res.data.customers || res.data.report || []);
          break;
        }
        case 'revenue': {
          const res = await getRevenueReport(params);
          setRevenueData(res.data.data || res.data.revenue || res.data);
          break;
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [activeTab, startDate, endDate, period]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExport = (format) => {
    const params = new URLSearchParams({ startDate, endDate, period, format });
    const token = localStorage.getItem('token');
    if (token) params.append('token', token);
    const url = `/api/v1/reports/export/${activeTab}?${params.toString()}`;
    window.open(url, '_blank');
  };

  const summaryCards = () => {
    if (activeTab === 'revenue' && revenueData) {
      const total = revenueData.totalRevenue || revenueData.total || 0;
      const orderCount = revenueData.totalOrders || revenueData.orderCount || 0;
      const avg = revenueData.averageOrderValue || (orderCount > 0 ? total / orderCount : 0);
      return (
        <div className="grid grid-4" style={{ gap: 16 }}>
          <div className="card">
            <div className="card-body text-center">
              <div className="text-muted text-sm">Total Revenue</div>
              <div className="text-xl font-bold" style={{ color: 'var(--secondary)' }}>{formatCurrency(total)}</div>
            </div>
          </div>
          <div className="card">
            <div className="card-body text-center">
              <div className="text-muted text-sm">Total Orders</div>
              <div className="text-xl font-bold" style={{ color: 'var(--primary)' }}>{orderCount}</div>
            </div>
          </div>
          <div className="card">
            <div className="card-body text-center">
              <div className="text-muted text-sm">Average Order Value</div>
              <div className="text-xl font-bold" style={{ color: 'var(--warning-dark)' }}>{formatCurrency(avg)}</div>
            </div>
          </div>
          <div className="card">
            <div className="card-body text-center">
              <div className="text-muted text-sm">Period</div>
              <div className="text-xl font-bold">{period.charAt(0).toUpperCase() + period.slice(1)}</div>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'vehicles') {
      return (
        <div className="grid grid-3" style={{ gap: 16 }}>
          <div className="card">
            <div className="card-body text-center">
              <div className="text-muted text-sm">Total Vehicles</div>
              <div className="text-xl font-bold" style={{ color: 'var(--primary)' }}>{vehicleData.length}</div>
            </div>
          </div>
          <div className="card">
            <div className="card-body text-center">
              <div className="text-muted text-sm">Total Orders</div>
              <div className="text-xl font-bold" style={{ color: 'var(--secondary)' }}>
                {vehicleData.reduce((sum, v) => sum + (v.orderCount || v.orders || 0), 0)}
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-body text-center">
              <div className="text-muted text-sm">Total Revenue</div>
              <div className="text-xl font-bold" style={{ color: 'var(--warning-dark)' }}>
                {formatCurrency(vehicleData.reduce((sum, v) => sum + (v.totalRevenue || v.revenue || 0), 0))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'drivers') {
      return (
        <div className="grid grid-2" style={{ gap: 16 }}>
          <div className="card">
            <div className="card-body text-center">
              <div className="text-muted text-sm">Total Drivers</div>
              <div className="text-xl font-bold" style={{ color: 'var(--primary)' }}>{driverData.length}</div>
            </div>
          </div>
          <div className="card">
            <div className="card-body text-center">
              <div className="text-muted text-sm">Completed Trips</div>
              <div className="text-xl font-bold" style={{ color: 'var(--secondary)' }}>
                {driverData.reduce((sum, d) => sum + (d.completedTrips || d.trips || 0), 0)}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'customers') {
      return (
        <div className="grid grid-2" style={{ gap: 16 }}>
          <div className="card">
            <div className="card-body text-center">
              <div className="text-muted text-sm">Total Customers</div>
              <div className="text-xl font-bold" style={{ color: 'var(--primary)' }}>{customerData.length}</div>
            </div>
          </div>
          <div className="card">
            <div className="card-body text-center">
              <div className="text-muted text-sm">Total Orders</div>
              <div className="text-xl font-bold" style={{ color: 'var(--secondary)' }}>
                {customerData.reduce((sum, c) => sum + (c.orderCount || c.orders || 0), 0)}
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderTable = () => {
    if (loading) return <Spinner />;

    if (activeTab === 'vehicles') {
      return vehicleData.length === 0 ? (
        <p className="text-muted text-center" style={{ padding: 24 }}>No vehicle data for this period</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>#</th>
                <th>Vehicle</th>
                <th>Plate Number</th>
                <th>Order Count</th>
                <th>Total Revenue</th>
              </tr>
            </thead>
            <tbody>
              {vehicleData.map((v, idx) => (
                <tr key={v._id || idx}>
                  <td>{idx + 1}</td>
                  <td>{v.name || `${v.make || ''} ${v.model || ''}`.trim() || 'N/A'}</td>
                  <td>{v.plateNumber || v.licensePlate || 'N/A'}</td>
                  <td>{v.orderCount || v.orders || 0}</td>
                  <td>{formatCurrency(v.totalRevenue || v.revenue || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (activeTab === 'drivers') {
      return driverData.length === 0 ? (
        <p className="text-muted text-center" style={{ padding: 24 }}>No driver data for this period</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>#</th>
                <th>Driver Name</th>
                <th>License</th>
                <th>Completed Trips</th>
                <th>Rating</th>
              </tr>
            </thead>
            <tbody>
              {driverData.map((d, idx) => (
                <tr key={d._id || idx}>
                  <td>{idx + 1}</td>
                  <td>{d.name || d.driverName || 'N/A'}</td>
                  <td>{d.licenseNumber || d.license || 'N/A'}</td>
                  <td>{d.completedTrips || d.trips || 0}</td>
                  <td>{d.rating != null ? `${d.rating.toFixed(1)} ⭐` : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (activeTab === 'customers') {
      return customerData.length === 0 ? (
        <p className="text-muted text-center" style={{ padding: 24 }}>No customer data for this period</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>#</th>
                <th>Customer Name</th>
                <th>Email</th>
                <th>Order Count</th>
                <th>Total Spent</th>
              </tr>
            </thead>
            <tbody>
              {customerData.map((c, idx) => (
                <tr key={c._id || idx}>
                  <td>{idx + 1}</td>
                  <td>{c.name || c.customerName || 'N/A'}</td>
                  <td>{c.email || 'N/A'}</td>
                  <td>{c.orderCount || c.orders || 0}</td>
                  <td>{formatCurrency(c.totalSpent || c.spent || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (activeTab === 'revenue') {
      if (!revenueData) return <p className="text-muted text-center" style={{ padding: 24 }}>No revenue data</p>;
      const breakdown = revenueData.breakdown || revenueData.periods || [];
      return breakdown.length === 0 ? (
        <p className="text-muted text-center" style={{ padding: 24 }}>No breakdown data for this period</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Period</th>
                <th>Orders</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((b, idx) => (
                <tr key={idx}>
                  <td>{b.period || b.label || b.date || `Period ${idx + 1}`}</td>
                  <td>{b.orders || b.orderCount || 0}</td>
                  <td>{formatCurrency(b.revenue || b.amount || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="container">
      <div className="page-header mb-2">
        <h1>Reports &amp; Analytics</h1>
      </div>

      {error && <div className="alert alert-danger mb-2">{error}</div>}

      {/* Controls */}
      <div className="card mb-2">
        <div className="card-body">
          <div className="flex gap-2 flex-wrap" style={{ alignItems: 'flex-end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Start Date</label>
              <input
                type="date"
                className="form-control"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">End Date</label>
              <input
                type="date"
                className="form-control"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0, minWidth: 140 }}>
              <label className="form-label">Period</label>
              <select
                className="form-control"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                {PERIOD_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary" onClick={fetchReport} disabled={loading}>
              {loading ? 'Loading...' : 'Generate Report'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-2" style={{ borderBottom: '2px solid var(--gray-light)', paddingBottom: 0 }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="btn btn-sm"
            style={{
              background: activeTab === tab.key ? 'var(--primary)' : 'transparent',
              color: activeTab === tab.key ? 'white' : 'var(--gray)',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid var(--primary)' : '2px solid transparent',
              borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
              padding: '10px 20px',
              fontWeight: activeTab === tab.key ? 600 : 400,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      {!loading && <div className="mb-2">{summaryCards()}</div>}

      {/* Export Buttons */}
      <div className="flex gap-1 mb-2">
        {EXPORT_FORMATS.map((f) => (
          <button
            key={f.value}
            className="btn btn-outline btn-sm"
            onClick={() => handleExport(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Data Table */}
      <div className="card">
        <div className="card-body">
          {renderTable()}
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
