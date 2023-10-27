const express = require('express');

const { body } = require('express-validator');

const feedController = require('../controllers/feed');
const isAuth = require('../middleware/is-auth');
const router = express.Router();


// GET /feed/posts
router.get('/posts', isAuth, feedController.getPosts); // add authorization middleware

// POST /feed/posts
router.post('/post',
    isAuth,
    body('title')
        .trim()
        .isLength({ min: 5 }),
    body('content')
        .trim()
        .isLength({ min: 5 }),
    feedController.createPost);

router.get('/status', isAuth, feedController.getUserStatus);

router.post('/status', [
    body('status')
        .trim()
        .not()
        .isEmpty()
    ],
    isAuth, feedController.updateUserStatus);

router.get('/post/:postId', isAuth, feedController.getPost);

router.put('/post/:postId',
    isAuth,
    body('title')
        .trim()
        .isLength({ min: 5 }),
    body('content')
        .trim()
        .isLength({ min: 5 }), feedController.updatePost); // edit, update

router.delete('/post/:postId', isAuth, feedController.deletePost); // delete route can't send the body, but param

module.exports = router;