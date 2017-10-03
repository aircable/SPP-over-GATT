import { Component } from '@angular/core';
import { Platform, IonicPage, NavController, NavParams } from 'ionic-angular';

/**
 * Generated class for the AboutPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-about',
  templateUrl: 'about.html',
})
export class AboutPage {

  private isIos: boolean;

  constructor(
      public navCtrl: NavController,
      public navParams: NavParams,
      private platform:Platform,
  ) {
    this.isIos = this.platform.is("ios");
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad AboutPage');
  }

}
