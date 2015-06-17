/**
 * Created by kihu on 2015-06-17.
 */
var express = require('express');
var passport = require('../services/mypassport');
var User = require('../models/User');
var Task = require('../models/Task');

var router = express.Router();

router.get('/tasks', passport.authenticate('bearer', {session: false}), function (req, res) {

    var userIds = [];

    User.findOne({token: req.query.access_token}, function (err, user) {
        if (err) {
            res.json({
                type: false,
                data: "error" + err
            })
        } else {

            if (!user) {
                res.json({
                    type: false,
                    data: "user not found"
                })
            } else {
                userIds = [user._id];

                if (user.accessedUsers !== null) {
                    user.accessedUsers.forEach(function (au) {
                        userIds.push(au._id);
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
        }
    });

});

router.post('/addTask', passport.authenticate('bearer', {session: false}), function (req, res) {

    var newTask = new Task();
    newTask.user = req.body.user_id;
    newTask.body = req.body.taskBody;
    newTask.dateStart = req.body.start;
    newTask.dateDeadLine = req.body.deadline;
    newTask.save(function(err, task) {
        if(err){
            res.json({
                type:false,
                data: err
            })
        }else {
            res.json({
                type:true,
                data: "success"
            })
        }
    });
});

router.post('/doTask', passport.authenticate('bearer', {session: false}), function (req, res) {

    Task.update({_id: req.body.task_id}, {done: true}, function(err, task) {
        if(err){
            res.json({
                type: false,
                data: err
            })
        }else {
            res.json({
                type: true,
                data: "done"
            })
        }
    });

});

module.exports = router;