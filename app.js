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
        newUser.save(generateDefaultDBCallback(res, "error", "user signed in"));
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

app.post('/sendInvitationToUser', function (req, res) {

    var dbQuery = {$push: {invitations: {fromUser: req.body.fromUserName}}};

    User.update({name: req.body.toUserName}, dbQuery, generateDefaultDBCallback(res, "error", "invitation sent"));
});

app.post('/acceptInvitation', function (req, res) {

    User.update({name: req.body.userName}, {$pull: {invitations: {fromUser: req.body.fromUserName}}}, function (err, raw) {
        if (err) {
            res.json({
                    type: false,
                    data: "error" + err
                }
            )
        }
    });
    User.update({name: req.body.userName}, {$push: {accessedUsers: {userName: req.body.fromUserName}}}, function (err, raw) {
        if (err) {
            res.json({
                    type: false,
                    data: "error" + err
                }
            )
        }
    });
    User.update({name: req.body.fromUserName}, {$push: {accessedUsers: {userName: req.body.userName}}}, generateDefaultDBCallback(res, "error", "accessed users updated"));

})
;

app.post('/tasks', function (req, res) {

    var tasks = [];
    var userIds = [];

    User.findOne({_id: req.body.user_id}, function (err, user) {
        if (err) {
            //
            res.json({
                type: false,
                data: "error" + err
            })
        } else {
            user.accessedUsers.forEach(function (au) {
                userIds.push(au.userName);
            });
            tasks = user.tasks;

            if (userIds.length > 0) {

                var promise = User.find({name: {$in: userIds}}).exec();

                promise.onReject(function(reason){
                    res.json({
                        type: false,
                        data: reason
                    });
                });
                promise.then(function (users) {
                    users.forEach(function (user) {
                        tasks = tasks.concat(user.tasks);
                    });
                    console.log("y");
                    res.json({
                        type: true,
                        data: tasks
                    });
                });
            } else {
                res.json({
                    type: true,
                    data: tasks
                });
            }
        }
    });

});

app.post('/addTask', function (req, res) {

    var addTaskQuery = {
        $push: {
            tasks: {
                body: req.body.taskBody,
                dateStart: req.body.start,
                dateDeadline: req.body.deadline
            }
        }
    };

    User.update({name: req.body.userName}, addTaskQuery, generateDefaultDBCallback(res, "error", "task added"));
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
