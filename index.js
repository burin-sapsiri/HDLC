"use strict";
exports.__esModule = true;
var crc = require("crc");
var EventEmitter = require("events").EventEmitter;
var FRAME_BOUNDARY_OCTET = 0x7E;
var CONTROL_ESCAPE_OCTET = 0x7D;
var INVERT_OCTET = 0x20;
var MINIHDLC_MAX_FRAME_LENGTH = 4096;
var HDLC = /** @class */ (function () {
    function HDLC() {
        this.pendingFrame = {};
        this.eventEmitter = new EventEmitter();
        this.byteSendingFunction = function (byte) { };
    }
    HDLC.prototype.HDLC = function () { };
    HDLC.prototype.init = function (byteSendingFunction) {
        this.byteSendingFunction = byteSendingFunction;
        this.pendingFrame.framePosition = 0;
        this.pendingFrame.frameChecksum = undefined;
        this.pendingFrame.escapeCharacter = false;
        this.pendingFrame.receivedFrameBuffer = [];
        this.pendingFrame.isStared = false;
    };
    HDLC.prototype.sendchar = function (data) {
        this.byteSendingFunction(data & 0xff);
    };
    HDLC.prototype.byteReceiver = function (bytes) {
        for (var i = 0; i < bytes.length; i++) {
            /* FRAME FLAG */
            var data = bytes[i];
            /* FRAME FLAG */
            if (data === FRAME_BOUNDARY_OCTET) {
                if (this.pendingFrame.escapeCharacter === true) {
                    this.pendingFrame.escapeCharacter = false;
                }
                else if (this.pendingFrame.framePosition >= 2) {
                    
                    this.pendingFrame.frameChecksum ^= 0xffff
                    
                    if (this.pendingFrame.frameChecksum === ((this.pendingFrame.receivedFrameBuffer[this.pendingFrame.framePosition - 1] << 8) | (this.pendingFrame.receivedFrameBuffer[this.pendingFrame.framePosition - 2] & 0xff))) {
                        /* Call the user defined function and pass frame to it */
                        this.eventEmitter.emit("newFrame", this.pendingFrame.receivedFrameBuffer.slice(0, this.pendingFrame.receivedFrameBuffer.length - 2));
                    }
                }
                this.pendingFrame.framePosition = 0;
                this.pendingFrame.frameChecksum = 0xffff;
                this.pendingFrame.escapeCharacter = false;
                this.pendingFrame.receivedFrameBuffer = [];
                continue;
            }
            if (this.pendingFrame.escapeCharacter) {
                this.pendingFrame.escapeCharacter = false;
                data ^= INVERT_OCTET;
            }
            else if (data === CONTROL_ESCAPE_OCTET) {
                this.pendingFrame.escapeCharacter = true;
                continue;
            }
            this.pendingFrame.receivedFrameBuffer[this.pendingFrame.framePosition] = data;
            if (this.pendingFrame.framePosition - 2 >= 0) {
                this.pendingFrame.frameChecksum = crc.crc16kermit([this.pendingFrame.receivedFrameBuffer[this.pendingFrame.framePosition - 2]], this.pendingFrame.frameChecksum);
            }
            this.pendingFrame.framePosition++;
            if (this.pendingFrame.framePosition === MINIHDLC_MAX_FRAME_LENGTH) {
                this.pendingFrame.framePosition = 0;
                this.pendingFrame.frameChecksum = undefined;
                this.pendingFrame.escapeCharacter = false;
                this.pendingFrame.receivedFrameBuffer = [];
            }
        }
    };
    HDLC.prototype.sendFrame = function (rawFrame) {
        var byte;
        var fcs = 0xffff
        this.sendchar(FRAME_BOUNDARY_OCTET);
        for (var i = 0; i < rawFrame.length; i++) {
            byte = rawFrame[i];
            fcs = crc.crc16kermit([byte], fcs);
            if ((byte === CONTROL_ESCAPE_OCTET) || (byte === FRAME_BOUNDARY_OCTET)) {
                this.sendchar(CONTROL_ESCAPE_OCTET);
                byte ^= INVERT_OCTET;
            }
            this.sendchar(byte);
        }

        fcs ^= 0xffff

        byte = fcs & 0x00ff;
        if ((byte === CONTROL_ESCAPE_OCTET) || (byte === FRAME_BOUNDARY_OCTET)) {
            this.sendchar(CONTROL_ESCAPE_OCTET);
            byte ^= INVERT_OCTET;
        }
        this.sendchar(byte);
        byte = (fcs & 0xff00) >> 8;
        if ((byte === CONTROL_ESCAPE_OCTET) || (byte === FRAME_BOUNDARY_OCTET)) {
            this.sendchar(CONTROL_ESCAPE_OCTET);
            byte ^= INVERT_OCTET;
        }
        this.sendchar(byte);
        this.sendchar(FRAME_BOUNDARY_OCTET);
    };
    HDLC.prototype.clear = function () {
        this.pendingFrame.framePosition = 0;
        this.pendingFrame.frameChecksum = 0xffff;
        this.pendingFrame.escapeCharacter = false;
        this.pendingFrame.receivedFrameBuffer = [];
    }
    return HDLC;
}());
exports.HDLC = HDLC;
