import { Component } from '@angular/core';
import { IonicPage, NavController, Platform, AlertController } from 'ionic-angular';

import { DevicePage } from "../device/device";
import { Settings } from '../../providers/providers';

// native Bluetooth
import { BLE } from "@ionic-native/ble";

/**
 * Generated class for the TabsPage tabs.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
    selector: 'page-tabs',
    templateUrl: 'tabs.html'
})
export class TabsPage {

    terminalRoot = 'TerminalPage';
    settingsRoot = 'SettingsPage';
    aboutRoot = 'AboutPage';

    private isIos:boolean;
    private isCordova:boolean;

    constructor(public navCtrl:NavController,
                public settings: Settings,
                private nativeble:BLE,
                private platform: Platform,
                private alertController:AlertController) {

        this.isIos = this.platform.is("ios");
        this.isCordova = this.platform.is("cordova");

        console.log("TABS: Platform: " + this.platform.platforms());

        // check native BLE access
        if (this.isCordova) {
            this.enableBLE().then(() => {
                    console.log("Native BLE is enabled");
                    // display the device page instead of the terminal page
                    this.terminalRoot = 'DevicePage';
                },
                err => {
                    console.log("Please enable Bluetooth");

                    let alert = this.alertController.create({
                        title: "Enable Bluetooth",
                        buttons: ["OK"]
                    });
                    alert.present();

                    //this.tab1Root = AboutPage;
                })
        } else {
            console.log("Web Bluetooth");
        }

        // make sure the default settings are stored in the database, load does that
        this.settings.load().then(() => {
            console.log( "settings stored/loaded");
        });

    }


    private enableBLE() {
        if (this.isIos) {
            // BLE.enable doesn't work on iOS
            return Promise.resolve();
        } else {
            return this.nativeble.enable();
        }
    }

}
