const fs = require('fs');
const path = require('path');

const { validationResult } = require('express-validator');

const Post = require('../models/post');
const User = require('../models/user');

exports.getUserStatus = (req, res, next) => {
    User.findById(req.userId)
    .then(user => {
        if(!user){
            const error = new Error('User not found.');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            message: 'Fetched user status successfully.',
            status: user.status
        });
    })
    .catch(err => {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    });
}

exports.updateUserStatus = (req, res, next) => {
    const status = req.body.status;
    User.findById(req.userId)
    .then(user => {
        if(!user){
            const error = new Error('User not found.');
            error.statusCode = 404;
            throw error;
        }
        user.status = status;
        return user.save();
    })
    .then(result => {
        res.status(200).json({
            message: 'Status updated successfully!',
            status: status
        });
    })
    .catch(err => {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    });
}

exports.getPosts = (req, res, next) => {
    const currentPage = req.query.page || 1;
    const perPage = 2;
    let totalItems;
    Post.find()
        .countDocuments() // count how many documents in db
        .then(count => {
            totalItems = count;
            return Post.find()
                .skip((currentPage - 1) * perPage)
                .limit(perPage);
        })
        .then(posts => {
            res.status(200).json({
                message: 'Fetched posts successfully',
                posts: posts,
                totalItems: totalItems
            });
        })
        .catch(err => {
            // error handling
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err); // promise: next(err) will reach to error handling middleware
        });
};

exports.createPost = (req, res, next) => {
    // input validation error handling
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const error = new Error('Validation failed, entered data is incorrect.');
        error.statusCode = 422;
        throw error; // exit this function execution -> go to next error handling function / middleware
    }

    // image file input validation
    if (!req.file) {
        const error = new Error('No image provided.');
        error.statusCode = 422;
        throw error;
    }
    const imageUrl = req.file.path;
    const title = req.body.title;
    const content = req.body.content;
    let creator;
    const post = new Post({
        title: title,
        content: content,
        imageUrl: imageUrl,
        creator: req.userId
    });
    post
        .save()
        .then(result => {
            return User.findById(req.userId)
        })
        .then(user => {
            creator = user;
            user.posts.push(post)
            return user.save();
        })
        .then(result => {
            res.status(201).json({ // 201: success in creating resource
                message: 'Post created successfully!',
                post: post,
                creator: { _id: creator._id, name: creator.name }
            });
        })
        .catch(err => {
            // error handling
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err); // promise: next(err) will reach to error handling middleware
        })

};

exports.getPost = (req, res, next) => {
    const postId = req.params.postId;
    Post.findById(postId)
        .then(post => {
            if (!post) {
                const error = new Error('Could not find post.');
                error.statusCode = 404;
                throw error; // forwarded to .catch err handling process
            }
            res.status(200).json({ message: 'Post fetched.', post: post });
        })
        .catch(err => {
            // error handling
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err); // promise: next(err) will reach to error handling middleware
        })
};

exports.updatePost = (req, res, next) => {
    const postId = req.params.postId;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const error = new Error('Validation failed, entered data is incorrect.');
        error.statusCode = 422;
        throw error;
    }

    const title = req.body.title;
    const content = req.body.content;
    let imageUrl = req.body.image;

    if (req.file) {
        imageUrl = req.file.path;
    }
    if (!imageUrl) {
        const error = new Error('No file picked.');
        error.statusCode = 422;
        throw error;
    }
    Post.findById(postId)
        .then(post => {
            if (!post) {
                const error = new Error('Could not find post.');
                error.statusCode = 404;
                throw error;
            }
            if (post.creator.toString !== req.userId) {
                const error = new Error('Not authorized!');
                error.statusCode = 403;
                throw error;
            }
            if (imageUrl !== post.imageUrl) { // update different image -> delete previous image
                clearImage(post.imageUrl);
            }
            post.title = title;
            post.imageUrl = imageUrl;
            post.content = content;
            return post.save();
        })
        .then(result => {
            res.status(200).json({ message: 'Post updated', post: result });
        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        })
};

exports.deletePost = (req, res, next) => {
    const postId = req.params.postId;
    Post.findById(postId)
        .then(post => {
            if (!post) {
                const error = new Error('Could not find post.');
                error.statusCode = 404;
                throw error;
            }
            if (post.creator.toString !== req.userId) {
                const error = new Error('Not authorized!');
                error.statusCode = 403;
                throw error;
            }
            // Check logged in user
            clearImage(post.imageUrl);
            return Post.findByIdAndDelete(postId);
        })
        .then(result => {
            return User.findById(req.userId);
        })
        .then(user => {
            user.posts.pull(postId);
            return user.save();
        })
        .then(result => {
            res.status(200).json({ message: 'Deleted Post' });
        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        });
};

const clearImage = filePath => {
    filePath = path.join(__dirname, '..', filePath);
    fs.unlink(filePath, err => console.log(err));
}