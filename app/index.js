(function () {
	
	// params object
	var params = {
		initLoc: { lat: 40.74032838760389, lng: -73.97234375 },
		domElem: document.getElementById('map'),
		zipcodes: [],
		apiRoute: "/zipcodes?",
		colorNormal: "#9b42f4",
		colorHighlighted: "#ff00ff",
		infoResolver: getTooltipHtml		//to turn off tooltips, simply set this param to null
	};

	//UI elements here  
	var button = document.getElementById("btnDo");
	var textBox = document.getElementById("txtData");

	//let's instantiate a new ZipPlotter object. The callback inside
	//this will basically be called once the google maps script is loaded
	new ZipPlotter(params, function (plotterObject) {

		///Event handler for button click
		button.onclick = function () {
			var zips = getZipsFromInput(textBox.value);

			if (validateZips(zips))
				plotterObject.update(zips);
			else
				alert("Invalid input. Check what you've entered again");

			$('#controlPanel').hide();
			$('#dateTimePicker').show();
		};
		
		///Handle click on a polygon
		plotterObject.zipcode_click = function (polygon, zipcode, callback) {
			var theDate = $('#date-picker').val();
			var date = new Date(theDate);
			var dayOfWeek = date.getDay();
			var hour = $('#time-picker').val();
			console.log('zipcode: ', zipcode);
			console.log('day of the week: ', dayOfWeek);
			console.log('hour: ', parseInt(hour));

			polygon.data.dayOfWeek = dayOfWeek;
			polygon.data.hour = hour;

			if (!isNaN(dayOfWeek) && !isNaN(hour)) {
				$.get("/prediction/" + zipcode + '/' + dayOfWeek + '/' + hour, function (data) {
					polygon.data.regression = data.regression;
					polygon.data.xgb = data.xgb;
					polygon.data.area = data.neighborhood;

					console.log(data);

					callback();
				});
			}
		}

	});

	function getTooltipHtml(zipcode, zipData) {
		
		var htmlTemplate =
			"<div class='info-window'>" +
			"<p><span style='font-weight:bold'>Zipcode: </span>{zipcode}</p>" +
			"<p><span style='font-weight:bold'>Area: </span>" + (zipData.area ? zipData.area : 'No data') + "</p>" +
			"<p><span style='font-weight:bold'>Day of the week: </span>" + zipData.dayOfWeek + "</p>" +
			"<p><span style='font-weight:bold'>Hour: </span>" + zipData.hour + "</p>" +
			"<p><span style='font-weight:bold'>Regression: </span>" + (zipData.regression ? zipData.regression : 'No data') + "</p>" +
			"<p><span style='font-weight:bold'>XGB: </span>" + (zipData.xgb ? zipData.xgb : 'No data') + "</p>" +
			"</div>";

		return htmlTemplate.replace("{zipcode}", zipcode);
	}
	 
	function getZipsFromInput(text) {
		var entered = text.trim().replaceAll("\n", '').replaceAll(" ", "");
		var lstZipCodes = entered.split(',');
		return lstZipCodes;
	}

	function validateZips(lstZipcodes) {
		//let's assume the list is valid
		var isListValid = true;
		
		//go through each element, and ensure its valid
		lstZipcodes.forEach(function (zipString) {
			//if an invalid element is found, change the status
			//of the flag
			if (!zipString.isDigits()) {
				isListValid = false;
				return;
			}
		});

		return isListValid;
	}

	String.prototype.replaceAll = function (search, replacement) {
		return this.split(search).join(replacement);
	};

	String.prototype.isDigits = function () {
		if (this.match(/^[0-9]+$/) != null) return true;
		return false;
	};

})();

