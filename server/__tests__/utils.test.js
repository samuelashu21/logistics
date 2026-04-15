describe('socketManager', () => {
  let socketManager;

  beforeEach(() => {
    // Clear module cache to get fresh instance
    jest.resetModules();
    socketManager = require('../utils/socketManager');
  });

  it('should have init method', () => {
    expect(typeof socketManager.init).toBe('function');
  });

  it('should have getIO method', () => {
    expect(typeof socketManager.getIO).toBe('function');
  });

  it('should throw error when getIO is called before init', () => {
    expect(() => socketManager.getIO()).toThrow(
      'Socket.io not initialized. Call init(server) first.'
    );
  });
});

describe('sendEmail', () => {
  it('should export a function', () => {
    const sendEmail = require('../utils/sendEmail');
    expect(typeof sendEmail).toBe('function');
  });
});
