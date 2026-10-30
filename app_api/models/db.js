const dns = require('dns');
const mongoose = require('mongoose');
const readline = require('readline');

// Windows에서 Node가 DNS 서버를 127.0.0.1로 잡아 mongodb+srv의 SRV 조회가 실패함
if (process.platform === 'win32') {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
}

const dbPassword = process.env.MONGODB_PASSWORD;

const dbURI = `mongodb+srv://atlasuser:${encodeURIComponent(dbPassword)}@cluster0.q0wpkss.mongodb.net/Loc8r`;

const connect = async () => {
    try {
        await mongoose.connect(dbURI);
    } catch (err) {
        console.error('Initial MongoDB connection error:', err.message);
        setTimeout(connect, 3000);
    }
};

mongoose.connection.on('connected', () => {
    console.log('Mongoose connected to MongoDB Atlas');
});

mongoose.connection.on('error', err => {
    console.log('Mongoose connection error: ' + err);
    return connect();
});

mongoose.connection.on('disconnected', () => {
    console.log('Mongoose disconnected');
});

if (process.platform === 'win32') {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.on('SIGINT', () => {
        process.emit('SIGINT');
    });
}

// const gracefulShutdown = (msg, callback) => {
//     mongoose.connection.close(() => {
//         console.log(`Mongoose disconnected through ${msg}`);
//         callback();
//     });
// };
const gracefulShutdown = async (msg, callback) => {
    await mongoose.connection.close();
    console.log(`Mongoose disconnected through ${msg}`);
    callback();
};

process.once('SIGUSR2', () => {
    gracefulShutdown('nodemon restart', () => {
        process.kill(process.pid, 'SIGUSR2');
    });
});

process.on('SIGINT', () => {
    gracefulShutdown('app termination', () => {
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    gracefulShutdown('Heroku app shutdown', () => {
        process.exit(0);
    });
});

connect();

require('./locations');