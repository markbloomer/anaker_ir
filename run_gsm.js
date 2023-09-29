#!/usr/bin/env node
const gsm=require("serialport-gsm");
const child=require("child_process");
//gsm.list((e, data)=>console.log(data));
const options={
  baudRate: 115200,
  dataBits: 8,
  stopBits: 1,
  parity: 'none',
  rtscts: false,
  xon: false,
  xoff: false,
  xany: false,
  autoDeleteOnReceive: true,
  enableConcatenation: true,
  incomingCallIndication: true,
  incomingSMSIndication: true,
  pin: '',
  customInitCommand: '',
  cnmiCommand: 'AT+CNMI=2,1,0,2,1',
  logger: console
};
const modem=gsm.Modem();
const cleanup=()=>{
  modem.close(()=>console.log("modem close"));
};
const execFunc=(successFunc)=>(err, stdout, stderr)=>{
  if (err) {
    console.error(`exec fail:\n${JSON.stringify(err, null, 2)}\n\n${stderr}`);
    cleanup();
    return;
  }
  console.log(`exec success:\n${stdout}`);
  successFunc();
};
//console.log(modem);
modem.open("/dev/ttyUSB2", options, ()=>{
  console.log(`open`);
  modem.initializeModem(()=>{
    console.log(`initializeModem`);
    modem.checkModem((data)=>{
      console.log(`checkModem\n${JSON.stringify(data, null, 2)}`);
      modem.getNetworkSignal((data)=>{
        console.log(`getNetworkSignal\n${JSON.stringify(data, null, 2)}`);
        modem.executeCommand("AT+CUSBPIDSWITCH?", (data)=>{
          console.log(`executeCommand\n${JSON.stringify(data, null, 2)}`);
          modem.executeCommand("AT+CUSBPIDSWITCH=9001,1,1", (data)=>{
            console.log(`executeCommand\n${JSON.stringify(data, null, 2)}`);
            modem.executeCommand("AT+CLANMODE?", (data)=>{
              console.log(`executeCommand\n${JSON.stringify(data, null, 2)}`);
              modem.executeCommand("AT+CLANMODE=1", (data)=>{
                console.log(`executeCommand\n${JSON.stringify(data, null, 2)}`);
                child.exec("qmicli -d /dev/cdc-wdm0 --dms-set-operating-mode='online'", execFunc(()=>{
                  child.exec("qmicli -d /dev/cdc-wdm0 --dms-get-operating-mode", execFunc(()=>{
                    child.exec("qmicli -d /dev/cdc-wdm0 --nas-get-signal-strength", execFunc(()=>{
                      child.exec("qmicli -d /dev/cdc-wdm0 --nas-get-home-network", execFunc(()=>{
                        cleanup();
                        console.log(`all done!`);
                      }));
                    }));
                  }));
                }));
                // child.exec("qmicli -d /dev/cdc-wdm0 --dms-set-operating-mode='online'");
                // child.exec("qmicli -d /dev/cdc-wdm0 --dms-get-operating-mode");
                // child.exec("qmicli -d /dev/cdc-wdm0 --nas-get-signal-strength");
                // child.exec("qmicli -d /dev/cdc-wdm0 --nas-get-home-network");
                // child.exec("ip link set wwan0 down");
                // child.exec("echo 'Y' | tee /sys/class/net/wwan0/qmi/raw_ip");
                // child.exec("ip link set wwan0 up");
                // child.exec("qmicli -p -d /dev/cdc-wdm0 --device-open-net='net-raw-ip|net-no-qos-header' --wds-start-network=\"apn='jionet',ip-type=4\" --client-no-release-cid");
              });
            });
          });
        });
      });
    });
  });
});
