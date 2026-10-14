const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const c = require('../controllers/enquiryController');

router.post('/public', validate(c.createSchema), c.createEnquiry);

// Everything below requires a valid JWT.
router.use(auth);
router.get('/unclaimed', validate(c.listQuerySchema, 'query'), c.getUnclaimed);
router.get('/mine', validate(c.listQuerySchema, 'query'), c.getMine);
router.post('/:id/claim', c.claimEnquiry);

module.exports = router;
