function find(valuesArray, value) {
	for (var i = 0; i < valuesArray.length; ++i) {
		if (valuesArray[i].value == value.toString()) {
			return i;
		}
	}

	return -1;
}

function main() {

	var pickListName;
	var pickListLevel;
	var includeBlankItem;
	var loadLabels;
	var initialValues;

	if (args.name === null) {
		status.code = 500;
		status.message = "Missing name parameter";
		status.redirect = true;
		return;
	} else {
		pickListName = args.name;
	}

	if (args.level === null) {
		pickListLevel = 1;
	} else {
		pickListLevel = parseInt(args.level);
	}

	includeBlankItem = args.includeBlankItem;
	loadLabels = args.loadLabels;

	if (args.initialValues === null) {
		initialValues = [ "" ];
	} else {
		initialValues = args.initialValues.split(",");
	}

	var valueParameter;

	switch (pickListLevel) {
	case 1:
		valueParameter = "";
		break;
	case 2:
		valueParameter = "level1";
		break;
	default:
		break;
	}

	var filterValue = args[valueParameter];

	model.picklistItems = getPickListItems(pickListName, pickListLevel,
			includeBlankItem, loadLabels, initialValues, valueParameter,
			filterValue);
}

function getPickListItems(pickListName, pickListLevel, includeBlankItem,
		loadLabels, initialValues, valueParameter, filterValue) {

    // TODO: properly fix this part. Make it a function or something
    var fixedPickListName;
    try{
    // If the string is UTF-8, this will work and not throw an error.
        fixedPickListName = decodeURIComponent(escape(pickListName));
    }catch(e){
        // If it isn't, an error will be thrown, and we can asume that we have an ISO string.
        fixedPickListName = pickListName;
    }

	var dataListQuery = 'TYPE:"{http://www.alfresco.org/model/datalist/1.0}dataList"';
    dataListQuery = dataListQuery + ' AND @cm\:title:"' + fixedPickListName + '"';

	//logger.warn("dataListQuery: " + dataListQuery);

	var dataListSearchParameters = {
       query: dataListQuery,
       language: "fts-alfresco",
       page: {maxItems: 1000},
       templates: []
    };

	var dataListResult = search.query(dataListSearchParameters);

	//logger.warn("dataListResult: " + dataListResult.length);

	var result = [];

	if (dataListResult.length == 0) {
		model.error = "Unable to locate data list object with title "
				+ pickListName;
	} else {

		var dataList;
		if (dataListResult.length > 0) {
			dataList = dataListResult[0];
		}

		var valueProperty;
		var labelProperty;
		var filterProperty;

		var pickListItemsQuery = "PARENT:\"" + dataList.nodeRef + "\"";

		switch (pickListLevel) {
		case 1:
			pickListItemsQuery = pickListItemsQuery
					+ " AND ASPECT:\"va:level1Aspect\"";

			valueProperty = "va:level1Value";
			labelProperty = "va:level1Label";
			break;
		case 2:
			pickListItemsQuery = pickListItemsQuery
					+ " AND ASPECT:\"va:level2Aspect\"";
			valueProperty = "va:level2Value";
			labelProperty = "va:level2Label";
			filterProperty = "va:level1Value";
			break;
		default:
			break;
		}

		if (pickListLevel > 1
				&& (filterValue === null || filterValue.length === 0)) {
			// returns a empty list because the filter value is empty

			var pickListItem = {};
			pickListItem.value = "";
			pickListItem.label = "";

			result.push(pickListItem);
		} else {

			if (typeof filterProperty !== "undefined") {
				pickListItemsQuery = pickListItemsQuery + " AND "
						+ filterProperty + ":\"" + filterValue + "\"";
			}

			//logger.log("query: " + pickListItemsQuery);

			var pickListItemsSearchParameters = {
				query : pickListItemsQuery,
				language : "fts-alfresco"
			};

			var pickListItemsResult = search
					.query(pickListItemsSearchParameters);

			// see if we're just supposed to send back some labels
			if (loadLabels) {
				var labels = [];

				valueLabelPairs = [];

				for (var i = 0; i < pickListItemsResult.length; i++) {
					dataListItem = pickListItemsResult[i];

					var pickListItemValue = dataListItem.properties[valueProperty];
					var pickListItemLabel = dataListItem.properties[labelProperty];

					valuePair = {};
					valuePair.value = pickListItemValue;
					valuePair.label = pickListItemLabel;

					valueLabelPairs.push(valuePair);
				}

				for (var j = 0; j < initialValues.length; j++) {
					var item = find(valueLabelPairs, initialValues[j]);

					if (item < 0) {
						labels.push(initialValues[j]);
					} else {
						labels.push(valueLabelPairs[item].label);
					}
				}

				model.labels = labels.toString();
			} else {

				if (includeBlankItem) {
					var pickListItem = {};
					pickListItem.value = "";
					pickListItem.label = "";

					result.push(pickListItem);
				}

				var dataListItem;

				for (var i = 0; i < pickListItemsResult.length; i++) {
					dataListItem = pickListItemsResult[i];

					var pickListItemValue = dataListItem.properties[valueProperty];
					var pickListItemLabel = dataListItem.properties[labelProperty];

					// avoid adding repeated items
					if (find(result, pickListItemValue) < 0) {
						var pickListItem = {};
						pickListItem.value = pickListItemValue;
						pickListItem.label = pickListItemLabel;

						result.push(pickListItem);
					}
				}
			}
		}

		return result;
	}
}

main();