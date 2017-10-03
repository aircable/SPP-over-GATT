/**
 * Created by juergen on 9/27/17.
 */


export const UART_SERVICE = 0x1815;
export const UART_SERVICE_STR = "1815";
export const UART_TXRX = 0x2a5e;
export const UART_TXRX_STR = "2A5E";
export const UART_PASSWORD = 0xffff;
export const UART_CONFIG = 0x2a5f;



export const readGroupCmd = new Uint8Array([ 0xef, 0x01, 0x77 ]);

// set baudrate command
export function setBaudCmd( baud: number ) {
    return new Uint8Array([0x56, baud, 0, 0xf0, 0xaa]);
}

// set password command
export function setPasswordCmd( pwd: string ) {
    return new Uint8Array([0x56, 0, 0, 0, pwd, 0x0f, 0xaa]);
}

// set broup command
export function setPasswordCmd( grp: number ) {
    return new Uint8Array([0x56, 0, 0, 0, grp, 0x0f, 0xaa]);
}