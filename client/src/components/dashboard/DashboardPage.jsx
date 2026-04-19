import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/useSocket.jsx';
import {
  getDashboardStats,
  getOrders,
  getVehicles,
  getDrivers,
} from '../../services/api';
import Spinner from '../common/Spinner';
  
const StatCard = ({ title, value, icon, color, link }) => (
  <div className="card">
    <div className="card-body">
      <div className="flex-between">
        <div>
          <p className="text-muted text-sm">{title}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
        <div
          style={{
            fontSize: '2rem',
            color: `var(--${color || 'primary'})`,
          }}
        >
          {icon}
        </div>
      </div>
      {link && (
        <Link to={link} className="text-primary text-sm">
          View all →
        </Link>
      )}
    </div>
  </div>
);

const statusBadge = (status) => {
  const map = {
    requested: 'badge-info',
    paid: 'badge-info',
    approved: 'badge-success',
    assigned: 'badge-warning',
    in_progress: 'badge-warning',
    completed: 'badge-success',
    rejected: 'badge-danger',
    cancelled: 'badge-danger',
  };
  return map[status] || 'badge-info';
};

/* ───────── Admin Dashboard ───────── */
const AdminDashboard = ({ stats, recentOrders }) => (
  <>
    <div className="grid grid-4 gap-2 mb-3">
      <StatCard title="Total Users" value={stats.totalUsers ?? 0} icon="👥" color="primary" link="/users" />
      <StatCard title="Vehicles" value={stats.totalVehicles ?? 0} icon="🚛" color="secondary" link="/vehicles" />
      <StatCard title="Orders" value={stats.totalOrders ?? 0} icon="📦" color="warning" link="/orders" />
      <StatCard
        title="Revenue"
        value={`$${(stats.totalRevenue ?? 0).toLocaleString()}`}
        icon="💰"
        color="secondary"
        link="/reports"
      />
    </div>

    <div className="grid grid-3 gap-2 mb-3">
      <StatCard title="Active Drivers" value={stats.activeDrivers ?? 0} icon="🏎️" color="primary" />
      <StatCard title="Pending Orders" value={stats.pendingOrders ?? 0} icon="⏳" color="warning" />
      <StatCard title="Completed Today" value={stats.completedToday ?? 0} icon="✅" color="secondary" />
    </div>

    <div className="flex gap-2 mb-3">
      <Link to="/users" className="btn btn-primary">Manage Users</Link>
      <Link to="/vehicles" className="btn btn-secondary">Manage Vehicles</Link>
      <Link to="/orders" className="btn btn-outline">View Orders</Link>
      <Link to="/reports" className="btn btn-outline">Reports</Link>
    </div>

    <div className="card">
      <div className="card-header">
        <div className="flex-between">
          <h3>Recent Orders</h3>
          <Link to="/orders" className="btn btn-sm btn-outline">View All</Link>
        </div>
      </div>
      <div className="card-body">
        {recentOrders.length === 0 ? (
          <p className="text-muted text-center">No recent orders</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order._id}>
                    <td>
                      <Link to={`/orders/${order._id}`}>
                        #{order._id?.slice(-6).toUpperCase()}
                      </Link>
                    </td>
                    <td>{order.customer?.name || order.customer?.email || 'N/A'}</td>
                    <td>
                      <span className={`badge ${statusBadge(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>${(order.totalAmount ?? 0).toLocaleString()}</td>
                    <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  </>
);

/* ───────── Owner Dashboard ───────── */
const OwnerDashboard = ({ stats, recentOrders }) => (
  <>
    <div className="grid grid-4 gap-2 mb-3">
      <StatCard title="My Vehicles" value={stats.totalVehicles ?? 0} icon="🚛" color="primary" link="/vehicles" />
      <StatCard title="Active Drivers" value={stats.activeDrivers ?? 0} icon="👨‍✈️" color="secondary" link="/drivers" />
      <StatCard title="Pending Orders" value={stats.pendingOrders ?? 0} icon="⏳" color="warning" link="/orders" />
      <StatCard
        title="Revenue"
        value={`$${(stats.totalRevenue ?? 0).toLocaleString()}`}
        icon="💰"
        color="secondary"
      />
    </div>

    <div className="flex gap-2 mb-3">
      <Link to="/vehicles" className="btn btn-primary">My Vehicles</Link>
      <Link to="/drivers" className="btn btn-secondary">My Drivers</Link>
      <Link to="/orders" className="btn btn-outline">Orders</Link>
    </div>

    <div className="card">
      <div className="card-header"><h3>Recent Activity</h3></div>
      <div className="card-body">
        {recentOrders.length === 0 ? (
          <p className="text-muted text-center">No recent orders</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Vehicle</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order._id}>
                    <td>
                      <Link to={`/orders/${order._id}`}>
                        #{order._id?.slice(-6).toUpperCase()}
                      </Link>
                    </td>
                    <td>
                      {order.vehicle
                        ? `${order.vehicle.make} ${order.vehicle.model}`
                        : 'N/A'}
                    </td>
                    <td>
                      <span className={`badge ${statusBadge(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  </>
);

/* ───────── Driver Dashboard ───────── */
const DriverDashboard = ({ stats, upcomingDeliveries }) => (
  <>
    <div className="grid grid-3 gap-2 mb-3">
      <StatCard title="Assigned Vehicle" value={stats.assignedVehicle ? '1' : '0'} icon="🚛" color="primary" />
      <StatCard title="Upcoming Deliveries" value={stats.upcomingDeliveries ?? 0} icon="📦" color="warning" />
      <StatCard title="Completed Trips" value={stats.completedTrips ?? 0} icon="✅" color="secondary" />
    </div>

    {stats.assignedVehicle && (
      <div className="card mb-3">
        <div className="card-header"><h3>My Vehicle</h3></div>
        <div className="card-body">
          <div className="grid grid-3 gap-2">
            <div>
              <p className="text-muted text-sm">Vehicle</p>
              <p className="font-bold">
                {stats.assignedVehicle.make} {stats.assignedVehicle.model}
              </p>
            </div>
            <div>
              <p className="text-muted text-sm">Year</p>
              <p className="font-bold">{stats.assignedVehicle.year}</p>
            </div>
            <div>
              <p className="text-muted text-sm">License Plate</p>
              <p className="font-bold">{stats.assignedVehicle.licensePlate}</p>
            </div>
          </div>
          <Link
            to={`/vehicles/${stats.assignedVehicle._id}`}
            className="btn btn-sm btn-outline mt-2"
          >
            View Details
          </Link> 
        </div>
      </div>
    )}

    <div className="card">
      <div className="card-header"><h3>Upcoming Deliveries</h3></div>
      <div className="card-body">
        {upcomingDeliveries.length === 0 ? (
          <p className="text-muted text-center">No upcoming deliveries</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Pickup</th>
                  <th>Destination</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {upcomingDeliveries.map((order) => (
                  <tr key={order._id}>
                    <td>
                      <Link to={`/orders/${order._id}`}>
                        #{order._id?.slice(-6).toUpperCase()}
                      </Link>
                    </td>
                    <td>{order.pickupAddress || 'N/A'}</td>
                    <td>{order.deliveryAddress || 'N/A'}</td>
                    <td>
                      <span className={`badge ${statusBadge(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  </>
);

/* ───────── Customer Dashboard ───────── */
const CustomerDashboard = ({ stats, recentOrders }) => (
  <>
    <div className="grid grid-4 gap-2 mb-3">
      <StatCard title="Total Orders" value={stats.totalOrders ?? 0} icon="📦" color="primary" link="/orders" />
      <StatCard title="Pending" value={stats.pendingOrders ?? 0} icon="⏳" color="warning" />
      <StatCard title="Active" value={stats.activeOrders ?? 0} icon="🚚" color="secondary" />
      <StatCard title="Completed" value={stats.completedOrders ?? 0} icon="✅" color="secondary" />
    </div>

    <div className="flex gap-2 mb-3">
      <Link to="/orders/new" className="btn btn-primary">Place Order</Link>
      <Link to="/orders" className="btn btn-primary">My Orders</Link>
      <Link to="/advertisements" className="btn btn-secondary">Browse Ads</Link>
    </div>

    <div className="card">
      <div className="card-header"><h3>Recent Orders</h3></div>
      <div className="card-body">
        {recentOrders.length === 0 ? (
          <p className="text-muted text-center">No orders yet</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order._id}>
                    <td>
                      <Link to={`/orders/${order._id}`}>
                        #{order._id?.slice(-6).toUpperCase()}
                      </Link>
                    </td>
                    <td>
                      <span className={`badge ${statusBadge(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>${(order.totalAmount ?? 0).toLocaleString()}</td>
                    <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  </>
);

/* ───────── Main Dashboard Page ───────── */
const DashboardPage = () => {
  const { user } = useAuth();
  const socket = useSocket();
  const [stats, setStats] = useState({});
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      if (user.role === 'admin') {
        const [statsRes, ordersRes] = await Promise.all([
          getDashboardStats(),
          getOrders({ limit: 5, sort: '-createdAt' }),
        ]);
        setStats(statsRes.data.data || statsRes.data || {});
        setRecentOrders(ordersRes.data.data || ordersRes.data.orders || []);
      } else if (user.role === 'owner') {
        const [vehiclesRes, driversRes, ordersRes] = await Promise.all([
          getVehicles({ limit: 1 }),
          getDrivers({ limit: 1 }),
          getOrders({ limit: 5, sort: '-createdAt' }),
        ]);
        const vData = vehiclesRes.data;
        const dData = driversRes.data;
        const oData = ordersRes.data;
        setStats({
          totalVehicles: vData.total ?? vData.count ?? 0,
          activeDrivers: dData.total ?? dData.count ?? 0,
          pendingOrders:
            (oData.data || oData.orders || []).filter(
              (o) => o.status === 'requested' || o.status === 'paid'
            ).length,
          totalRevenue: 0,
        });
        setRecentOrders(oData.data || oData.orders || []);
      } else if (user.role === 'driver') {
        const ordersRes = await getOrders({
          limit: 10,
          sort: '-createdAt',
        });
        const orders = ordersRes.data.data || ordersRes.data.orders || [];
        const assigned = orders.find(
          (o) =>
            o.status === 'assigned' || o.status === 'in_progress'
        );
        setStats({
          assignedVehicle: assigned?.vehicle || null,
          upcomingDeliveries: orders.filter(
            (o) => o.status === 'assigned' || o.status === 'approved'
          ).length,
          completedTrips: orders.filter((o) => o.status === 'completed').length,
        });
        setRecentOrders(
          orders.filter(
            (o) =>
              o.status === 'assigned' ||
              o.status === 'approved' ||
              o.status === 'in_progress'
          )
        );
      } else {
        // customer
        const ordersRes = await getOrders({ limit: 10, sort: '-createdAt' });
        const orders = ordersRes.data.data || ordersRes.data.orders || [];
        setStats({
          totalOrders: ordersRes.data.total ?? orders.length,
          pendingOrders: orders.filter(
            (o) => o.status === 'requested' || o.status === 'paid'
          ).length,
          activeOrders: orders.filter(
            (o) =>
              o.status === 'approved' ||
              o.status === 'assigned' ||
              o.status === 'in_progress'
          ).length,
          completedOrders: orders.filter((o) => o.status === 'completed')
            .length,
        });
        setRecentOrders(orders.slice(0, 5));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [user.role]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleOrderUpdate = () => fetchDashboard();
    socket.on('orderUpdate', handleOrderUpdate);
    socket.on('newOrder', handleOrderUpdate);

    return () => {
      socket.off('orderUpdate', handleOrderUpdate);
      socket.off('newOrder', handleOrderUpdate);
    };
  }, [socket, fetchDashboard]);

  if (loading) return <Spinner />;

  return (
    <div className="container">
      <div className="page-header mb-3">
        <h1>Dashboard</h1>
        <p className="text-muted">
          Welcome back, {user.name || user.email}
        </p>
      </div>

      {error && <div className="alert alert-danger mb-2">{error}</div>}

      {user.role === 'admin' && (
        <AdminDashboard stats={stats} recentOrders={recentOrders} />
      )}
      {user.role === 'owner' && (
        <OwnerDashboard stats={stats} recentOrders={recentOrders} />
      )}
      {user.role === 'driver' && (
        <DriverDashboard stats={stats} upcomingDeliveries={recentOrders} />
      )}
      {user.role === 'customer' && (
        <CustomerDashboard stats={stats} recentOrders={recentOrders} />
      )}
    </div> 
  ); 
};

export default DashboardPage;