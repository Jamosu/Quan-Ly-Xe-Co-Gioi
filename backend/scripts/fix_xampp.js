const fs = require('fs');
const path = require('path');

// 1. Fix mysql_stop.bat
const stopBatPath = 'C:\\xampp\\mysql_stop.bat';
const gracefulStopBat = `@echo off
cd /D %~dp0
echo MySQL shutting down gracefully...
"%~dp0mysql\\bin\\mysqladmin.exe" -u root shutdown
`;
fs.writeFileSync(stopBatPath, gracefulStopBat, 'utf8');
console.log('Fixed:', stopBatPath);

// 2. Read and update my.ini
const myIniPath = 'C:\\xampp\\mysql\\bin\\my.ini';
let myIni = fs.readFileSync(myIniPath, 'utf8');

// Upgrade tiny 16M buffer pool & 5M log file to 128M / 32M for reliable operation
if (myIni.includes('innodb_buffer_pool_size=16M')) {
  myIni = myIni.replace('innodb_buffer_pool_size=16M', 'innodb_buffer_pool_size=128M');
}
if (myIni.includes('innodb_log_file_size=5M')) {
  myIni = myIni.replace('innodb_log_file_size=5M', 'innodb_log_file_size=32M');
}
if (!myIni.includes('innodb_fast_shutdown')) {
  myIni = myIni.replace('innodb_flush_log_at_trx_commit=1', 'innodb_flush_log_at_trx_commit=1\r\ninnodb_fast_shutdown=1');
}

fs.writeFileSync(myIniPath, myIni, 'utf8');
console.log('Updated my.ini with reliable InnoDB buffer pool and fast_shutdown settings.');
