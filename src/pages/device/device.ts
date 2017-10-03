import { Component, NgZone } from '@angular/core';
import { IonicPage, NavController, NavParams, AlertController } from 'ionic-angular';

import { TerminalPage } from '../terminal/terminal';


@IonicPage()
@Component({
    selector: 'page-device',
    templateUrl: 'device.html',
})
export class DevicePage {

    isScanning:boolean = false;
    devices = []; // unfiltered list of devices
    statusMessage:string;


    constructor(
        public navCtrl:NavController,
        public navParams:NavParams
    ) {
    }

    ionViewDidLoad() {
        console.log('ionViewDidLoad DevicePage');
    }


    // button press
    startScanning() {
        console.log('Scanner start');
        this.isScanning = true;

        console.log("looking for services " + this.UART_SERVICE);
        // MED_SERVICE_UUID = "55feb600-0030-11e7-93ae-92361f002671";
        // var service = MED_SERVICE_UUID.replace(/-/g, ''); // find all '-' and change to ''
        // services:[service]
        // also string "1815" works

        this.ble.startScanWithOptions([this.UART_SERVICE], {reportDuplicates: true}).subscribe(
            device => this.deviceDetected(device),
            error => this.scanError(error)
        );

        setTimeout(this.setStatus.bind(this), 5000, "Scan complete");
    }

    stopScanning() {
        console.log("stop scanning");
    }

    // redirect to terminal page
    async redirectToTerminalPage(device) {

        if (this.isScanning) {
            this.stopScanning();
        }
        // connect to the device
        this.setStatus('Connecting to ' + device.name || device.id);

        return this.ble.connect(device.id).subscribe(
            peripheral => this.onConnected(peripheral),
            peripheral => this.onDeviceDisconnected(peripheral)
        );
    }

    // status message on footer
    setStatus(message) {
        console.log(message);
        this.zone.run(() => {
            this.statusMessage = message;
        });
    }

}
