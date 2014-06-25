var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.Types.ObjectId,
    Mixed = Schema.Types.Mixed;

var schema = Schema({});

// Define the model.
module.exports = mongoose.model('Template', schema);
