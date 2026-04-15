import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', icon: '📊', roles: ['admin', 'owner', 'driver', 'customer'] },
  { label: 'Profile', path: '/profile', icon: '👤', roles: ['admin', 'owner', 'driver', 'customer'] },
  { label: 'Users', path: '/users', icon: '👥', roles: ['admin'] },
  { label: 'Vehicles', path: '/vehicles', icon: '🚛', roles: ['admin', 'owner'] },
  { label: 'Drivers', path: '/drivers', icon: '🧑‍✈️', roles: ['admin', 'owner'] },
  { label: 'Orders', path: '/orders', icon: '📦', roles: ['admin', 'owner', 'driver', 'customer'] },
  { label: 'Advertisements', path: '/advertisements', icon: '📢', roles: ['admin', 'owner', 'customer'] },
  { label: 'Tracking', path: '/tracking', icon: '📍', roles: ['admin', 'owner'] },
  { label: 'Reports', path: '/reports', icon: '📈', roles: ['admin'] },
  { label: 'Notifications', path: '/notifications', icon: '🔔', roles: ['admin', 'owner', 'driver', 'customer'] },
];

export default function Sidebar({ open, onClose }) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) return null;

  const role = user?.role || '';
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <>
      {open && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="sidebar-header">
          <span className="sidebar-logo">🚚 Logistics MS</span>
        </div>
        <nav className="sidebar-nav">
          {visibleItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `sidebar-link${isActive ? ' sidebar-link-active' : ''}`
              }
              onClick={onClose}
            >
              <span className="sidebar-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
