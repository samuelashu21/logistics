import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
});

// Request interceptor — attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export default api;

// ===== Auth =====
export const login = (data) => api.post('/auth/login', data);
export const register = (data) => api.post('/auth/register', data);
export const getMe = () => api.get('/auth/me');
export const forgotPassword = (data) => api.post('/auth/forgot-password', data);
export const resetPassword = (token, data) =>
  api.put(`/auth/reset-password/${token}`, data);

// ===== Users =====
export const getUsers = (params) => api.get('/users', { params });
export const getUser = (id) => api.get(`/users/${id}`);
export const createUser = (data) => api.post('/users', data);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/users/${id}`);
export const suspendUser = (id) => api.put(`/users/${id}/suspend`);
export const activateUser = (id) => api.put(`/users/${id}/activate`);

// ===== Vehicles =====
export const getVehicles = (params) => api.get('/vehicles', { params });
export const getVehicle = (id) => api.get(`/vehicles/${id}`);
export const createVehicle = (data) => api.post('/vehicles', data);
export const updateVehicle = (id, data) => api.put(`/vehicles/${id}`, data);
export const deleteVehicle = (id) => api.delete(`/vehicles/${id}`);
export const assignDriver = (vehicleId, driverId) =>
  api.put(`/vehicles/${vehicleId}/assign-driver`, { driverId });

// ===== Drivers =====
export const getDrivers = (params) => api.get('/drivers', { params });
export const getDriver = (id) => api.get(`/drivers/${id}`);
export const createDriver = (data) => api.post('/drivers', data);
export const updateDriver = (id, data) => api.put(`/drivers/${id}`, data);
export const deleteDriver = (id) => api.delete(`/drivers/${id}`);

// ===== Orders =====
export const getOrders = (params) => api.get('/orders', { params });
export const getOrder = (id) => api.get(`/orders/${id}`);
export const createOrder = (data) => api.post('/orders', data);
export const updateOrderStatus = (id, data) =>
  api.put(`/orders/${id}/status`, data);
export const approveOrder = (id) => api.put(`/orders/${id}/approve`);
export const rejectOrder = (id, data) => api.put(`/orders/${id}/reject`, data);
export const assignDriverToOrder = (id, data) =>
  api.put(`/orders/${id}/assign-driver`, data);
export const verifyPayment = (id, data) =>
  api.put(`/orders/${id}/verify-payment`, data);
export const getOrderHistory = (id) => api.get(`/orders/${id}/history`);

// ===== Advertisements =====
export const getAdvertisements = (params) =>
  api.get('/advertisements', { params });
export const getAdvertisement = (id) => api.get(`/advertisements/${id}`);
export const createAdvertisement = (data) => api.post('/advertisements', data);
export const updateAdvertisement = (id, data) =>
  api.put(`/advertisements/${id}`, data);
export const deleteAdvertisement = (id) => api.delete(`/advertisements/${id}`);
export const approveAd = (id) => api.put(`/advertisements/${id}/approve`);
export const rejectAd = (id, data) =>
  api.put(`/advertisements/${id}/reject`, data);
export const getMyAds = (params) => api.get('/advertisements/my-ads', { params });

// ===== Reviews =====
export const getReviews = (params) => api.get('/reviews', { params });
export const createReview = (data) => api.post('/reviews', data);
export const updateReview = (id, data) => api.put(`/reviews/${id}`, data);
export const deleteReview = (id) => api.delete(`/reviews/${id}`);
export const getAverageRating = (entityId) =>
  api.get(`/reviews/average/${entityId}`);

// ===== Notifications =====
export const getNotifications = (params) =>
  api.get('/notifications', { params });
export const markAsRead = (id) => api.put(`/notifications/${id}/read`);
export const markAllAsRead = () => api.put('/notifications/read-all');
export const deleteNotification = (id) => api.delete(`/notifications/${id}`);
export const getUnreadCount = () => api.get('/notifications/unread-count');

// ===== Tracking =====
export const updateLocation = (data) => api.post('/tracking/location', data);
export const getVehicleLocation = (vehicleId) =>
  api.get(`/tracking/vehicles/${vehicleId}/location`);
export const getTrackingHistory = (vehicleId, params) =>
  api.get(`/tracking/vehicles/${vehicleId}/history`, { params });
export const getActiveVehicles = () => api.get('/tracking/vehicles/active');

// ===== Reports =====
export const getDashboardStats = () => api.get('/reports/dashboard');
export const getVehicleReport = (params) =>
  api.get('/reports/vehicles', { params });
export const getDriverReport = (params) =>
  api.get('/reports/drivers', { params });
export const getCustomerReport = (params) =>
  api.get('/reports/customers', { params });
export const getRevenueReport = (params) =>
  api.get('/reports/revenue', { params });
export const exportReport = (type, params) =>
  api.get(`/reports/export/${type}`, { params, responseType: 'blob' });
