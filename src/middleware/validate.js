const AppError = require('../utils/AppError');

// validate(zodSchema, 'body' | 'query' | 'params')
module.exports = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return next(new AppError(400, 'Validation failed', details));
  }
  // req.query is a getter in Express 5, so store parsed data separately.
  req.valid = { ...(req.valid || {}), [source]: result.data };
  next();
};
