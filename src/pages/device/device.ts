import { Component, NgZone } from '@angular/core';
import { IonicPage, NavController, NavParams, AlertController } from 'ionic-angular';
import { TextEncoder } from 'text-encoding';

import { TerminalPage } from '../terminal/terminal';
import { Settings } from '../../providers/providers';

// native Bluetooth
import { BLE } from '@ionic-native/ble';
import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';

import 'rxjs/add/operator/map';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/publish';
import 'rxjs/add/observable/from';
import 'rxjs/add/observable/fromPromise';
import 'rxjs/add/observable/zip';
import 'rxjs/add/operator/share';


// service and characteristics numbers (native)
import { UART_SERVICE_STR, UART_TXRX_STR, UART_PASSWORD_STR, UART_CONFIG_STR } from '../../providers/ble/consts';

@IonicPage()
@Component({
    selector: 'page-device',
    templateUrl: 'device.html',
})
export class DevicePage {

    isScanning:boolean = false;
    // status message on the bottom of screen
    statusMessage: string;

    // unfiltered list of devices
    devices = [];
    private scanId : Date;
    // filtered and sorted list of devices
    peripherals = [];
    // the connected peripheral
    peripheral: any = {};

    private writableSubject = new BehaviorSubject<boolean>(false);
    writable$:          Observable< boolean >;


    constructor(
        private ble: BLE,
        private zone: NgZone,
        public navCtrl: NavController,
        private alertCtrl: AlertController,
        public settings: Settings,
    ) {
        console.log( "device page");

        this.writable$ = this.writableSubject.asObservable();

        // bind the this-context in the constructor
        // allowing external calls from
        this.sendText = this.sendText.bind(this);

    }

    ionViewDidLoad() {
        console.log('ionViewDidLoad DevicePage');
    }


////////////////////////////// N A T I V E    B L U E T O O T H    F U N C T I O N S


    // button press, start scanning
    public nativeScan() {

        console.log("looking for services " + UART_SERVICE_STR );

        this.scanId = new Date();
        this.devices.length = 0;
        this.isScanning = true;

        // native BLE works with strings, in stead of numbers
        // MED_SERVICE_UUID = "55feb600-0030-11e7-93ae-92361f002671";
        // var service = MED_SERVICE_UUID.replace(/-/g, ''); // find all '-' and change to ''
        // services:[service]
        // also string "1815" works

        this.ble.startScanWithOptions([ UART_SERVICE_STR ], {reportDuplicates: true})
            .subscribe(
                device => this.deviceDetected( device ),
                error => this.scanError( error),
                () => console.log("stopped scanning")
            );

        // stop after 10 seconds
        setTimeout( () => this.nativeStopScan(), 10000 );
    }


    nativeStopScan() {
        this.ble.stopScan().then(() => {
            this.isScanning = false;
        });
        this.removeAbsentDevices();
    }


    private removeAbsentDevices(){
        this.peripherals.filter( d => d.scanId !== this.scanId )
            .map( d => this.removeAbsentDevice( d ));
        this.peripherals = this.peripherals.filter( d => d.scanId === this.scanId );
    }


    private removeAbsentDevice( device ){
        console.log( "removed "+JSON.stringify( device ));
    }


    // permission maybe
    scanError( error ) {
        this.setStatus('Error ' + error);
        let alert = this.alertCtrl.create({
            title: 'Scanning: ' + error,
            buttons: ["OK"]
        });
        alert.present();
    }



    public deviceDetected( device ) {

        if (device.name !== undefined) {
            console.log( "detected "+device.name )

            if( this.deviceAlreadySeen( device )) {
                // add te.deviceAlreadySeen( device )) {
                // add to filtered list
                console.log("filtered " + JSON.stringify(device, null, 2));
                this.updateExistingDevice( device );
            } else {
                // just add to list
                console.log("added " + JSON.stringify(device, null, 2));
                this.devices.push( device );
            }
        }
    }


    public deviceAlreadySeen( device ){
        let d = this.devices.find( d => d.name === device.name );
        return d !== undefined;
    }


    public updateExistingDevice( newDevice ){
        let deviceIndex = -1;
        // add to filtered list if not there yet
        if( this.peripherals.find( d => d.name === newDevice.name ) === undefined ){
            // push returns length
            deviceIndex = this.peripherals.push( newDevice ) -1;

        } else {
            // get index and update the details
            deviceIndex = this.peripherals.findIndex(d => d.id === newDevice.id);
            let oldDevice = this.devices[ deviceIndex ];

            // overwrite with new device information
            newDevice.movement = this.compareRSSI( newDevice, oldDevice );
            this.peripherals[ deviceIndex ] = newDevice;
        }
        // sort list by RSSI and keep display updated
        this.zone.run(() => {
            this.peripherals.sort((a, b) => {
                return this.compareRSSI(a, b) ? 0 : 1;
            })
        });

    }

    private compareRSSI( oldDevice, newDevice ) : boolean {
        let oldRssi = this.getRssiAsAbsInt( oldDevice );
        let newRssi = this.getRssiAsAbsInt( newDevice );
        return oldRssi < newRssi;
    }

    private getRssiAsAbsInt( device ){
        return Math.abs(parseInt( device.rssi ));
    }




    // redirect to terminal page
    async redirectToTerminalPage(device) {

        this.nativeStopScan();
        // connect to the device
        this.setStatus('Connecting to ' + device.name || device.id);

        return this.ble.connect( device.id ).subscribe(
            peripheral => this.onConnected( peripheral ),
            peripheral => this.onDeviceDisconnected( peripheral )
        );
    }


    async onConnected( peripheral ) {
        let _pwd = "";

        this.zone.run(() => {
            this.setStatus("Password");
            this.peripheral = peripheral;
        });
        // send password
        await this.settings.getValue( 'password' ).then(
            data => _pwd = data
        );
        await this.password( _pwd );

        // now allow write to UART
        setTimeout(() => this.writableSubject.next( true ), 0);

        //await this.sendText( this.peripheral.id, "\0");
        //await this.sendText( this.peripheral.id, "hallo from ios\n");
        //await this.sendText( this.peripheral.id, "second string\n");

        // start notifications
        this.peripheral.data = this.ble.startNotification( this.peripheral.id, UART_SERVICE_STR, UART_TXRX_STR )
            .map( buffer => String.fromCharCode.apply( null, new Uint8Array( buffer )))
            .share();

        console.log( "notify config");
        // not subscribed yet

        //await this.sendText( this.peripheral.id, "third text\n");

        console.log( "goto TermPage "+ peripheral.name );
        // move to the terminal page, if all is authorized
        this.navCtrl.push( TerminalPage, {
            peripheral: this.peripheral
        })
    }

    private encodeCommand(cmd: string) {
        const encoded = new TextEncoder('utf-8').encode(`${cmd}`);
        //encoded[0] = encoded.length - 1;
        return encoded;
    }

    async password( pw: string ){
        console.log( "writing passwd "+ pw);
        return this.ble.write( this.peripheral.id, UART_SERVICE_STR, UART_PASSWORD_STR, this.encodeCommand( pw ).buffer ).then(
            () => this.setStatus( "password written" ),
            e => this.setStatus( "password Error" )
        );
    }


    public sendText( text: string ) {

        console.log("native send " + text);

        const bytes = text.split('').map(c => c.charCodeAt(0));
        const chunks = [];

        while (bytes.length > 0) {
            chunks.push(new Uint8Array(bytes.splice(0, 20)));
        }

        const result = Observable.zip(
                Observable.from(chunks),
                this.writableSubject.filter(value => value)
            )
            .mergeMap(([ chunk, writeable ]) => {
                //console.log("writing: " + chunk);
                this.writableSubject.next(false);
                // this.ble.writeWithoutResponse is a promise
                return Observable.fromPromise(
                    this.ble.writeWithoutResponse( this.peripheral.id, UART_SERVICE_STR, UART_TXRX_STR, chunk.buffer )
                )
            })
            // timeout absolutely necessary because otherwise writeValue$ will fail when called too quickly
            .map(() => setTimeout(() => this.writableSubject.next(true), 10))
            // make this into a connectable Observable
            .publish();

        // connect to the Observable and get the result
        result.connect();
        return result;

    }


    public onDeviceDisconnected( peripheral ) {
        let alert = this.alertCtrl.create({
            title: "The peripheral disconnected",
            buttons: ["OK"]
        });
        alert.present();
        this.navCtrl.push( DevicePage );
    }



    // status message on footer
    setStatus(message) {
        console.log(message);
        this.zone.run(() => {
            this.statusMessage = message;
        });
    }

}
