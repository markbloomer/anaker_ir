# sudo su

#chown root:root ./*check_restart*
chmod 0644 ./anaker_ir_*.service
systemctl link ./anaker_ir_*.service
systemctl daemon-reload
systemctl enable anaker_ir_*.service

systemctl list-units --type=service anaker_ir_*.service | sed '/^$/,$d'
# journalctl -f -n 200 -u anaker_ir_check_restart.service
