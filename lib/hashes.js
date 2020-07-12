'use strict';

const bcrypt = require('bcryptjs');
const argon2 = require('argon2');
const pbkdf2 = require('@phc/pbkdf2'); // see https://www.npmjs.com/package/@phc/pbkdf2
// this crap is only needed to support legacy users imported from some older system
const cryptMD5 = require('./md5/cryptmd5').cryptMD5;
const consts = require('./consts');

// just pass hashing through to bcrypt
module.exports.hash = async password => {
    password = (password || '').toString();

    switch (consts.DEFAULT_HASH_ALGO) {
        case 'pbkdf2':
            return await pbkdf2.hash(password, {
                iterations: consts.PDKDF2_ITERATIONS,
                saltSize: consts.PDKDF2_SALT_SIZE,
                digest: consts.PDKDF2_DIGEST
            });
        case 'argon2i':
            return await argon2.hash(password);
        case 'bcrypt':
        default:
            return await bcrypt.hash(password, consts.BCRYPT_ROUNDS);
    }
};

// compare against known hashing algos
module.exports.compare = async (password, hash) => {
    password = (password || '').toString();
    hash = (hash || '').toString();

    let algo = [].concat(hash.match(/^\$([^$]+)\$/) || [])[1];
    algo = (algo || '').toString().toLowerCase();

    switch (algo) {
        case 'argon2i':
            return await argon2.verify(hash, password);
        case 'pbkdf2-sha512':
        case 'pbkdf2-sha256':
        case 'pbkdf2-sha1':
            return await pbkdf2.verify(hash, password);

        case '2a':
        case '2b':
        case '2y':
            return await bcrypt.compare(password, hash);

        case '1': {
            let result;

            let salt = hash.split('$')[2] || '';
            result = cryptMD5(password, salt) === hash;

            return result;
        }
        default:
            throw new Error('Invalid algo: ' + JSON.stringify(algo));
    }
};

module.exports.shouldRehash = hash => {
    hash = (hash || '').toString();
    let algo = [].concat(hash.match(/^\$([^$]+)\$/) || [])[1];
    algo = (algo || '').toString().toLowerCase();

    switch (algo) {
        case 'pbkdf2-sha512':
        case 'pbkdf2-sha256':
        case 'pbkdf2-sha1':
            return consts.DEFAULT_HASH_ALGO !== 'pbkdf2';

        case '2a':
        case '2b':
        case '2y':
            return consts.DEFAULT_HASH_ALGO !== 'bcrypt';

        case '1': {
            return consts.DEFAULT_HASH_ALGO !== 'md5-crypt';
        }

        default:
            return false;
    }
};
