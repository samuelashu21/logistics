const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const Order = require('../models/Order');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// @desc    Get dashboard stats
// @route   GET /api/v1/reports/dashboard
exports.getDashboardStats = asyncHandler(async (req, res) => {
  const [totalUsers, totalVehicles, totalDrivers, ordersByStatus, revenueResult] =
    await Promise.all([
      User.countDocuments(),
      Vehicle.countDocuments(),
      Driver.countDocuments(),
      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { paymentStatus: 'verified' } },
        { $group: { _id: null, total: { $sum: '$paymentAmount' } } },
      ]),
    ]);

  const orders = {};
  ordersByStatus.forEach((item) => {
    orders[item._id] = item.count;
  });

  res.status(200).json({
    success: true,
    data: {
      totalUsers,
      totalVehicles,
      totalDrivers,
      orders,
      revenue: revenueResult.length > 0 ? revenueResult[0].total : 0,
    },
  });
});

// @desc    Get vehicle report (most active by order count)
// @route   GET /api/v1/reports/vehicles
exports.getVehicleReport = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.startDate || req.query.endDate) {
    filter.createdAt = {};
    if (req.query.startDate) filter.createdAt.$gte = new Date(req.query.startDate);
    if (req.query.endDate) filter.createdAt.$lte = new Date(req.query.endDate);
  }

  const limit = parseInt(req.query.limit, 10) || 10;

  const vehicles = await Order.aggregate([
    { $match: { vehicle: { $ne: null }, ...filter } },
    { $group: { _id: '$vehicle', orderCount: { $sum: 1 } } },
    { $sort: { orderCount: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'vehicles',
        localField: '_id',
        foreignField: '_id',
        as: 'vehicle',
      },
    },
    { $unwind: '$vehicle' },
    {
      $project: {
        _id: 0,
        vehicleId: '$_id',
        make: '$vehicle.make',
        model: '$vehicle.model',
        year: '$vehicle.year',
        licensePlate: '$vehicle.licensePlate',
        orderCount: 1,
      },
    },
  ]);

  res.status(200).json({
    success: true,
    count: vehicles.length,
    data: vehicles,
  });
});

// @desc    Get driver report (most active by completed trips)
// @route   GET /api/v1/reports/drivers
exports.getDriverReport = asyncHandler(async (req, res) => {
  const filter = { status: 'completed', driver: { $ne: null } };

  if (req.query.startDate || req.query.endDate) {
    filter.createdAt = {};
    if (req.query.startDate) filter.createdAt.$gte = new Date(req.query.startDate);
    if (req.query.endDate) filter.createdAt.$lte = new Date(req.query.endDate);
  }

  const limit = parseInt(req.query.limit, 10) || 10;

  const drivers = await Order.aggregate([
    { $match: filter },
    { $group: { _id: '$driver', completedTrips: { $sum: 1 } } },
    { $sort: { completedTrips: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'driver',
      },
    },
    { $unwind: '$driver' },
    {
      $project: {
        _id: 0,
        driverId: '$_id',
        name: '$driver.name',
        email: '$driver.email',
        completedTrips: 1,
      },
    },
  ]);

  res.status(200).json({
    success: true,
    count: drivers.length,
    data: drivers,
  });
});

// @desc    Get customer report (most frequent by order count)
// @route   GET /api/v1/reports/customers
exports.getCustomerReport = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.startDate || req.query.endDate) {
    filter.createdAt = {};
    if (req.query.startDate) filter.createdAt.$gte = new Date(req.query.startDate);
    if (req.query.endDate) filter.createdAt.$lte = new Date(req.query.endDate);
  }

  const limit = parseInt(req.query.limit, 10) || 10;

  const customers = await Order.aggregate([
    { $match: filter },
    { $group: { _id: '$customer', orderCount: { $sum: 1 } } },
    { $sort: { orderCount: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'customer',
      },
    },
    { $unwind: '$customer' },
    {
      $project: {
        _id: 0,
        customerId: '$_id',
        name: '$customer.name',
        email: '$customer.email',
        orderCount: 1,
      },
    },
  ]);

  res.status(200).json({
    success: true,
    count: customers.length,
    data: customers,
  });
});

// @desc    Get revenue report by period
// @route   GET /api/v1/reports/revenue
exports.getRevenueReport = asyncHandler(async (req, res) => {
  const period = req.query.period || 'monthly';

  let dateFormat;
  if (period === 'weekly') {
    dateFormat = { $isoWeek: '$createdAt' };
  } else if (period === 'yearly') {
    dateFormat = { $year: '$createdAt' };
  } else {
    // monthly
    dateFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
  }

  const groupId =
    period === 'weekly'
      ? { year: { $isoWeekYear: '$createdAt' }, week: dateFormat }
      : period === 'yearly'
        ? { year: dateFormat }
        : { period: dateFormat };

  const revenue = await Order.aggregate([
    { $match: { paymentStatus: 'verified' } },
    {
      $group: {
        _id: groupId,
        revenue: { $sum: '$paymentAmount' },
        orderCount: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.status(200).json({
    success: true,
    count: revenue.length,
    data: revenue,
  });
});

// @desc    Export report data
// @route   GET /api/v1/reports/export/:type/:format
exports.exportReport = asyncHandler(async (req, res) => {
  const { type, format } = req.params;
  const validTypes = ['vehicles', 'drivers', 'customers', 'revenue'];
  const validFormats = ['csv', 'excel', 'pdf'];

  if (!validTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      error: `Invalid report type. Valid types: ${validTypes.join(', ')}`,
    });
  }

  if (!validFormats.includes(format)) {
    return res.status(400).json({
      success: false,
      error: `Invalid format. Valid formats: ${validFormats.join(', ')}`,
    });
  }

  // Gather report data
  const data = await getReportData(type, req.query);

  if (format === 'csv') {
    const { Parser } = require('json2csv');
    const parser = new Parser();
    const csv = parser.parse(data);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${type}-report.csv`);
    return res.status(200).send(csv);
  }

  if (format === 'excel') {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`${type} Report`);

    if (data.length > 0) {
      worksheet.columns = Object.keys(data[0]).map((key) => ({
        header: key,
        key,
        width: 20,
      }));
      data.forEach((row) => worksheet.addRow(row));
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename=${type}-report.xlsx`);
    await workbook.xlsx.write(res);
    return res.end();
  }

  if (format === 'pdf') {
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${type}-report.pdf`);
    doc.pipe(res);

    doc.fontSize(18).text(`${type.charAt(0).toUpperCase() + type.slice(1)} Report`, {
      align: 'center',
    });
    doc.moveDown();
    doc.fontSize(10).text(`Generated: ${new Date().toISOString()}`, { align: 'center' });
    doc.moveDown();

    if (data.length > 0) {
      const headers = Object.keys(data[0]);
      doc.fontSize(10).text(headers.join(' | '), { underline: true });
      doc.moveDown(0.5);

      data.forEach((row) => {
        const values = headers.map((h) => String(row[h] != null ? row[h] : ''));
        doc.text(values.join(' | '));
      });
    } else {
      doc.text('No data available for this report.');
    }

    doc.end();
    return;
  }
});

// Helper to gather report data based on type
async function getReportData(type, query) {
  const filter = {};
  if (query.startDate || query.endDate) {
    filter.createdAt = {};
    if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
    if (query.endDate) filter.createdAt.$lte = new Date(query.endDate);
  }

  const limit = parseInt(query.limit, 10) || 50;

  if (type === 'vehicles') {
    return Order.aggregate([
      { $match: { vehicle: { $ne: null }, ...filter } },
      { $group: { _id: '$vehicle', orderCount: { $sum: 1 } } },
      { $sort: { orderCount: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'vehicles',
          localField: '_id',
          foreignField: '_id',
          as: 'vehicle',
        },
      },
      { $unwind: '$vehicle' },
      {
        $project: {
          _id: 0,
          make: '$vehicle.make',
          model: '$vehicle.model',
          year: '$vehicle.year',
          licensePlate: '$vehicle.licensePlate',
          orderCount: 1,
        },
      },
    ]);
  }

  if (type === 'drivers') {
    return Order.aggregate([
      { $match: { status: 'completed', driver: { $ne: null }, ...filter } },
      { $group: { _id: '$driver', completedTrips: { $sum: 1 } } },
      { $sort: { completedTrips: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'driver',
        },
      },
      { $unwind: '$driver' },
      {
        $project: {
          _id: 0,
          name: '$driver.name',
          email: '$driver.email',
          completedTrips: 1,
        },
      },
    ]);
  }

  if (type === 'customers') {
    return Order.aggregate([
      { $match: filter },
      { $group: { _id: '$customer', orderCount: { $sum: 1 } } },
      { $sort: { orderCount: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'customer',
        },
      },
      { $unwind: '$customer' },
      {
        $project: {
          _id: 0,
          name: '$customer.name',
          email: '$customer.email',
          orderCount: 1,
        },
      },
    ]);
  }

  if (type === 'revenue') {
    return Order.aggregate([
      { $match: { paymentStatus: 'verified', ...filter } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          revenue: { $sum: '$paymentAmount' },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          period: '$_id',
          revenue: 1,
          orderCount: 1,
        },
      },
    ]);
  }

  return [];
}
