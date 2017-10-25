import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { DevicePage } from './device';
//import { TerminalPage } from '../terminal/terminal';

@NgModule({
  declarations: [
    DevicePage
  ],
  imports: [
    IonicPageModule.forChild( DevicePage ),
  ],
  exports: [
    DevicePage,
  ],
  //entryComponents: [
  //  TerminalPage,
  //],
  // for the obscure ion-textbox
  //schemas: [ CUSTOM_ELEMENTS_SCHEMA ]

})
export class DevicePageModule {}
