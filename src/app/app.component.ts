import { Component } from '@angular/core';
import { Platform } from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';

import { Settings } from '../providers/providers';
import { TabsPage } from '../pages/tabs/tabs';

@Component({
    templateUrl: 'app.html'
})
export class MyApp {

    // must be a string
    rootPage = 'TabsPage';

    constructor(
        private platform: Platform,
        private statusBar: StatusBar,
        settings: Settings,
        private splashScreen: SplashScreen
    ) {
    }

    ionViewDidLoad() {
        this.platform.ready().then(() => {
            // Okay, so the platform is ready and our plugins are available.
            // Here you can do any higher level native things you might need.
            if ( this.platform.is("cordova")) {
                this.statusBar.styleDefault();
                this.splashScreen.hide();
            }
        });
    }
}

