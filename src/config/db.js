const mongoose = require('mongoose');

async function connectToDb(uri) {
    mongoose.set('strictQuery', true);
    await mongoose.connect(uri, { autoIndex: true });
}

module.exports = { connectToDb };

