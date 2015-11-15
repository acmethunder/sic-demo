const InputIdentifiers = {
	DocumentType:      'identity-document-type',
	DocumentNumber:    'identity-document-number',
	GivenName:         'identity-given-name',
	MiddleName:        'identity-middle-name',
	FamilyName:        'identity-family-name',
	Nationality:       'identity-nationality',
	IdentityPhoto:     'identity-photo',
	IdentitySignature: 'identity-signature',
	IdentitySignDate:  'identity-sign-date'
};

const ActionIdentifiers = {
	CardScanner:      'card-scanner-action',
	PassportScanner:  'passport-scanner-action',
	CaptureSignature: 'signature-draw-action',
	EndSession:       'end-session-action',
	StartSession:     'start-session-action',
	ImageButton:      'identity-image-action'
};

const HandlerNames = {
	start_handler:     'JNBStartHandler_V1',
	end_handler:       'JNBEndHandler_V1',
	card_handler:      'JNBIDCardHandler_V1',
	image_handler:     'JNBImageHandler_V1',
	signature_handler: 'JNBSignatureHandler_V1',
	barcode_handler:   'JNBBarcodeHandler_V1'
};

const IdentityType = {
	mrz_passport: 'passport_mrz',
	mrz_visa:     'visa_mrz',
	mrz_id_card:  'id_card_mrz',
	smart_card:   'smart_card'
};

/** Session Info */

var jnbSessionId = null;

/** Callback validation */

/** Calbacks */

function _startSessionCallback(responseString) {
	if ( typeof responseString === 'string' ) {
		var response = JSON.parse(responseString);
		jnbSessionId = response.response_data.jnb_session_id;
		alert("Session Id: " + jnbSessionId);
	}
}

function _endSessionCallback(responseString) {
	jnbSessionId = null;

	document.getElementById(InputIdentifiers.DocumentType).value = null;
	document.getElementById(InputIdentifiers.DocumentNumber).value = null;
	document.getElementById(InputIdentifiers.GivenName).value = null;
	document.getElementById(InputIdentifiers.MiddleName).value = null;
	document.getElementById(InputIdentifiers.FamilyName).value = null;
	document.getElementById(InputIdentifiers.Nationality).value = null;
	document.getElementById(InputIdentifiers.IdentitySignDate).innerHTML =  null;
	document.getElementById(InputIdentifiers.IdentitySignature).src = "";
}

function _parseResponseString(responseString) {
	if ( typeof responseString !== 'string' ) {
		return null;
	}

	var response = JSON.parse(responseString);
	return ( typeof response === 'object' ? response : null );
}

const NativeIdentityDocType = {
	Passport: "passport",
	TravelDocument: "travel_document",
};

function _mapScannedIDType(type) {
	if ( type === NativeIdentityDocType.Passport ) {
		return "Passport";
	}
	else if ( type === NativeIdentityDocType.TravelDocument ) {
		return "Travel Document";
	}
	else {
		return "Unknown";
	}
}

const MRZDomain = "com.jnb.jnbmrzscan.v1";
const MRZErrorCode = {
	UserCancelled:     1,
	VideoNotSupported: 2,
	ScanFailed:        3
};

function _cardScanCallback(responseString) {
	if ( typeof responseString !== 'string' ) {
		alert('Invalid response from MRZ scan.');
	}

	var response = JSON.parse(responseString);
	var errorsArray = response.errors;
	if ( errorsArray && (errorsArray.length > 0) ) {
		for ( var i = 0; i < errorsArray.length; ++i ) {
			var error = errorsArray[i];
			if ( error.error_code === MRZErrorCode.UserCancelled ) {
				break;
			}

			alert(error.error_message);
		}
	}
	else if ( response.response_data ) {
		var identity = response.response_data;
		_populateIdentityInfo(identity);
	}
}

function _callNative(messageBody,messageHandler) {
	if ( jnbSessionId ) {
		messageBody.jnb_session_id = jnbSessionId;
	}

	var message = { body: messageBody };
	messageHandler.postMessage(message);
}

function _populateIdentityInfo(identityDocument) {
	if ( (! identityDocument) || (typeof identityDocument !== 'object') ) {
		alert('Invalid identity format.');
		return;
	}

	document.getElementById(InputIdentifiers.DocumentType).value = _mapScannedIDType(identityDocument.document_type);
	document.getElementById(InputIdentifiers.DocumentNumber).value = identityDocument.document_number;

	var docContent = identityDocument.document_content;

	document.getElementById(InputIdentifiers.GivenName).value = docContent.first_name;
	document.getElementById(InputIdentifiers.MiddleName).value = docContent.middle_name;
	document.getElementById(InputIdentifiers.FamilyName).value = docContent.last_name;
	document.getElementById(InputIdentifiers.Nationality).value = docContent.nationality;
}

function _signatureCallback(responseString) {
	var response = _parseResponseString(responseString);
	if ( ! response ) {
		alert('Invalid signature response.');
		return;
	}

	var responseData = response.response_data;
	var imageSource = ( responseData && responseData.hasOwnProperty('image') ?
							responseData.image :
							null );

	var imageElement = document.getElementById(InputIdentifiers.IdentitySignature);
	var altText;
	if ( imageSource ) {
		var tempArray = responseData.image_name.split('.');
		var imageType = tempArray[tempArray.length - 1];
		imageElement.src = 'data:image/' + imageType + ';base64,' + imageSource;
		altText = "";

		var date = new Date();
		var dateValue = "Sign Date: " + date.getDay() + '-' + (date.getMonth() + 1) + '-' + date.getFullYear();
		document.getElementById(InputIdentifiers.IdentitySignDate).innerHTML =  dateValue;
	}
	else {
		altText = "Signature not available";
	}

	imageElement.alt = altText;
}

function _imageCallback(responseString) {
}

/** Loader */

(function(webkitHandler){

	console.log('Webkit Handler: ' + webkitHandler);
	if ( ! webkitHandler ) {
		alert('To view the demo, this web content must be viewed inside the S.I.C. iOS application.');
		return;
	}

	var nativeHandler = webkitHandler;

	console.log('We have a webkit handler');

	const Actions = {

		startSessionClick: function() {
			var messageBody = {
				callback_name: _startSessionCallback.name,
			};
			var messageHandler = nativeHandler.messageHandlers[HandlerNames.start_handler];
			_callNative(messageBody,messageHandler);
		},

		endSessionClick: function() {
			var messageBody = {
				callback_name: _endSessionCallback.name
			};

			var messageHandler = nativeHandler.messageHandlers[HandlerNames.end_handler];
			_callNative(messageBody,messageHandler);
		},

		cardScanClick: function() {
			var messageBody = {
				callback_name: _cardScanCallback.name,
				parameters: {
					card_type: IdentityType.mrz_id_card
				}
			};

			if ( nativeHandler ) {
				var messageHandler = nativeHandler.messageHandlers[HandlerNames.card_handler];
				_callNative(messageBody,messageHandler);
			}
		},

		passportScanClick: function() {
			console.log('Passport Scan Click');
			var messageBody = {
				callback_name: _cardScanCallback.name,
				parameters: {
					card_type: IdentityType.mrz_passport
				}
			};

			if ( nativeHandler ) {
				var messageHandler = nativeHandler.messageHandlers[HandlerNames.card_handler];
				_callNative(messageBody,messageHandler);
			}
		},

		signatureScanClick: function() {
			console.log('Signature Scan Click');

			var imageSize = { width: 200, height: 200 };
			var parameters = {
				image_size: imageSize,
				image_format: 'jpg',
			};

			var message = {
				callback_name: _signatureCallback.name,
				parameters: parameters
			};

			var messageHandler = nativeHandler.messageHandlers[HandlerNames.signature_handler];
			_callNative(message,messageHandler);
		},

		imageCaptureClick: function() {
			var imageSize = { width: 200, height: 200 };
			var parameters = {
				image_size: imageSize,
				image_format: 'jpg'
			};

			var message = {
				callback_name: _imageCallback.name,
				parameters: parameters
			};

			var messageHandler = nativeHandler.messageHandlers[HandlerNames.image_handler];
			_callNative(message,messageHandler);
		}
	};

	function _prepDocument() {
		document.getElementById(ActionIdentifiers.StartSession).onclick = Actions.startSessionClick;
		document.getElementById(ActionIdentifiers.EndSession).onclick = Actions.endSessionClick;
		document.getElementById(ActionIdentifiers.CardScanner).onclick = Actions.cardScanClick;
		document.getElementById(ActionIdentifiers.PassportScanner).onclick = Actions.passportScanClick;
		document.getElementById(ActionIdentifiers.CaptureSignature).onclick = Actions.signatureScanClick;
		document.getElementById(ActionIdentifiers.ImageButton).onclick = Actions.imageCaptureClick;

		Actions.startSessionClick();
	};

	_prepDocument();

}(window.webkit));
