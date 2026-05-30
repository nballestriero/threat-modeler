/**
 * @file Middleware centralizzato per la gestione degli errori
 * @module utils/errorHandler
 */

/**
 * Wrapper per gestire le eccezioni nelle route asincrone
 * @param {Function} fn - Funzione asincrona da eseguire
 * @returns {Function} Middleware che cattura errori e li passa a next()
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Middleware globale per la gestione degli errori
 * @param {Error} err - Oggetto errore
 * @param {Object} req - Request Express
 * @param {Object} res - Response Express
 * @param {Function} next - Next middleware
 */
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
