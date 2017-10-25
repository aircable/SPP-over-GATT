import { Component, ViewChild, NgZone } from '@angular/core';
import { Validators, FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { IonicPage, Tabs, NavController, NavParams, Events } from 'ionic-angular';

import { Settings } from '../../providers/providers';

/**
 * The Settings page is a simple form that syncs with a Settings provider
 * to enable the user to customize settings for the app.
 *
 */

@IonicPage()
@Component({
    selector: 'page-settings',
    templateUrl: 'settings.html',
})
export class SettingsPage {

    @ViewChild('myTabs') tabRef:Tabs;

    showPasswordText = false;
    connected = false;

    settingsForm: FormGroup;

    private baudid;
    // map ID to actual bps
    private baudlist = [
        { id: 1, speed: '2400' },
        { id: 3, speed: '9600' },
        { id: 4, speed: '19200' },
        { id: 5, speed: '38400' },
        { id: 6, speed: '57600' },
        { id: 8, speed: '115200' }
    ];

    // Our local settings object
    private uartsettings: any; // = { baudid: 3, password: "1234" };

    settingsReady = false;

    profileSettings = {
        page: 'profile',
        pageTitleKey: 'SETTINGS_PAGE_PROFILE'
    };

    page: string = 'main';
    pageTitleKey: string = 'SETTINGS_TITLE';
    pageTitle: string;

    constructor(public navCtrl:NavController,
                public settings: Settings,
                public navp: NavParams,
                private zone: NgZone,
                public formBuilder: FormBuilder,
                public events: Events) {
        console.log("settings page "+JSON.stringify( settings ));
    }



    _buildForm() {

        console.log("buildForm");

        this.settingsForm = this.formBuilder.group({
            baudid: [ this.uartsettings.baudid ],
            password: [ this.uartsettings.password, Validators.compose([ Validators.maxLength(20), Validators.required ])],
            group: [ this.uartsettings.group ],
        });

        // Watch the form for changes, and save them immediately
        this.settingsForm.valueChanges.subscribe((v) => {
            this.settings.merge( this.settingsForm.value );
        });

    }


    ionViewDidLoad() {
        console.log('ionViewDidLoad SettingsPage');
        // Build an empty form for the template to render
        this.settingsForm = this.formBuilder.group({});
    }

    ionViewWillEnter() {
        console.log("ionViewWillEnter");
        // Build an empty form for the template to render
        this.settingsForm = this.formBuilder.group({});

        //this.page = this.navParams.get('page') || this.page;
        //this.pageTitleKey = this.navParams.get('pageTitleKey') || this.pageTitleKey;

        this.settings.load().then(() => {
            this.settingsReady = true;
            this.uartsettings = this.settings.allSettings;

            this._buildForm();
        });
    }

    ngOnChanges() {
        console.log('Ng All Changes');
    }



    showPassword( input: any ): any {
        this.zone.run(() => {
            this.showPasswordText = this.showPasswordText === true ? false : true;
        });
    }

    save() {

        console.log( "form "+ JSON.stringify( this.settingsForm.value ));
        this.uartsettings.baudid = +this.settingsForm.value.baudid;
        // make it into a number with the plus sign
        this.uartsettings.password = this.settingsForm.value.password;
        // keep as string
        this.uartsettings.group = this.settingsForm.value.group;

        //saveSettings( this.storage, this.uartsettings );


        // move to the main page 1
        this.navCtrl.parent.select( 0, {
            uartsettings: this.uartsettings
        } );

        // send event to the terminal page so it can change the physical settings
        this.events.publish( "settings:changed", this.uartsettings );

    }

}
