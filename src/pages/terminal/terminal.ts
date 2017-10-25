import { Component, NgZone, ElementRef, ViewChild } from '@angular/core';
import { IonicPage, NavController, NavParams, Events, AlertController } from 'ionic-angular';

import { DevicePage } from '../device/device';

import { Settings } from '../../providers/providers';
// Web Bluetooth
import { Ble } from '../../providers/providers';

import { Observable } from 'rxjs/Observable';


// Terminal
import * as Terminal from "xterm";
//import style from "xterm/dist/xterm";
import "xterm/dist/addons/fit/fit";

@IonicPage()
@Component({
    selector: 'terminal',
    templateUrl: 'terminal.html',
})
export class TerminalPage {

    public isScanning: boolean = false;
    public isConnected: boolean = false;

    public linechars_echo: boolean = false;
    public linechars_cr: boolean = true;
    public linechars_lf: boolean = false;

    private transmit:string;
    // the peripheral to connect to
    private peripheral;

    // xterm.js
    term: Terminal;
    // this finds the #terminal element, after view init
    @ViewChild('terminal') terminal:ElementRef;

    private nativeBLE = DevicePage;
    // streaming data coming from the connected device
    public uartData: Observable< string >;



    constructor(
        public navCtrl:NavController,
        public navParams:NavParams,
        public events: Events,
        private zone: NgZone,
        public settings: Settings,
        private alertCtrl: AlertController,
        public ble: Ble,
    ) {

        console.log( "terminal constructor");

        // bind the this-context in the constructor
        // allowing external callbacks
        this.getDataNote = this.getDataNote.bind(this);
        this.gotConfig = this.gotConfig.bind(this);


        /////  N A T I V E   B L U E T O O T H
        // navigator provides parameter when coming from devicePage
        this.peripheral = navParams.get('peripheral');

        if( this.peripheral !== undefined ){
            this.isConnected = true;
            // called from device page
            console.log( "from device page "+JSON.stringify( this.peripheral ));

            // subscribe to the observable to get data from the device
            this.peripheral.data.subscribe((data) => {
                //console.log('got ' + data);  //JSON.stringify( data ));
                this.zone.run(() => {
                    // data to terminal
                    this.term.write(data);
                });
            });
        }

        Terminal.loadAddon("fit");

        this.term = new Terminal({
            cursorBlink: true,
            //useStyle: true,
            scrollback: 60,
            rows: 21,
        });


        // this is just simple echo
        this.term.on("key", (key, ev) => {
            /*  debug just an echo
             console.log(key.charCodeAt(0));
             if (key.charCodeAt(0) == 13)
             this.term.write('\n');
             this.term.write(key);
             */
            // send every single keystroke over Bluetooth
            if (this.peripheral !== undefined) {
                // native Bluetooth
                this.ble.sendTextNative( key, this.peripheral );
            } else {
                // Web Bluetooth
                this.ble.sendText( key );
            }
        });


        // the settings page changed the UART settings
        // same arguments passed in `events.publish()
        events.subscribe('settings:changed', ( settings ) => {
            console.log( "changed "+ JSON.stringify( settings ));

            if( this.isConnected ) {
                let alert = this.alertCtrl.create({
                    title: "YOU ARE CONNECTED!",
                    subTitle: 'Changing Hardware Security Keys',
                    message: 'Are you sure you want to change the settings on the device?',
                    buttons: [
                        {
                            text: 'NO',
                            handler: () => {
                                console.log('Disagree clicked');
                            }
                        },
                        {
                            text: 'YES',
                            handler: () => {
                                console.log('Agree clicked');

                                // if connected write to the config char
                                this.settings.getValue( 'baudid' ).then(
                                    baud => this.ble.setBaudConfig( baud )
                                );
                                // then we change the password and group and give it some extra time
                                setTimeout(() => {
                                    this.settings.getValue( 'password' ).then(
                                        pwd => this.ble.newPassword( pwd )
                                    );
                                }, 200 );
                                setTimeout(() => {
                                    this.settings.getValue( 'group' ).then(
                                        grp => this.ble.setConfig( grp )
                                    );
                                }, 500 );
                            }
                        }
                    ]
                });
                alert.present();
            }
        });
    }

    ionViewDidLoad() {
        console.log('ionViewDidLoad TerminalPage');

        this.term.open( this.terminal.nativeElement, true );

        // calling fit is not quite working
        // uses the obscure ion-textbox, which does not really exist, but changes the font size
        // the number of rows will determine the size of the terminal screen
        this.term.fit();
        this.term.writeln('Welcome to xterm.js');
    }


    updateLinechar( type: string ) {
        this.zone.run(() => {
            // somehow it's required on iOS to have that changed on the screen
            this.linechars_echo = this.linechars_echo;
            this.linechars_cr = this.linechars_cr;
            this.linechars_lf = this.linechars_lf;
            //console.log("linechars changed " + this.linechars_echo );
        });
    }


    // called from button
    sendText() {
        //console.log( this.transmit );
        if (this.linechars_echo) {
            // echo to terminal
            this.zone.run(() => {
                this.term.writeln( this.transmit );
            });
        }
        if (this.linechars_cr) {
            this.transmit += '\r';
        }
        if (this.linechars_lf) {
            this.transmit += '\n';
        }

        console.log( 'sending to ' + JSON.stringify( this.peripheral ));
        if( this.peripheral !== undefined ){
            // native BLE
            this.ble.sendTextNative( this.transmit, this.peripheral );
        } else {
            // send text over Bluetooth
            this.ble.sendText( this.transmit );
        }

        //console.log( this.terminal );
        this.transmit = "";
    }



    // Web Bluetooth scan button
    async startScanning() {
        let pwd = "";

        this.isScanning = true;
        // clear terminal
        this.term.clear();

        try {
            // returns an Observable
            await this.ble.connect( this.gotConfig, this.getDataNote );
            //console.log('Connected!');

            this.term.writeln("Connected to " + this.ble.name());
            this.isConnected = true;
            this.isScanning = false;

            // first send password, must do that before read or subscribe to notes
            //this.settings.getValue( 'password' ).then(
            //    pwd => this.ble.password( pwd )
            //);

            await this.settings.getValue( 'password' ).then(
                data => pwd = data
            );
            await this.ble.password( pwd );

            // send null char for connected
            // REMOVE WHEN WORKING, FIRMWARE BUG, first packet is lost
            //await this.client.sendText("Hello from Chrome");
            await this.ble.sendText("\0");

            // set the baud rate
            this.settings.getValue( 'baudid').then(
                baud => this.ble.setBaudConfig( baud )
            );

            // use local
            this.uartData
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

        } catch (err) {
            // navigate away from the page
            console.log("error connecting " + err);
            this.ble.disconnect();
            this.isScanning = false;
            this.isConnected = false;
        }
    }


    // notify characteristic callback, save the observable for later subscribe
    private getDataNote( o: Observable<string> ) {
        this.uartData = o;
        console.log( "got observable for notes");
    }


    // read characteristic callback
    private gotConfig( event: any ) {
        console.log( "got "+ new Uint8Array( event.target.value.buffer ));
        let group = event.target.value.getUint8(11) + event.target.value.getUint8(12)*256;
        let baud = event.target.value.getUint8(17);
        console.log('Config: grp:' + group + ", bd:" + baud );
        // store in settings
        this.settings.setValue( 'baudid', baud );
        this.settings.setValue( 'group', group );
    }


    // disconnect button for web and native
    disconnect() {

        if( this.peripheral !== undefined ) {
            // native
            this.ble.disconnectNative( this.peripheral.id );
            // back to the device page for peripheral select
            this.navCtrl.push( 'DevicePage' );

        } else {
            // web bluetooth
            //console.log( "web bt disconnect" );
            this.ble.disconnect();
            //this.term.writeln( "Disconnected" );
        }

        this.isScanning = false;
        this.isConnected = false;
    }

}
