function(instance, properties, context) {

// Функция для нахождения центральной точки линии
function getCenterOfPolyline(latLngs) {
    var totalLength = 0,
        lengths = [0],
        previous = latLngs[0],
        current = null,
        partialLength = 0,
        i;

    // Вычисление длины каждого сегмента линии и общей длины
    for (i = 1; i < latLngs.length; i++) {
        current = latLngs[i];
        partialLength = L.latLng(previous).distanceTo(current);
        totalLength += partialLength;
        lengths.push(totalLength);
        previous = current;
    }

    // Ищем средину
    var halfLength = totalLength / 2;

    // Находим сегмент, который содержит центр линии, и интерполируем положение
    for (i = 0; i < lengths.length - 1; i++) {
        if (halfLength >= lengths[i] && halfLength <= lengths[i + 1]) {
            var start = latLngs[i],
                end = latLngs[i + 1];

            // Линейная интерполяция
            var ratio = (halfLength - lengths[i]) / (lengths[i + 1] - lengths[i]);
            var lat = start[0] + ratio * (end[0] - start[0]);
            var lng = start[1] + ratio * (end[1] - start[1]);

            return [lat, lng];
        }
    }

    return null;
}
    
const polylineDecoder = function(str, precision) {
    var index = 0,
        lat = 0,
        lng = 0,
        coordinates = [],
        shift = 0,
        result = 0,
        byte = null,
        latitude_change,
        longitude_change,
        factor = Math.pow(10, precision || 6);

    // Coordinates have variable length when encoded, so just keep
    // track of whether we've hit the end of the string. In each
    // loop iteration, a single coordinate is decoded.
    while (index < str.length) {

        // Reset shift, result, and byte
        byte = null;
        shift = 0;
        result = 0;

        do {
            byte = str.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        latitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

        shift = result = 0;

        do {
            byte = str.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        longitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

        lat += latitude_change;
        lng += longitude_change;

        coordinates.push([lat / factor, lng / factor]);
    }

    return coordinates;
};

let latLngs = [];


// this returns an array holding the list of whatever bubble holds. In this case a list of numbers.
let getList = (columnXBasicReference, startPosition, finishPosition) => {	
  let returnedList = columnXBasicReference.get(startPosition, finishPosition);
   return returnedList;
	}	

// this is to load data from Bubble's server.
let listLoader = (columnBasicReference, columnLengthFunction) => {
	// grab the column array
	let acquiredListColumn = getList(columnBasicReference, 0, columnLengthFunction); 	
	// return it, whether it's a blank space or the actual list.
	return acquiredListColumn;
}


if (properties.use_encoded_shape_polyline) {
 
  latLngs = polylineDecoder(properties.encoded_shape, 6);
    
} else if (!properties.use_encoded_shape_polyline) {
    
   let listOfLatitudes = listLoader(properties.list_of_latitudes, properties.list_of_latitudes.length());
   let listOfLongitudes = listLoader(properties.list_of_longitudes, properties.list_of_longitudes.length());

   const readListsAndPush = (element, index, array) => {
 
   latLngs.push( [listOfLatitudes[index], listOfLongitudes[index] ]) ; 
    
    }

listOfLatitudes.forEach(readListsAndPush) 
    
}

let optionsObject = {
    
    color: properties.stroke_color, // stroke color  
    weight: properties.stroke_weight, // stroke width in pixels, default is 3
    opacity: properties.stroke_opacity, // default is 1.0
    lineCap: properties.line_cap, // default is "round"
    lineJoin: properties.line_join, // default is "round"
    dashArray: properties.dashArray, //default is '2, 2'

};

instance.data[`${properties.polyline_name}`] = L.polyline(latLngs, optionsObject).addTo(instance.data.mymap);


// zoom the map to the polyline

if (properties.zoom_map_to_this_line) {
    
instance.data.mymap.fitBounds(instance.data[`${properties.polyline_name}`].getBounds());
    
}

// Вычисляем середину линии
let centerOfPolyline = getCenterOfPolyline(latLngs);

//let index = 0;

//let ordersCount = getList(properties[`orders_count`], 0, properties[`orders_count`].length());

// Создаем кастомный маркер с текстом по центру линии
if (centerOfPolyline) {
    let text = /*ordersCount[index]*/ '14';
    let textIcon = L.divIcon({
        className: '',
        html: `<div style="background: #406AEA; padding: 6px; border-radius: 8px; font-size: 10px; font-weight: 700; color: white; width: max-content;">${text}</div>`
    });
    L.marker(centerOfPolyline, {icon: textIcon, /*`${index + 1}`*/}).addTo(instance.data.mymap);
}

}