const jwt = require('jsonwebtoken');
const { body } = require('express-validator');

const JWT_SECRET = 'test-secret-key-for-testing';
process.env.JWT_SECRET = JWT_SECRET;

const { protect, authorize } = require('../middleware/auth');
const errorHandler = require('../middleware/errorHandler');
const validate = require('../middleware/validate');

// Mock User.findById for protect middleware
jest.mock('../models/User', () => {
  const findById = jest.fn();
  return { findById };
});
const User = require('../models/User');

// Helper to create mock res
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Auth Middleware - protect', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if no token is provided', async () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 if authorization header has no Bearer prefix', async () => {
    const req = { headers: { authorization: 'Token abc123' } };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 for an invalid token', async () => {
    const req = { headers: { authorization: 'Bearer invalidtoken' } };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 if user not found', async () => {
    const token = jwt.sign({ id: 'user123' }, JWT_SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    User.findById.mockResolvedValue(null);

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next and set req.user for valid token', async () => {
    const mockUser = { _id: 'user123', name: 'John', role: 'customer' };
    const token = jwt.sign({ id: 'user123' }, JWT_SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    User.findById.mockResolvedValue(mockUser);

    await protect(req, res, next);

    expect(req.user).toEqual(mockUser);
    expect(next).toHaveBeenCalled();
  });
});

describe('Auth Middleware - authorize', () => {
  it('should return 403 if user role is not in allowed roles', () => {
    const req = { user: { role: 'customer' } };
    const res = mockRes();
    const next = jest.fn();

    const middleware = authorize('admin', 'owner');
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next if user role is authorized', () => {
    const req = { user: { role: 'admin' } };
    const res = mockRes();
    const next = jest.fn();

    const middleware = authorize('admin', 'owner');
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should work with a single role', () => {
    const req = { user: { role: 'driver' } };
    const res = mockRes();
    const next = jest.fn();

    const middleware = authorize('driver');
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});

describe('Error Handler Middleware', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should handle CastError', () => {
    const err = new Error('Cast error');
    err.name = 'CastError';
    const req = {};
    const res = mockRes();
    const next = jest.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Resource not found',
      })
    );
  });

  it('should handle duplicate key error (code 11000)', () => {
    const err = new Error('Duplicate key');
    err.code = 11000;
    err.keyValue = { email: 'test@test.com' };
    const req = {};
    const res = mockRes();
    const next = jest.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('email'),
      })
    );
  });

  it('should handle duplicate key error without keyValue', () => {
    const err = new Error('Duplicate key');
    err.code = 11000;
    const req = {};
    const res = mockRes();
    const next = jest.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Duplicate field value entered',
      })
    );
  });

  it('should handle ValidationError', () => {
    const err = new Error('Validation error');
    err.name = 'ValidationError';
    err.errors = {
      name: { message: 'Name is required' },
      email: { message: 'Email is required' },
    };
    const req = {};
    const res = mockRes();
    const next = jest.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.arrayContaining([
          'Name is required',
          'Email is required',
        ]),
      })
    );
  });

  it('should handle generic errors with statusCode', () => {
    const err = new Error('Not found');
    err.statusCode = 404;
    const req = {};
    const res = mockRes();
    const next = jest.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Not found',
      })
    );
  });

  it('should default to 500 for errors without statusCode', () => {
    const err = new Error('Something went wrong');
    const req = {};
    const res = mockRes();
    const next = jest.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Something went wrong',
      })
    );
  });
});

describe('Validate Middleware', () => {
  it('should return 400 on validation errors', async () => {
    const validations = [
      body('email').isEmail().withMessage('Invalid email'),
    ];
    const middleware = validate(validations);

    const req = { body: { email: 'not-an-email' }, headers: {}, get: jest.fn() };
    const res = mockRes();
    const next = jest.fn();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        errors: expect.any(Array),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next on valid input', async () => {
    const validations = [
      body('email').isEmail().withMessage('Invalid email'),
    ];
    const middleware = validate(validations);

    const req = { body: { email: 'valid@example.com' }, headers: {}, get: jest.fn() };
    const res = mockRes();
    const next = jest.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
