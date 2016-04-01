define('ContactPageV2', ['ContactPageV2Resources', 'GeneralDetails'],
function(resources, GeneralDetails) {
	return {
		methods: {
			init: function() {
				var contactCommunicationDetailSandboxId;
				this.callParent(arguments);
				this.sandbox.subscribe("GetContactCommunicationOnItemChange", function(items) {
					var communication = [];
					items.forEach(function(item) {
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
		messages: {
			"GetContactCommunicationOnItemChange": {
				mode: Terrasoft.MessageMode.PTP,
				direction: Terrasoft.MessageDirectionType.SUBSCRIBE
			}
		}
	};
});
