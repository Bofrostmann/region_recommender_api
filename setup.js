'use strict';
const fs = require('fs');
fs.createReadStream('.sample_env')
    .pipe(fs.createWriteStream('.env'));