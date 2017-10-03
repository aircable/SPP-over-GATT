import { Component, NgZone, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { IonicPage, NavController, NavParams, Events } from 'ionic-angular';

import { DevicePage } from '../device/device';
import { Settings } from '../../providers/providers';
import { Ble } from '../../providers/providers';

/**
 * Generated class for the TerminalPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

// Terminal
import * as Terminal from "xterm";
import style from "xterm/dist/xterm";
import "xterm/dist/addons/fit/fit";

@IonicPage()
@Component({
    selector: 'terminal',
    templateUrl: 'terminal.html',
})
export class TerminalPage implements AfterViewInit {

    public isScanning: boolean = false;
    public isConnected: boolean = false;


    public linechars = {
        echo: false,
        cr: true,
        lf: false
    }
    private transmit:string;

    private devicepage:any = DevicePage;

    private term: Terminal;
    // this finds the #terminal element, after view init
    @ViewChild('terminal') terminal:ElementRef;


    constructor(
        public navCtrl:NavController,
        public navParams:NavParams,
        public events: Events,
        private zone: NgZone,
        public settings: Settings,
        public ble: Ble, // Web Bluetooth
    ) {

        console.log( "terminal constructor");
        Terminal.loadAddon("fit");

        this.term = new Terminal({
            cursorBlink: true,
            //useStyle: true,
            scrollback: 60,
            rows: 24,
        });

        // this is just simple echo
        this.term.on("key", (key, ev) => {

             console.log(key.charCodeAt(0));
             if (key.charCodeAt(0) == 13)
             this.term.write('\n');
             this.term.write(key);

            // send every single keystroke over Bluetooth
            //this.client.sendText( key );
        });

        // the settings page changed the UART settings
        // same arguments passed in `events.publish()
        events.subscribe( 'settings:changed', ( settings ) => {
            console.log( "changed "+ JSON.stringify( settings ));

            // if connected write to the config char
            this.ble.setBaudConfig( settings.getValue( 'baudid' ));
            // then we change the password
            setTimeout(() => this.ble.newPassword(settings.getValue( 'password' )), 200);

        });

    }

    ionViewDidLoad() {
        console.log('ionViewDidLoad TerminalPage');
    }


    // getting the nativeElement only possible after view init
    ngAfterViewInit() {

        // this now finds the #terminal element
        this.term.open( this.terminal.nativeElement, true );

        // calling fit is not quite working
        // uses the obscure ion-textbox, which does not really exist, but changes the font size
        // the number of rows will determine the size of the terminal screen
        this.term.fit();
        this.term.writeln('Welcome to xterm.js');
    }


    // called from button
    sendText() {
        //console.log( this.transmit );
        if (this.linechars.echo) {
            // echo to terminal
            this.zone.run(() => {
                this.term.writeln( this.transmit );
            });
        }
        if (this.linechars.cr) {
            this.transmit += '\r';
        }
        if (this.linechars.lf) {
            this.transmit += '\n';
        }

        // send text over Bluetooth
        this.ble.sendText( this.transmit );

        //console.log( this.terminal );
        this.transmit = "";
    }


    // only for Web Bluetooth scan button
    async startScanning() {

        this.isScanning = true;
        // clear terminal
        this.term.clear();

        try {
            // returns an Observable
            await this.ble.connect();
            //console.log('Connected!');
            this.term.writeln("Connected to " + this.ble.name());
            this.isConnected = true;
            this.isScanning = false;

            // first send password, must wait until sent
            this.settings.getValue( 'password' ).then( pwd => this.ble.password( pwd ));

            // send null char for connected
            // REMOVE WHEN WORKING, FIRMWARE BUG, first packet is lost
            //await this.client.sendText("Hello from Chrome");
            await this.ble.sendText("\0");

            // set the baud rate
            this.ble.setBaudConfig( this.settings.getValue( 'baudid' ));

            // now connect notifications and subscribe
            await this.ble.uartChar.startNotifications();
            console.log( "started note");

            this.ble.uartData
                .subscribe(
                    (data) => this.term.write( data ),
                    // error
                    (e) => console.log("datastream " + e),
                    // final
                    () => {
                        // stream disconnectred
                        //console.log("stream disconnected");
                        this.term.writeln("\r\nDisconnected");
                        this.isScanning = false;
                        this.isConnected = false;
                    }

                );

            /*
             setTimeout(() => {
             this.client.sendText("Hello From Chrome");
             }, 1000);
             */

        } catch (err) {
            // navigate away from the page
            console.log("error connecting " + err);
            this.isScanning = false;
            this.isConnected = false;
        }
    }

    // disconnect button for web and native
    disconnect() {
        /*
        if( this.peripheral !== undefined ) {
            // native
            this.ble.disconnect( this.peripheral.id );
            // back to the device page for peripheral select
            this.navCtrl.push( DevicePage );

        } else {
            // web bluetooth
            //console.log( "web bt disconnect" );
            this.client.disconnect();
            //this.term.writeln( "Disconnected" );
        }
        */
        this.isScanning = false;
        this.isConnected = false;
    }

}
