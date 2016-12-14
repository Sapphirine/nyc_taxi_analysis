(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
if (!google.maps) throw "Ensure that the Google Maps API has been loaded before using this module";

var CustomMarker = function (coords, label, textSize) {
	this._div = null;
	this._coords = new google.maps.LatLng(coords.lat,coords.lng);
	this._text = label;
	this._textSize = textSize;
};

CustomMarker.prototype = new google.maps.OverlayView();

CustomMarker.prototype.onAdd = function () {
	var div = document.createElement('div');
	div.style.textAlign = 'center';
	div.style.backgroundColor = "rgb(255,255,255,0.5)";
	div.style.padding = "5px";
	div.style.borderLeftColor = "gray";
	div.style.position = 'absolute';
	div.style.fontSize = this._textSize + "px";	
	div.style.fontWeight = 'bold';
	div.style.zIndex = '1000';
	div.innerHTML = this._text;
	div.className = "zipCodeLabel";
	this._div = div;
	
	var panes = this.getPanes();
	panes.overlayLayer.appendChild(div);
};

CustomMarker.prototype.draw = function(){
	//use the overlay project to translate LatLng value to actual (x,y) coordinates
	var overlayProjection = this.getProjection();
	var point = overlayProjection.fromLatLngToDivPixel(this._coords);	
	
	//use these x,y coordinates to move the div to the appropriate place
	var h = this._div.style.height;
	var w = this._div.style.width;
	
	this._div.style.left =(point.x - (20)) + 'px';
	this._div.style.top = (point.y - (20)) + 'px';
};

CustomMarker.prototype.onRemove = function(){
	this._div.parentNode.removeChild(this._div);
	this._div = null;
};

module.exports = CustomMarker;
},{}],2:[function(require,module,exports){
module.exports = {
			
	///---------------------------------------------------------------------
	/// returns True if the google.maps namespace exists
	///---------------------------------------------------------------------
	isGoogleMapsApiLoaded: function () {
		if (typeof (google) == "undefined") return false;
		return true;
	},

	///---------------------------------------------------------------------
	/// injects the google maps library (JS file) into the DOM. Also injects
	/// the initMap() function that is needed to get the script going
	///---------------------------------------------------------------------
	loadGoogleMapsApi: function (callback_loadComplete) {
	
		//this is the URL to the API
		var googleMapsApiUrl = "https://maps.googleapis.com/maps/api/js?key=AIzaSyA3Oa5uLCltGJkIyF5EVmUSQrz7-ujGdQA&callback=initMap";
	
		//once loaded, if the API doesn't find a function named "initMap", it yells
		//by throwing an error. We don't want that, so let's make sure this silly
		//function exists in our code. Inject a script into the body
		var lameScriptTag = document.createElement("script");
		lameScriptTag.innerHTML = "function initMap(){}";
		document.body.appendChild(lameScriptTag);
	
		//now let's load the google maps library. First create a script tag
		var googleMapsScriptTag = document.createElement("script");
		googleMapsScriptTag.src = googleMapsApiUrl;
		googleMapsScriptTag.type = "text/javascript";
		googleMapsScriptTag.onload = callback_loadComplete;
	
		//now inject that script into the body
		document.body.appendChild(googleMapsScriptTag);
	
		//as soon as the script is fetched and loaded, the callback_loadComplete function is called
	},
	
	///-------------------------------------------------------------------------
	/// helper function to perform async Http GET calls
	/// calls the URL, then invokes the callback once the
	/// response is ready to be handled
	/// fakedelay - in case you want it to delay the response (for UI magic!!!)
	///-------------------------------------------------------------------------
	httpGetAsync: function (url, callback, fakedelay) {

		if (!fakedelay) fakedelay = 0;
		
		//create a GET request, assign callback 
		var request = new XMLHttpRequest();
		request.open("GET", url, true);

        request.onreadystatechange = function () {
			if (request.readyState == 4) {
				
				//type checking for fakedelay, make sure its a number 
				if (typeof (fakedelay) == typeof (1)) {
					setTimeout(function () {
						callback(request);
					}, fakedelay);
				}
				else callback(request);
			}
		};
               
		//ready to send it!
		request.send(null);
	},
	
	///-------------------------------------------------------------------------
	/// Get zip code data from the server for all the zips in 'lstZips'
	/// in parts. Since there are limitations on how long the URL can be for
	/// HTTP requests, its likely that we'll have to handle this in parts
	/// if the user wants to request data for 2000 zipcodes, some zips may 
	/// get missed because of url truncation
	///
	/// To address this, we'll split the list of zips into smaller, manageble 
	/// chunks. Each chunk (which is a subset of the large list) will turn
	/// into a url. These URL will be requested one by one. And when all the requests
	/// have been served, we'll invoke the 'callback'
	///-------------------------------------------------------------------------
	getZipsFromServerInParts: function (lstZips, route, callback) {
		
		if(lstZips.length == 0) callback(null);
		
		//lstZips might be extremely large, so we'll split it into smaller chunk
		//sized lists. For each chunk sized list, we'll form a url and get the data 
		//from the server using the route specified		
		var chunkSize = 80;
		var numChunks = Math.floor(lstZips.length / chunkSize);
		if (lstZips.length % chunkSize > 0) numChunks++;

		var chunkSizedZips = [];
				
		//now we need to create as many lists as indicated in 'numChunks'
		for (var i = 0; i < numChunks; i++) {
			var startChunkAt = i * chunkSize;
			var endChunkAt = startChunkAt + chunkSize;
			chunkSizedZips.push(lstZips.slice(startChunkAt, endChunkAt));
		}
		
		
		//now we have split our larger list in small manageable chunk sizes
		//all these smaller lists contain zip codes, we'll now create URLs 
		//for each smaller list using the route provided as argument
		var urls = [];

		chunkSizedZips.forEach(function (chunk) {
			urls.push('' + route + chunk.join("&"));
		});
				
		//now we have all the urls we need to call in our 'urls' list
		//let's call them one by one. Each call will return a response
		//which will also have to be collated into one big response
		
		var responses = [];
		var GET = this.httpGetAsync;
		var counter = 0;
		
		//call each url, store its response in the list. When the list
		//has as many responses as urls, we know we're done. Invoke the callback
		urls.forEach(function (url) {
			GET(url, function (req) {
				//get this URL
				var resp = null;
				if (req.status == 200) {
					resp = JSON.parse(req.responseText);
					counter++;
				}
				
				//save the response in 'responses'
				responses.push(resp);
				
				//looks like we have no more URLs to fetch, invoke callback												
				if (responses.length == urls.length) { 
					//now every response object (in 'responses') is basically a collection
					//of key value pairs. We want to combine all this into a single object
					
					var bigObject_allZipData = {};
					responses.forEach(function (eachResp) {
						for (var zipcode in eachResp) {
							var dataForZip = eachResp[zipcode];
							bigObject_allZipData[zipcode] = dataForZip;
						}
					});
					
					//now throw it back to the callback
					callback(bigObject_allZipData);
				}
			});
		});

	},
	
	///-------------------------------------------------------------------------
	/// Convert a string of format "lat1,lng1/lat2,lng2/lat3,lng3..."
	/// to a google polygon object that can be drawn on the map. Each coordString
	/// must represent a single polygon
	///-------------------------------------------------------------------------
	converZipToPolygon: function (zipStr, zipData, opacity, callbacks) {
		
		if(!google.maps) throw "Google Maps API not found!";
		
		//the coordStr data is delimited by "/" character. when we split
		//we get ["lat1,lng1","lat2,lng2",...]
		var coords = [];
		var coordStr = zipData.coords[0];
		var arrPairs = coordStr.split("/");
		var bounds = new google.maps.LatLngBounds();
		
		//Now take that list and turn everything into a json object
		//push that json object into the array 'coords'
		arrPairs.forEach(function (latLngString) {
			
			//string to {lat:.., lng:...}
			var lat = parseFloat(latLngString.split(",")[0]);
			var lng = parseFloat(latLngString.split(",")[1]);
			coords.push({'lat': lat, 'lng': lng});			
			
			//since we're using the bounds object to track the region
			//this polygon spreads over, let's add this point to our
			//bounds object as well
			bounds.extend(new google.maps.LatLng(lat,lng));
		});
		
		//get the center of this region defined by the polygon
		var regionCenter = {lat: bounds.getCenter().lat(), lng: bounds.getCenter().lng()};
		
		//turn that array 'coords' into a google polygon
		var polygon = new google.maps.Polygon({
            paths: coords
            , strokeColor: '#ff0000'
            , strokeOpacity: 0.8
            , strokeWeight: 2
            , fillColor: '#ff0000'
            , fillOpacity: zipData.opacity
			, centerCoord: regionCenter
			, tag: zipStr
			, data: zipData
			, bounds: bounds
        });
		
		//attach a mouse events for each polygon. This is a nice hack to
		//give me access to the polygon inside this event handler
		google.maps.event.addListener(polygon, 'click', function(){			
			var thisPoly = this;
			var zipcode = thisPoly.tag;			
			if(typeof(callbacks.click) == typeof(function(){})){
				callbacks.click(thisPoly,zipcode);
			}
		});
		
		google.maps.event.addListener(polygon,'mouseover',function(){
			var thisPoly = this;
			var zipcode = thisPoly.tag;
			if(typeof(callbacks.mouseover) == typeof(function(){})){
				callbacks.mouseover(thisPoly,zipcode);
			}
		});
		
		google.maps.event.addListener(polygon,'mouseout',function(){
			var thisPoly = this;
			var zipcode = thisPoly.tag;
			if(typeof(callbacks.mouseout) == typeof(function(){})){
				callbacks.mouseout(thisPoly,zipcode);
			}
		});
		
		return polygon;
	},
	
	///-------------------------------------------------------------------------
	/// Create a google.maps.Marker from the coordinates and the label
	/// provided in the arguments
	///-------------------------------------------------------------------------	
	getCustomMarker: function(coord,label,textSize){
		var CustomMarker = require("./customMarker");
		var cusMark = new CustomMarker(coord,label,textSize);
		return cusMark;		
	},
	
	///--------------------------------------------------------------
	/// this method will clear the 'polygons' from the map
	/// polygons - the list of polygons you want to clear from the map
	/// to clear a set of polygons, simply make them point to null, instead
	/// of an actual map object
	///--------------------------------------------------------------
	clearPolygonsOnMap: function (polygons) {
		if (google.maps) {
			polygons.forEach(function (eachPoly) {
				eachPoly.setMap(null);
			});
		}
		else throw "Google Maps API not loaded or map object is invalid"
	},

	///--------------------------------------------------------------
	/// this method will draw a list of 'polygons' on the 'map'
	///--------------------------------------------------------------	
	drawPolygonsOnMap: function (polygons, map) {

		if (google.maps && map instanceof google.maps.Map) {		
			
			//We also want to understand where the center of this polygon is
			//we'll do this using a LatLngBounds object provided by google maps
			var bounds = new google.maps.LatLngBounds();
		
			//iterate through each polygon in the list and draw it on the map
			polygons.forEach(function (polyToDraw) {
			
				//these are the center coordinates of each polygon
				var lat = polyToDraw.centerCoord.lat;
				var lng = polyToDraw.centerCoord.lng;
			
				//extend the bounds of our region to include the bounds
				//of this polygon
				//this is very important as it allows you to scale to the
				//correct zoom level 
				bounds.union(polyToDraw.bounds);
				
				//draw the polygon
				polyToDraw.setMap(map);

			});
			
			//the object 'bounds' now contains the largest outer rect
			//that represents the best view of the map. Use this to 
			//recenter the map and adjust the zoom level
			map.panTo(bounds.getCenter());
			map.fitBounds(bounds);			
		}
		else throw "Google Maps API not loaded or map object is invalid"
	},
	
	///--------------------------------------------------------------
	/// this method will clear all the 'markers' from the map
	/// markers - a list of google.maps.Marker objects that need to
	/// be cleared from the maps they're currently drawn on
	///--------------------------------------------------------------
	clearMarkersOnMap: function (markers) {
		if (google.maps) {
			markers.forEach(function (eachMarker) {
				eachMarker.setMap(null);
			});
		}
	},

	///--------------------------------------------------------------
	/// draw the markers on the map
	///--------------------------------------------------------------
	drawMarkersOnMap: function (markers, map) {
		markers.forEach(function (eachMarker) {
			eachMarker.setMap(map);
		});
	}
};


},{"./customMarker":1}],3:[function(require,module,exports){
///---------------------------------------------------------------------
/// validate the arguments that were passed to the plotter object

var helper = require("./helpers");

var props = ['initLoc', 'domElem', 'zipcodes', 'apiRoute', 'colorNormal', 'colorHighlighted', 'infoResolver'];
var isParamsValid = function (params) {
	var keys = Object.keys(params);
	for (var i in props) {
		if (!params.hasOwnProperty(keys[i])) return false;
	}
	return true;
};

/******************************************************************************
 * ZipPlotter - a class that plots various zip codes on a google map
 * Parameters:
 * 	--- params: 
 * 		This is an object that must contain the following fields
 *	--------> initLoc 	: the initial location of the map
 *	--------> zipcodes	: the list of zipcodes that need to be fetched
 *	--------> mapDomElem 	: the DOM element where the map needs to be drawn
 *  --------> apiRoute	: the API route to get the zip code data from
 *  --------> colorNormal: the color of the polygon in normal state
 *  --------> colorHighlighted: color of the polygon in highlighted state
 *  --------> infoResolver: function to get HTML for tooltips / info windows
 * 
 * --- callback: 
 * 		This is a function that will be called when the map is loaded
 * 		the callback will also receive a "map" object as a parameter
 ******************************************************************************/
var ZipPlotter = function (params, callback) {

	///global reference to this zipPlotter object
	var thisObj = this;
	
	///input parameters that are passed to this zipPlotter
	var initLoc,
		zipcodes,
		apiRoute,
		mapDomElem,
		colorNormal,
		colorHighlighted,
		infoResolver;
		
	//lists to store Polygons and Markers that might be drawn on the map
	var polygons = [], markers = [];
	
	//reference to the map object 
	var map = null;
	
	//flags to toggle visibility of markers and polygons
	var isMarkerShown = true, isPolygonShown = true;
	
	//the zip code data (fetched from the server)
	var zipcodeData = null;
	
	//the zoom level below which the marker labels are hidden
	var zoomLevelThreshold = 12;

	//members to manage infoWindow / tooltip
	var info = null;
	
	///---------------------------------------------------------------------
	/// this will initialize a map, configure the object based on the params
	/// provided and then call the callback
	///---------------------------------------------------------------------
	var init = function () {
		if (isParamsValid(params)) {
			
			//save the initial location of the map
			initLoc = params.initLoc;
			mapDomElem = params.domElem;
			colorNormal = params.colorNormal;
			colorHighlighted = params.colorHighlighted;
			infoResolver = params.infoResolver;
			
			//draw the map with the initial location
			map = new google.maps.Map(mapDomElem, {
				zoom: 12,
				center: initLoc,
				mapTypeId: 'terrain',
			});
			
			//attach a "zoom changed listener"
			map.addListener('zoom_changed', manageMarkersWithZoom);
			
			//save some of these params, we might need them later
			zipcodes = params.zipcodes;
			apiRoute = params.apiRoute;
			
			//fetch the data from the initial zipcodes and draw it
			helper.getZipsFromServerInParts(zipcodes, apiRoute, draw);
		}
		else throw "You're missing one or more parameters to create this object"
	};
	
	
	///---------------------------------------------------------------------
	/// clear any existing polygons/markers on the map
	///---------------------------------------------------------------------
	var clear = function () {
		helper.clearPolygonsOnMap(polygons);
		helper.clearMarkersOnMap(markers);
		polygons = [];
		markers = [];
	};
	
	///---------------------------------------------------------------------
	/// draw all polygons on the map
	///---------------------------------------------------------------------
	var draw = function (allData) {

		console.log(allData);

		var mouseEvents = {
			click: zipcode_clicked,
			mouseover: zipcode_mouseover,
			mouseout: zipcode_mouseout
		};

		if (allData != null) {
			clear();
			var polygon;
			
			//let's get a polygon for each of the zipcodes in the data
			for (var zipStr in allData) {
				if (allData[zipStr] != null) {
					var zipData = allData[zipStr];
					polygon = helper.converZipToPolygon(zipStr, zipData, 0.6, mouseEvents);
					
					//configure appearance
					polygon.strokeColor = colorNormal;
					polygon.fillColor = colorNormal;
					polygons.push(polygon);

					var textSize = map.getZoom();
					var marker = helper.getCustomMarker(polygon.centerCoord, zipStr, textSize);
					markers.push(marker);
				}
			}

			if (isPolygonShown) helper.drawPolygonsOnMap(polygons, map);
			if (isMarkerShown) helper.drawMarkersOnMap(markers, map);
		}

		callback(thisObj);
	};
	
	///------------------------------------------------------------------------
	/// Show the tooltip / info window over the specified polygon
	///------------------------------------------------------------------------
	var showInfoWindow = function (polygon) {

		if (typeof (infoResolver) == typeof (function () { })) {
			var zipcode = polygon.tag;
			var zipData = polygon.data;
			var infoHtml = infoResolver(zipcode, zipData);
			var infoPosition = { lat: polygon.bounds.getCenter().lat(), lng: polygon.bounds.getCenter().lng() };
			
			//there is no info window shown on the screen
			//let's create one, load the custom html into it and 
			//display it on the screen
			info = new google.maps.InfoWindow({
				content: infoHtml,
				position: infoPosition,
				zipcode: zipcode
			});
			
			//attach an event listener to see when it has been closed by pressing the ("x")
			//this basically resets the 'info' object to null, when the infoWindow is closed
			google.maps.event.addListener(info, 'closeclick', function () { info = null });
			
			//display it on the map
			info.open(map);
		}
	};
	
	
	///---------------------------------------------------------------------
	/// App supplied click event for polygon. Basically, since this function
	/// is attached to "this" object, the app can override this behavior
	/// to do more than what zipPlotter provides
	///---------------------------------------------------------------------
	this.zipcode_click = function (polygon, zipcode, info) {
		//Override this in the app
	};

	///---------------------------------------------------------------------
	/// click event handler
	///---------------------------------------------------------------------
	var zipcode_clicked = function (polygon, zipcode) {
		thisObj.zipcode_click(polygon, zipcode, function() {
			if (info == null) {
				showInfoWindow(polygon);
			}
			else if (zipcode != info.zipcode) {
				info.close();
				showInfoWindow(polygon);
			}
		});
	};

	///---------------------------------------------------------------------
	/// mouseover handler for polygon
	///---------------------------------------------------------------------
	var zipcode_mouseover = function (polygon, zipcode) {
		polygon.strokeWeight = 4;
		polygon.fillColor = colorHighlighted;
		redrawPolygon(polygon);
	};
	
	///---------------------------------------------------------------------
	/// mouseout handler for polygon
	///---------------------------------------------------------------------
	var zipcode_mouseout = function (polygon, zipcode) {
		polygon.strokeWeight = 2;
		polygon.fillColor = colorNormal;
		redrawPolygon(polygon);
	};
	
	///---------------------------------------------------------------------
	/// update the data (zipcodes) and redraw the maps
	///---------------------------------------------------------------------
	var redrawPolygon = function (polygon) {
		polygon.setMap(null);
		polygon.setMap(map);
	};
	
	///---------------------------------------------------------------------
	/// update the data (zipcodes) and redraw the maps
	///---------------------------------------------------------------------
	this.update = function (newZips) {
		zipcodes = newZips;
		helper.getZipsFromServerInParts(zipcodes, apiRoute, draw);
	};

	///---------------------------------------------------------------------
	/// this function manages the visibility of the markers based on the 
	/// zoom level of the map. This is the callback for 'zoom_changed' event
	/// for the google map used by this zipPlotter object
	///---------------------------------------------------------------------
	var manageMarkersWithZoom = function () {
		var zoomLevel = map.getZoom();

		if (isMarkerShown && zoomLevel < zoomLevelThreshold) {
			isMarkerShown = false;
			helper.clearMarkersOnMap(markers);
			if (info!=null) info.close();
		}
		else if (!isMarkerShown && zoomLevel >= zoomLevelThreshold) {
			isMarkerShown = true;
			helper.drawMarkersOnMap(markers, map);			
		}
		else {
			draw(zipcodeData);
		}

	};
	
	//is the google maps API loaded, start init. If not, load it
	//and then start init
	if (helper.isGoogleMapsApiLoaded()) init(); else helper.loadGoogleMapsApi(init);
};


module.exports = ZipPlotter;
},{"./helpers":2}],4:[function(require,module,exports){
/*******************************************************************
 * This file is used to import the ZipPlotter library and add it
 * to the global namespace (window object).
 * When we build this js file using browserify, we effectively end
 * up creating a single JS library for ZipPlotter 
********************************************************************/

var ZipPlotter = require("./lr-maps/zipPlotter");
window['ZipPlotter'] = ZipPlotter;
},{"./lr-maps/zipPlotter":3}]},{},[4]);
