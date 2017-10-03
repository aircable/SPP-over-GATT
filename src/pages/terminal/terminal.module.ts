import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { TerminalPage } from './terminal';

@NgModule({
    declarations: [
        TerminalPage,
    ],
    imports: [
        IonicPageModule.forChild(TerminalPage),
    ],
    // for the obscure ion-textbox
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class TerminalPageModule {
}
