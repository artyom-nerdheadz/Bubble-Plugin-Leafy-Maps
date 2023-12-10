function draw_line_on(instance, properties, context) {
  const polylineDecoder = function (str, precision) {
    let index = 0,
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

      latitude_change = result & 1 ? ~(result >> 1) : result >> 1;

      shift = result = 0;

      do {
        byte = str.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      longitude_change = result & 1 ? ~(result >> 1) : result >> 1;

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
  };

  // this is to load data from Bubble's server.
  let listLoader = (columnBasicReference, columnLengthFunction) => {
    // grab the column array
    let acquiredListColumn = getList(
      columnBasicReference,
      0,
      columnLengthFunction
    );
    // return it, whether it's a blank space or the actual list.
    return acquiredListColumn;
  };

  if (properties.use_encoded_shape_polyline) {
    latLngs = polylineDecoder(properties.encoded_shape, 6);
  } else if (!properties.use_encoded_shape_polyline) {
    let listOfLatitudes = listLoader(
      properties.list_of_latitudes,
      properties.list_of_latitudes.length()
    );
    let listOfLongitudes = listLoader(
      properties.list_of_longitudes,
      properties.list_of_longitudes.length()
    );

    const readListsAndPush = (element, index, array) => {
      latLngs.push([listOfLatitudes[index], listOfLongitudes[index]]);
    };

    listOfLatitudes.forEach(readListsAndPush);
  }

  const lineOptions = {
    color: properties.stroke_color, // stroke color
    weight: properties.stroke_weight, // stroke width in pixels, default is 3
    opacity: properties.stroke_opacity, // default is 1.0
    lineCap: properties.line_cap, // default is "round"
    lineJoin: properties.line_join, // default is "round"
    dashArray: properties.dashArray, //default is '2, 2'
  };

  // create a LatLngBounds object to encompass all the line segments
  let bounds = [];

  const listOfLineIds = listLoader(
    properties.polyline_names,
    properties.polyline_names.length()
  );

  // define the polyLines coordinates
  const polyLines = createPolyLines();

  function createPolyLines() {
    const listOfLatitudes = listLoader(
      properties.list_of_latitudes,
      properties.list_of_latitudes.length()
    );
    const listOfLongitudes = listLoader(
      properties.list_of_longitudes,
      properties.list_of_longitudes.length()
    );

    const polyLines = [];

    for (let i = 0; i < listOfLatitudes.length; i += 2) {
      const lat1 = listOfLatitudes[i];
      const lat2 = listOfLatitudes[i + 1];
      const lng1 = listOfLongitudes[i];
      const lng2 = listOfLongitudes[i + 1];

      const polyline = {
        coordinates: [
          [lat1, lng1],
          [lat2, lng2],
        ],
      };

      polyLines.push(polyline);
    }

    return polyLines;
  }

  // calculate the center point of the coordinates
  function calculateCenter(coordinates) {
    let latSum = 0;
    let lngSum = 0;

    for (let i = 0; i < coordinates.length; i++) {
      latSum += coordinates[i][0];
      lngSum += coordinates[i][1];
    }

    const latCenter = latSum / coordinates.length;
    const lngCenter = lngSum / coordinates.length;

    return [latCenter, lngCenter];
  }

  // create and add line segments to the map
  const ordersCount = listLoader(
    properties.orders_count,
    properties.orders_count.length()
  );

  //   console.clear();

  polyLines.forEach((polyline, idx, arr) => {
    const uniqueName = `lineSegment_${listOfLineIds[idx]}_${
      listOfLineIds[idx + 1]
    }`
      .replace(/\s/gi, '_')
      .toLowerCase();

    if (properties.use_curved_lines === false) {
      if (idx < arr.length - 1) {
        const secondPoint = arr[idx + 1];
        const lineSegment = L.polyline(
          [polyline.coordinates, secondPoint.coordinates],
          lineOptions
        ).addTo(instance.data.mymap);
        instance.data[uniqueName] = lineSegment;
        bounds.push(lineSegment.getLatLngs());
      } else {
        const lineSegment = L.polyline(
          [polyline.coordinates],
          lineOptions
        ).addTo(instance.data.mymap);
        instance.data[uniqueName] = lineSegment;
        bounds.push(lineSegment.getLatLngs());
      }
    }

    if (properties.use_curved_lines === true && L.Curve !== undefined) {
      const latlngs = [];

      // Add the control points for the curved line
      polyline.coordinates.forEach((latlng, index) => {
        if (index > 0) {
          const prevLatlng = polyline.coordinates[index - 1];
          const offsetX = latlng[1] - prevLatlng[1];
          const offsetY = latlng[0] - prevLatlng[0];

          const r = Math.sqrt(Math.pow(offsetX, 2) + Math.pow(offsetY, 2));
          const theta = Math.atan2(offsetY, offsetX);

          const thetaOffset = Math.PI / 10;

          const r2 = r / 2 / Math.cos(thetaOffset);
          const theta2 = theta + thetaOffset;

          const midpointX = r2 * Math.cos(theta2) + prevLatlng[1];
          const midpointY = r2 * Math.sin(theta2) + prevLatlng[0];

          const midpointLatLng = [midpointY, midpointX];
          latlngs.push(prevLatlng, midpointLatLng);
        }
      });

      // Add the last point of the polyline
      latlngs.push(polyline.coordinates[polyline.coordinates.length - 1]);

      // Use L.curve for curved lines
      L.curve(
        ['M', latlngs[0], 'Q', latlngs[1], ...latlngs.slice(2)],
        lineOptions
      ).addTo(instance.data.mymap);
    }

    // get the center of the coordinates and add a marker
    if (ordersCount.length) {
      const center = calculateCenter(polyline.coordinates);
      const div = document.createElement('div');
      div.innerText = ordersCount[idx];
      Object.assign(div.style, {
        background: '#406AEA',
        padding: '6px',
        borderRadius: '8px',
        fontSize: '10px',
        fontWeight: 700,
        color: 'white',
        width: 'max-content',
      });
      const icon = L.divIcon({
        html: div,
      });
      L.marker(center, {
        icon,
        title: null,
      }).addTo(instance.data.mymap);
    }
  });

  // zoom the map to the polyline
  if (properties.zoom_map_to_this_line) {
    bounds = L.latLngBounds(bounds);
    instance.data.mymap.fitBounds(bounds);
  }
}
