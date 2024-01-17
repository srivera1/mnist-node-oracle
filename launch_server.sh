#!/bin/bash

export ORACLE_HOME="/opt/oracle/product/23c/dbhomeFree"
export ORACLE_SID="free"
export ORACLE_BASE=$ORACLE_HOME
export NLS_LANG=American_America.UTF8
export NODE_ORACLEDB_USER="mnist"
export NODE_ORACLEDB_PASSWORD="mnist"
export NODE_ORACLEDB_CONNECTIONSTRING="//192.168.1.108:9998/MNIST" # "//192.168.115.246:1521/mnist"
export NODE_ORACLEDB_EXTERNALAUTH=""
export NODE_ORACLEDB_WALLET_PASSWORD=""
export NODE_ORACLEDB_WALLET_LOCATION=""
export NODE_ORACLEDB_DBA_USER="mnist"
export NODE_ORACLEDB_DBA_PASSWORD="mnist"
export TNS_ADMIN=$ORACLE_HOME/network/admin

node src/webapp.js
# nodemon src/webapp.js
