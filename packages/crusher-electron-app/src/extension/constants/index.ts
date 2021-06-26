export const EVENT_CAPTURED = "EVENT_CAPTURED";

// Actions
export const START_RECORDING_SESSION = "START_RECORDING_SESSION";
export const DELETE_RECORDING_SESSION = "STOP_RECORDING_SESSION";
export const SAVE_EVENT = "SAVE_EVENT";
export const GET_EVENTS = "GET_EVENTS";
export const CHECK_SESSION_STATUS = "CHECK_SESSION_STATUS";
export const STOP_RECORDING = "STOP_RECORDING";
export const GET_CODE = "GET_CODE";

// Scripts
export const DEFAULT_VALIDATION_SCRIPT = `function(html, text, element) {
    return text.toLowerCase();
}`;

export const EVENTS = {
	CLICK: "CLICK",
	INPUT: "INPUT",
	KEYUP: "KEYUP",
	KEYDOWN: "KEYDOWN",
	HOVER: "HOVER",
	PAGE_SCREENSHOT: "PAGE_SCREENSHOT",
	ELEMENT_SCREENSHOT: "ELEMENT_SCREENSHOT",
};

export const START_INSPECTING_RECORDING_MODE = "START_INSPECTING_RECORDING_MODE";
export const START_NON_INSPECTING_RECORDING_MODE = "START_NON_INSPECTING_MODE";
export const NOT_RECORDING = "NOT_RECORDING";

export const ACTION_FORM_TYPE = {
	PAGE_ACTIONS: "PAGE_ACTIONS",
	ELEMENT_ACTIONS: "ELEMENT_ACTIONS",
};