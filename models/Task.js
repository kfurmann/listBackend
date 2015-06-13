/**
 * Created by kihu on 2015-06-13.
 */

var mongoose = require('mongoose');

var TaskSchema = new mongoose.Schema({
    user: mongoose.Schema.Types.ObjectId,
    body: String,
    dateAdded: {type: Date, default: Date.now},
    dateStart: {type: Date, default: Date.now},
    dateDeadline: {type: Date, default: Date.now},
    done: {type: Boolean, default: false}
});

module.exports = mongoose.model('Task', TaskSchema);
