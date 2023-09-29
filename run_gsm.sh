#!/bin/sh
clear
#
node run_gsm.js
#qmicli
qmicli -d /dev/cdc-wdm0 --dms-set-operating-mode='online'
qmicli -d /dev/cdc-wdm0 --dms-get-operating-mode
qmicli -d /dev/cdc-wdm0 --nas-get-signal-strength
qmicli -d /dev/cdc-wdm0 --nas-get-home-network
