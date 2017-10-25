import { BrowserModule } from '@angular/platform-browser';
import { ErrorHandler, NgModule } from '@angular/core';
import { IonicApp, IonicErrorHandler, IonicModule } from 'ionic-angular';
import { SplashScreen } from '@ionic-native/splash-screen';
import { StatusBar } from '@ionic-native/status-bar';
import { IonicStorageModule, Storage } from '@ionic/storage';

import { BLE } from "@ionic-native/ble";

import { Ble } from '../providers/providers';
import { Settings } from '../providers/providers';
import { MyApp } from './app.component';

import { TerminalPage } from '../pages/terminal/terminal';
import { DevicePage } from '../pages/device/device';


export function defaultSettings( storage: Storage ) {
    /**
     * The Settings provider takes a set of default settings for your app.
     *
     * You can add new settings options at any time. Once the settings are saved,
     * these values will not overwrite the saved values (this can be done manually if desired).
     */
    console.log( "default settings");
    return new Settings( storage, {
        baudid: 3,
        password: "1234",
        group: 0,
    });
}

@NgModule({
    declarations: [
        MyApp,
    ],
    imports: [
        BrowserModule,
        IonicModule.forRoot(MyApp),
        // defaults to indexdb driver
        IonicStorageModule.forRoot()
    ],
    bootstrap: [IonicApp],
    entryComponents: [
        MyApp,
        TerminalPage,
        DevicePage,
    ],
    providers: [
        BLE,
        StatusBar,
        SplashScreen,
        { provide: Settings, useFactory: defaultSettings, deps: [Storage] },
        // Keep this to enable Ionic's runtime error handling during development
        { provide: ErrorHandler, useClass: IonicErrorHandler },
        Ble
    ]
})
export class AppModule {
}
