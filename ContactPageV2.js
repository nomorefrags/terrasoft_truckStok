define('ContactPageV2', ['ContactPageV2Resources', 'GeneralDetails'],
function (resources, GeneralDetails) {
    return {
        entitySchemaName: 'Contact',
        details: /**SCHEMA_DETAILS*/{}/**SCHEMA_DETAILS*/,
        diff: /**SCHEMA_DIFF*/[
	{
	    "operation": "merge",
	    "name": "Name",
	    "values": {
	        "layout": {
	            "column": 2,
	            "row": 0,
	            "colSpan": 22,
	            "rowSpan": 1
	        },
	        "caption": {
	            "bindTo": "Resources.Strings.NameCaption"
	        },
	        "textSize": "Default",
	        "contentType": 1,
	        "labelConfig": {
	            "visible": true
	        },
	        "enabled": true
	    }
	},
	{
	    "operation": "merge",
	    "name": "Account",
	    "values": {
	        "layout": {
	            "column": 2,
	            "row": 1,
	            "colSpan": 22,
	            "rowSpan": 1
	        }
	    }
	},
	{
	    "operation": "merge",
	    "name": "Type",
	    "values": {
	        "layout": {
	            "column": 2,
	            "row": 2,
	            "colSpan": 9,
	            "rowSpan": 1
	        }
	    }
	},
	{
	    "operation": "merge",
	    "name": "Owner",
	    "values": {
	        "layout": {
	            "column": 11,
	            "row": 2,
	            "colSpan": 13,
	            "rowSpan": 1
	        }
	    }
	},
	{
	    "operation": "insert",
	    "name": "Gender1",
	    "values": {
	        "layout": {
	            "column": 2,
	            "row": 3,
	            "colSpan": 12,
	            "rowSpan": 1
	        },
	        "bindTo": "Gender",
	        "caption": {
	            "bindTo": "Resources.Strings.GenderCaption"
	        },
	        "enabled": true
	    },
	    "parentName": "Header",
	    "propertyName": "items",
	    "index": 5
	},
	{
	    "operation": "insert",
	    "name": "Phone",
	    "values": {
	        "layout": {
	            "column": 14,
	            "row": 3,
	            "colSpan": 10,
	            "rowSpan": 1
	        },
	        "bindTo": "Phone",
	        "caption": {
	            "bindTo": "Resources.Strings.PhoneCaption"
	        },
	        "enabled": true
	    },
	    "parentName": "Header",
	    "propertyName": "items",
	    "index": 6
	},
	{
	    "operation": "merge",
	    "name": "JobTitle",
	    "values": {
	        "caption": {
	            "bindTo": "Resources.Strings.JobTitleCaption"
	        },
	        "textSize": "Default",
	        "contentType": 1,
	        "labelConfig": {
	            "visible": true
	        },
	        "enabled": true
	    }
	}
        ]/**SCHEMA_DIFF*/,
        attributes: {},
        methods: {
            init: function () {
                var contactCommunicationDetailSandboxId;
                this.callParent(arguments);
                this.sandbox.subscribe("GetContactCommunicationOnItemChange", function (items) {
                    var communication = [];
                    items.forEach(function (item) {
                        var newNumber = {
                            Id: item.changedValues.Id,
                            Number: item.changedValues.Number
                        };
                        communication.push(newNumber);
                    }, this);
                    this.ContactCommunicationList = communication;
                }, this, [this.sandbox.id + "_detail_ContactCommunication"]);
            }
        },
        rules: {},
        userCode: {},
        messages: {
            "GetContactCommunicationOnItemChange": {
                mode: Terrasoft.MessageMode.PTP,
                direction: Terrasoft.MessageDirectionType.SUBSCRIBE
            }
        }
    };
});
