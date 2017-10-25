
import { Platform } from 'ionic-angular';


import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';

import 'rxjs/add/operator/map';
import 'rxjs/add/operator/concatMap';
import 'rxjs/add/operator/do';
import 'rxjs/add/operator/expand';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/first';
import 'rxjs/add/operator/let';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/publishReplay';
import 'rxjs/add/operator/reduce';
import 'rxjs/add/operator/publish';
import 'rxjs/add/operator/scan';
import 'rxjs/add/operator/finally';
import 'rxjs/add/operator/delay';
import 'rxjs/add/operator/switchMap';
import 'rxjs/add/operator/take';
import 'rxjs/add/operator/takeWhile';
import 'rxjs/add/operator/takeUntil';
import 'rxjs/add/operator/share';

import 'rxjs/add/observable/concat';
import 'rxjs/add/observable/defer';
import 'rxjs/add/observable/empty';
import 'rxjs/add/observable/from';
import 'rxjs/add/observable/fromEvent';
import 'rxjs/add/observable/merge';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/timer';

import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { TextEncoder } from 'text-encoding';

// native Bluetooth
import { BLE } from '@ionic-native/ble';

// service and characteristics numbers
import { UART_SERVICE, UART_TXRX, UART_PASSWORD, UART_CONFIG } from './consts';
// service and characteristics numbers (native)
import { UART_SERVICE_STR, UART_TXRX_STR, UART_PASSWORD_STR, UART_CONFIG_STR } from '../../providers/ble/consts';

// callback function type definition of read events and notify observables
type charReadCallback = ( event: any ) => void;
type getObservableFromNotify = ( Observable ) => void;

// module augmentation, adding an interface we can implement
declare module 'rxjs/Observable' {
    interface Observable<T> {
        doOnSubscribe(onSubscribe: () => void): this;
    }
}


/*
  Provider for Web Bluetooth
 */
@Injectable()
export class Ble {

    deviceName:         string;

    ///////////////   W E B   B L U E T O O T H

    gatt:               BluetoothRemoteGATTServer;

    /** define your Characteristics here **/
    // write and notify char
    public uartChar: BluetoothRemoteGATTCharacteristic;
    // write only char
    public passwordChar: BluetoothRemoteGATTCharacteristic;
    // read and write char
    public configChar: BluetoothRemoteGATTCharacteristic;

    // we need synchronized writing not to overload WebBluetooth
    writable$:          Observable< boolean >;
    private writableSubject = new BehaviorSubject<boolean>(false);

    private isCordova:boolean;

    constructor(
        private platform:Platform,
        private ble: BLE,
    ) {
        this.isCordova = this.platform.is("cordova");

        if (!this.isCordova) {
            console.log('Hello Web BLE Provider');
            this.writable$ = this.writableSubject.asObservable();
        }
    }


    // connect gets call back functions for READ and NOTIFY chars used

    async connect( gotConfig: charReadCallback, getUartDataNote: getObservableFromNotify ) {
        // pops up device select window
        const device = await navigator.bluetooth.requestDevice({
            filters: [
                { services: [ UART_SERVICE ]},
                { namePrefix: "AIR" },
            ],
            optionalServices: ["battery_service"],
        });

        this.gatt = await device.gatt.connect();
        this.deviceName = this.gatt.device.name;
        console.log( "connected to " + this.deviceName );

        /*      // listing all services available, for debugging
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
            console.log('getServices error ' + error);
         }
         */

        // get the main service
        const uartService = await this.gatt.getPrimaryService( UART_SERVICE );

        // Password, write only
        this.passwordChar = await uartService.getCharacteristic( UART_PASSWORD );
        // config, read and write
        this.configChar = await uartService.getCharacteristic( UART_CONFIG );
        // register an event handler for config reads
        this.configChar.addEventListener( 'characteristicvaluechanged', gotConfig );

        console.log("got all uart chars");

        // observable
        //this.uartData = (await observableCharacteristic( this.uartChar ))
        //    .map( parseUart );

        // UART packets write and notify
        this.uartChar = await uartService.getCharacteristic( UART_TXRX );
        // register notify events and turn into observable

        // implement operator doOnSubscribe on the event observable
        Observable.prototype.doOnSubscribe = function(onSubscribe) {
            let source = this;
            return Observable.defer(() => {
                onSubscribe();
                return source;
            });
        };

        // return the Observable for the notify char, with startNotify on first subscribe
        getUartDataNote( Observable.fromEvent( this.uartChar, 'characteristicvaluechanged' )
             .doOnSubscribe(() => {
                 console.log('starting note');
                 this.uartChar.startNotifications();
             })
            .map( value => String.fromCharCode.apply( null, new Uint8Array( this.uartChar.value.buffer )))
            .takeUntil( Observable.fromEvent( this.gatt.device, 'gattserverdisconnected' ))
            .finally(() => {
                console.log( 'stream disconnected ');
                // not necessary: return this.uartChar.stopNotifications()
            })
            .share()
        );


        /*
         const chars = this.uartData.concatMap(chunk => chunk.split(''));
         this.lines$ = chars.scan(( acc, curr ) => acc[acc.length - 1] === '\n' ? curr : acc + curr)
         .filter(item => item.indexOf('\n') >= 0);
         console.log( 'got '+this.lines$ )
         */

        // now allow write to UART
        await setTimeout(() => this.writableSubject.next( true ), 0);

    }


    public disconnect() {
        console.log("calling disconnect on gatt");
        try {
            this.gatt.disconnect();
        } catch (e) {}
    }

    public disconnectNative( peripheral: any ){
        try{
            this.ble.disconnect( peripheral );
        } catch (e) {}
    }

    public name(): string {
        return this.deviceName;
    }

    /* unused functions

     private getSupportedProperties( characteristic ) {
        let supportedProperties = [];
        for (const p in characteristic.properties) {
            if (characteristic.properties[p] === true) {
                supportedProperties.push(p.toUpperCase());
            }
        }
        return '[' + supportedProperties.join(', ') + ']';
     }

     // another way to do that:
     this.sensData = (await observableCharacteristic( SENSOR ))
         .map( parseSensor );

     async observableCharacteristic( char: BluetoothRemoteGATTCharacteristic ) {
        await char.startNotifications();
        const disconnected = Observable.fromEvent( char.service!.device, 'gattserverdisconnected');
        return Observable.fromEvent( char, 'characteristicvaluechanged' )
            .takeUntil( disconnected )
            .map((event: Event) => ( event.target as BluetoothRemoteGATTCharacteristic ).value as DataView );
     }

     */




    /** characteristic write functions **/


    public async password( pw: string ){
        console.log( "writing pwd "+ pw );
        await this.passwordChar.writeValue( new TextEncoder('utf-8').encode(`${pw}`));
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



    public async setConfig( group: number ){
        let raw = new Uint8Array( 3 );
        raw[0] = 32; // group command
        raw[1] = group & 0xFF; // lower bytes
        raw[2] = ( group >> 8 ); // upper byte
        try {
            await this.configChar.writeValue( raw );
        } catch( e ) {
            console.log( "setConfig failed " + e);
        }
    }



    public async newPassword( pw: string ){

        const length = (pw as string).length;

        let pwdata = new Uint8Array( length+1 );
        pwdata[0] = length;
        for( let i=0; i<length; i++){
            pwdata[i+1] = pw.charCodeAt(i);
        }

        try{
            await this.configChar.writeValue( pwdata );
        } catch( e ) {
            console.log( "pw failed " + e);
        }

    }


    // write to char in chunks as well as step by step

    public sendText( text: string ){

        //console.log("sending "+text);

        const bytes = text.split('').map(c => c.charCodeAt(0));
        const chunks = [];

        while( bytes.length > 0 ) {
            chunks.push(new Uint8Array(bytes.splice(0, 20)));
        }

        const result = Observable.zip(
                Observable.from( chunks ),
                this.writableSubject.filter(value => value)
            )
            .mergeMap(([ chunk, writeable ]) => {
                //console.log("writing: "+ chunk);
                this.writableSubject.next(false);
                return Observable.from( this.uartChar.writeValue( chunk ));
            })

            // timeout absolutely necessary because otherwise writeValue will fail when called too quickly
            .map(() => setTimeout(() => this.writableSubject.next( true ), 10))
            // make this into a connectable Observable
            .publish();

        // connect to the Observable and get the result
        result.connect();
        return result;
    }

    public sendTextNative( text: string, peripheral: any ) {

        console.log("native send " + text + "to " + JSON.stringify( peripheral ));
        this.writableSubject.next(true);

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
                    this.ble.writeWithoutResponse( peripheral.id, UART_SERVICE_STR, UART_TXRX_STR, chunk.buffer )
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




}
