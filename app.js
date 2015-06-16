var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var jwt = require('jsonwebtoken');
var env = require('node-env-file');

var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var BearerStrategy = require('passport-http-bearer').Strategy;

var routes = require('./routes/index');

var User = require('./models/User');
var Task = require('./models/Task');

var app = express();

env('dev.env');

passport.use(new LocalStrategy({
        usernameField: 'name',
        session: false
    },
    function (username, password, done) {
        User.findOne({name: username}, function (err, user) {
            if (err) {
                return done(err);
            }
            if (!user) {
                return done(null, false, {message: 'Incorrect username.'});
            }
            user.comparePassword(password, function (err, isMatch) {
                if (err) return done(err);
                if (isMatch) {
                    return done(null, user);
                } else {
                    return done(null, false, {message: 'Invalid password'});
                }
            });
        });
    }
));

passport.use(new BearerStrategy(
    function (token, done) {
        User.findOne({token: token}, function (err, user) {
            if (err) {
                return done(err);
            }
            if (!user) {
                return done(null, false);
            }
            return done(null, user, {scope: 'all'});
        });
    }
));

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
app.use(passport.initialize());
app.use(express.static(path.join(__dirname, 'public')));

app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization');

    // intercept OPTIONS method
    if ('OPTIONS' == req.method) {
        res.sendStatus(200);
    }
    else {
        next();
    }
});

app.use('/', routes);

function generateDefaultDBCallback(res, errorMessage, successMessage) {
    return function defaultDBCallback(err, raw) {
        if (err) {
            // error
            res.json({
                type: false,
                data: errorMessage + err
            })
        } else {
            res.json({
                type: true,
                data: successMessage
            });
        }
    }
}

app.post('/signin', function (req, res) {

    function saveNewUser() {
        var newUser = new User();
        newUser.name = req.body.name;
        newUser.password = req.body.password;
        newUser.token = jwt.sign(newUser, process.env.JWT_SECRET);

        newUser.save(function (err, user) {
            res.json({
                type: true,
                data: user.token
            })
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

app.post('/login', passport.authenticate('local', {
    failureRedirect: '/login',
    failureFlash: false,
    session: false
}), function (req, res) {
    res.redirect('/');
});


app.get('/findUsersByName', passport.authenticate('bearer', {session: false}), function (req, res) {

    var re = new RegExp(req.name, 'i');

    User.find({"name": {$regex: re}}, function (err, users) {
        if (err) {
            // error
            res.json({
                type: false,
                data: "error " + err
            })
        } else {

            var filteredUsers = [];
            users.forEach(function(u){
               filteredUsers.push({
                   name: u.name,
                   _id: u._id
               })
            });

            res.json({
                type: true,
                data: filteredUsers
            });
        }
    })
});

app.post('/sendInvitationToUser', function (req, res) {

    var dbQuery = {$push: {invitations: {fromUser: req.body.fromUserId}}};

    User.update({_id: req.body.toUserId}, dbQuery, generateDefaultDBCallback(res, "error", "invitation sent"));
});

app.post('/acceptInvitation', function (req, res) {

    var promiseToRemoveInvitation = User.update({_id: req.body.userId}, {$pull: {invitations: {fromUser: req.body.fromUserId}}}).exec();
    var promiseToAddActorAToAccessedUsers = User.update({_id: req.body.userId}, {$push: {accessedUsers: {userName: req.body.fromUserId}}}).exec();
    var promiseToAddActorBToAccessedUsers = User.update({_id: req.body.fromUserId}, {$push: {accessedUsers: {userName: req.body.userId}}}).exec();

    Promise.all([promiseToRemoveInvitation, promiseToAddActorAToAccessedUsers, promiseToAddActorBToAccessedUsers]).then(function (values) {
        res.json({
            type: true,
            data: values
        })
    })
});

app.post('/tasks', function (req, res) {

    var userIds = [req.body.user_id];

    User.findOne({_id: req.body.user_id}, function (err, user) {
        if (err) {
            //
            res.json({
                type: false,
                data: "error" + err
            })
        } else {
            if (user.accessedUsers !== null) {
                user.accessedUsers.forEach(function (au) {
                    userIds.push(au.userName);
                });
            }

            var promise = Task.find({user: {$in: userIds}}).exec();

            promise.onReject(function (reason) {
                res.json({
                    type: false,
                    data: reason
                });
            });
            promise.then(function (tasks) {
                res.json({
                    type: true,
                    data: tasks
                });
            });
        }
    });

});

app.post('/addTask', function (req, res) {

    var newTask = new Task();
    newTask.user = req.body.user_id;
    newTask.body = req.body.taskBody;
    newTask.dateStart = req.body.start;
    newTask.dateDeadLine = req.body.deadline;
    newTask.save(generateDefaultDBCallback(res, "error", "task added"));
});

app.post('/doTask', function (req, res) {

    Task.update({_id: req.body.taskId}, {done: true}, generateDefaultDBCallback(res, "error", "task marked as done"));

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
