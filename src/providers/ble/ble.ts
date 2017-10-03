import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { TextEncoder, TextDecoder } from 'text-encoding';

// native Bluetooth
import { BLE } from '@ionic-native/ble';



import 'rxjs/add/operator/map';
import 'rxjs/add/operator/concatMap';
import 'rxjs/add/operator/do';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/publish';
import 'rxjs/add/operator/scan';
import 'rxjs/add/operator/finally';
import 'rxjs/add/operator/delay';
import 'rxjs/add/operator/takeUntil';
import 'rxjs/add/operator/share';

import 'rxjs/add/observable/fromEvent';
import 'rxjs/add/observable/from';
import 'rxjs/add/observable/zip';
import 'rxjs/add/observable/merge';

// service and characteristics numbers
import { UART_SERVICE, UART_SERVICE_STR, UART_TXRX, UART_TXRX_STR, UART_PASSWORD, UART_CONFIG } from './consts';

/*
 Generated class for the BleProvider provider.

 See https://angular.io/guide/dependency-injection for more info on providers
 and Angular DI.
 */
@Injectable()
export class Ble {

    // ---- web bluetooth ------
    deviceName:         string;
    gatt:               BluetoothRemoteGATTServer;

    // write to char
    public uartChar: BluetoothRemoteGATTCharacteristic;
    // write only char
    public passwordChar: BluetoothRemoteGATTCharacteristic;
    // write only char
    public configChar: BluetoothRemoteGATTCharacteristic;

    // create observable from the uartChar for receive data
    public uartData: Observable< string >;
    public lines$: Observable< string >;

    writable$:          Observable< boolean >;

    private writableSubject = new BehaviorSubject<boolean>(false);


    constructor() {
        console.log('Hello BleProvider Provider');
        this.writable$ = this.writableSubject.asObservable();
    }


    // called by scan button on the Terminal page
    async connect() {
        // pops up device select window
        const device = await navigator.bluetooth.requestDevice({
            filters: [
                { services: [ UART_SERVICE ]},
                { namePrefix: "AIR" },
            ]
        });
        this.gatt = await device.gatt!.connect();
        this.deviceName = this.gatt.device.name;
        console.log( "connected to " + this.deviceName );

        /*      // listing all services available
        try {
            console.log('Getting Services...');
            const services = await this.gatt.getPrimaryServices();
            for (const service of services) {
                console.log('> Service: ' + service.uuid);
                const characteristics = await service.getCharacteristics();

                characteristics.forEach(characteristic => {
                    console.log('>> Characteristic: ' + characteristic.uuid + ' ' +
                    this.getSupportedProperties(characteristic));
                });
            }

         } catch( error ) {
            console.log('Argh! ' + error);
         }
         */
        const uartService = await this.gatt.getPrimaryService( UART_SERVICE );
        await this.connectChars( uartService );

    }


    private getSupportedProperties( characteristic ) {
        let supportedProperties = [];
        for (const p in characteristic.properties) {
            if (characteristic.properties[p] === true) {
                supportedProperties.push(p.toUpperCase());
            }
        }
        return '[' + supportedProperties.join(', ') + ']';
    }

    public disconnect() {
        console.log("calling disconnect on gatt");
        this.gatt.disconnect();
    }

    public name(): string {
        return this.deviceName;
    }


    private async connectChars( primaryService: BluetoothRemoteGATTService ) {

        console.log("connecting uart char");

        const uartService = await this.gatt.getPrimaryService( UART_SERVICE );
        // setup writable characteristics
        // UART packets write and notify
        var toUart = primaryService.getCharacteristic( UART_TXRX );
        this.uartChar = await toUart;
        // Password, write only
        var password = primaryService.getCharacteristic( UART_PASSWORD );
        this.passwordChar = await password;
        // config
        var config = primaryService.getCharacteristic( UART_CONFIG );
        this.configChar = await config;

        // obaservable
        //this.uartData = (await observableCharacteristic( this.uartChar ))
        //    .map( parseUart );

        this.uartData = Observable.fromEvent( this.uartChar, 'characteristicvaluechanged' )
            .map( value => String.fromCharCode.apply( null, new Uint8Array( this.uartChar.value.buffer )))
            .takeUntil( Observable.fromEvent( this.gatt.device, 'gattserverdisconnected' ))
            .finally(() => {
                console.log( 'stream disconnected ');
                // not necessary: return this.uartChar.stopNotifications()
            })
            .share();

        /*
         // do not start notifications here, must send password first
         await this.uartChar.startNotifications();
         console.log( "started note");

         const chars = this.uartData.concatMap(chunk => chunk.split(''));
         this.lines$ = chars.scan(( acc, curr ) => acc[acc.length - 1] === '\n' ? curr : acc + curr)
         .filter(item => item.indexOf('\n') >= 0);
         console.log( 'got '+this.lines$ )
         */
        // allow write to UART
        setTimeout(() => this.writableSubject.next( true ), 0);
    }


    // call with: await delay(1000) for example
    private delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }


    private encodeCommand( cmd: string ) {
        const encoded = new TextEncoder('utf-8').encode(`${cmd}`);
        //encoded[0] = encoded.length - 1;
        return encoded;
    }

    public async password( pw: string ){
        console.log( "writing pwd "+ pw )
        await this.passwordChar.writeValue( this.encodeCommand( pw ));
    }


    public async newPassword( pw: string ){
        //await this.delay( 1000 );
        // observable
        const bytes = pw.split('').map(c => c.charCodeAt(0));
        const length = (pw as string).length;

        let pwdata = new Uint8Array( length+1 );
        pwdata[0] = length;
        for( let i=0; i<length; i++){
            pwdata[i+1] = pw.charCodeAt(i);
        }

        try{
            await this.configChar.writeValue( pwdata );
        } catch( e ) {
            console.log( "failed " + e);
        }

    }


    // write to char
    public sendText( text: string ){
        //console.log("sending "+text);
        const bytes = text.split('').map(c => c.charCodeAt(0));
        const chunks = [];
        while( bytes.length > 0 ) {
            chunks.push(new Uint8Array(bytes.splice(0, 20)));
        }

        const result = Observable.zip(
            Observable.from( chunks ),
            this.writableSubject.filter(value => value))
            .mergeMap(([ chunk, writeable ]) => {
                //console.log("writing: "+ chunk);
                this.writableSubject.next(false);
                return Observable.from( this.uartChar.writeValue( chunk ));
            })
            // timeout absolutely necessary because otherwise writeValue$ will fail when called too quickly
            .map(() => setTimeout(() => this.writableSubject.next( true ), 10))
            // make this into a connectable Observable
            .publish();

        // connect to the Observable and get the result
        result.connect();
        return result;
    }

    public async setBaudConfig( baudid ){
        let raw = new Uint8Array( 2 );
        raw[0] = 0x01; // baud command
        raw[1] = +baudid; // convert to number
        try {
            await this.configChar.writeValue( raw );
        } catch( e ) {
            console.log( "setbaud failed " + e);
        }
    }



}
