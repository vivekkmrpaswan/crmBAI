const router = require('express').Router();
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const c = require('../controllers/authController');

router.post('/register', validate(c.registerSchema), c.register);
router.post('/login', validate(c.loginSchema), c.login);
router.get('/me', auth, c.me);

module.exports = router;
