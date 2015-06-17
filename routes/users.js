var express = require('express');
var passport = require('../services/mypassport');
var User = require('../models/User');
var Task = require('../models/Task');

var router = express.Router();


router.post('/signin', function (req, res) {

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

router.post('/login', passport.authenticate('local', {
    failureRedirect: '/login',
    failureFlash: false,
    session: false
}), function (req, res) {
    res.redirect('/');
});


router.get('/findUsersByName', passport.authenticate('bearer', {session: false}), function (req, res) {

    var re = new RegExp(req.query.name, 'i');

    User.find({"name": {$regex: re}}, function (err, users) {
        if (err) {
            // error
            res.json({
                type: false,
                data: "error " + err
            })
        } else {

            var filteredUsers = [];
            users.forEach(function (u) {
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

router.post('/sendInvitationToUser', passport.authenticate('bearer', {session: false}), function (req, res) {

    var dbQuery = {$push: {invitations: {fromUser: req.body.fromUserId}}};

    User.update({_id: req.body.toUserId}, dbQuery, generateDefaultDBCallback(res, "error", "invitation sent"));
});

router.post('/acceptInvitation', passport.authenticate('bearer', {session: false}), function (req, res) {

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

module.exports = router;