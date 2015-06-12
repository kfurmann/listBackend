var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');

var routes = require('./routes/index');
var users = require('./routes/users');

var User = require('./models/User');

var app = express();

mongoose.connect('mongodb://localhost/local');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
app.use(require('less-middleware')(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type, Authorization');
    next();
});

app.use('/', routes);
//app.use('/users', users);

app.post('/signin', function (req, res) {

    function saveNewUser() {
        var newUser = new User();
        newUser.name = req.body.name;
        newUser.save(function (err, user) {
            if (err) {
                res.json({
                    type: false,
                    data: "error " + err
                })
            } else {
                res.json({
                    type: true,
                    data: "new user saved"
                })
            }
        });
    }

    User.findOne({name: req.body.name}, function (err, user) {
        if (err) {
            // error
            res.json({
                type: false,
                data: "error " + err
            })
        } else {
            if (user) {
                res.json({
                    type: false,
                    data: "User already exists!"
                });
            } else {
                saveNewUser();
            }
        }
    });
});

app.post('/findUsersByName', function (req, res) {

    var re = new RegExp(req.body.name, 'i');

    User.find({"name": {$regex: re}}, function (err, users) {
        if (err) {
            // error
            res.json({
                type: false,
                data: "error " + err
            })
        } else {
            res.json({
                type: true,
                data: users
            });
        }
    })
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
