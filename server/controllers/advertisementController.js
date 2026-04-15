const Advertisement = require('../models/Advertisement');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// @desc    Get all active, approved advertisements
// @route   GET /api/v1/advertisements
exports.getAdvertisements = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;

  const filter = { isActive: true, isApproved: true };

  // Text search across title, description, make, model
  if (req.query.keyword) {
    const regex = new RegExp(req.query.keyword, 'i');
    filter.$or = [
      { title: regex },
      { description: regex },
      { make: regex },
      { model: regex },
    ];
  }

  if (req.query.make) filter.make = new RegExp(req.query.make, 'i');
  if (req.query.model) filter.model = new RegExp(req.query.model, 'i');
  if (req.query.transmission) filter.transmission = req.query.transmission;
  if (req.query.condition) filter.condition = req.query.condition;
  if (req.query.fuelType) filter.fuelType = req.query.fuelType;
  if (req.query.sellerType) filter.sellerType = req.query.sellerType;
  if (req.query.city) filter['location.city'] = new RegExp(req.query.city, 'i');
  if (req.query.region) filter['location.region'] = new RegExp(req.query.region, 'i');

  // Year range
  if (req.query.yearMin || req.query.yearMax) {
    filter.year = {};
    if (req.query.yearMin) filter.year.$gte = parseInt(req.query.yearMin, 10);
    if (req.query.yearMax) filter.year.$lte = parseInt(req.query.yearMax, 10);
  }

  // Price range
  if (req.query.priceMin || req.query.priceMax) {
    filter.price = {};
    if (req.query.priceMin) filter.price.$gte = parseFloat(req.query.priceMin);
    if (req.query.priceMax) filter.price.$lte = parseFloat(req.query.priceMax);
  }

  // Sorting
  let sort = '-createdAt';
  if (req.query.sort) {
    const sortOptions = {
      price_asc: 'price',
      price_desc: '-price',
      newest: '-createdAt',
      year_asc: 'year',
      year_desc: '-year',
    };
    sort = sortOptions[req.query.sort] || sort;
  }

  const total = await Advertisement.countDocuments(filter);
  const advertisements = await Advertisement.find(filter)
    .populate('owner', 'name email')
    .skip(startIndex)
    .limit(limit)
    .sort(sort);

  res.status(200).json({
    success: true,
    count: advertisements.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: advertisements,
  });
});

// @desc    Get single advertisement
// @route   GET /api/v1/advertisements/:id
exports.getAdvertisement = asyncHandler(async (req, res) => {
  const advertisement = await Advertisement.findById(req.params.id)
    .populate('owner', 'name email phone');

  if (!advertisement) {
    return res.status(404).json({
      success: false,
      error: 'Advertisement not found',
    });
  }

  res.status(200).json({
    success: true,
    data: advertisement,
  });
});

// @desc    Create advertisement
// @route   POST /api/v1/advertisements
exports.createAdvertisement = asyncHandler(async (req, res) => {
  req.body.owner = req.user.id;

  const advertisement = await Advertisement.create(req.body);

  res.status(201).json({
    success: true,
    data: advertisement,
  });
});

// @desc    Update advertisement
// @route   PUT /api/v1/advertisements/:id
exports.updateAdvertisement = asyncHandler(async (req, res) => {
  let advertisement = await Advertisement.findById(req.params.id);

  if (!advertisement) {
    return res.status(404).json({
      success: false,
      error: 'Advertisement not found',
    });
  }

  if (advertisement.owner.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to update this advertisement',
    });
  }

  advertisement = await Advertisement.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: advertisement,
  });
});

// @desc    Delete advertisement
// @route   DELETE /api/v1/advertisements/:id
exports.deleteAdvertisement = asyncHandler(async (req, res) => {
  const advertisement = await Advertisement.findById(req.params.id);

  if (!advertisement) {
    return res.status(404).json({
      success: false,
      error: 'Advertisement not found',
    });
  }

  if (advertisement.owner.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to delete this advertisement',
    });
  }

  await Advertisement.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    data: {},
  });
});

// @desc    Approve advertisement
// @route   PUT /api/v1/advertisements/:id/approve
exports.approveAdvertisement = asyncHandler(async (req, res) => {
  const advertisement = await Advertisement.findById(req.params.id);

  if (!advertisement) {
    return res.status(404).json({
      success: false,
      error: 'Advertisement not found',
    });
  }

  advertisement.isApproved = true;
  await advertisement.save();

  res.status(200).json({
    success: true,
    data: advertisement,
  });
});

// @desc    Reject advertisement
// @route   PUT /api/v1/advertisements/:id/reject
exports.rejectAdvertisement = asyncHandler(async (req, res) => {
  const advertisement = await Advertisement.findById(req.params.id);

  if (!advertisement) {
    return res.status(404).json({
      success: false,
      error: 'Advertisement not found',
    });
  }

  advertisement.isApproved = false;
  await advertisement.save();

  res.status(200).json({
    success: true,
    data: advertisement,
  });
});

// @desc    Get advertisements for current user
// @route   GET /api/v1/advertisements/my
exports.getMyAdvertisements = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;

  const filter = { owner: req.user.id };

  const total = await Advertisement.countDocuments(filter);
  const advertisements = await Advertisement.find(filter)
    .skip(startIndex)
    .limit(limit)
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: advertisements.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: advertisements,
  });
});
