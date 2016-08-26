/* jshint esversion: 6 */
/* jshint node: true */
'use strict';
const NestHelper = require('opent2t-translator-helper-nest');

// This code uses ES2015 syntax that requires at least Node.js v4.
// For Node.js ES2015 support details, reference http://node.green/

function validateArgumentType(arg, argName, expectedType) {
    if (typeof arg === 'undefined') {
        throw new Error('Missing argument: ' + argName + '. ' +
            'Expected type: ' + expectedType + '.');
    } else if (typeof arg !== expectedType) {
        throw new Error('Invalid argument: ' + argName + '. ' +
            'Expected type: ' + expectedType + ', got: ' + (typeof arg));
    }
}

// Helper method to convert the device schema to the translator schema.
function deviceSchemaToTranslatorSchema(deviceSchema) {

    // Quirks:
    // - Nest does not have an external temperature field, so that is left out.
    // - HVAC Mode is not implemented at this time. Allowed modes may be inferred from the can_cool and can_heat properties per Nest documentation
    // - Away Mode is not implemented at this time.

    // return units in Celsius regardless of what the thermostat is set to
    var tempScale = 'C';
    var ts = tempScale.toLowerCase();

    return {
        id: deviceSchema['device_id'],
        n: deviceSchema['name'],
        rt: 'org.opent2t.sample.thermostat.superpopular',
        targetTemperature: { temperature: deviceSchema['target_temperature_' + ts], units: tempScale },
        targetTemperatureHigh: { temperature: deviceSchema['target_temperature_high_' + ts], units: tempScale },
        targetTemperatureLow: { temperature: deviceSchema['target_temperature_low_' + ts], units: tempScale },
        ambientTemperature: { temperature: deviceSchema['ambient_temperature_' + ts], units: tempScale },
        hasFan: deviceSchema['has_fan'],
        ecoMode: deviceSchema['has_leaf'],
        fanTimerActive: deviceSchema['fan_timer_active']
    };
}

// Helper method to convert the translator schema to the device schema.
function translatorSchemaToDeviceSchema(translatorSchema) {

    // Quirks:
    // - HVAC Mode is not implemented at this time.
    // - Away Mode is not implemented at this time.

    var result = {};

    if (!!translatorSchema.n) {
        result['name'] = translatorSchema.n;
    }

    if (!!translatorSchema.targetTemperature) {
        result['target_temperature_' + translatorSchema.targetTemperature.units.toLowerCase()] = translatorSchema.targetTemperature.temperature;
    }

    if (!!translatorSchema.targetTemperatureHigh) {
        result['target_temperature_high_' + translatorSchema.targetTemperatureHigh.units.toLowerCase()] = translatorSchema.targetTemperatureHigh.temperature;
    }

    if (!!translatorSchema.targetTemperatureLow) {
        result['target_temperature_low_' + translatorSchema.targetTemperatureLow.units.toLowerCase()] = translatorSchema.targetTemperatureLow.temperature;
    }

    return result;
}

var deviceId;
var deviceType = 'thermostats';
var nestHelper;

// This translator class implements the 'org.opent2t.sample.thermostat.superpopular' interface.
class Translator {

    constructor(device) {
        console.log('Initializing device.');

        validateArgumentType(device, 'device', 'object');
        validateArgumentType(device.props, 'device.props', 'object');

        validateArgumentType(device.props.access_token, 'device.props.access_token', 'string');
        validateArgumentType(device.props.id, 'device.props.id', 'string');

        deviceId = device.props.id;

        // Initialize Nest Helper
        nestHelper = new NestHelper(device.props.access_token);
        console.log('Javascript and Nest Helper initialized.');
    }

    // exports for the entire schema object

    // Queries the entire state of the thermostat
    // and returns an object that maps to the json schema org.opent2t.sample.thermostat.superpopular
    getThermostatResURI() {
        return nestHelper.getDeviceDetailsAsync(deviceType, deviceId)
            .then((response) => {
                return deviceSchemaToTranslatorSchema(response);
            });
    }

    // Updates the current state of the thermostat with the contents of postPayload
    // postPayload is an object that maps to the json schema org.opent2t.sample.thermostat.superpopular
    //
    // In addition, returns the updated state (see sample in RAML)
    postThermostatResURI(postPayload) {

        console.log('postThermostatResURI called with payload: ' + JSON.stringify(postPayload, null, 2));

        var putPayload = translatorSchemaToDeviceSchema(postPayload);
        return nestHelper.putDeviceDetailsAsync(deviceType, deviceId, putPayload)
            .then((response) => {
                return deviceSchemaToTranslatorSchema(response);
            });
    }

    // exports for individual properties

    getAmbientTemperature() {
        console.log('getAmbientTemperature called');

        return this.getThermostatResURI()
            .then(response => {
                return response.ambientTemperature.temperature;
            });
    }

    getTargetTemperature() {
        console.log('getTargetTemperature called');

        return this.getThermostatResURI()
            .then(response => {
                return response.targetTemperature.temperature;
            });
    }

    getTargetTemperatureHigh() {
        console.log('getTargetTemperatureHigh called');

        return this.getThermostatResURI()
            .then(response => {
                return response.targetTemperatureHigh.temperature;
            });
    }

    setTargetTemperatureHigh(value) {
        console.log('setTargetTemperatureHigh called with value: ' + value);

        var postPayload = {};
        postPayload.targetTemperatureHigh = { temperature: value, units: 'C' };

        return this.postThermostatResURI(postPayload)
            .then(response => {
                return response.targetTemperatureHigh.temperature;
            });
    }

    getTargetTemperatureLow() {
        console.log('getTargetTemperatureLow called');

        return this.getThermostatResURI()
            .then(response => {
                return response.targetTemperatureLow.temperature;
            });
    }

    setTargetTemperatureLow(value) {
        console.log('setTargetTemperatureLow called with value: ' + value);

        var postPayload = {};
        postPayload.targetTemperatureLow = { temperature: value, units: 'C' };

        return this.postThermostatResURI(postPayload)
            .then(response => {
                return response.targetTemperatureLow.temperature;
            });
    }
}

// Export the translator from the module.
module.exports = Translator;
