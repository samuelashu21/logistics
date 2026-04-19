const mongoose = require('mongoose');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Order = require('../models/Order');
const Advertisement = require('../models/Advertisement');
const Review = require('../models/Review');

describe('User Model Validation', () => {
  it('should require name, email, and password', () => {
    const user = new User({});
    const err = user.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.name).toBeDefined();
    expect(err.errors.email).toBeDefined();
    expect(err.errors.password).toBeDefined();
  });

  it('should pass validation with valid required fields', () => {
    const user = new User({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
    });
    const err = user.validateSync();
    expect(err).toBeUndefined();
  });

  it('should reject invalid email format', () => {
    const user = new User({
      name: 'John Doe',
      email: 'invalid-email',
      password: 'password123',
    });
    const err = user.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.email).toBeDefined();
  });

  it('should reject invalid role enum value', () => {
    const user = new User({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      role: 'superuser',
    });
    const err = user.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.role).toBeDefined();
  });

  it('should accept valid role enum values', () => {
    const roles = ['admin', 'owner', 'driver', 'customer'];
    roles.forEach((role) => {
      const user = new User({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role,
      });
      const err = user.validateSync();
      expect(err).toBeUndefined();
    });
  });

  it('should default role to customer', () => {
    const user = new User({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
    });
    expect(user.role).toBe('customer');
  });

  it('should reject name exceeding maxlength', () => {
    const user = new User({
      name: 'a'.repeat(51),
      email: 'john@example.com',
      password: 'password123',
    });
    const err = user.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.name).toBeDefined();
  });
});

describe('Vehicle Model Validation', () => {
  const validOwnerId = new mongoose.Types.ObjectId();

  it('should require make, model, year, vin, and owner', () => {
    const vehicle = new Vehicle({});
    const err = vehicle.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.make).toBeDefined();
    expect(err.errors.model).toBeDefined();
    expect(err.errors.year).toBeDefined();
    expect(err.errors.vin).toBeDefined();
    expect(err.errors.owner).toBeDefined();
  });

  it('should pass with valid required fields', () => {
    const vehicle = new Vehicle({
      make: 'Toyota',
      model: 'Camry',
      year: 2022,
      vin: 'ABC123DEF456GH789',
      owner: validOwnerId,
    });
    const err = vehicle.validateSync();
    expect(err).toBeUndefined();
  });

  it('should reject invalid transmission enum value', () => {
    const vehicle = new Vehicle({
      make: 'Toyota',
      model: 'Camry',
      year: 2022,
      vin: 'ABC123DEF456GH789',
      owner: validOwnerId,
      transmission: 'cvt',
    });
    const err = vehicle.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.transmission).toBeDefined();
  });

  it('should accept valid transmission values', () => {
    ['automatic', 'manual'].forEach((transmission) => {
      const vehicle = new Vehicle({
        make: 'Toyota',
        model: 'Camry',
        year: 2022,
        vin: 'ABC123DEF456GH789',
        owner: validOwnerId,
        transmission,
      });
      const err = vehicle.validateSync();
      expect(err).toBeUndefined();
    });
  });

  it('should reject invalid fuelType enum value', () => {
    const vehicle = new Vehicle({
      make: 'Toyota',
      model: 'Camry',
      year: 2022,
      vin: 'ABC123DEF456GH789',
      owner: validOwnerId,
      fuelType: 'hydrogen',
    });
    const err = vehicle.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.fuelType).toBeDefined();
  });

  it('should accept valid fuelType values', () => {
    ['petrol', 'diesel', 'electric', 'hybrid'].forEach((fuelType) => {
      const vehicle = new Vehicle({
        make: 'Toyota',
        model: 'Camry',
        year: 2022,
        vin: 'ABC123DEF456GH789',
        owner: validOwnerId,
        fuelType,
      });
      const err = vehicle.validateSync();
      expect(err).toBeUndefined();
    });
  });

  it('should reject invalid condition enum value', () => {
    const vehicle = new Vehicle({
      make: 'Toyota',
      model: 'Camry',
      year: 2022,
      vin: 'ABC123DEF456GH789',
      owner: validOwnerId,
      condition: 'refurbished',
    });
    const err = vehicle.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.condition).toBeDefined();
  });

  it('should accept valid condition values', () => {
    ['new', 'used', 'certified'].forEach((condition) => {
      const vehicle = new Vehicle({
        make: 'Toyota',
        model: 'Camry',
        year: 2022,
        vin: 'ABC123DEF456GH789',
        owner: validOwnerId,
        condition,
      });
      const err = vehicle.validateSync();
      expect(err).toBeUndefined();
    });
  });

  it('should reject invalid status enum value', () => {
    const vehicle = new Vehicle({
      make: 'Toyota',
      model: 'Camry',
      year: 2022,
      vin: 'ABC123DEF456GH789',
      owner: validOwnerId,
      status: 'retired',
    });
    const err = vehicle.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.status).toBeDefined();
  });

  it('should accept valid status values', () => {
    ['available', 'in_use', 'maintenance'].forEach((status) => {
      const vehicle = new Vehicle({
        make: 'Toyota',
        model: 'Camry',
        year: 2022,
        vin: 'ABC123DEF456GH789',
        owner: validOwnerId,
        status,
      });
      const err = vehicle.validateSync();
      expect(err).toBeUndefined();
    });
  });

  it('should default status to available', () => {
    const vehicle = new Vehicle({
      make: 'Toyota',
      model: 'Camry',
      year: 2022,
      vin: 'ABC123DEF456GH789',
      owner: validOwnerId,
    });
    expect(vehicle.status).toBe('available');
  });
});

describe('Order Model Validation', () => {
  const validCustomerId = new mongoose.Types.ObjectId();

  it('should require customer, pickup address, and dropoff address', () => {
    const order = new Order({});
    const err = order.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.customer).toBeDefined();
    expect(err.errors['pickupLocation.address']).toBeDefined();
    expect(err.errors['dropoffLocation.address']).toBeDefined();
  });

  it('should pass with valid required fields', () => {
    const order = new Order({
      customer: validCustomerId,
      pickupLocation: { address: '123 Main St' },
      dropoffLocation: { address: '456 Oak Ave' },
    });
    const err = order.validateSync();
    expect(err).toBeUndefined();
  });

  it('should not auto-create invalid geo point objects when coordinates are omitted', () => {
    const order = new Order({
      customer: validCustomerId,
      pickupLocation: { address: '123 Main St' },
      dropoffLocation: { address: '456 Oak Ave' },
    });

    expect(order.pickupLocation.coordinates).toBeUndefined();
    expect(order.dropoffLocation.coordinates).toBeUndefined();
  });

  it('should reject incomplete geo point objects', () => {
    const order = new Order({
      customer: validCustomerId,
      pickupLocation: {
        address: '123 Main St',
        coordinates: { type: 'Point' },
      },
      dropoffLocation: {
        address: '456 Oak Ave',
        coordinates: { type: 'Point', coordinates: [38.74, 9.03] },
      },
    });

    const err = order.validateSync();
    expect(err).toBeDefined();
    expect(err.errors['pickupLocation.coordinates.coordinates']).toBeDefined();
  });

  it('should accept valid geo point objects', () => {
    const order = new Order({
      customer: validCustomerId,
      pickupLocation: {
        address: '123 Main St',
        coordinates: { type: 'Point', coordinates: [38.74, 9.03] },
      },
      dropoffLocation: {
        address: '456 Oak Ave',
        coordinates: { type: 'Point', coordinates: [39.28, 11.83] },
      },
    });

    const err = order.validateSync();
    expect(err).toBeUndefined();
  });

  it('should reject invalid status enum value', () => {
    const order = new Order({
      customer: validCustomerId,
      pickupLocation: { address: '123 Main St' },
      dropoffLocation: { address: '456 Oak Ave' },
      status: 'unknown',
    });
    const err = order.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.status).toBeDefined();
  });

  it('should accept valid status values', () => {
    const statuses = [
      'requested', 'paid', 'approved', 'assigned',
      'in_progress', 'completed', 'rejected', 'cancelled',
    ];
    statuses.forEach((status) => {
      const order = new Order({
        customer: validCustomerId,
        pickupLocation: { address: '123 Main St' },
        dropoffLocation: { address: '456 Oak Ave' },
        status,
      });
      const err = order.validateSync();
      expect(err).toBeUndefined();
    });
  });

  it('should reject invalid paymentStatus enum value', () => {
    const order = new Order({
      customer: validCustomerId,
      pickupLocation: { address: '123 Main St' },
      dropoffLocation: { address: '456 Oak Ave' },
      paymentStatus: 'refunded',
    });
    const err = order.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.paymentStatus).toBeDefined();
  });

  it('should accept valid paymentStatus values', () => {
    ['pending', 'verified', 'failed'].forEach((paymentStatus) => {
      const order = new Order({
        customer: validCustomerId,
        pickupLocation: { address: '123 Main St' },
        dropoffLocation: { address: '456 Oak Ave' },
        paymentStatus,
      });
      const err = order.validateSync();
      expect(err).toBeUndefined();
    });
  });

  it('should default status to requested', () => {
    const order = new Order({
      customer: validCustomerId,
      pickupLocation: { address: '123 Main St' },
      dropoffLocation: { address: '456 Oak Ave' },
    });
    expect(order.status).toBe('requested');
  });

  it('should default paymentStatus to pending', () => {
    const order = new Order({
      customer: validCustomerId,
      pickupLocation: { address: '123 Main St' },
      dropoffLocation: { address: '456 Oak Ave' },
    });
    expect(order.paymentStatus).toBe('pending');
  });
});

describe('Advertisement Model Validation', () => {
  const validOwnerId = new mongoose.Types.ObjectId();

  it('should require title, description, owner, make, model, year, price', () => {
    const ad = new Advertisement({});
    const err = ad.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.title).toBeDefined();
    expect(err.errors.description).toBeDefined();
    expect(err.errors.owner).toBeDefined();
    expect(err.errors.make).toBeDefined();
    expect(err.errors.model).toBeDefined();
    expect(err.errors.year).toBeDefined();
    expect(err.errors.price).toBeDefined();
  });

  it('should pass with valid required fields', () => {
    const ad = new Advertisement({
      title: 'Toyota Camry for Sale',
      description: 'A great car in excellent condition',
      owner: validOwnerId,
      make: 'Toyota',
      model: 'Camry',
      year: 2022,
      price: 25000,
    });
    const err = ad.validateSync();
    expect(err).toBeUndefined();
  });

  it('should default isApproved to false', () => {
    const ad = new Advertisement({
      title: 'Test',
      description: 'Test desc',
      owner: validOwnerId,
      make: 'Toyota',
      model: 'Camry',
      year: 2022,
      price: 25000,
    });
    expect(ad.isApproved).toBe(false);
  });

  it('should default isActive to true', () => {
    const ad = new Advertisement({
      title: 'Test',
      description: 'Test desc',
      owner: validOwnerId,
      make: 'Toyota',
      model: 'Camry',
      year: 2022,
      price: 25000,
    });
    expect(ad.isActive).toBe(true);
  });
});

describe('Review Model Validation', () => {
  const validReviewerId = new mongoose.Types.ObjectId();
  const validTargetId = new mongoose.Types.ObjectId();

  it('should require reviewer, targetType, targetId, and rating', () => {
    const review = new Review({});
    const err = review.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.reviewer).toBeDefined();
    expect(err.errors.targetType).toBeDefined();
    expect(err.errors.targetId).toBeDefined();
    expect(err.errors.rating).toBeDefined();
  });

  it('should pass with valid required fields', () => {
    const review = new Review({
      reviewer: validReviewerId,
      targetType: 'driver',
      targetId: validTargetId,
      rating: 4,
    });
    const err = review.validateSync();
    expect(err).toBeUndefined();
  });

  it('should reject rating below 1', () => {
    const review = new Review({
      reviewer: validReviewerId,
      targetType: 'driver',
      targetId: validTargetId,
      rating: 0,
    });
    const err = review.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.rating).toBeDefined();
  });

  it('should reject rating above 5', () => {
    const review = new Review({
      reviewer: validReviewerId,
      targetType: 'driver',
      targetId: validTargetId,
      rating: 6,
    });
    const err = review.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.rating).toBeDefined();
  });

  it('should accept ratings between 1 and 5', () => {
    [1, 2, 3, 4, 5].forEach((rating) => {
      const review = new Review({
        reviewer: validReviewerId,
        targetType: 'driver',
        targetId: validTargetId,
        rating,
      });
      const err = review.validateSync();
      expect(err).toBeUndefined();
    });
  });

  it('should reject invalid targetType enum value', () => {
    const review = new Review({
      reviewer: validReviewerId,
      targetType: 'vehicle',
      targetId: validTargetId,
      rating: 3,
    });
    const err = review.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.targetType).toBeDefined();
  });

  it('should accept valid targetType values', () => {
    ['driver', 'service', 'advertisement'].forEach((targetType) => {
      const review = new Review({
        reviewer: validReviewerId,
        targetType,
        targetId: validTargetId,
        rating: 3,
      });
      const err = review.validateSync();
      expect(err).toBeUndefined();
    });
  });
});
