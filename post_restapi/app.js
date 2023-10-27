const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const multer = require('multer');

const feedRoutes = require('./routes/feed');
const authRoutes = require('./routes/auth');

const app = express();

const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'images');
    },
    filename: (req, file, cb) => {
        cb(null, new Date().toISOString() + '-' + file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg') {
        cb(null, true);
    } else {
        cb(null, false);
    }
}
dotenv.config();

const password = process.env.PASSWORD;
const MONGODB_URI = `mongodb+srv://eunmijoo228:${password}@cluster0.wz8yn18.mongodb.net/messages?&w=majority`;

// app.use(bodyParser.urlencoded()); // x-www-form-urlencoded <form>
app.use(bodyParser.json()); // appliation/json
app.use(multer({storage: fileStorage, fileFilter: fileFilter}).single('image')) // register image storage
app.use('/images', express.static(path.join(__dirname, 'images'))); // requests going to '/images' are statically served

app.use((req, res, next) => { // middleware that set headers on any response that leaves the server
    // headers, domains that should be able to access the server (* - all)
    res.setHeader('Access-Control-Allow-Origin', '*'); // allow a specific origin to access the content, data
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE'); // allow origins to use specific http methods
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // client can define the content type, send request that hold extra authorization
    next();
})

app.use('/feed', feedRoutes);
app.use('/auth', authRoutes);

app.use((error, req, res, next) => { // error handling middleware 
    console.log(error);
    const status = error.statusCode || 500;
    const message = error.message;
    const data = error.data;
    res.status(status).json({ message: message, data: data });
})

mongoose.connect(MONGODB_URI)
    .then(() => {
        app.listen(8080);
    })
    .catch(err => {
        console.log(err);
    })