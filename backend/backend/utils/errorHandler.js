/**
 * @file Middleware centralizzato per la gestione degli errori
 * @module utils/errorHandler
 */

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

const errorMiddleware = (err, req, res, next) => {
    const status = err.status || 500;
    console.error(`❌ [ERROR] ${req.method} ${req.path} - ${err.message}`);
    if (err.stack) console.error(err.stack);
    res.status(status).json({
        error: err.message,
        code: err.code || 'INTERNAL_ERROR',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = { asyncHandler, errorMiddleware };
