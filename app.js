const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const index_router = require('./routes/index');
const recommender_api_router = require('./routes/recommenderAPI');

const app = express();

const dotenv = require('dotenv');

dotenv.load();

const authenticator = require('./authentication/authenticator')();
app.use(authenticator.initialize());

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//TODO Store allowed origin in environment variable
const allowCrossDomain = function (req, res, next) {
    const allowedOrigins = ['http://localhost:3000', 'http://localhost:3006', 'http://127.0.0.1:3000', 'http://127.0.0.1:3006', 'http://vmott20.in.tum.de'],
        origin = req.headers.origin;
    if (allowedOrigins.indexOf(origin) > -1) {
        res.header('Access-Control-Allow-Origin', origin);
    }

    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    // intercept OPTIONS method
    if ('OPTIONS' == req.method) {
        res.sendStatus(200);
    } else {
        next();
    }
};

app.use( allowCrossDomain );




app.use('/', index_router);
recommender_api_router(app, authenticator);


module.exports = app;
