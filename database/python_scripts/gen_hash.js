const bcrypt = require('D:/ThacoAgri_Code/pm-Quan-li-xe-co-gioi/backend/node_modules/bcrypt');
const hash = bcrypt.hashSync('123456', 10);
console.log('HASH:', hash);
