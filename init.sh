#!/bin/sh
apt -qq -y update
apt -qq -y upgrade
apt -qq -y install nodejs npm libcamera-apps-lite
#
apt -qq -y autoremove
