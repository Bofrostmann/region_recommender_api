var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var index_router = require('./routes/index');
var recommender_api_router = require('./routes/recommenderAPI');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//TODO Store allowed origin in environment variable
var allowCrossDomain = function(req, res, next) {
    const allowedOrigins = ['http://localhost:3000', 'http://localhost:3006'],
        origin = req.headers.origin;
    if(allowedOrigins.indexOf(origin) > -1){
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
app.use('/recommenderAPI', recommender_api_router);


module.exports = app;
