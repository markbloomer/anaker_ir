# sudo su

systemctl link ./anaker_ir_*.service
systemctl daemon-reload
systemctl enable anaker_ir_*

systemctl list-units --type=service anaker_ir_*
# journalctl -f -u anaker_ir_check_restart
