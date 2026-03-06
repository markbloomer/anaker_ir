# Raspberry Pi OS Lite (32bit)
# first, copy ~/anaker_ir

# sudo su
cd /home/pi/anaker_ir/
chmod 777 *.sh
cp -f ./rpi_apps.yaml /usr/share/libcamera/pipeline/rpi/vc4
apt-get -y update
apt-get -y upgrade
apt-get -y install nodejs npm libcamera-apps-lite ffmpeg
# minicom
apt-get -y autoremove
npm install
