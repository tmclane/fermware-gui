function(doc) {
    if(doc.type == 'sensor_value')
        emit([doc.sensor_id, doc.date],
             {"sensor_id": doc.sensor_id,
	      "date": doc.date,
              "C": doc.C,
              "F": doc.F}
            );
}
